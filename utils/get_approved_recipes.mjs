// Retained filename for existing callers; exports all supported content types.
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { CookieJar } from 'tough-cookie';
import matter from 'gray-matter';
import { exportPlan, validateMarkdown } from './draft-export.mjs';
const BASE_URL = process.env.DEPLOY_BASE_URL || 'http://regen.localhost:8582';
const EMAIL = process.env.DEPLOY_EMAIL;
const PASSWORD = process.env.DEPLOY_PASSWORD;
const DRY_RUN = process.argv.includes('--dry-run');
const jar = new CookieJar();
async function request(route, options = {}) {
  const url = new URL(route, BASE_URL).href;
  const cookie = await jar.getCookieString(url);
  const response = await fetch(url, {...options, headers: {...options.headers, ...(cookie ? {cookie} : {})}});
  for (const cookie of response.headers.getSetCookie()) await jar.setCookie(cookie, url);
  if (!response.ok) throw new Error(`Request failed: ${response.status} ${route}`);
  return response;
}
async function run() {
  if (!EMAIL || !PASSWORD) throw new Error('Set DEPLOY_EMAIL and DEPLOY_PASSWORD. Optionally set DEPLOY_BASE_URL.');
  await request('/api/auth/login', {method: 'POST', headers: {'Content-Type': 'application/x-www-form-urlencoded'}, body: new URLSearchParams({username: EMAIL, password: PASSWORD})});
  const {drafts} = await (await request('/api/admin/drafts/list?status=approved')).json();
  console.log(`Found ${drafts.length} approved drafts for export.`);
  const existing = [];
  for (const folder of ['experiments', 'results', 'post', 'ideas', 'events', 'organizations']) {
    const directory = path.join('src/content', folder);
    let files;
    try { files = await fs.readdir(directory); } catch (error) { if (error.code === 'ENOENT') continue; throw error; }
    for (const file of files.filter(f => f.endsWith('.md'))) existing.push({folder, file, data: matter(await fs.readFile(path.join(directory, file), 'utf8')).data});
  }
  // Check every relationship and export before writing or marking any draft deployed.
  const plan = exportPlan(drafts, existing);
  for (const entry of plan) {
    entry.markdown = await (await request(`/api/admin/drafts/${entry.draft.id}/md`)).text();
    validateMarkdown(entry.markdown, entry.draft);
  }
  for (const {draft, destination, markdown} of plan) {
    console.log(`${DRY_RUN ? 'Would write' : 'Writing'} ${destination}`);
    if (DRY_RUN) continue;
    await fs.mkdir(path.dirname(destination), {recursive: true});
    await fs.writeFile(`${destination}.tmp`, markdown);
    await fs.rename(`${destination}.tmp`, destination);
  }
  if (DRY_RUN) {
    console.log(`Validated ${plan.length} drafts. Dry run: no files written or site build run.`);
    return;
  }
  console.log('Building the site…');
  const build = spawnSync('npm', ['run', 'build'], {stdio: 'inherit'});
  if (build.error) throw build.error;
  if (build.status !== 0) throw new Error(`Site build failed (${build.signal || build.status}). Exported files are retained; drafts have not been marked deployed.`);
  for (const {draft} of plan) await request(`/api/admin/drafts/${draft.id}/deploy`, {method: 'POST'});
  console.log(`Exported ${plan.length} drafts and built the site successfully. Review the output before publishing.`);
}
run().catch(error => { console.error(error.message); process.exitCode = 1; });
