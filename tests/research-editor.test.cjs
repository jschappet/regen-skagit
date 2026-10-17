const test = require('node:test');
const assert = require('node:assert/strict');
const {researchEditor} = require('../src/assets/js/research-editor.js');
test('editing results preserves unrelated metadata and does not replace its parent reference', () => {
  const editor = researchEditor('results');
  editor.doc = {title: ' Updated ', body_md: 'Notes', meta: {experiment_id: 'soil', result_id: 'observation', custom: {keep: true}, images: ['photo.jpg']}};
  const payload = editor.payload();
  assert.equal(payload.title, 'Updated');
  assert.equal(payload.meta.experiment_id, 'soil');
  assert.deepEqual(payload.meta.custom, {keep: true});
  assert.deepEqual(payload.meta.images, ['photo.jpg']);
  assert.throws(() => editor.validate(true), /observation date/);
  assert.doesNotThrow(() => editor.validate(false));
});
test('save creates once, then updates; submit waits until save succeeds', async () => {
  const calls = [];
  global.Alpine = {store: () => ({call: async (name, params, payload) => {calls.push(name); return {id: 17};}})};
  global.location = {href: 'https://example.org/admin/content/experiment/'};
  global.history = {replaceState: () => {}};
  const editor = researchEditor('experiment');
  editor.ready = true;
  editor.doc = {title: 'Soil', body_md: 'Notes', meta: {experiment_id: 'soil', question: 'Does mulch help?'}};
  await editor.save(false); await editor.save(true);
  assert.deepEqual(calls, ['draft_create', 'draft_update', 'draft_submit']);
  assert.equal(editor.id, 17);
  assert.equal(editor.doc.status, 'submitted');
  global.Alpine.store = () => ({call: async name => {calls.push(name); throw new Error('Offline');}});
  await editor.save(true);
  assert.equal(calls.at(-1), 'draft_update');
  assert.equal(editor.error, 'Offline');
  assert.equal(editor.doc.body_md, 'Notes');
  assert.equal(editor.busy, false);
});
test('result picker merges published and draft experiments and retains legacy metadata', async () => {
  global.location = {search: '?id=9', href: 'https://example.org/admin/content/results/?id=9'};
  global.fetch = async () => ({ok: true, json: async () => [{experiment_id: 'soil', title: 'Published soil'}]});
  global.Alpine = {store: () => ({call: async name => name === 'draft_get'
    ? {id: 9, doc_type: 'results', title: 'Legacy', description: 'Earlier findings', meta: {experiment_id: 'soil', date: '2026-01-01', extra: 'keep'}}
    : {drafts: [{title: 'Same experiment', meta: {experiment_id: 'soil'}}, {title: 'Water trial', meta: {experiment_id: 'water'}}]}})};
  const editor = researchEditor('results');
  await editor.init();
  assert.equal(editor.ready, true);
  assert.deepEqual(editor.experiments.map(e => e.experiment_id), ['soil', 'water']);
  assert.equal(editor.doc.meta.observed_date, '2026-01-01');
  assert.equal(editor.doc.meta.summary, 'Earlier findings');
  assert.equal(editor.doc.meta.extra, 'keep');
  assert.match(editor.doc.meta.result_id, /^res-/);
});
test('missing draft access gives actionable feedback and prevents saving incomplete loads', async () => {
  global.location = {search: '', href: 'https://example.org/admin/content/results/'};
  global.fetch = async () => ({ok: true, json: async () => []});
  global.Alpine = {store: () => ({call: async () => {throw new Error('Unknown API function: draft_list');}})};
  const editor = researchEditor('results');
  await editor.init();
  assert.equal(editor.ready, false);
  assert.equal(editor.needsAccess, true);
  assert.match(editor.error, /Sign in/);
  assert.equal(editor.loading, false);
});
