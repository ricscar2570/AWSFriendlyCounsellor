import { loadSettings } from './config.js';

const TOKENS='awsfc.tokens.v1', PKCE='awsfc.pkce.v1';
const enc = new TextEncoder();
const b64url = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
function randomString(n=64){ const a=new Uint8Array(n);crypto.getRandomValues(a);return b64url(a); }
async function sha256(text){ return crypto.subtle.digest('SHA-256',enc.encode(text)); }
function loadTokens(){ try{return JSON.parse(sessionStorage.getItem(TOKENS)||'null')}catch{return null} }
function saveTokens(t){ sessionStorage.setItem(TOKENS,JSON.stringify(t)); }

async function exchangeToken(params) {
  const s=loadSettings();
  const r=await fetch(`${s.cognitoDomain}/oauth2/token`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(params)});
  const data=await r.json().catch(()=>({})); if(!r.ok) throw new Error(data.error_description||data.error||`Token exchange failed (${r.status})`);
  const old=loadTokens()||{}; const issued=Date.now();
  const t={...old,...data,issued_at:issued,expires_at:issued+(Number(data.expires_in||3600)*1000)}; saveTokens(t); return t;
}

export async function beginLogin() {
  const s=loadSettings();
  if(!s.cognitoDomain||!s.cognitoClientId) throw new Error('Configure Cognito domain and client ID first.');
  const verifier=randomString(48), challenge=b64url(await sha256(verifier)), state=randomString(20);
  sessionStorage.setItem(PKCE,JSON.stringify({verifier,state,created_at:Date.now()}));
  const q=new URLSearchParams({client_id:s.cognitoClientId,response_type:'code',scope:s.cognitoScopes,redirect_uri:s.redirectUri,state,code_challenge_method:'S256',code_challenge:challenge});
  location.assign(`${s.cognitoDomain}/oauth2/authorize?${q}`);
}

export async function handleCallback() {
  const s=loadSettings(); if(s.authMode!=='cognito') return false;
  const q=new URLSearchParams(location.search); const oauthError=q.get('error');if(oauthError)throw new Error(q.get('error_description')||oauthError);const code=q.get('code'); if(!code) return false;
  const state=q.get('state'); let p={}; try{p=JSON.parse(sessionStorage.getItem(PKCE)||'{}')}catch{}
  if(!p.verifier||!p.state||state!==p.state) throw new Error('Login state validation failed.');
  if(!p.created_at || Date.now()-Number(p.created_at)>10*60*1000){sessionStorage.removeItem(PKCE);throw new Error('Login request expired. Start sign-in again.');}
  await exchangeToken({grant_type:'authorization_code',client_id:s.cognitoClientId,code,redirect_uri:s.redirectUri,code_verifier:p.verifier});
  sessionStorage.removeItem(PKCE); history.replaceState({},'',location.pathname+'#/dashboard'); return true;
}

async function refresh() {
  const s=loadSettings(), t=loadTokens(); if(!t?.refresh_token) return null;
  return exchangeToken({grant_type:'refresh_token',client_id:s.cognitoClientId,refresh_token:t.refresh_token});
}

export async function getBearerToken() {
  const s=loadSettings(); if(s.authMode!=='cognito') return '';
  let t=loadTokens(); if(!t) return '';
  if((t.expires_at||0) < Date.now()+60000) t=await refresh().catch(()=>null);
  return t?.id_token || t?.access_token || '';
}
export function isSignedIn(){ const s=loadSettings(); return s.authMode==='demo'||s.authMode==='local'||!!loadTokens(); }
export function clearTokens(){ sessionStorage.removeItem(TOKENS); sessionStorage.removeItem(PKCE); }
export function logout(){ const s=loadSettings();clearTokens(); if(s.authMode==='cognito'&&s.cognitoDomain&&s.cognitoClientId){const q=new URLSearchParams({client_id:s.cognitoClientId,logout_uri:s.logoutUri}); location.assign(`${s.cognitoDomain}/logout?${q}`)} else location.hash='#/'; }
