import path from 'node:path';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {chromium,firefox,webkit,type Browser, type Page} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import {PNG} from 'pngjs';
import pixelmatch from 'pixelmatch';
import {assertTargetAllowed,execFileSafe,result,skipped,metrics,thresholdChecks,type FrontendSuite,type CheckResult,type RunContext,type SuiteResult} from '@sapling/quality-core';
const engines={chromium,firefox,webkit};
const safeName=(s:string)=>s.replace(/[^\w.-]+/g,'_').slice(0,100);
const DEFAULT_VIEWPORTS=[{name:'mobile',width:390,height:844},{name:'tablet',width:768,height:1024},{name:'desktop',width:1440,height:900}];
async function inspectRoute(page:Page,url:string,checks:CheckResult[],prefix:string){
 const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
 checks.push({name:`${prefix}: main document responded`,passed:!!response && response.status()>=200 && response.status()<400,detail:`HTTP ${response?.status()??'none'}`});
 return response;
}
async function compareScreenshot(ctx:RunContext,page:Page,key:string,checks:CheckResult[],artifacts:string[]){
 const cfg=ctx.config.frontend!,baselineDir=path.resolve(cfg.visual?.baselineDir??'quality-baselines');
 const current=path.join(ctx.outputDir,`${key}.png`),baseline=path.join(baselineDir,`${key}.png`),diff=path.join(ctx.outputDir,`${key}.diff.png`);
 await page.screenshot({path:current,fullPage:true,animations:'disabled'});artifacts.push(current);
 if(ctx.updateBaselines && ctx.config.environment!=='production'){await mkdir(baselineDir,{recursive:true});await writeFile(baseline,await readFile(current));checks.push({name:`${key}: approved baseline written`,passed:true,detail:baseline});return;}
 let baselineBytes:Buffer;
 try{baselineBytes=await readFile(baseline);}catch{checks.push({name:`${key}: baseline exists`,passed:false,detail:`Missing ${baseline}. Run with --update-baselines.`});return;}
 const a=PNG.sync.read(await readFile(current)),b=PNG.sync.read(baselineBytes);
 if(a.width!==b.width || a.height!==b.height){checks.push({name:`${key}: image dimensions unchanged`,passed:false,detail:`${a.width}x${a.height} vs ${b.width}x${b.height}`});return;}
 const d=new PNG({width:a.width,height:a.height});const pixels=pixelmatch(a.data,b.data,d.data,a.width,a.height,{threshold:0.1});
 const ratio=pixels/(a.width*a.height);if(ratio>(cfg.visual?.thresholdRatio??0.01)){await writeFile(diff,PNG.sync.write(d));artifacts.push(diff);}
 checks.push({name:`${key}: visual pixel change <= ${cfg.visual?.thresholdRatio??0.01}`,passed:ratio<=(cfg.visual?.thresholdRatio??0.01),detail:`${(ratio*100).toFixed(2)}% changed`});
}
async function gatherMemory(page:Page){
 const session=await page.context().newCDPSession(page);
 try{await session.send('HeapProfiler.enable');await session.send('HeapProfiler.collectGarbage');
  return await page.evaluate(()=>Number((performance as any).memory?.usedJSHeapSize??NaN));
 }finally{await session.detach();}
}
export async function runBrowserSuite(ctx:RunContext,suite:FrontendSuite):Promise<SuiteResult>{
 const started=Date.now(),cfg=ctx.config.frontend!,id=`frontend:${suite}` as const;
 if(suite==='localization' && !cfg.localization?.locales?.length)return skipped(id,'Playwright','Configure frontend.localization.locales to verify translations');
 if(suite==='api-integration' && !cfg.apiMocks?.length)return skipped(id,'Playwright','Configure frontend.apiMocks to test HTTP integration behavior');
 if(suite==='rendering' && !cfg.custom?.rendering){/* React instrumentation is checked below */}
 if(suite==='observability' && !cfg.telemetryEndpoint)return skipped(id,'Playwright','Configure frontend.telemetryEndpoint to verify browser telemetry ingestion');
 if(suite==='network' && !cfg.network?.blockPattern && !cfg.network?.offline)return skipped(id,'Playwright','Configure frontend.network.blockPattern or offline simulation');
 if(suite==='network' && cfg.network?.offline && !cfg.network?.offlineIndicatorSelector)return skipped(id,'Playwright','Offline quality requires network.offlineIndicatorSelector to assert fallback behavior');
 const browsers=suite==='cross-browser'?(cfg.browsers??['chromium','firefox','webkit']):[cfg.browsers?.[0]??'chromium'];
 const viewports=suite==='responsive'?(cfg.viewports??DEFAULT_VIEWPORTS):[cfg.viewports?.find(v=>v.name==='desktop')??DEFAULT_VIEWPORTS[2]!];
 const routes=(suite==='seo'?(cfg.publicRoutes??cfg.routes):cfg.routes);
 const checks:CheckResult[]=[],artifacts:string[]=[],measured:Record<string,number>={};
 let instrumented=false;
 for(const engineName of browsers){
  const engine=engines[engineName as keyof typeof engines];if(!engine)throw new Error(`Unsupported browser ${engineName}`);
  const browser:Browser=await engine.launch({headless:true});
  try{
   for(const viewport of viewports){
    const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height},ignoreHTTPSErrors:false});
    const page=await context.newPage();
    await context.route('**/*',async route=>{if(route.request().isNavigationRequest()){try{assertTargetAllowed(ctx.config,route.request().url());}catch{return route.abort('blockedbyclient');}}await route.fallback();});
    let apiHits=0,blockedHits=0;const pageErrors:string[]=[];page.on('pageerror',e=>pageErrors.push(e.message));
    if(suite==='performance'||suite==='rendering'){
     await page.addInitScript(()=>{
      (window as any).__saplingLcp=0;(window as any).__saplingLongTask=0;(window as any).__saplingCls=0;
      try{new PerformanceObserver(list=>{for(const e of list.getEntries()){const shift=e as PerformanceEntry & {hadRecentInput?:boolean;value?:number};if(!shift.hadRecentInput)(window as any).__saplingCls+=shift.value??0;}}).observe({type:'layout-shift',buffered:true});}catch{}
      try{new PerformanceObserver(list=>{for(const e of list.getEntries())(window as any).__saplingLcp=e.startTime;}).observe({type:'largest-contentful-paint',buffered:true});}catch{}
      try{new PerformanceObserver(list=>{for(const e of list.getEntries())(window as any).__saplingLongTask=Math.max((window as any).__saplingLongTask,e.duration);}).observe({type:'longtask',buffered:true});}catch{}
     });
    }
    if(suite==='api-integration')for(const mock of cfg.apiMocks??[]){await page.route(mock.urlPattern,async route=>{apiHits++;await route.fulfill({status:mock.status??200,contentType:'application/json',body:JSON.stringify(mock.body??{})});});}
    if(suite==='network' && cfg.network?.blockPattern)await page.route(cfg.network.blockPattern,route=>{blockedHits++;return route.abort('failed');});
    for(const route of routes){
     apiHits=0;blockedHits=0;
     const label=`${engineName}/${viewport.name}/${route}`;
     const url=new URL(route,cfg.baseUrl).href;
     const response=await inspectRoute(page,url,checks,label);
     if(suite==='visual') await compareScreenshot(ctx,page,safeName(label),checks,artifacts);
     if(suite==='accessibility'){
      const analyzer=new AxeBuilder({page});if(cfg.accessibility?.wcagTags?.length)analyzer.withTags(cfg.accessibility.wcagTags);
      const findings=await analyzer.analyze();const violations=findings.violations;
      const max=cfg.accessibility?.criticalViolationsMax??0;const critical=violations.filter(v=>['critical','serious'].includes(v.impact??''));
      checks.push({name:`${label}: critical accessibility violations <= ${max}`,passed:critical.length<=max,detail:critical.map(v=>v.id).join(', ')||'none'});
      measured['accessibility.violations']=(measured['accessibility.violations']??0)+violations.length;
     }
     if(suite==='responsive'){
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1);
      checks.push({name:`${label}: no horizontal overflow`,passed:!overflow});
     }
     if(suite==='performance'||suite==='rendering'){
      await page.waitForTimeout(500);
      const perf=await page.evaluate(()=>{
       const n=performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming|undefined;
       return {navigationMs:n?.duration??NaN,domContentLoadedMs:n?.domContentLoadedEventEnd??NaN,lcpMs:(window as any).__saplingLcp??NaN,longTaskMs:(window as any).__saplingLongTask??0,cls:(window as any).__saplingCls??NaN,reactProfiler:(window as any).__SAPLING_REACT_PROFILE__??[]};
      });
      for(const key of ['navigationMs','lcpMs','longTaskMs','cls'] as const) if(Number.isFinite(perf[key]))measured[`page.${key}`]=Math.max(measured[`page.${key}`]??0,perf[key]);
      if(suite==='rendering'){
       if(perf.reactProfiler.length){instrumented=true;measured['react.render.count']=(measured['react.render.count']??0)+perf.reactProfiler.length;
        measured['react.render.maxActualDurationMs']=Math.max(measured['react.render.maxActualDurationMs']??0,...perf.reactProfiler.map((v:any)=>v.actualDuration??0));}
      }else{
       if(cfg.perf?.maxNavigationMs!==undefined)checks.push({name:`${label}: navigation <= ${cfg.perf.maxNavigationMs}ms`,passed:perf.navigationMs<=cfg.perf.maxNavigationMs});
       if(cfg.perf?.maxLcpMs!==undefined)checks.push({name:`${label}: LCP observed and <= ${cfg.perf.maxLcpMs}ms`,passed:perf.lcpMs>0&&perf.lcpMs<=cfg.perf.maxLcpMs});
       if(cfg.perf?.maxCls!==undefined)checks.push({name:`${label}: lab CLS <= ${cfg.perf.maxCls}`,passed:Number.isFinite(perf.cls)&&perf.cls<=cfg.perf.maxCls});
       if(cfg.perf?.maxLongTaskMs!==undefined)checks.push({name:`${label}: longest task <= ${cfg.perf.maxLongTaskMs}ms`,passed:perf.longTaskMs<=cfg.perf.maxLongTaskMs});
      }
     }
     if(suite==='security'){
      const headers=response?.headers()??{};for(const expected of cfg.security?.requiredHeaders??['x-content-type-options','content-security-policy']){
       checks.push({name:`${label}: ${expected} header present`,passed:!!headers[expected],detail:headers[expected]??'missing'});
      }
     }
     if(suite==='seo'){
      const seo=await page.evaluate(()=>({title:document.title,description:document.querySelector('meta[name="description"]')?.getAttribute('content'),robots:document.querySelector('meta[name="robots"]')?.getAttribute('content'),canonical:document.querySelector('link[rel="canonical"]')?.getAttribute('href')}));
      checks.push({name:`${label}: descriptive title present`,passed:seo.title.trim().length>=5});
      checks.push({name:`${label}: meta description present`,passed:(seo.description?.trim().length??0)>=30});
      checks.push({name:`${label}: route not explicitly noindexed`,passed:!seo.robots?.includes('noindex')});
     }
     if(suite==='navigation'){
      for(const link of cfg.navigation?.links??[]){await page.goto(new URL(link,cfg.baseUrl).href);checks.push({name:`${label}: navigation to ${link}`,passed:!((await page.locator('body').innerText()).includes('Cannot GET'))});}
      if(cfg.navigation?.expectedSelector)checks.push({name:`${label}: expected element visible`,passed:await page.locator(cfg.navigation.expectedSelector).isVisible().catch(()=>false)});
     }
     if(suite==='recovery'){
      const before=cfg.recovery?.selector?await page.locator(cfg.recovery.selector).textContent().catch(()=>null):null;
      await page.reload({waitUntil:'domcontentloaded'});checks.push({name:`${label}: refresh recovers`,passed:await page.locator('body').isVisible()});
      if(cfg.recovery?.selector&&cfg.recovery.persistAcrossReload)checks.push({name:`${label}: state survives reload`,passed:before===(await page.locator(cfg.recovery.selector).textContent().catch(()=>null))});
     }
     if(suite==='localization')for(const locale of cfg.localization?.locales??[]){
      const locUrl=new URL(route,cfg.baseUrl);locUrl.searchParams.set(cfg.localization?.localeQueryParam??'lang',locale);
      await page.goto(locUrl.href);const actual=await page.locator('html').getAttribute('lang');
      checks.push({name:`${label}: html lang matches ${locale}`,passed:actual?.toLowerCase().startsWith(locale.toLowerCase())??false,detail:actual??'missing'});
     }
     if(suite==='network'&&cfg.network?.blockPattern){await page.waitForTimeout(250);checks.push({name:`${label}: target network route blocked`,passed:blockedHits>0,detail:`blocked requests: ${blockedHits}`});}
     if(suite==='network'&&cfg.network?.offline){
      await context.setOffline(true);await page.reload({waitUntil:'domcontentloaded',timeout:8000}).catch(()=>{});
      if(cfg.network?.offlineIndicatorSelector)checks.push({name:`${label}: offline fallback visible`,passed:await page.locator(cfg.network.offlineIndicatorSelector).isVisible().catch(()=>false)});
      await context.setOffline(false);
     }
     if(suite==='api-integration'){
      await page.waitForTimeout(250);checks.push({name:`${label}: mocked API request was intercepted`,passed:apiHits>0,detail:`${apiHits} matching requests`});
      for(const selector of cfg.apiAssertions??[])checks.push({name:`${label}: mocked API selector ${selector} visible`,passed:await page.locator(selector).isVisible().catch(()=>false)});
     }
     if(suite==='observability'){
      const events=await page.evaluate(()=>((window as any).__SAPLING_QUALITY_EVENTS__??[]).length);
      checks.push({name:`${label}: diagnostics initialized`,passed:events>0,detail:`events: ${events}`});
     }
     if(suite==='memory'){
      if(engineName!=='chromium')continue;
      const startHeap=await gatherMemory(page),iterations=cfg.memory?.iterations??5;
      for(let i=0;i<iterations;i++)await page.reload({waitUntil:'domcontentloaded'});
      const endHeap=await gatherMemory(page),growthMb=(endHeap-startHeap)/1048576;
      if(Number.isFinite(growthMb)){
       measured['heap.growthMb']=Math.max(measured['heap.growthMb']??0,growthMb);
       checks.push({name:`${label}: heap growth <= ${cfg.memory?.maxHeapGrowthMb??10} MB`,passed:growthMb<=(cfg.memory?.maxHeapGrowthMb??10),detail:`${growthMb.toFixed(2)} MB`});
      }
     }
     checks.push({name:`${label}: no uncaught page errors`,passed:pageErrors.length===0,detail:pageErrors.join('; ').slice(0,500)});
    }
    await context.close();
   }
  }finally{await browser.close();}
 }
 if(suite==='rendering'&&!instrumented)return skipped(id,'React Profiler','Wrap a React subtree with SaplingProfiler to supply instrumentation for rendering assertions');
 if(suite==='memory'&&!Object.hasOwn(measured,'heap.growthMb'))return skipped(id,'Chrome CDP','Chrome heap usage unavailable; enable precise-memory-info or a supported Chromium version');
 if(suite==='security'&&cfg.security?.semgrep){const scan=await execFileSafe('semgrep',['scan','--config','auto','--error','.'],{timeoutMs:ctx.config.safety?.timeoutMs??300000});checks.push({name:'Semgrep source scan',passed:scan.code===0,detail:`exit ${scan.code}`});}
 checks.push(...thresholdChecks(ctx,measured));
 return result(id,'Playwright / axe-core / Chrome CDP',started,checks.every(c=>c.passed)?'passed':'failed',`Ran ${suite} across ${routes.length} routes`,{checks,metrics:metrics(measured),artifacts});
}
