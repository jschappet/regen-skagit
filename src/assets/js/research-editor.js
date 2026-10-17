/* Dedicated editors still use the existing draft approval workflow. */
function researchEditor(kind) {
  return {
    kind, id: null, doc: {meta: {}}, original: {}, experiments: [], loading: true, busy: false,
    error: '', message: '', ready: false, needsAccess: false,
    async init() {
      try {
        const params = new URLSearchParams(location.search);
        this.id = params.get('id');
        this.doc = { title: '', description: '', author: '', body_md: '', meta: {
          [kind === 'experiment' ? 'experiment_id' : 'result_id']: `${kind === 'experiment' ? 'exp' : 'res'}-${crypto.randomUUID()}`,
          experiment_status: 'planned', outcome: 'inconclusive', images: [],
        }};
        if (this.id) {
          const data = await Alpine.store('api').call('draft_get', {id: this.id});
          if (data.doc_type !== kind) throw new Error('This draft belongs to a different content type. Open it from the content list.');
          this.original = data;
          this.doc = {...data, meta: {...(data.meta || {})}};
          const key = kind === 'experiment' ? 'experiment_id' : 'result_id';
          this.doc.meta[key] ||= `${kind === 'experiment' ? 'exp' : 'res'}-${crypto.randomUUID()}`;
          this.doc.meta.observed_date ||= this.doc.meta.date?.slice(0, 10) || '';
          this.doc.meta.summary ||= data.description || '';
          this.doc.meta.experiment_status ||= 'planned';
          this.doc.meta.outcome ||= 'inconclusive';
        }
        if (kind === 'results') {
          const response = await fetch('/experiments/catalog.json');
          if (!response.ok) throw new Error('Unable to load published experiments. Please reload before saving.');
          const published = await response.json();
          const drafts = await Alpine.store('api').call('draft_list', {docType: 'experiment'});
          const options = new Map(published.map(e => [e.experiment_id, {...e, label: e.title}]));
          for (const draft of drafts.drafts || []) {
            const id = draft.meta?.experiment_id;
            if (id && !options.has(id)) options.set(id, {experiment_id: id, label: `${draft.title} (draft — publish first)`});
          }
          this.experiments = [...options.values()];
          const parent = params.get('experiment_id');
          if (!this.id && parent && options.has(parent)) this.doc.meta.experiment_id = parent;
          // Preserve links to experiments the current member cannot see in their draft list.
          if (this.doc.meta.experiment_id && !options.has(this.doc.meta.experiment_id)) {
            this.experiments.push({experiment_id: this.doc.meta.experiment_id, label: `${this.doc.meta.experiment_id} (existing link — verify before publication)`});
          }
        }
        this.ready = true;
      } catch (error) { this.showError(error, 'Unable to load this draft.'); }
      finally { this.loading = false; }
    },
    showError(error, fallback) {
      this.needsAccess = error.status === 401 || error.status === 403 || /Unknown API function: draft_/.test(error.message || '');
      this.error = this.needsAccess
        ? 'Draft editing is unavailable in this session. Sign in with content-editing access, then reload this page. If you are already signed in, check that the updated backend is running.'
        : error.message || fallback;
    },
    validate(submit) {
      if (!this.doc.title?.trim()) throw new Error('Add a title before saving.');
      if (submit) {
        if (!this.doc.body_md?.trim()) throw new Error('Add your notes before submitting.');
        if (this.kind === 'experiment' && !this.doc.meta.question?.trim()) throw new Error('Add the question this experiment will test.');
        if (this.kind === 'results') {
          if (!this.doc.meta.experiment_id) throw new Error('Choose the experiment this result belongs to.');
          if (!this.doc.meta.observed_date) throw new Error('Add an observation date.');
          if (!this.doc.meta.summary?.trim()) throw new Error('Add a short summary of the findings.');
        }
      }
      for (const key of ['experiment_id', 'result_id']) {
        if (this.doc.meta[key] && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(this.doc.meta[key])) throw new Error(`${key} must use lowercase letters, numbers, and hyphens.`);
      }
      if (this.kind === 'experiment' && this.doc.meta.start_date && this.doc.meta.end_date && this.doc.meta.end_date < this.doc.meta.start_date) throw new Error('The end date must be on or after the start date.');
    },
    payload() {
      const columns = {};
      for (const key of ['title', 'description', 'tags', 'author', 'body_md', 'status', 'submitted_at', 'reviewed_by', 'reviewed_at', 'review_notes', 'details']) {
        if (this.doc[key] !== undefined) columns[key] = this.doc[key];
      }
      return {...columns, title: this.doc.title.trim(), body_md: this.doc.body_md || '', doc_type: this.kind, meta: {...this.doc.meta}};
    },
    async save(submit = false) {
      if (!this.ready || this.busy) return;
      this.error = ''; this.message = ''; this.busy = true;
      try {
        this.validate(submit);
        const data = await Alpine.store('api').call(this.id ? 'draft_update' : 'draft_create', this.id ? {id: this.id} : {}, this.payload());
        this.id = data.id;
        const url = new URL(location.href); url.searchParams.set('id', this.id);
        history.replaceState(null, '', url);
        if (submit) {
          await Alpine.store('api').call('draft_submit', {id: this.id}, {});
          this.doc.status = 'submitted';
          this.message = 'Submitted for review. Publication follows the existing approval process.';
        } else this.message = 'Draft saved. You can keep editing or return to the content list.';
      } catch (error) { this.showError(error, 'Unable to save. Your edits are still here.'); }
      finally { this.busy = false; }
    },
    async uploadImages(files) {
      if (this.busy || !this.ready) return;
      this.error = ''; this.busy = true;
      try {
        const images = Array.isArray(this.doc.meta.images) ? this.doc.meta.images : [];
        this.doc.meta.images = images;
        for (const file of Array.from(files || [])) {
          if (!file.type.startsWith('image/')) throw new Error('Please choose image files.');
          const body = new FormData(); body.append('image', file);
          const response = await fetch('/api/upload', {method: 'POST', body});
          if (!response.ok) throw new Error(`Could not upload ${file.name}.`);
          const data = await response.json();
          if (!data.url) throw new Error('Upload did not return an image URL.');
          this.doc.meta.images.push({url: data.url, name: file.name, alt: ''});
        }
      } catch (error) { this.error = error.message; }
      finally { this.busy = false; }
    },
  };
}
if (typeof module !== 'undefined') module.exports = { researchEditor };
