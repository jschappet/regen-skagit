# Experiments and results

Work is tracked in [Regen #13](https://github.com/jschappet/regen-skagit/issues/13) and [Heron #25](https://github.com/jschappet/heron/issues/25), on `codex/experiments-results` in both repositories.

## Content model

An experiment asks a question and describes a method. It can have any number of dated results. Each result belongs to one experiment. Results include positive, mixed, negative, and inconclusive observations; summaries describe findings rather than automatically claiming success.

The permanent `experiment_id` links the documents. Titles can change without breaking the relationship. Each result also has its own permanent `result_id`. The dedicated editor generates IDs automatically. Do not regenerate IDs when revising existing published work.

Experiment progress (`experiment_status`: planned, active, completed, paused) is independent of the backend draft workflow (draft, submitted, approved, deployed, etc.).

Published files live in `src/content/experiments/` and `src/content/results/`. Directory data selects the layout and public URL automatically. No layout field is required in exported frontmatter.

Example experiment metadata:

```yaml
title: Mulch and soil moisture
experiment_id: mulch-soil-moisture
doc_type: experiment
description: Compare moisture retention in adjacent garden beds.
experiment_status: active
question: Does mulch improve moisture retention between watering?
method: Compare mulched and unmulched beds under similar conditions.
success_criteria: Record moisture at the same depth and time, with units and baseline values.
location: Community garden
start_date: '2026-10-01'
author: Garden team
```

Example result metadata:

```yaml
title: First week of moisture observations
result_id: mulch-week-one
experiment_id: mulch-soil-moisture
doc_type: results
observed_date: '2026-10-08'
summary: Describe the actual observations here, including unexpected findings.
outcome: inconclusive
limitations: Record sample size, weather, and differences between beds.
author: Garden team
```

These are documentation examples, not published findings. Markdown below the frontmatter holds detailed notes and evidence. `images` accepts existing URL arrays or `{url, name, alt}` objects.

## Draft workflow

1. Choose **experiment** or **results** from `/admin/content/`. The dedicated pages are `/admin/content/experiment/` and `/admin/content/results/`.
2. Save the experiment first. Use **Record a result** to open a result with its parent selected. The parent picker combines published experiments with accessible experiment drafts.
3. Save drafts as needed. Submitting requires notes and a question for an experiment; results also require a parent, observation date, and findings summary.
4. Review and approve through the existing content administration workflow.
5. Publish the experiment before its results, or export the experiment and its results together.

The generic editor remains available at `/admin/content/edit/?doc_type=experiment` (or `results`). Both types use Heron's shared schema. Deploy/restart the updated Heron backend alongside the site changes so it recognizes `experiment`.

## Export and publication

The existing `utils/get_approved_recipes.mjs` filename is retained for compatibility. It now maps supported document types to their correct content folders. It uses `DEPLOY_EMAIL` and `DEPLOY_PASSWORD` environment variables; `DEPLOY_BASE_URL` optionally overrides the site URL.

```sh
node utils/get_approved_recipes.mjs --dry-run
node utils/get_approved_recipes.mjs
npm test
```

Dry runs authenticate and read approved drafts but do not write files, run a site build, or update draft status. The exporter validates the whole batch before writing, requires new results to reference a published or same-batch experiment, and verifies that IDs survived Markdown export. Existing files are found by permanent ID, so their filenames and public URLs survive title changes. New filenames use the permanent ID. After writing the exports, the script runs `npm run build`, including the search index. Only after a successful build does it mark drafts deployed. A build failure exits with an error, retains the exported files, and leaves drafts approved so the export can be retried. This is **not** a hosting deployment. Review the files and publish the site separately.

Supported export types: experiment, results, post, idea, event, organization. Unsupported types fail explicitly instead of being written to the wrong folder.

## Existing results

Existing result drafts retain all metadata, including images and fields absent from the custom form. On first editing, legacy `date` supplies the observation date and the description supplies the summary. Choose the matching experiment before submitting. If a draft was already published, retain or add the same permanent IDs in both the draft metadata and published file before exporting it again.

Published older results without a parent remain readable with an explanatory note. They will not appear under an experiment until an `experiment_id` is added. A nonempty ID pointing to a missing experiment, or duplicate IDs, fails the site build so broken links are caught before publication. Files marked `draft: true` or with a nonpublic draft status are excluded from generated research pages and collections.

## Search and verification

Pagefind follows the ReVillage build pattern: it regenerates after builds and in watch mode. `/search/` is linked from navigation and searches public content, including experiments and results. Admin/member/editor pages and navigation/footer content are excluded. Search requires JavaScript; experiment pages and their result lists do not.

`npm test` covers the relationship model, export validation, editor save/submit behavior, metadata preservation, and an isolated Eleventy/Pagefind build. The integration fixture verifies result ordering, parent links, date formatting, unpublished-file exclusion, and search index exclusions without publishing example content into the site's output.

## Editorial decisions still worth making

- Who owns an experiment and who approves its findings?
- Which measurements need structured values, units, baselines, or downloadable datasets? The current form supports these in notes and evidence links.
- How should corrections to published results be identified and dated?
- Which existing results belong to which experiments? This requires an editorial mapping rather than guessing.
- Are any locations, participant details, or raw observations private? Publish only the intended public account.
