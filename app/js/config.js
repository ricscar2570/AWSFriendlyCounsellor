const KEY = 'awsfc.settings.v1';
const base = window.AWSFC_CONFIG || {};

function cleanUrl(v='') { return String(v).trim().replace(/\/+$/,''); }
function getDefaultRedirect() { return location.origin + location.pathname; }

export function loadSettings() {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (_) {}
  return {
    webVersion: base.webVersion || 'M5-A2',
    apiBaseUrl: cleanUrl(saved.apiBaseUrl ?? base.apiBaseUrl ?? ''),
    authMode: saved.authMode ?? base.authMode ?? 'standalone',
    tenantId: saved.tenantId ?? base.tenantId ?? '',
    cognitoDomain: cleanUrl(saved.cognitoDomain ?? base.cognitoDomain ?? ''),
    cognitoClientId: saved.cognitoClientId ?? base.cognitoClientId ?? '',
    cognitoScopes: saved.cognitoScopes ?? base.cognitoScopes ?? 'openid email profile',
    redirectUri: saved.redirectUri || getDefaultRedirect(),
    logoutUri: saved.logoutUri || getDefaultRedirect(),
    localSubject: saved.localSubject ?? base.localSubject ?? 'local-owner',
    localUsername: saved.localUsername ?? base.localUsername ?? 'Local Owner'
  };
}

export function saveSettings(next) {
  const copy = {...next, apiBaseUrl: cleanUrl(next.apiBaseUrl), cognitoDomain: cleanUrl(next.cognitoDomain)};
  localStorage.setItem(KEY, JSON.stringify(copy));
  return copy;
}

export function resetSettings() { localStorage.removeItem(KEY); }
export function setTenantId(id) { const s=loadSettings(); s.tenantId=id||''; saveSettings(s); return s; }
