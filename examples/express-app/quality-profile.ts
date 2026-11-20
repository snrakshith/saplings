import type {BackendQualityConfig} from '@sapling/sdk';
/** All 15 categories available in one package. Full profile only for dedicated staging. */
export function backendQualityProfile():BackendQualityConfig {
 const origin=process.env.QUALITY_ORIGIN??'http://127.0.0.1:3000';const environment=process.env.QUALITY_STAGING==='yes'?'staging':'local';const namespace=process.env.QUALITY_NAMESPACE??'sapling-quality';const deployment=process.env.QUALITY_DEPLOYMENT??'sapling-api';const path=process.env.QUALITY_HEALTH_PATH??'/health';
 const base={target:'api',probes:[{path,statuses:[200]}],thresholds:{maxP95Ms:250,maxErrorRate:0}};
 return {environment,allowedOrigins:[origin],targets:{api:origin},allowedNamespaces:[namespace],allowedDeployments:[deployment],allowDisruptive:environment==='staging',maxConcurrency:100,maxDurationSeconds:7200,outputDir:'quality-results',suites:[
 {...base,id:'performance',category:'performance',engine:'native',requests:100},
 {...base,id:'load',category:'load',engine:'k6',stages:[{concurrency:10,seconds:60},{concurrency:30,seconds:300}]},
 {...base,id:'stress',category:'stress',engine:'k6',stages:[{concurrency:25,seconds:60},{concurrency:100,seconds:120}]},
 {...base,id:'spike',category:'spike',engine:'k6',stages:[{concurrency:5,seconds:30},{concurrency:80,seconds:10},{concurrency:80,seconds:60},{concurrency:5,seconds:30}]},
 {...base,id:'soak',category:'soak',engine:'k6',stages:[{concurrency:20,seconds:3600}]},
 {id:'scalability',category:'scalability',engine:'kubectl',namespace,deployment,replicas:3},
 {...base,id:'security',category:'security',engine:'zap'},
 {...base,id:'concurrency',category:'concurrency',engine:'native',concurrency:32,requests:500},
 {id:'resilience',category:'resilience',engine:'toxiproxy',script:'packages/backend-quality/examples/toxiproxy.test.mjs'},
 {id:'recovery',category:'recovery',engine:'testcontainers',script:'packages/backend-quality/examples/postgres-recovery.test.mjs'},
 {...base,id:'observability',category:'observability',engine:'node-test',script:'packages/backend-quality/examples/observability.test.mjs'},
 {...base,id:'contract',category:'contract',engine:'schemathesis',script:'packages/backend-quality/examples/openapi.json'},
 {id:'chaos',category:'chaos',engine:'chaos-mesh',namespace,script:'packages/backend-quality/examples/chaos.test.mjs',target:'api'},
 {id:'disaster-recovery',category:'disaster-recovery',engine:'node-test',script:'packages/backend-quality/examples/restore.test.mjs'},
 {id:'kubernetes',category:'kubernetes',engine:'kubectl',namespace,deployment}
 ]};
}
