const validId = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const experimentStatuses = ['planned', 'active', 'completed', 'paused'];
const outcomes = ['positive', 'mixed', 'negative', 'inconclusive'];
function isPublished(item) {
  return item.data.draft !== true && !['draft', 'submitted', 'changes_requested', 'rejected', 'deleted', 'pending'].includes(item.data.status);
}
function dateValue(value) {
  const date = new Date(value || 0);
  return Number.isNaN(date.valueOf()) ? 0 : date.valueOf();
}
function researchCatalog(items) {
  const experiments = items.filter(i => i.inputPath.includes('/content/experiments/') && isPublished(i));
  const results = items.filter(i => i.inputPath.includes('/content/results/') && isPublished(i));
  const ids = new Set();
  for (const item of experiments) {
    const id = item.data.experiment_id;
    if (!validId.test(id || '') || ids.has(id)) throw new Error(`Missing, invalid, or duplicate experiment_id: ${item.inputPath}`);
    if (item.data.experiment_status && !experimentStatuses.includes(item.data.experiment_status)) throw new Error(`Invalid experiment_status: ${item.inputPath}`);
    ids.add(id);
  }
  const resultIds = new Set();
  for (const item of results) {
    const id = item.data.result_id;
    if (id && (!validId.test(id) || resultIds.has(id))) throw new Error(`Invalid or duplicate result_id: ${item.inputPath}`);
    if (id) resultIds.add(id);
    if (item.data.experiment_id && !ids.has(item.data.experiment_id)) throw new Error(`Result references an unpublished or missing experiment: ${item.inputPath}`);
    if (item.data.outcome && !outcomes.includes(item.data.outcome)) throw new Error(`Invalid outcome: ${item.inputPath}`);
  }
  experiments.sort((a, b) => dateValue(b.data.start_date) - dateValue(a.data.start_date) || a.data.title.localeCompare(b.data.title));
  results.sort((a, b) => dateValue(b.data.observed_date || b.data.date) - dateValue(a.data.observed_date || a.data.date));
  return { experiments, results };
}
module.exports = { researchCatalog, validId, isPublished };
