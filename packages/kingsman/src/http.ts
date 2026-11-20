import type {IncomingMessage,ServerResponse} from 'node:http';
import {IdentityError} from './config.js';import type {IdentityPlatform} from './index.js';
/** OIDC-compatible core endpoints. UI/auth cookie lifecycle is application-owned. */
export function createIdentityHttpHandler(identity:IdentityPlatform,settings:{authenticateBrowser?:(req:IncomingMessage)=>Promise<string|undefined>}={}){
 const root=new URL(identity.issuer).pathname,oidc=root+'/protocol/openid-connect';
 return async(req:IncomingMessage,res:ServerResponse)=>{res.setHeader('cache-control','no-store');res.setHeader('x-content-type-options','nosniff');const url=new URL(req.url??'/',identity.issuer);const write=(status:number,data:unknown)=>{res.statusCode=status;res.setHeader('content-type','application/json; charset=utf-8');res.end(JSON.stringify(data));};
 try{
 if(req.method==='GET'&&url.pathname===root+'/.well-known/openid-configuration'){write(200,identity.discovery());return;}
 if(req.method==='GET'&&url.pathname===oidc+'/certs'){write(200,identity.jwks());return;}
 if(req.method==='GET'&&url.pathname===oidc+'/auth'){
  const auth=settings.authenticateBrowser??identity.deps.authenticateBrowser;if(!auth)throw new IdentityError('LOGIN_REQUIRED','Browser login integration required',401);const sid=await auth(req);if(!sid)throw new IdentityError('LOGIN_REQUIRED','Browser session required',401);
  if(url.searchParams.get('response_type')!=='code'||url.searchParams.get('code_challenge_method')!=='S256')throw new IdentityError('INVALID_REQUEST','Authorization Code + PKCE S256 required');
  const clientId=url.searchParams.get('client_id')??'',redirectUri=url.searchParams.get('redirect_uri')??'',codeChallenge=url.searchParams.get('code_challenge')??'',state=url.searchParams.get('state')??'';
  const result=await identity.authorizeCode({sessionId:sid,clientId,redirectUri,codeChallenge,state,scope:url.searchParams.get('scope')??'openid',nonce:url.searchParams.get('nonce')??undefined});const redirect=new URL(redirectUri);redirect.searchParams.set('code',result.code);redirect.searchParams.set('state',result.state);res.statusCode=302;res.setHeader('location',redirect.href);res.end();return;
 }
 if(req.method==='GET'&&url.pathname===oidc+'/userinfo'){
  const bearer=req.headers.authorization;if(typeof bearer!=='string'||!/^Bearer \S+$/.test(bearer))throw new IdentityError('INVALID_TOKEN','Bearer token required',401);const p=await identity.verifyAccessToken(bearer.slice(7));const u=await identity.store.get<{username:string;email:string;emailVerified:boolean}>(identity.realm,'users',p.sub);write(200,{sub:p.sub,preferred_username:u?.username,email:u?.email,email_verified:u?.emailVerified});return;
 }
 if(req.method==='POST'&&[oidc+'/token',oidc+'/revoke',oidc+'/introspect'].includes(url.pathname)){
  if(!(req.headers['content-type']??'').toString().startsWith('application/x-www-form-urlencoded'))throw new IdentityError('INVALID_REQUEST','Form URL encoding required',415);
  const chunks:Buffer[]=[];let total=0;for await(const part of req){const b=Buffer.from(part);total+=b.length;if(total>16384)throw new IdentityError('REQUEST_TOO_LARGE','Token request too large',413);chunks.push(b);}const params=new URLSearchParams(Buffer.concat(chunks).toString('utf8')),grant=params.get('grant_type'),clientId=params.get('client_id')??'',clientSecret=params.get('client_secret')??undefined;
  if(url.pathname===oidc+'/revoke'){write(200,await identity.revokeToken({clientId,clientSecret,token:params.get('token')??''}));return;}
  if(url.pathname===oidc+'/introspect'){write(200,await identity.introspectToken({clientId,clientSecret,token:params.get('token')??''}));return;}

  if(grant==='authorization_code'){write(200,await identity.exchangeCode({clientId,clientSecret,code:params.get('code')??'',redirectUri:params.get('redirect_uri')??'',codeVerifier:params.get('code_verifier')??''}));return;}
  if(grant==='refresh_token'){write(200,await identity.refresh({clientId,clientSecret,refreshToken:params.get('refresh_token')??''}));return;}
  if(grant==='client_credentials'){write(200,await identity.clientCredentials({clientId,clientSecret:clientSecret??'',scope:params.get('scope')??undefined}));return;}
  throw new IdentityError('UNSUPPORTED_GRANT','Only authorization_code, refresh_token and client_credentials supported',400);
 }
 write(404,{error:'not_found'});
 }catch(error){const e=error instanceof IdentityError?error:new IdentityError('SERVER_ERROR','Identity request failed',500);write(e.status,{error:e.code});}
 };
}
