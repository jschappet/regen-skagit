import { api, apiCall, loadRoutes } from './heron-client.mjs';

/* =========================
Alpine Integration
========================= */

document.addEventListener("alpine:init", () => {

  Alpine.store("api", api);

  Alpine.store("member", {

    inflows: [],
    outflows: [],
    entities: {},
    content: [],

    loading: false,

    async loadFlows() {

      const flows = await Alpine
        .store("api")
        .call("member_flows");

      this.inflows = flows.inflows ?? [];
      this.outflows = flows.outflows ?? [];

      this.entities = Object.fromEntries(
        (flows.entities ?? []).map(e => [e.id, e])
      );

    },

    async loadContent() {

      const data = await Alpine
        .store("api")
        .call("member_content");

      this.content = data.draft_list ?? [];

    },
    async loadAll() {

      if (this.loading || this.inflows.length || this.content.length) return;

      this.loading = true;

      await Promise.all([
        this.loadFlows(),
        this.loadContent()
      ]);

      this.loading = false;

    },

    get groupedContent() {

      return this.content.reduce((acc, item) => {

        acc[item.doc_type] ??= [];
        acc[item.doc_type].push(item);

        return acc;

      }, {});

    }

  });


  Alpine.store("profileEditor", {

    form: {},
    saving: false,
    message: "",

    start(user) {
      console.log("User: ", user);
      this.form = JSON.parse(JSON.stringify(user));
      this.message = "";

    },

    async save() {

      this.saving = true;

      try {

        const result = await Alpine
          .store("api")
          .call("update_member_profile", {}, {user_details: this.form});

        Alpine.store("auth").user = result.user;

        this.message = "Profile saved";

      } catch (e) {

        console.error(e);
        this.message = "Error saving profile";

      }

      this.saving = false;

    }

  });

  Alpine.store("auth", {
    loaded: false,
    loading: false,
    user: null,
    authenticated: false,
    roles: [],

    hasRole(roleName) {
      console.log("Checking role:", roleName, "in", this.roles);
      return this.roles?.includes(roleName);
    },

    async load() {
      console.log("Loading auth Profile...")
      if (this.loaded || this.loading) return;

      this.loading = true;

      try {
        console.log("Loading profile…");

        const data = await Alpine.store("api").call("profile_json");
        console.log("Data: ", data);

        this.user = data.user;
        this.authenticated = data.authenticated;
        this.roles = data.roles ?? [];
        //console.log("User: ", this.user);
      } catch (e) {
        //console.warn("Auth load failed:", e);
        this.user = null;
        this.authenticated = false;
        this.roles = [];
      } finally {
        this.loaded = true;
        this.loading = false;
      }
    }


  });
  let memberLoaded = false;

  Alpine.effect(() => {

    const auth = Alpine.store("auth");

    if (auth.loaded && auth.authenticated && !memberLoaded) {
      memberLoaded = true;
      Alpine.store("member").loadAll();
    }

  });

});

/* =========================
Preload capabilities early
========================= */

document.addEventListener("DOMContentLoaded", () => {
  loadRoutes().catch(err =>
    console.error("Failed to preload capabilities:", err)
  );
});

window.loadRoutes = loadRoutes;
