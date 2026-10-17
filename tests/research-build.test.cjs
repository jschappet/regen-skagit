const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {execFile} = require('node:child_process');
const {promisify} = require('node:util');
const {gunzipSync} = require('node:zlib');
const run = promisify(execFile);
test('published pages link results and search excludes drafts and admin pages', async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'regen-research-'));
  const input = path.join(temp, 'src'), output = path.join(temp, 'dist');
  try {
    await fs.symlink(path.resolve('node_modules'), path.join(temp, 'node_modules'));
    await fs.cp('src/styles', path.join(input, 'styles'), {recursive: true});
    await fs.cp('src/_includes', path.join(input, '_includes'), {recursive: true});
    await fs.mkdir(path.join(input, '_11ty'), {recursive: true});
    await fs.copyFile('src/_11ty/research.cjs', path.join(input, '_11ty/research.cjs'));
    for (const folder of ['experiments', 'results']) {
      await fs.mkdir(path.join(input, 'content', folder), {recursive: true});
      await fs.copyFile(`src/content/${folder}/${folder}.11tydata.js`, path.join(input, 'content', folder, `${folder}.11tydata.js`));
    }
    for (const folder of ['site', 'admin']) await fs.mkdir(path.join(input, 'content', folder), {recursive: true});
    for (const name of ['experiments.njk', 'experiment-catalog.11ty.js', 'search.njk']) await fs.copyFile(`src/content/site/${name}`, path.join(input, 'content/site', name));
    await fs.copyFile('src/content/admin/experiment.njk', path.join(input, 'content/admin/experiment.njk'));
    await fs.writeFile(path.join(input, 'content/experiments/soil.md'), '---\ntitle: Soil observation trial\nexperiment_id: soil\nquestion: Does mulch help?\nexperiment_status: active\n---\nA repeatable soil experiment.');
    await fs.writeFile(path.join(input, 'content/experiments/private.md'), '---\ntitle: Private sentinel\nexperiment_id: private\nstatus: draft\n---\nDo not publish.');
    for (const [id, date, summary] of [['one', '2026-01-01', 'First findings'], ['two', '2026-02-01', 'Latest findings']]) {
      await fs.writeFile(path.join(input, `content/results/${id}.md`), `---\ntitle: Observation ${id}\nresult_id: ${id}\nexperiment_id: soil\nobserved_date: ${date}\nsummary: ${summary}\n---\nEvidence from the field.`);
    }
    await run(process.execPath, [path.resolve('node_modules/@11ty/eleventy/cmd.cjs'), `--config=${path.resolve('eleventy.config.mjs')}`, '--input=src', '--output=dist'], {cwd: temp, maxBuffer: 4 * 1024 * 1024});
    const listing = await fs.readFile(path.join(output, 'experiments/index.html'), 'utf8');
    assert.match(listing, /Latest findings/);
    assert.match(listing, /2 results/);
    const detail = await fs.readFile(path.join(output, 'experiments/soil/index.html'), 'utf8');
    assert.match(detail, /href="\/results\/two\/"/);
    assert.ok(detail.indexOf('Observation two') < detail.indexOf('Observation one'));
    const result = await fs.readFile(path.join(output, 'results/one/index.html'), 'utf8');
    assert.match(result, /href="\/experiments\/soil\/"/);
    assert.match(result, /Jan 1, 2026/);
    await assert.rejects(fs.access(path.join(output, 'experiments/private/index.html')));
    const catalog = JSON.parse(await fs.readFile(path.join(output, 'experiments/catalog.json'), 'utf8'));
    assert.deepEqual(catalog.map(e => e.experiment_id), ['soil']);
    const fragments = await fs.readdir(path.join(output, 'pagefind/fragment'));
    const indexed = await Promise.all(fragments.map(async file => {
      const data = gunzipSync(await fs.readFile(path.join(output, 'pagefind/fragment', file))).toString();
      return JSON.parse(data.slice(data.indexOf('{')));
    }));
    assert.ok(indexed.some(f => f.url === '/experiments/soil/'));
    assert.ok(indexed.some(f => f.url === '/results/one/'));
    assert.ok(!indexed.some(f => f.url.startsWith('/admin/') || f.content.includes('Private sentinel')));
  } finally { await fs.rm(temp, {recursive: true, force: true}); }
});
