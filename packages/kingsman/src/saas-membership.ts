import type {SaasActorContext,SaasStore} from './saas-foundation.js';
import {fail,text} from './saas-foundation.js';
/** Identity-owned membership proof. This checks existing SDK membership records, not arbitrary client tenant claims. */
export class KingsmanMembership {
 constructor(private store:SaasStore){}
 async switchOrganization(ctx:SaasActorContext,membershipId:unknown){
  const id=text(membershipId,'membershipId',200);
  if(!ctx.actorId||!ctx.tenantId)return fail('Verified identity context required','FORBIDDEN',403);
  const r=await this.store.get<{id:string;userId:string;status:string;organizationId:string}>(ctx.tenantId,'memberships',id);
  if(!r||r.userId!==ctx.actorId||r.status!=='active'||typeof r.organizationId!=='string'||!r.organizationId)return fail('Membership required','FORBIDDEN',403);
  return {organizationId:r.organizationId,tenantId:ctx.tenantId};
 }
}
