import { ROUTES } from "./api-routes.js";

function fillUrl(template, params = {}) {
  return template.replace(/{(\w+)}/g, (_, key) => {
    if (!(key in params)) {
      throw new Error(`Missing param: ${key}`);
    }
    return encodeURIComponent(params[key]);
  });
}


async function apiCall(fnName, params = {}, body = null) {
  const route = ROUTES[fnName];
  if (!route) throw new Error(`Unknown API function: ${fnName}`);

  const url = fillUrl(route.url, params);

  const headers = {
    "Content-Type": "application/json",
  };

  if (route.auth) {
    const token = localStorage.getItem("auth_token");
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const options = {
    method: route.method,
    headers,
  };

  if (body && route.method !== "GET") {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(url, options);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${fnName} failed: ${res.status} ${text}`);
  }

  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : res.text();
}




document.addEventListener("alpine:init", () => {
  Alpine.store("api", {
    async call(fnName, params = {}, body = null) {
      console.log("Calling: ", fnName);
      return apiCall(fnName, params, body);
    }
  });

  Alpine.store('auth', {
    loaded: false,
    loading: false,
    user: null,
    authenticated: false,
    roles: [],


    async load() {
      if (this.loaded) return;

      try {
        console.log("Loading Profile...");
        const data = await Alpine.store("api").call("profile_json");
        this.user = data.user;
        this.authenticated = data.authenticated;
        this.roles = data.roles ?? [];
                

      } catch (e) {
        console.log("error: ", e);
        this.user = null;
        this.authenticated = false;
        this.roles = [];

      } finally {
        this.loaded = true;
      }
    }
  });
});

