import {pathToFileURL} from 'node:url';
import {createSapling,type ActorContext} from '@sapling/sdk';
const path=process.env.SAPLING_CONFIG_PATH;
if(!path)throw Error('SAPLING_CONFIG_PATH required; supply trusted worker configuration');
const config=await import(pathToFileURL(path).href);
if(config.default.app.environment!=='production'||typeof config.workerTenants!=='function')throw Error('Production config and trusted workerTenants function required');
const sdk=createSapling(config.default),controller=new AbortController();
const close=()=>controller.abort();process.once('SIGTERM',close);process.once('SIGINT',close);
try{if((await sdk.readiness()).status!=='ready')throw Error('Worker dependencies not ready');await sdk.worker.run(async()=>{const tenants:ActorContext[]=await config.workerTenants();if(!Array.isArray(tenants)||tenants.length>10000||tenants.some(c=>!c.tenantId||!c.actorId||c.tenantId.startsWith('__sapling_')))throw Error('Invalid tenant registry');return tenants;},controller.signal);}finally{await sdk.lifecycle.close();await config.close?.();}
