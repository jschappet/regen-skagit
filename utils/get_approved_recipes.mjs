import fs from "fs/promises";
import path from "path";
import slugify from "slugify";
import { CookieJar } from "tough-cookie";

/**
 * CONFIG
 */
const BASE_URL = "https://dev.regenerateskagit.org";
const RECIPES_DIR = path.resolve("src/content/events");

const EMAIL = "schappet";
const PASSWORD = "1432Audrey";

if (!EMAIL || !PASSWORD) {
  console.error("DEPLOY_EMAIL and DEPLOY_PASSWORD must be set");
  process.exit(1);
}

const DRY_RUN = process.argv.includes("--dry-run");

/**
 * COOKIE-AWARE FETCH
 */
const jar = new CookieJar();

async function fetchWithCookies(url, options = {}) {
  const cookie = await jar.getCookieString(url);

  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(cookie ? { cookie } : {})
    }
  });

  const setCookie = res.headers.get("set-cookie");
  if (setCookie) {
    await jar.setCookie(setCookie, url);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `${res.status} ${res.statusText} for ${url}\n${body}`
    );
  }

  return res;
}

/**
 * LOGIN
 */
async function login() {
  console.log("Logging in…");
/* 
  await fetchWithCookies(`${BASE_URL}/api/login`, {
    method: "POST",
    headers: { "Content-Type":"application/json" },
    body: JSON.stringify({
      email: EMAIL,
      password: PASSWORD
    })
  });
 */
  let loginData =  {
        username: EMAIL,
        password: PASSWORD
      };

    await fetchWithCookies(`${BASE_URL}/api/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams(loginData)
        });
  console.log("Logged in");
}

/**
 * FETCH SUBMITTED DRAFTS
 */
async function fetchDrafts() {
  console.log("Fetching submitted recipe drafts…");

  const res = await fetchWithCookies(
    `${BASE_URL}/api/admin/drafts/list?status=approved`
  );

  const drafts = await res.json();
  console.log(drafts.drafts);
  console.log(`Found ${drafts.drafts.length} drafts`);
  return drafts.drafts;
}

/**
 * FETCH MARKDOWN
 */
async function fetchMarkdown(draftId) {
  const res = await fetchWithCookies(
    `${BASE_URL}/api/admin/drafts/${draftId}/md`
  );
  return res.text();
}

/**
 * DEPLOY DRAFT
 */
async function markDeployed(draftId) {
  if (DRY_RUN) return;

  await fetchWithCookies(
    `${BASE_URL}/api/admin/drafts/${draftId}/deploy`,
    { method: "POST" }
  );
}

/**
 * WRITE FILE ATOMICALLY
 */
async function writeRecipeFile(slug, markdown) {
  const filePath = path.join(RECIPES_DIR, `${slug}.md`);
  const tmpPath = `${filePath}.tmp`;

  if (!markdown.trim().startsWith("---")) {
    throw new Error(`Markdown missing frontmatter for ${slug}`);
  }

  if (DRY_RUN) {
    console.log(`DRY RUN: would write ${filePath}`);
    return;
  }

  await fs.writeFile(tmpPath, markdown);
  await fs.rename(tmpPath, filePath);
}

/**
 * MAIN
 */
async function run() {
  console.log("Starting recipe draft sync");

  await login();
  await fs.mkdir(RECIPES_DIR, { recursive: true });

  const drafts = await fetchDrafts();

  for (const draft of drafts) {
    const slug =
      draft.slug ||
      slugify(draft.title, { lower: true, strict: true });

    console.log(`Processing "${draft.title}"`);

    const markdown = await fetchMarkdown(draft.id);
    await writeRecipeFile(slug, markdown);
    await markDeployed(draft.id);

    console.log(`✓ Deployed ${slug}.md`);
  }

  console.log("\n🎉 Recipe draft sync complete");
}

run().catch(err => {
  console.error("\n Sync failed:");
  console.error(err);
  process.exit(1);
});
