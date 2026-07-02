# Liberia PBO Custom Features

This fork of `ushahidi/platform-client-mzima` carries a small set of custom
pages built for the Liberia Peacebuilding Office (PBO): **Get Alerts**,
**Contact Us**, **About Us** (public), and **Analysis** / **Analysis
Templates** (permission-gated). They replace the equivalent pages on the
old UNICC fork (`/dashboard/get-alerts`, `/dashboard/about-us`,
`/dashboard/contact-us`, `/dashboard/analysis`, `/dashboard/analysis-templates`),
now served flat at `/get-alerts`, `/about-us`, `/contact-us`, `/analysis`,
`/analysis-templates`.

See `ireport/docs/MIGRATION_PLAN.md` (Phase 3) in the parent repo for the
full migration background.

## The pattern: minimize the stock-file diff

Every custom page lives in its own self-contained directory
(`get-alerts/`, `contact-us/`, `about-us/`, `analysis/`,
`analysis-templates/`) — module, routing module, component. The public
pages (`get-alerts`, `contact-us`, `about-us`) import nothing beyond
Angular Material and the SDK. `analysis`/`analysis-templates` are the one
exception — they're permission-gated, so their routes do use the stock
`CombinedGuard` + a new `AccessAnalysisGuard` (see below), same as every
admin settings route already does.

Stock files are touched as little as possible, and only in ways designed to
stay a fixed size as more pages are added:

| Stock file | What was added | Why |
|---|---|---|
| `apps/web-mzima-client/src/app/app-routing.module.ts` | One import + `...liberiaRoutes,` spread | Public route registration. All actual route definitions live in `liberia/liberia.routes.ts`, so this file's diff never grows. |
| `apps/web-mzima-client/src/app/core/services/config.service.ts` | `getByGroup(id)` method | Generic GET counterpart to the existing `update(id, resource)` — needed because About Us reads a config group the bulk `getConfig()` preload doesn't cover. |
| `apps/web-mzima-client/src/app/settings/settings-routing.module.ts` | One child route (`about-us-content`) | Registers the admin edit page, same shape as every other settings page. |
| `apps/web-mzima-client/src/app/settings/settings/settings.component.ts` | One `settingsItems` entry | Low-churn file (3 historical commits); safe to touch directly. |
| `apps/web-mzima-client/src/app/core/services/session.service.ts` | `resolveMediaUrl()` helper | Unrelated real bugfix (relative deployment-logo URLs weren't resolved against `backend_url`), not part of the custom-pages pattern. |
| `libs/sdk/src/lib/services/index.ts` | 2 barrel exports | `AlertsService`, `ContactUsService`. |
| `apps/web-mzima-client/src/app/post/location-select/location-select.component.ts` | Optional `geocoderCountryCodes` `@Input()`, defaulting to `undefined`; when set, also passes `showUniqueResult: false` to the geocoder control; also `tap: false` added to `leafletOptions` | Get Alerts' address search needs to be restricted to Liberia (`countrycodes=lr` passed to Nominatim); the same component is also used unrestricted by the stock post-edit location picker, so the restriction had to be additive rather than hardcoded. `showUniqueResult: false` prevents the library from auto-selecting (and hiding the suggestion dropdown for) the single match that a Liberia-only search often returns. Only `get-alerts.component.html` passes `[geocoderCountryCodes]="'lr'"`. `tap: false` is an unrelated real bugfix (Leaflet's touch-tap handler was eating the first click on the map in environments where `L.Browser.touch` is true), not part of the custom-pages pattern. |
| `apps/web-mzima-client/src/app/post/post.module.ts` | Switched from declaring `LocationSelectComponent` directly to importing the new `location-select/location-select.module.ts` (which declares and exports it instead) | Get Alerts needs the same map-based location picker as the post editor, so `LocationSelectComponent` was extracted into its own module for reuse by `get-alerts.module.ts`, rather than duplicating the component. |
| `apps/web-mzima-client/src/app/post/post-edit/post-edit.component.ts` / `.html` / `.scss` | In `changeLocation()`, an additional call to `AlertsService.lookupLocation(lat, lng)`, storing the result in a new `resolvedLocationNames` map keyed by field key; template shows the result as a `<p class="resolved-location">` under the map for `field.input === 'location'` fields | Reuses Get Alerts' Liberia county/district reverse-geocode lookup (`get-alerts/lookup-location`, see below) so the post-report location picker shows the same human-readable label Get Alerts does. Purely additive — no existing behavior changed, no new form control (display-only, not part of the submitted payload). |
| `apps/web-mzima-client/src/app/core/interfaces/menu.interface.ts` | New `authGuard?: boolean` field on `MenuInterface`, alongside the existing `adminGuard?: boolean` | Lets nav items be login-gated the same way `adminGuard`/`isHost` already gates admin-only items. |
| `apps/web-mzima-client/src/app/shared/components/fragments/menu-list-links/menu-list-links.component.ts` / `.html` | `authGuard: true` on the "Activity" menu entry; template `*ngIf` now also checks `(!item.authGuard \|\| isLoggedIn)` | PBO wants Activity visible only to authenticated users, not anonymous visitors. |
| `apps/web-mzima-client/src/app/shared/components/main/sidebar/sidebar.component.ts` / `.html` | Implements `OnInit`, calls `this.getUserData()`; `<app-submit-post-button>`'s `*ngIf` now also checks `&& isLoggedIn` | "Add new post" (renamed "Create Incident") was previously gated only by `checkAllowedAccessToSite()`, which is `true` for any non-private deployment regardless of login — anonymous visitors could reach the post form. `getUserData()` populates `isLoggedIn`, unused on this component before. |
| `apps/web-mzima-client/src/app/app.component.html` | Same `&& isLoggedIn` addition on the mobile bottom-nav `<app-submit-post-button>` | Same reasoning as sidebar — `AppComponent` already calls `getUserData()` in `ngOnInit()`, so no TS change was needed here. |
| `apps/web-mzima-client/src/app/shared/components/onboarding/onboarding.component.ts` | `hidden: !this.isLoggedIn` added to the "activity" onboarding step, matching the existing "settings" step | Once Activity is login-gated, the tour must skip pointing at it for anonymous users, same as it already does for the admin-only Settings step. |
| `apps/web-mzima-client/src/assets/locales/en.json` | `app.add_new_post` value changed from `"Add new post"` to `"Create Incident"` | Matches PBO's incident-reporting domain language. Only the English locale was changed; the key is used in exactly one place (`submit-post-button.component.html`). |
| `apps/web-mzima-client/src/app/map/map.component.ts` | In `onMapReady()`, adds an `L.control.layers()` (bottom-left, next to the zoom control) populated with "Clan" and "District" boundary overlays, built via a new `addBoundaryLayers()` method that fetches/parses `assets/shapefiles/liberia/administrative-levels.zip` with `shpjs` | Ports the old UNICC-fork `/dashboard/map` Clan/District toggle (`ireport/frontend/libs/features/ui/map/map.component.ts`'s `addShapefiles()`/`buildMap()`) — same shapefile, same `shpjs` library and approach, scoped to just the main map view. District is shown by default, Clan is an optional overlay (off by default), matching the old platform's `tenant_options.map_shapefiles` config. |
| `apps/web-mzima-client/src/assets/shapefiles/liberia/administrative-levels.zip` (new file) | Liberia Clan/County boundary shapefiles, copied as-is from `ireport/frontend/libs/assets/shapefiles/liberia/administrative-levels.zip` | Static asset consumed by the map component above; no backend involvement, matching the old platform's approach. |
| `apps/web-mzima-client/src/shpjs.d.ts` (new file) | `declare module 'shpjs';` | `shpjs` ships no type declarations; this app's TS config (unlike the old Angular 8 app's) errors on untyped imports, so a minimal ambient module shim is needed. |
| `package.json` | Added `shpjs` (boundary shapefile parsing) and `buffer` (browser `Buffer` polyfill) dependencies | `shpjs`'s dependency chain (via `jszip`) assumes Node.js `global`/`Buffer`, which this project's webpack 5 build (unlike the old app's webpack 4) no longer polyfills automatically. |
| `package.json` | Added `pdfmake` and `html2canvas` (PDF export) dependencies, and `@types/pdfmake` (devDependency) | Neither needed a `polyfills.ts` addition (unlike `shpjs`'s `jszip` chain above): `html2canvas` is browser-native DOM screenshotting, and `pdfmake`'s browser build (`pdfmake/build/pdfmake.js` + `vfs_fonts.js`) is precompiled and self-contained. |
| `apps/web-mzima-client/src/polyfills.ts` | `window.global = window; window.Buffer = Buffer;` (from the `buffer` package) | Required for `shpjs`/`jszip` to work in the browser under webpack 5 — see above. |
| `apps/web-mzima-client/src/app/shared/components/fragments/deployment-details/deployment-details.component.html` | Removed the `<span class="menu__logo"><img src=".../ushahidi-logo.svg" ...></span>` block (this component is shared by both the desktop sidebar and the mobile burger menu) | PBO wants the generic "Ushahidi" platform branding logo hidden — it's separate from the deployment's own logo/name (`<app-company-info>`, gated by `checkAllowedAccessToSite()`, still below it and unaffected). `ushahidi-logo.svg` itself is left in place (unused, harmless) rather than deleted. |
| `apps/web-mzima-client/src/app/shared/components/toolbar/toolbar.component.html` | Removed the `<app-language>...</app-language>` block from `.toolbar__controls` | iReport Liberia is a single-language (English) deployment — the language switcher serves no purpose. `language.component.ts`/`.html`/`.scss` and its `shared.module.ts` declaration/export are left in place (unused, harmless) rather than deleted. |
| `apps/web-mzima-client/src/app/shared/components/fragments/menu-list-non-links/menu-list-non-links.component.ts` | "Collections"/"Help & Support" items: `visible`/`forDesktop` changed from always-true (or `!private \|\| isLoggedIn`, always-true on this public deployment) to `this.isLoggedIn` for both | PBO wants these hidden for anonymous visitors, visible only once authenticated — same intent as the earlier Activity/Add-new-post login-gating. Reuses the component's own existing `forDesktop`-mirrors-`visible`-for-desktop convention (already used by the login/register item) rather than introducing a new mechanism. |
| `apps/web-mzima-client/src/app/core/services/search.service.ts` | `countrycodes: 'lr'` added to the Nominatim query params; `format` switched from `json` to `jsonv2` | The filter bar's location search should only surface Liberian results. `jsonv2` exposes the `addresstype` field the component below uses for granularity filtering; `lat`/`lon`/`display_name`/`boundingbox` are unchanged between formats. This service has exactly one consumer (`location-selection.component.ts`), so the restriction is hardcoded rather than made additive like `location-select.component.ts`'s `geocoderCountryCodes`. |
| `apps/web-mzima-client/src/app/shared/components/location-selection/location-selection.component.ts` | `addresstype` added to the `SearchResponse` interface; new `allowedAddressTypes` allowlist and `filterToLiberiaLocations()` applied to both the debounced search results and the `writeValue` reverse-lookup results before they reach `citiesOptions` | Restricts the filter bar's Location field to city/county/address-level results, per PBO request. The allowlist is deliberately inclusive (`town`/`village`/`hamlet`/`suburb`/`municipality` count as "city", `state` counts as "county") because live Nominatim queries show most Liberian settlements aren't literally tagged `city` in OSM (only Monrovia and Gbarnga are) and all 15 counties are tagged `state` (OSM admin_level 4) — a literal `city`/`county` match would break search for nearly everywhere outside the capital. |
| `apps/web-mzima-client/src/app/core/enums/roles.ts` | `Permissions.AccessAnalysis = 'Access analysis'` | New permission string, mirrors backend `Permission::ACCESS_ANALYSIS`. Exact string per PBO requirement, not the old UNICC fork's longer `Access analysis and filters section`. |
| `apps/web-mzima-client/src/app/core/guards/index.ts` | `export { AccessAnalysisGuard } from './access-analysis.guard';` | Barrel export, same convention as every other guard. |
| `apps/web-mzima-client/src/app/core/interfaces/menu.interface.ts` | New `permission?: string` field on `MenuInterface`, alongside `adminGuard?`/`authGuard?` | Generic per-permission nav-item gating, checked as `isLoggedIn && user.permissions?.includes(item.permission)`. Chosen over a one-off boolean (the `authGuard` precedent) because it means future permission-gated nav items are a one-line addition instead of a new boolean field + computed property + template clause each time. |
| `apps/web-mzima-client/src/app/shared/components/fragments/menu-list-links/menu-list-links.component.ts` / `.html` | New "Analysis" entry in `initNavigationMenu()` with `permission: Permissions.AccessAnalysis`; template `*ngIf` now also checks `(!item.permission \|\| (isLoggedIn && user.permissions?.includes(item.permission)))` | Analysis nav link visible only to logged-in users holding `Access analysis` — mirrors the existing `adminGuard`/`isHost` and `authGuard`/`isLoggedIn` clauses already on this line. |
| `apps/web-mzima-client/src/app/core/enums/icons.ts` | `chartBar = 'chart-bar'` | New nav icon for the Analysis link, same pattern as `warning`/`infoCircle`. |
| `apps/web-mzima-client/src/app/liberia/liberia.routes.ts` | Two new route entries (`analysis`, `analysis-templates`), each with `canActivate: [CombinedGuard]` and `data: { guards: [AccessAnalysisGuard] }` | Routes both new pages, gated identically to the nav link. |
| `apps/web-mzima-client/src/app/core/guards/combined.guard.ts` | Removed `async` from `canActivate()` and the `Promise<Observable<...>>` return type / `@ts-ignore`; now returns `Observable<boolean \| UrlTree>` directly | **Unrelated real bugfix**, found while testing the Analysis route guard live: `canActivate` was declared `async` while its body `return`ed an Observable (not awaited), so an `async` function auto-wraps that in a resolved `Promise`. Angular's router flattens a Promise-*or*-Observable guard result one level, but not "a Promise that resolves to an Observable" — so it received the inner Observable object itself as the "result", which is truthy and neither `false` nor `UrlTree`, and treated it as **allow**. Confirmed via direct testing: an unauthenticated session could load `/analysis` (a route with no other protection) with real data, while a `[HostGuard, AccessDeniedGuard, DeploymentFoundGuard]`-guarded route redirected correctly — that trio runs at the parent `/settings` route in `app-routing.module.ts` and had been masking `CombinedGuard`'s bug for every existing usage (all 11 are settings child routes, always nested under that outer guard). `/analysis`/`/analysis-templates` are the first top-level routes to rely on `CombinedGuard` alone, which is what surfaced it. Fix has no observable effect on any existing route (all were already blocked by their outer guard either way) and was verified against both a blocked (no permission) and allowed (admin) session after the change. |
| `libs/sdk/src/lib/services/index.ts` | 1 more barrel export | `AnalysisTemplatesService`. |
| `apps/web-mzima-client/src/assets/locales/en.json` | New `analysis` top-level translation key block | All Analysis/Analysis Templates page copy. |
| `apps/web-mzima-client/src/app/map/map.component.ts` / `.html` / `.scss`, `map.module.ts` | Adds a local `isLoading` flag set around the marker fetch in `getPostsGeoJson()` (including across recursive pagination), and an `<app-spinner>` overlay shown over the map while it's `true`; imports the stock `SpinnerModule` into `MapModule` | The Map view gave no feedback while markers were loading/re-loading (initial load, filter changes, large paginated result sets), unlike the Feed view which already has a spinner via `PostsService.isLoadingPosts$`. That subject is wired only into the Feed's `getPosts()` list endpoint, not the Map's `getGeojson()` call, so this uses local component state instead of extending the shared service — avoids any risk of regressing Feed's existing loading behavior. |

**Adding a new Liberia public page:** add an entry to
`apps/web-mzima-client/src/app/liberia/liberia.routes.ts`, create the
feature directory the same way as the existing three. Don't touch
`app-routing.module.ts` directly.

**Adding a new Liberia permission-gated page:** same as above, plus
`canActivate: [CombinedGuard]` and `data: { guards: [YourGuard] }` on the
route entry (see `analysis`/`analysis-templates` below), and a matching
`permission` value on the corresponding `menu-list-links` nav entry so the
link itself is hidden from users who'd otherwise hit the guard.

**Adding a new admin-editable setting:** prefer the About Us approach below
over inventing a new table/controller/route.

## About Us: reusing the stock config mechanism

Ushahidi already has a generic config store — `config` table, keyed by
`group_name`/`config_key`, exposed via stock `GET/PUT /api/v5/config/{group}`
and `/{group}/{key}` routes (`Ushahidi\Modules\V5\Models\Config`,
`Ushahidi\Modules\V5\Policies\ConfigPolicy`). About Us reuses this instead of
adding a bespoke `AboutUsController`/migration, consistent with the
thin-layer approach:

- Backend: `about_us` added to `Config::AVIALABLE_CONFIG_GROUPS`,
  `AVIALABLE_CONFIG_GROUPS_FOR_NON_ADMIN`, and `ConfigPolicy::$public_groups`
  (NOT `$readonly_groups`). Single key: `content` (plain text).
- **Do not add `about_us` (or any new key) to the `site` group.** A
  whole-group `PUT /api/v5/config/site` deletes any key present in the
  current config but absent from the submitted body
  (`UpdateConfigCommand::fromRequest`) — `GeneralComponent`'s save form
  doesn't know about extra keys, so they'd be silently wiped on every
  "Save General Settings". Dedicated groups don't have this problem since
  the delete logic is scoped per `group_name`.
- Frontend public page: `about-us/about-us.component.ts` calls
  `ConfigService.getByGroup('about_us')`.
- Frontend admin page: `settings/about-us-content/about-us-content.component.ts`
  calls `ConfigService.getByGroup('about_us')` to load and
  `ConfigService.update('about_us', { content })` to save — the existing
  whole-group `update()` works unmodified because the group only ever has
  one key.

## Analysis / Analysis Templates

Replaces the old UNICC fork's `/dashboard/analysis` (an inner "Dashboard" +
"Analysis" tabbed page) and `/dashboard/analysis-templates`. The old
platform used the commercial **Flexmonster** pivot-table widget for its
report builder — that is *not* ported; charts use `@swimlane/ngx-charts`
(already a project dependency, used by the stock `activity/bar-chart`
component) and tabs use `mat-tab-group`. Parity with Flexmonster's
arbitrary drag-and-drop pivoting is instead achieved via a working
per-attribute group-by (see the `EloquentPostRepository.php` row in
`ushahidi-api/LIBERIA_CUSTOM.md`), multi-chart reports (an array of
single-dimension charts, rather than one arbitrary 2D crosstab), and a
small embedded choropleth map view. PDF export (`pdfmake` + `html2canvas`,
the same two open-source libraries the old platform used) **is** ported.

New isolated files (no stock-file diff beyond the table above):

| File | Purpose |
|---|---|
| `apps/web-mzima-client/src/app/core/guards/access-analysis.guard.ts` | Route guard checking `Permissions.AccessAnalysis` from `localStorage`, same pattern as `manage-settings.guard.ts`. |
| `apps/web-mzima-client/src/app/analysis/**` | `/analysis` page — a `mat-tab-group` shell (`analysis.component.ts`) with a **Dashboard** tab (total reports stat, reports-by-county pie chart, monthly + daily reports-trend line charts with prev/next year/month navigation, an All/Custom date-filter mode, and an independent survey selector scoping just the trend charts) and a **Report Builder** tab (ad-hoc filter/group-by/chart-type builder against `GET posts/stats`, with status/tag filters, a dynamic per-survey attribute picker, multi-chart reports via "+ Add another chart", a "Show map" toggle, PDF export, and "Save as Template" / "Load Template"). Includes `save-template-dialog/` (name a new template) and `report-map/` (the map toggle's embedded choropleth, see below). |
| `apps/web-mzima-client/src/app/analysis/analysis-pdf-export.service.ts` | `html2canvas` snapshot of the report container → `pdfmake` PDF, download. Ports the old platform's `post-analysis.component.ts`'s `generatePdf()`. |
| `apps/web-mzima-client/src/app/analysis/report-map/**` | Small, standalone Leaflet choropleth (not a reuse of the full page-level `MapComponent`, which is wired to global filter/results state) for the Report Builder's "Show map" toggle — colors counties/districts by report count. Reuses the same `assets/shapefiles/liberia/administrative-levels.zip` asset and `shpjs` parsing approach as `map.component.ts`'s `addBoundaryLayers()`. Purely presentational, driven by `@Input() charts`. |
| `apps/web-mzima-client/src/app/analysis-templates/**` | `/analysis-templates` page — lists all saved templates (`AnalysisTemplatesService`), with Apply (deep-links to `/analysis?template=<id>`), Edit (`rename-template-dialog/`), and Delete (via the stock `ConfirmModalService`) actions. |
| `libs/sdk/src/lib/services/analysis-templates.service.ts` | CRUD SDK client for `analysis_templates` (`v5/analysis-templates`), generic `ResourceService<T>`-based, same shape as `alerts.service.ts`. Also exports the `AnalysisChartConfig`/`AnalysisChartType`/`AnalysisGroupBy` types shared by `analysis/` and `analysis-templates/` (one chart panel's config; a template's `report_config` is `AnalysisChartConfig[]`). |
| `apps/web-mzima-client/src/assets/icons/chart-bar.svg` | Nav icon, same style/viewBox as the other icons in this set. |

**Multi-chart template shape**: a saved template's `report_config` field
(`AnalysisChartConfig[]`) is an array of `{group_by, group_by_attribute_key?,
chart_type}`, one entry per chart panel — the ngx-charts equivalent of the
old platform's "+ Add more charts". `status_filter`/`tags_filter` are
template-wide (apply to every chart in `report_config`), mirroring the old
platform's `FilterCriteria` having `region`/`category` as siblings of
`reportConfig[]` rather than nested inside it. See the
`20260702000001_liberia_analysis_templates_multi_chart.php` row in
`ushahidi-api/LIBERIA_CUSTOM.md` for the backend schema this maps to, and
`migration/migrate-liberia-analysis-templates.php` (same repo) for how the
old platform's Flexmonster-JSON templates were best-effort ported into this
shape.

**Dashboard trend-chart caveat**: the old platform had a dedicated
`posts/dashboardtrend` backend endpoint taking literal `date_month`/
`date_year` params. The new stack has no equivalent, so
`analysis-dashboard-tab.component.ts`'s monthly/daily trend charts
approximate it via `posts/stats`'s `timeline`/`timeline_interval`
bucketing, bounded by `created_after`/`created_before` for the selected
year (monthly chart) or month (daily chart). `timeline_interval: 2629800`
(≈1 calendar month in seconds) for the monthly chart is an approximation,
not exact calendar-month buckets — acceptable for a 12-point yearly trend,
but worth knowing if bucket boundaries ever look off by a day near
month-end.

Both pages are gated end-to-end: nav link hidden unless
`isLoggedIn && Access analysis` (see `menu-list-links` row above), routes
guarded client-side by `AccessAnalysisGuard`, and the templates CRUD API
itself re-checks the same permission server-side
(`AnalysisTemplateController::requireAccessAnalysis()` in the sibling
`ushahidi-api` fork — see its `LIBERIA_CUSTOM.md`) — the frontend guard
alone is not the security boundary.

`posts.mgmt_lev_1`/`mgmt_lev_2` (county/district) already existed
server-side for Get Alerts/LERN import but weren't exposed via the posts
API; the backend fork adds them to `Post::ALLOWED_FIELDS` (not
`$fillable` — that governs mass-assignment, not field selection) so the
Analysis dashboard's county chart can read them from `GET /api/v5/posts`.

Two things worth knowing if you touch the county/district fetch
(`loadCountyBreakdown()` in `dashboard-tab/`, `previewByLocation()` in
`report-builder-tab/`), found while testing against the real ~5,700-post
dataset:
- `PostsService.searchPosts(url, query, params)` always merges a `q` param
  in; pass `query` as `''`, never `undefined` — Angular's `HttpClient`
  serializes an `undefined` param value as the literal string
  `"undefined"`, which the backend's full-text search then treats as a
  real (zero-match) search term, silently returning an empty result set.
- The fetch requests `only: 'id,mgmt_lev_1'` (a stock sparse-fieldset
  param, `Post::ALLOWED_FIELDS`-backed) rather than full post objects.
  Fetching ~5,700 full posts (media/translations/allowed_privileges/etc.)
  in one request exhausts this deployment's 128MB PHP `memory_limit`
  server-side (`500` with no body); the lean fieldset keeps the payload
  small regardless of dataset size.

## get-alerts / contact-us backend

Backend routes for `get-alerts`/`contact-us`/`lern-import` live in the
sibling `ushahidi-api` fork's `src/Ushahidi/Modules/V5/routes/liberia.php`,
loaded via a 6-line addition to `ServiceProvider.php::boot()`. Same
isolation principle: one separate route file, registered once.

## Staying in sync with upstream

```bash
git fetch upstream
git merge upstream/development   # or upstream/develop for ushahidi-api
```

Expect conflicts only in the small number of stock files listed above —
everything else is additive, isolated directories.
