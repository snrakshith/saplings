import express from 'express';
import {createSapling,SaplingError} from '@sapling/sdk';
import devConfig from '../sapling.config.js';
import {pathToFileURL} from 'node:url';
const configPath=process.env.SAPLING_CONFIG_PATH;
if(process.env.NODE_ENV==='production'&&!configPath)throw Error('SAPLING_CONFIG_PATH required in production');
const configModule=configPath?await import(pathToFileURL(configPath).href):undefined;
const config=configModule?.default??devConfig;
if(process.env.NODE_ENV==='production'&&config.app.environment!=='production')throw Error('Production config required');
const app=express();const sapling=createSapling(config);
app.disable('x-powered-by');app.use(sapling.defender.preflight());app.use(express.json({limit:'100kb'}));
app.use(sapling.middleware());
app.use(...sapling.httpMiddleware());
app.get('/events/:channel',(req,res)=>{if(!sapling.realtime){res.sendStatus(404);return;}void sapling.realtime.sse(req,res,req.params.channel);});
app.get('/health',(_req,res)=>res.json(sapling.health()));
app.get('/ready',async(_req,res)=>{const result=await sapling.readiness();res.status(result.status==='ready'?200:503).json(result);});
app.post('/projects',async(req,res,next)=>{
 try {
  const ctx=req.sapling && {tenantId:req.sapling.tenantId!,actorId:req.sapling.userId!,impersonatorId:req.sapling.impersonatorId,roles:req.sapling.roles,permissions:req.sapling.permissions};
  if(!ctx)return res.status(401).json({error:'Unauthorized'});
  const result=await sapling.projects.create(ctx,{name:String(req.body.name??'Untitled')});res.status(201).json(result);
 }catch(e){next(e);}
});
app.use((error:unknown,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{
 const err=error instanceof SaplingError?error:new SaplingError('INTERNAL_ERROR','Unexpected error',500);
 res.status(err.statusCode).json({error:{code:err.code,message:err.message}});
});
const server=app.listen(Number(process.env.PORT??3000),()=>console.log('Sapling Express listening'));
let closing=false;for(const sig of ['SIGTERM','SIGINT'] as const)process.once(sig,()=>{if(closing)return;closing=true;void sapling.lifecycle.close();void sapling.closeRealtime();server.close(()=>{void Promise.resolve(configModule?.close?.()).then(()=>process.exit(0),()=>process.exit(1));});setTimeout(()=>process.exit(1),15000).unref();});
