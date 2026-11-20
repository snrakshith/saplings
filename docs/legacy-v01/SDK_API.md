# SDK API reference (v0.1.0)

```ts
const sdk = createSapling(config);
sdk.middleware(); // Express compatible async middleware
sdk.getCapability('SAAS-001'); sdk.listCapabilities();
sdk.projects.create(ctx, {name: 'Example'});
sdk.projects.get(ctx, id);
sdk.projects.list(ctx, {limit: 20, offset: 0});
sdk.projects.update(ctx, id, {name: 'Updated'});
sdk.projects.delete(ctx, id);
sdk.access.setRole(ctx, 'editor', ['projects:read','projects:write']);
sdk.access.addRule(async (ctx, permission, resource) => true);
sdk.authorize(ctx, 'projects:write');
sdk.identity.createApiKey(ctx, {name:'automation', scopes:['projects:read'],ttlDays:30});
sdk.identity.verifyApiKey(verifiedTenantId, secret);
sdk.identity.revokeApiKey(ctx, keyId);
sdk.billing.setQuota(ctx, 'api', 1000);
sdk.billing.meter(ctx, 'api', 1);
sdk.billing.getUsage(ctx, 'api');
sdk.flags.set(ctx, {key:'beta',enabled:true,rollout:50,variants:{A:50,B:50}});
sdk.flags.evaluate(ctx, 'beta', userId);
sdk.storage.upload(ctx, {key:'docs/invoice.pdf',data:new Uint8Array()});
sdk.storage.download(ctx, 'docs/invoice.pdf');
sdk.storage.list(ctx);
sdk.audit.record(ctx, 'user.invited', 'invites', inviteId);
sdk.audit.list(ctx);
sdk.jobs.register('send-email', async (ctx,payload)=>{});
sdk.jobs.enqueue(ctx, 'send-email', {to:'user@example.com'}, {idempotencyKey:'foo'});
sdk.jobs.workNext(ctx); // explicit worker polling
sdk.events.on('invoice.created', async event=>{});
sdk.events.emit(ctx, 'invoice.created', {id:'inv-1'});
sdk.webhooks.sign(rawBody,secret);
sdk.webhooks.verify(rawBody,secret,timestamp,signature);
sdk.notifications.send(ctx,{channel:'email',to:'user@example.com',body:'Hello'});
sdk.payments.createOrder(ctx,{amountMinor:100,currency:'INR',reference:'order-1'});
sdk.exportTenantData(ctx,['projects','teams']);
sdk.scan('.', 'https://your-owned-app.example', ['your-owned-app.example']);
sdk.health();sdk.readiness();
```

The `ActorContext` must come from authenticated server-side identity. For fine-grained security, pass resource attributes to `authorize` and define ABAC callback rules. Register provider adapters in `config.providers`; notification/payment calls throw `NOT_CONFIGURED` if no provider exists.

Type declaration files are emitted under each package's `dist/` folder. See source for complete signatures and typed config sections.

## Universal capability extension contract

All **182** catalog IDs can be wired to a provider from the same config file. This is a real adapter dispatch interface, **not** 182 production feature implementations.

```ts
const config = defineSaplingConfig({
  app: { id: 'saas-app', environment: 'development' },
  features: { 'SAAS-010': { enabled: true, provider: 'identityos', options: {region:'in'} } },
  providers: {
    capabilities: {
      'SAAS-010': {
        async execute({ctx,featureId,action,input,options}) {
          // Call your validated IdentityOS integration with trusted actor/tenant scope.
          return {featureId,action,tenantId:ctx.tenantId,options};
        }
      }
    }
  }
});
const sdk = createSapling(config);
await sdk.capabilities.invoke(adminContext, 'SAAS-010', 'enroll', {method:'totp'});
```

The dispatcher rejects disabled or unregistered features, and uses `capabilities:execute` authorization. Each adapter must enforce its own operation-level permission checks and data safety. Client-provided strings are not a substitute for verified authentication.
