/** Static UI package architecture and source inventory verification; not browser/native release certification. */
import fs from 'node:fs';import path from 'node:path';
const version=JSON.parse(fs.readFileSync('package.json','utf8')).version;
const packageNames=['ui-core','murphi-ui','murph-appui'];const manifest=packageNames.map(n=>JSON.parse(fs.readFileSync(`packages/${n}/package.json`,'utf8')));
const expected=['@saplings/ui-core','@saplings/murphi-ui','@saplings/murph-appui'];if(manifest.some((m,i)=>m.name!==expected[i]))throw Error('UI package name mismatch');
for(const p of packageNames){for(const child of ['src/core','src/components','src/lib','src/icons','src/stories']){
 // Token-core is platform-independent and intentionally has no rendering component folder.
 if(p==='ui-core')continue;
 if(!fs.existsSync(`packages/${p}/${child}`))throw Error(`Missing Xlox-structured directory ${p}/${child}`);
 }}
const webBase='packages/murphi-ui/src/components';const webDirs=fs.readdirSync(webBase,{withFileTypes:true}).filter(e=>e.isDirectory()).map(e=>e.name);
const webIndex=fs.readFileSync('packages/murphi-ui/src/components/index.ts','utf8');for(const dir of webDirs)if(!webIndex.includes(`./${dir}/index.js`))throw Error('Web component not exported: '+dir);
const nativeSources=fs.readdirSync('packages/murph-appui/src/components').filter(f=>f.endsWith('.tsx')).map(f=>fs.readFileSync(`packages/murph-appui/src/components/${f}`,'utf8')).join('\n');
const native=webDirs.filter(name=>new RegExp(`export\\s+(?:function|const)\\s+${name}\\b`).test(nativeSources));
if(webDirs.length!==39||native.length!==38||webDirs.filter(x=>!native.includes(x)).join(',')!=='Slider')throw Error('Unexpected component inventory/parity drift');
const pure=fs.readdirSync('packages/ui-core/src').filter(f=>f.endsWith('.ts')).map(f=>fs.readFileSync(`packages/ui-core/src/${f}`,'utf8')).join('\n');
if(/from\s+['"](?:react|react-native|react-dom|@emotion\/)/.test(pure)||/\b(?:document|window)\./.test(pure))throw Error('UI core is not platform-independent');
if(/from\s+['"](?:react-dom|@emotion\/)/.test(nativeSources)||/\b(?:document|window|localStorage)\./.test(nativeSources))throw Error('React Native imported web runtime');
if(!fs.readFileSync('apps/web/src/main.tsx','utf8').includes('@saplings/murphi-ui'))throw Error('Web reference app not integrated');
const packageCount=fs.readdirSync('packages',{withFileTypes:true}).filter(e=>e.isDirectory()&&fs.existsSync(`packages/${e.name}/package.json`)).length;
if(packageCount!==24)throw Error('Wrong number of SDK workspaces');
console.log(JSON.stringify({version,packages:packageCount,newPackages:expected,webComponentFolders:webDirs.length,nativeMatchingComponents:native.length,pendingNative:['Slider'],result:'source and package layout verified; live platform evidence remains required'},null,2));
