/** Framework-independent, capabilities-driven Heron transport. No requests on import. */
export class ApiError extends Error {
  constructor(capability, response, body) {
    let data = null;
    try { data = JSON.parse(body); } catch { /* Text errors remain available as body. */ }
    const detail = data?.message || data?.error || body || response.statusText || 'Request failed';
    super(`API ${capability} failed: ${response.status} ${detail}`);
    this.name = 'ApiError';
    this.status = response.status;
    this.capability = capability;
    this.body = body;
    this.data = data;
    this.response = response;
  }
}

export function fillUrl(template, params = {}) {
  return template.replace(/{(\w+)}/g, (_, key) => {
    if (!Object.hasOwn(params, key) || params[key] == null) throw new Error(`Missing param: ${key}`);
    return encodeURIComponent(params[key]);
  });
}

export function buildQuery(params = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') query.append(key, value);
  }
  return query.toString();
}

function browserToken() {
  try { return globalThis.localStorage?.getItem('auth_token') ?? null; }
  catch { return null; }
}

export function createApiClient({
  fetch: transport = (...args) => globalThis.fetch(...args),
  capabilitiesUrl = '/api/config/capabilities',
  baseUrl,
  credentials = 'same-origin',
  getToken = browserToken,
} = {}) {
  let routes = null;
  let pending = null;
  let generation = 0;
  const listeners = new Set();
  const resolveUrl = url => baseUrl ? new URL(url, baseUrl).href : url;

  function notify() {
    for (const listener of listeners) {
      try { listener(routes); }
      catch (error) { globalThis.console?.error('Capability subscriber failed', error); }
    }
  }

  function invalidateCapabilities() {
    generation++;
    routes = null;
    pending = null;
    notify();
  }

  async function loadRoutes(refresh = false) {
    if (refresh) invalidateCapabilities();
    if (routes) return routes;
    if (pending) return pending;
    const started = generation;
    const request = (async () => {
      const headers = new Headers();
      const token = getToken();
      if (token) headers.set('Authorization', `Bearer ${token}`);
      const response = await transport(resolveUrl(capabilitiesUrl), {credentials, cache: 'no-store', headers});
      if (!response.ok) throw new ApiError('capabilities', response, await response.text());
      const list = await response.json();
      if (!Array.isArray(list)) throw new Error('Invalid API capabilities response');
      const next = Object.create(null);
      for (const route of list) {
        if (!route || typeof route.key !== 'string' || !route.key || typeof route.url !== 'string' || !route.url
          || typeof route.method !== 'string' || !/^(GET|HEAD|POST|PUT|PATCH|DELETE|OPTIONS)$/i.test(route.method)) {
          throw new Error('Invalid API capability');
        }
        next[route.key] = Object.freeze({...route, method: route.method.toUpperCase()});
      }
      // A response begun before login/logout must never restore old permissions.
      if (started !== generation) return loadRoutes();
      routes = Object.freeze(next);
      notify();
      return routes;
    })();
    pending = request;
    try { return await request; }
    finally { if (pending === request) pending = null; }
  }

  async function call(name, params = {}, body = null, requestOptions = {}) {
    const mode = requestOptions.responseType ?? 'auto';
    if (!['auto', 'json', 'text', 'blob', 'arrayBuffer', 'response'].includes(mode)) {
      throw new Error(`Unknown response type: ${mode}`);
    }
    const available = await loadRoutes();
    let route = Object.hasOwn(available, name) ? available[name] : null;
    if (!route) {
      // Concurrent missing-capability calls share the same refresh.
      const refreshed = await loadRoutes(routes === available);
      route = Object.hasOwn(refreshed, name) ? refreshed[name] : null;
    }
    if (!route) throw new Error(`Unknown API function: ${name}`);
    let url = fillUrl(route.url, params);
    if (route.method === 'GET' || route.method === 'HEAD') {
      const pathKeys = new Set([...route.url.matchAll(/{(\w+)}/g)].map(match => match[1]));
      const query = buildQuery(Object.fromEntries(Object.entries(params).filter(([key]) => !pathKeys.has(key))));
      if (query) url += `${url.includes('?') ? '&' : '?'}${query}`;
    }
    const headers = new Headers(requestOptions.headers);
    if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    if (route.auth) {
      const token = getToken();
      if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
    }
    const options = {method: route.method, headers, credentials, signal: requestOptions.signal, cache: 'no-store'};
    if (body !== null && body !== undefined && !['GET', 'HEAD'].includes(route.method)) {
      if (body instanceof URLSearchParams) {
        headers.set('Content-Type', 'application/x-www-form-urlencoded');
        options.body = body.toString();
      } else if (typeof FormData !== 'undefined' && body instanceof FormData) {
        headers.delete('Content-Type');
        options.body = body;
      } else {
        options.body = JSON.stringify(body);
      }
    }
    const response = await transport(resolveUrl(url), options);
    if (!response.ok) throw new ApiError(name, response, await response.text());
    if (name === 'login' || name === 'logout') invalidateCapabilities();
    if (mode === 'response') return response;
    if ([204, 205].includes(response.status) || route.method === 'HEAD') return null;
    switch (mode) {
      case 'blob': return response.blob();
      case 'arrayBuffer': return response.arrayBuffer();
      case 'text': return response.text();
      case 'json': return response.json();
      case 'auto': {
        const contentType = response.headers.get('content-type') ?? '';
        return /(?:\/json|\+json)(?:\s*;|$)/i.test(contentType) ? response.json() : response.text();
      }
      default: throw new Error(`Unknown response type: ${mode}`);
    }
  }

  function subscribeCapabilities(listener) {
    listeners.add(listener);
    listener(routes);
    return () => listeners.delete(listener);
  }

  return Object.freeze({
    call, loadRoutes, invalidateCapabilities, subscribeCapabilities,
    refreshCapabilities: () => loadRoutes(true),
    has: async name => Object.hasOwn(await loadRoutes(), name),
  });
}

/** Browser-app singleton; use a factory instance for each server request or account. */
export const api = createApiClient();
export const apiCall = api.call;
export const loadRoutes = api.loadRoutes;
