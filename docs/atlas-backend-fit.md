# Living atlas: fit with Heron and Regenerate Skagit

Reviewed local source on October 20, 2026. This is an integration assessment, not a claim that deployed services were tested. The prototype uses fictional browser-local data and does not call Heron.

## Assessment

The core domain is already present. Most work is a new presentation layer, metadata conventions, and a deliberately public read model. Do not replace Heron's entity, ledger, authentication, or publishing systems.

| Experience | Existing support | Smallest next step |
| --- | --- | --- |
| People, organizations, experiments as connected records | `src/schema.rs` entities, entity_types, entity_aliases, canonical_entity_id; `src/models/entities.rs` uses JsonField details | Give published content an explicit entity_id; retain experiment_id/result_id as permanent content identifiers. Do not join on names. |
| Time, materials, tools, seed, knowledge flows | `src/routes/ledger.rs`: from_entity, to_entity, resource_type, quantity_value, quantity_unit, timestamp, notes, details | Adapt existing records to display shapes; keep resource units separate. Never sum unlike resources. |
| Typed relationships | `src/schema.rs` entity_relationships: from_entity, to_entity, host_id, relationship_type, created_at | Activate model/service and host-scoped read/write routes. `src/models/mod.rs` currently comments out entity_relationships; search found no active relationship handlers. This is a real implementation gap. |
| Experiments and dated results | Regen `docs/experiments-and-results.md`: experiment_id/result_id, statuses, question, method, observed_date, outcome, limitations; approved export workflow | Reuse published catalogs and editing workflow. Add entity_id mapping and public location metadata. |
| Values and interests | Entity details and draft metadata can carry additional structured fields | Agree arrays of stable value/interest identifiers and labels; validate them through the existing schema. Treat these as declared attributes, not inferred endorsements. |
| Geographic placement | Experiment metadata already has a free-text location | Add basin_id, optional geometry, precision, and publication visibility. Existing free-text location is not sufficient for dependable mapping. Basin-level placement should remain valid without coordinates. |
| Public atlas | Ledger API exists, but under a Member scope | Export or serve an intentionally public, host-scoped projection of approved records and relationships. Do not expose all entity.details or ledger rows. |
| Observations and edits | Existing authenticated draft/review/export flow | Replace browser-only observation storage with the existing result editor and permissions. User identity resolves through existing auth/entity mapping. |

## Verified route/access nuance

`src/routes/mod.rs` registers `/api/ledger` with Member scope. In register(), a route declared Public inherits the scope role. Therefore the apparent Public ledger GET handlers remain member-scoped in route metadata. Do not assume anonymous atlas requests can use these endpoints directly.

Existing relative ledger routes: `/entities`, `/entity/{id}`, `/entity/{id}/flows`, `/ledger.json`; admin mutations `/entity`, `/flow`, bulk submission and merge. Ledger summary filters already include entity, direction, start/end, limit and offset. Read the actual response shapes when implementing an adapter rather than assuming they match prototype arrays.

`get_entity` receives an ID without an explicit HostContext in its handler. Before exposing any new public ID lookup, verify host isolation throughout the domain/service path. This assessment does not modify access controls.

## Proposed metadata contract (not implemented)

- `entity.details.atlas`: public display name/summary, values[], interests[], place{basin_id, geometry?, precision}, visibility.
- Published experiment metadata: entity_id plus existing experiment_id.
- Published result metadata: existing result_id and experiment_id; evidence and limitations stay associated with the result.
- Relationship types: an agreed vocabulary such as stewards, hosts, supports, learns_with. Direction and display wording must be explicit.
- Relationship publication/provenance: the existing relationship table does not have approval, source, or visibility fields. A first release could maintain a curated export allowlist; a durable editing workflow likely needs a small migration for these fields or a related metadata record.
- Public feed: entities[], relationships[], published experiments/results, and only approved public contribution fields. Preserve IDs and source links.

This convention can avoid a broad schema redesign. Do not call it zero backend work: relationship CRUD, publication decisions, validation, and joining content IDs to entity IDs still need implementation.

## Phased implementation

1. Build a curated static atlas feed from approved published content and selected entities/flows. Keep the existing Eleventy export/publish model; the UI consumes a single stable feed.
2. Add host-scoped relationship model/service/routes and editing controls; settle vocabulary, visibility and provenance.
3. Connect authenticated contribution/result forms to the existing backend. Separate private drafts from the public read model.
4. Add full transboundary watershed geometry and validated location information. Optimize viewport queries only when real data volume requires it.

## Prototype behavior

Six primary views plus experiment/profile, contribution and field-note detail pages. Map pan/zoom, lenses, search, status/resource/community filters, saved records, and browser-only observation drafts work. The concept does not represent a live ledger, real organizations, proven impact, or exact sites.

Map geometry: Skagit County Skagit–Samish River Sub-basins (Planning/WatershedsMap/MapServer/4) and stream geometry (Geocortex/CriticalAreas/MapServer/15). Geometry was simplified, polygon winding normalized for D3, and embedded locally. This is partial coverage, not the full transboundary watershed. Example nodes use computed basin centroids. Decorative landscape artwork is not geographic geometry.

## Validation

- JavaScript syntax checked.
- Browser verified: initial atlas render (80 basin features and stream geometry), impact lens, map search, experiment status filter, community search, ledger resource filter, connected detail navigation, saved records, observation submission and persistence after reload.
- Responsive checks: no document-level overflow at observed 1133px desktop and 325px narrow viewport widths.
- Browser console had no errors during these checks.
- No Heron integration test or production backend mutation was performed.

## Repository location

The mockup lives at `/atlas/`, rendered from `src/atlas.njk`. Its isolated scripts, styles, and embedded map geometry live in `src/assets/atlas/`. Run the normal `npm run dev` or `npm run build`; no separate Site service is required. Fictional content is excluded from Pagefind and Eleventy collections. Heron file references above are relative to the sibling Heron repository.
