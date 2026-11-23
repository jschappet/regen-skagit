/* Canonical shared experiment journey. Private workspace is stored only in details. */
function experimentJourney() {
  return {
    id: null, step: 1, ready: false, busy: false, error: '', message: '', savedSnapshot: '',
    owner: true, userId: null, doc: {meta: {}}, work: {}, map: null, marker: null,
    steps: ['Your interest', 'Private brain dump', 'Choose your experiment', 'Week one', 'Personal check-in', 'Week two', 'Tell your story', 'Review and submit'],
    fields: {
      1: [['interest', 'What’s got your attention?', 'In one sentence.', 1], ['why', 'What lights you up about it?', 'What’s the deeper why?', 4]],
      2: [['brain_dump', 'What comes to mind?', 'Things to try, questions, people, places, materials, wild ideas, bumps and nearby curiosities.', 14]],
      3: [['chosen_piece', 'What small piece are you choosing?', 'In one sentence.', 1], ['hope', 'What do you hope to learn, try, or feel?', 'By the end of two weeks, in one sentence.', 1], ['needs', 'What might you need for this one small piece?', 'Supplies, questions, people, places, skills, time, help, or things that might get in the way.', 4], ['setup_notes', 'Anything else you want to note?', 'Optional private notes.', 4]],
      4: [['week_one_notes', 'Private notes as you go', 'What did you find out? Who did you talk to? What surprised you? Optional.', 10]],
      5: [['discovered', 'What have you discovered so far?', 'In one sentence.', 1], ['action', 'What small action will you try this week?', 'Keep your original plan or change it based on what you’ve learned.', 1], ['checkin_notes', 'Private notes, questions, or things to remember', 'Optional.', 5]],
      6: [['week_two_notes', 'Private notes as you go', 'Notice surprises, what doesn’t work, or what keeps you from trying it. Optional.', 10]],
    },
    introductions: {
      1: 'Pick one thing you’re curious about, itching to try, or can’t stop thinking about. A hunch, a question, a hobby, or a “wouldn’t it be cool if…” all count. Big or small, serious or silly, barely a spark. You don’t need to be an expert.',
      2: 'This space is just for you. Get it all out of your head, in any order, as messy as you like. Nothing needs to make sense yet. It won’t be included in your submitted story or published on the map.',
      3: 'Look back through your brain dump. Which piece feels interesting, possible, and worth two weeks of your attention? Your interest can be big. Your experiment can be small. Week one is for preparation; week two is for one real step.',
      4: 'Spend this week exploring what it will take to move your chosen piece into action. Research a question, talk to someone, visit a place, find supplies, learn a skill, or look for resources.',
      5: 'Pause and look at what you’ve discovered. What feels possible now? Your original intention stays here even if your next step changes.',
      6: 'Take your next step. Small and real is the goal. Notice what happens, including what surprises you, what doesn’t work, and what you decide to change. If something keeps you from trying it, that’s part of the experience too.',
      7: 'You gave something your attention. Whether things went as planned, took an unexpected turn, or left you with new questions, your experience is worth sharing.',
      8: 'Only the story, author name, and public location shown below will enter publishing review. Your private workspace and notes are not included.',
    },
    get editable() { return this.ready && ['draft', 'changes_requested'].includes(this.doc.status); },
    get dirty() { return this.ready && this.savedSnapshot !== this.snapshot(); },
    snapshot() { return JSON.stringify({doc: this.doc, work: this.work}); },
    async init() {
      try {
        if (!await requireContentLogin()) return;
        // Fail closed against older servers that do not enforce notebook privacy.
        await Alpine.store('api').call('experiment_workspace_ready');
        const profile = await Alpine.store('api').call('profile_json');
        this.userId = profile.user.id;
        this.id = new URLSearchParams(location.search).get('id');
        this.doc = {doc_type: 'experiment', title: '', status: 'draft', author: profile.user.display_name || profile.user.username || '', meta: {journey_version: 1, experiment_id: `exp-${crypto.randomUUID()}`, experiment_status: 'planned'}};
        if (this.id) {
          this.doc = await Alpine.store('api').call('content_get', {id: this.id});
          this.doc.tagInput = (this.doc.explicit_tags || []).join(", ");
          this.id = this.doc.id; // Keep the current revision when resuming an older bookmark.
          if (this.doc.doc_type !== 'experiment') throw new Error('This is not an experiment. Open it from My Content.');
          if (!this.doc.meta?.journey_version) {
            location.replace(`/my/content/edit/?doc_type=experiment&id=${encodeURIComponent(this.id)}`); return;
          }
          this.owner = this.doc.submitted_by === this.userId;
          if (this.owner && this.doc.details) this.work = JSON.parse(this.doc.details);
          this.step = this.owner ? Math.min(8, Math.max(1, Number(this.work.step) || 1)) : 8;
          if (!['draft', 'changes_requested'].includes(this.doc.status)) this.step = 8;
        }
        if (this.owner) {
          for (const fields of Object.values(this.fields)) {
            for (const [key] of fields) this.work[key] ??= '';
          }
        }
        for (const key of ['story_exploration', 'story_happened', 'story_takeaway', 'location']) {
          this.doc.meta[key] ??= '';
        }
        this.ready = true; this.savedSnapshot = this.snapshot();
        this.beforeUnload = event => { if (this.dirty) { event.preventDefault(); event.returnValue = ''; } };
        window.addEventListener('beforeunload', this.beforeUnload);
        if (this.step >= 7) await this.$nextTick(() => this.mountMap());
      } catch (error) { this.error = error.message || 'Unable to load your experiment. Please sign in and try again.'; }
    },
    destroy() { window.removeEventListener('beforeunload', this.beforeUnload); this.map?.remove(); },
    async go(step) {
      if (this.busy) return;
      this.error = '';
      if (!this.owner && step < 7) return;
      this.step = step;
      if (this.owner && this.editable) this.work.step = step;
      await this.$nextTick();
      if (step >= 7) this.mountMap();
      this.$refs.heading?.focus();
    },
    async next() {
      if (this.step === 3 && !this.work.start_date) this.work.start_date = new Date().toISOString().slice(0, 10);
      if (this.step === 6 && !this.work.story_started) {
        this.doc.meta.story_exploration = [this.work.interest, this.work.chosen_piece].filter(Boolean).join('\n\n');
        this.work.story_started = true;
      }
      const next = Math.min(8, this.step + 1);
      const moment = {4: 'exploring_at', 6: 'action_at', 7: 'story_at'}[next];
      if (moment && !this.work[moment]) this.work[moment] = new Date().toISOString();
      this.work.step = next;
      if (await this.save()) await this.go(next);
    },
    payload() {
      const meta = {...this.doc.meta};
      for (const key of ['latitude', 'longitude']) {
        meta[key] = meta[key] === '' || meta[key] == null ? null : Number(meta[key]);
      }
      meta.question = meta.story_exploration || '';
      meta.experiment_status = this.step >= 7 ? 'completed' : this.work.start_date ? 'active' : 'planned';
      return {doc_type: 'experiment', title: this.doc.title.trim() || 'My two-week experiment',
        author: this.doc.author, body_md: '', meta,
        tags: JSON.stringify((this.doc.tagInput || '').split(',')),
        ...(this.owner ? {details: JSON.stringify(this.work)} : {})};
    },
    async save() {
      if (!this.editable || this.busy) return false;
      if (!this.id && this.owner && !this.work.interest_at) this.work.interest_at = new Date().toISOString();
      this.busy = true; this.error = ''; this.message = '';
      try {
        const saved = await Alpine.store('api').call(this.id ? 'content_update' : 'content_create', this.id ? {id: this.id} : {}, this.payload());
        this.doc = {...saved, tagInput: (saved.explicit_tags || []).join(", ")}; this.id = saved.id;
        const url = new URL(location.href); url.searchParams.set('id', this.id); history.replaceState(null, '', url);
        this.savedSnapshot = this.snapshot(); this.message = 'Saved. You can return to this experiment from My Content.';
        return true;
      } catch (error) { this.error = error.message || 'Unable to save. Your edits are still here.'; return false; }
      finally { this.busy = false; }
    },
    async submit() {
      if (this.step !== 8 || this.busy || !this.editable) return;
      for (const key of ['story_exploration', 'story_happened', 'story_takeaway', 'location']) {
        if (!this.doc.meta[key]?.trim()) { await this.go(7); this.error = 'Complete each story prompt and name your public location before submitting.'; return; }
      }
      if (!this.doc.title.trim() || !this.validCoordinates()) { await this.go(7); this.error = 'Add a story title and choose a public map location.'; return; }
      if (!await this.save()) return;
      this.busy = true;
      try {
        this.doc = await Alpine.store('api').call('content_submit', {id: this.id}, {});
        this.savedSnapshot = this.snapshot();
        this.message = 'Your story is submitted! It will go through publishing review before it appears on the map. If changes are needed, you’ll have a chance to revise it.';
      } catch (error) { this.error = error.message || 'Your draft is saved, but submission failed. Please try again.'; }
      finally { this.busy = false; }
    },
    validCoordinates() {
      return [['latitude', 90], ['longitude', 180]].every(([key, limit]) => {
        const value = this.doc.meta[key]; return value !== '' && value != null && Number.isFinite(Number(value)) && Math.abs(Number(value)) <= limit;
      });
    },
    mountMap() {
      if (!window.L || !this.$refs.map) return;
      if (!this.map) {
        this.map = L.map(this.$refs.map).setView([48.42, -122.33], 9);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors', maxZoom: 19}).addTo(this.map);
        this.map.on('click', event => {
          if (!this.editable || this.step !== 7) return;
          this.doc.meta.latitude = Number(event.latlng.lat.toFixed(5));
          this.doc.meta.longitude = Number(event.latlng.lng.toFixed(5)); this.updateMarker();
        });
      }
      this.map.invalidateSize(); this.updateMarker();
    },
    updateMarker() {
      if (!this.map || !this.validCoordinates()) return;
      const point = [Number(this.doc.meta.latitude), Number(this.doc.meta.longitude)];
      if (this.marker) this.marker.setLatLng(point); else this.marker = L.marker(point).addTo(this.map);
      this.map.panTo(point);
    },
  };
}
if (typeof module !== 'undefined') module.exports = {experimentJourney};
