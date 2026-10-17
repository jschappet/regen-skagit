import path from 'node:path';
import matter from 'gray-matter';
const folders = {experiment: 'experiments', results: 'results', post: 'post', idea: 'ideas', event: 'events', organization: 'organizations'};
const validId = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export function exportPlan(drafts, existing = []) {
  const knownExperiments = new Set(existing.filter(f => f.folder === 'experiments' && !['draft','submitted','deleted','rejected','pending','changes_requested'].includes(f.data.status) && f.data.draft !== true).map(f => f.data.experiment_id).filter(Boolean));
  const destinations = new Set();
  const ids = new Set();
  for (const draft of drafts) if (draft.doc_type === 'experiment') knownExperiments.add(draft.meta?.experiment_id);
  return drafts.map(draft => {
    const folder = folders[draft.doc_type];
    if (!folder) throw new Error(`Unsupported export type: ${draft.doc_type}`);
    const key = draft.doc_type === 'experiment' ? 'experiment_id' : draft.doc_type === 'results' ? 'result_id' : null;
    const id = key ? draft.meta?.[key] : null;
    if (key && (!validId.test(id || '') || ids.has(id))) throw new Error(`Draft ${draft.id} needs a unique ${key}. Open it in the dedicated editor and save it.`);
    if (id) ids.add(id);
    if (draft.doc_type === 'results' && (!draft.meta?.experiment_id || !knownExperiments.has(draft.meta.experiment_id))) throw new Error(`Result ${draft.id} needs a published experiment or one in this export batch.`);
    const same = key ? existing.filter(f => f.folder === folder && f.data[key] === id) : [];
    if (same.length > 1) throw new Error(`Duplicate published ID: ${id}`);
    const slug = id || draft.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `draft-${draft.id}`;
    const file = same[0]?.file || `${slug}.md`;
    const destination = path.join('src/content', folder, file);
    if (destinations.has(destination)) throw new Error(`Two drafts would write ${destination}`);
    destinations.add(destination);
    const collision = existing.find(f => f.folder === folder && f.file === file);
    if (key && collision && collision.data[key] !== id) throw new Error(`Refusing to overwrite a different document at ${destination}`);
    return {draft, destination};
  });
}
export function validateMarkdown(markdown, draft) {
  if (!markdown.trimStart().startsWith('---')) throw new Error(`Draft ${draft.id} has no frontmatter.`);
  const parsed = matter(markdown);
  if (parsed.data.doc_type !== draft.doc_type) throw new Error(`Draft ${draft.id} exported with the wrong content type.`);
  for (const key of ['experiment_id', 'result_id']) {
    if (draft.meta?.[key] && parsed.data[key] !== draft.meta[key]) throw new Error(`Draft ${draft.id} lost ${key} during export.`);
  }
  return parsed;
}
