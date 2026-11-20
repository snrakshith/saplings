import {afterEach, describe, expect, test, vi} from 'vitest';
import {createHmac} from 'node:crypto';
import {CashfreeAdapter, resolveSaplingConfig} from '@saplings/sdk';
import {parseVitestReport} from '../packages/backend-quality/dist/engines/vitest-runner.js';

const app={id:'vitest-migration',environment:'test'};
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});

describe('v0.16.0 Vitest-native tests',()=>{
  test.each([
    ['cashfree','cashfree'],
    ['razorpay','razorpay'],
    ['stripe','stripe'],
  ])('typed gateway selection: %s',(_name,selected)=>{
    expect(resolveSaplingConfig({app,payments:{provider:selected}}).payments.provider).toBe(selected);
  });

  test('spy-on mocked Cashfree POST preserves paise and stable IDs',async()=>{
    const fake=vi.fn(async (_url,init)=>{
      const request=JSON.parse(init.body);
      return Response.json({...request,order_status:'ACTIVE',payment_session_id:'session_approved'});
    });
    vi.stubGlobal('fetch',fake);
    const a=new CashfreeAdapter({clientId:'test-client',clientSecret:'test-secret',
      customer:({tenantId})=>({id:tenantId,phone:'9999999999'})});
    const result=await a.createOrder({tenantId:'tenant-one',amountMinor:1250,currency:'INR',
      reference:'ref',idempotencyKey:'immutable-key'});
    expect(result.provider).toBe('cashfree');
    expect(result.checkoutSessionId).toBe('session_approved');
    expect(fake).toHaveBeenCalledOnce();
    const request=JSON.parse(fake.mock.calls[0][1].body);
    expect(request.order_amount).toBe(12.5);
    expect(request.customer_details.customer_id).toBe('tenant-one');
  });

  test('frozen time: webhook signature expiry fails closed',()=>{
    vi.useFakeTimers();vi.setSystemTime(new Date('2026-11-19T00:00:00Z'));
    const adapter=new CashfreeAdapter({clientId:'a',clientSecret:'test-secret',
      customer:()=>({id:'u',phone:'9999999999'}),webhookMaxAgeMs:60_000});
    const raw='{"event":"safe"}',timestamp=String(Date.now());
    const signature=createHmac('sha256','test-secret').update(timestamp+raw).digest('base64');
    expect(adapter.verifyWebhook(raw,timestamp,signature)).toBe(true);
    vi.advanceTimersByTime(61_000);
    expect(adapter.verifyWebhook(raw,timestamp,signature)).toBe(false);
    expect(adapter.verifyWebhook(raw+' ',timestamp,signature,Number(timestamp))).toBe(false);
  });

  test.each([
    [{success:true,numTotalTests:1,numPassedTests:1,numFailedTests:0,numPendingTests:0,numTodoTests:0,testResults:[{status:'passed',assertionResults:[{status:'passed'}]}]},0,true],
    [{success:true,numTotalTests:1,numPassedTests:0,numFailedTests:0,numPendingTests:1,numTodoTests:0,testResults:[{status:'passed',assertionResults:[{status:'pending'}]}]},0,false],
    [{success:false,numTotalTests:1,numPassedTests:0,numFailedTests:1,numPendingTests:0,numTodoTests:0,testResults:[{status:'failed',assertionResults:[{status:'failed'}]}]},1,false],
    [{success:true,numTotalTests:0,numPassedTests:0,numFailedTests:0,numPendingTests:0,numTodoTests:0,testResults:[]},0,false],
    [null,0,false],
  ])('quality reporter never counts skip, failure, zero or missing as pass', (report,code,valid)=>{
    expect(parseVitestReport(report,code).failures.length===0).toBe(valid);
  });
});
