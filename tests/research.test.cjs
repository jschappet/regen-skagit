const test = require('node:test');
const assert = require('node:assert/strict');
const {researchCatalog, isPublished} = require('../src/_11ty/research.cjs');
const item = (folder, data) => ({inputPath: `/src/content/${folder}/example.md`, data, url: '/example/'});
test('one experiment has multiple newest-first results; private drafts are excluded', () => {
  const data = researchCatalog([item('experiments', {experiment_id: 'soil', title: 'Soil'}), item('results', {result_id: 'one', experiment_id: 'soil', observed_date: '2026-01-01'}), item('results', {result_id: 'two', experiment_id: 'soil', observed_date: '2026-02-01'}), item('results', {draft: true, experiment_id: 'missing'})]);
  assert.equal(data.experiments.length, 1);
  assert.deepEqual(data.results.map(r => r.data.result_id), ['two', 'one']);
  assert.equal(isPublished({data: {status: 'deleted'}}), false);
});
test('broken parent links and duplicate experiment IDs fail publication', () => {
  assert.throws(() => researchCatalog([item('results', {experiment_id: 'missing'})]), /missing experiment/);
  assert.throws(() => researchCatalog([item('experiments', {experiment_id: 'same'}), item('experiments', {experiment_id: 'same'})]), /duplicate/);
});
test('legacy unlinked results remain readable', () => {
  assert.equal(researchCatalog([item('results', {title: 'Earlier observations'})]).results.length, 1);
});
test('export uses stable IDs and preserves existing filenames after title changes', async () => {
  const {exportPlan} = await import('../utils/draft-export.mjs');
  const experiment = {id: 1, doc_type: 'experiment', title: 'New title', meta: {experiment_id: 'soil'}};
  const result = {id: 2, doc_type: 'results', title: 'Result', meta: {result_id: 'observation', experiment_id: 'soil'}};
  const plan = exportPlan([experiment, result], [{folder: 'experiments', file: 'old-title.md', data: {experiment_id: 'soil'}}]);
  assert.equal(plan[0].destination, 'src/content/experiments/old-title.md');
  assert.equal(plan[1].destination, 'src/content/results/observation.md');
  assert.throws(() => exportPlan([result]), /published experiment/);
});
test('export verifies relationship metadata round trips', async () => {
  const {validateMarkdown} = await import('../utils/draft-export.mjs');
  const draft = {id: 2, doc_type: 'results', meta: {experiment_id: 'soil'}};
  assert.throws(() => validateMarkdown('---\ndoc_type: results\n---\nNotes', draft), /lost experiment_id/);
  assert.equal(validateMarkdown('---\ndoc_type: results\nexperiment_id: soil\n---\nNotes', draft).data.experiment_id, 'soil');
});
