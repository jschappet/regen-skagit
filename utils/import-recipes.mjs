import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import fetch from 'node-fetch';

const API_URL = 'https://dev.regenerateskagit.org/api/admin/drafts/new';
const DOC_TYPE = 'organization';

//const RECIPES_DIR = './src/content/' + DOC_TYPE + 's/';
const RECIPES_DIR = '/Users/schappet/git/gen_org_docs/md_files/';

// 🔐 paste a valid session cookie from your browser
const SESSION_COOKIE = 'revillage_session=79o3ZHJobBBQYoxuK9vpcXZNwFwCx9R2ur0wU2xkAH140sxvjS0lZJwcOQ%3D%3D';

async function importRecipe(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(raw);

  // All frontmatter except top-level doc fields go into meta
  const {
    title,
    description,
    doc_type, // optional, can be overridden
    tags,
    author,
    status,
    ...meta
  } = data;

  const payload = {
    title: title ?? 'Untitled',
    description: description ?? '',
    doc_type: DOC_TYPE,
    tags: Array.isArray(tags) ? tags.join(',') : String(tags || ''),
    author: author ?? 'Unknown',
    status: 'draft',
    submitted_by: 0,
    body_md: content.trim(),
    meta, // <-- everything else from frontmatter goes here
  };

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': SESSION_COOKIE,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${filePath}: ${res.status} ${text}`);
  }

  const draft = await res.json();
  console.log(`✔ Imported: ${draft.title} (id=${draft.id})`);

  return draft;
}

async function run() {
  const files = fs
    .readdirSync(RECIPES_DIR)
    .filter(f => f.endsWith('.md'));

  console.log(`Found ${files.length} recipes`);

  for (const file of files) {
    const fullPath = path.join(RECIPES_DIR, file);
    try {
      await importRecipe(fullPath);
    } catch (err) {
      console.error(`✖ Failed: ${file}`);
      console.error(err.message);
    }
  }
}

run();
