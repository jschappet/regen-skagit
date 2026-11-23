# Feature: Memorable experiment code names and a submission entry point

Status: Implemented locally; release pending.

## Purpose

Give experiments playful names people can remember and make it easy to start an experiment from the public Experiments page.

## Accepted behavior

- [x] New experiments in the dedicated editor automatically receive a code name.
- [x] Randomly mix Project, Operation, Mission, Expedition, The … Heist, and The … Initiative with playful adjective/noun pairs.
- [x] Offer **Try another** before the first save; each click produces a different name.
- [x] Preserve the name after saving and reopening the experiment.
- [x] Show code names on published experiment pages, the experiment listing, and the result picker.
- [x] Keep permanent IDs for relationships; code names are labels and may repeat.
- [x] Preserve existing experiments without silently assigning or changing their names.
- [x] Add **Submit your own experiment** to `/experiments/`, linking to `/admin/content/experiment/`.
- [x] Position the button beside the introduction on desktop and stack it on small screens.
- [x] Use explicit dark-green and white button colors, including hover and keyboard-focus styles.

Example names: Project Cosmic Turnip, Operation Sneaky Salmon, Mission Fuzzy Heron, Expedition Wobbly Mushroom, The Disco Otter Heist, The Midnight Compost Initiative.

## Implementation

- `src/assets/js/research-editor.js`: generation, pre-save reroll, persistence, and result-picker labels.
- `src/_includes/components/research-editor.njk`: code-name display and reroll control.
- `src/_includes/layouts/experiment.njk`: published code-name display.
- `src/content/site/experiments.njk`: listing labels and submission button.
- `src/content/site/experiment-catalog.11ty.js`: include names in the public catalog.
- `src/styles/index.css`: explicit button colors.
- Heron companion change: `doc_schema.json` defines optional `code_name` experiment metadata for editing/export.

The dedicated editor is the automatic-generation entry point. Other creation paths are outside this implementation's scope.

## Validation

- Research tests passed for editor persistence, stable references, export relationships, and generated pages/catalog.
- All five editor tests passed after adding the six naming styles.
- User confirmed the button displays correctly in Chrome and Safari after a hard refresh.

## Release checklist

- [ ] Commit and release the Regenerate Skagit changes and companion Heron schema change.
- [ ] Verify a newly saved experiment retains its code name through approval and Markdown export.
- [ ] Verify the deployed listing, detail page, and result picker show the exported name.
- [ ] Smoke-test the submission link with a signed-in contributor and a signed-out visitor.
