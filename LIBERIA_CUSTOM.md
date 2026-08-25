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
| `apps/web-mzima-client/src/app/core/helpers/map.ts` | Removed `mapboxStaticTiles()` and its `EnvService` import; the `satellite`/`MapQuestAerial`/`streets`/`MapQuest` baselayers (previously all Mapbox, gated on `EnvService.ENV.mapbox_api_key`) now come from new `esriSatelliteTiles()`/`osmStreetsTiles()` helpers pointing at Esri World Imagery and standard OpenStreetMap tiles instead. `hOSM` is unchanged. All 5 `code` keys are preserved so any existing `mapConfig.default_view.baselayer` value keeps resolving | Production tiles were failing (Mapbox 503s, empty `access_token`) because `MAPBOX_API_KEY` was never set in `deploy/.env` on the VPS — the app was otherwise silently relying on Ushahidi's shared public "OSS demo" Mapbox token (hardcoded in `environment.ts`/`environment.prod.ts`/`env.json`), which is prone to exactly this kind of throttling/rejection. Rather than provision and maintain a real Mapbox account, switched to free/keyless tile providers — mirroring how the old UNICC fork (`ireport/frontend/libs/features/ui/map/map.component.ts`) already did this successfully with plain OSM tiles. `mapbox_api_key` is left as unused dead config in `EnvService`/`env.json`/`deploy/.env.example` rather than ripped out everywhere, to keep this diff minimal. |
| `apps/web-mzima-client/src/app/post/post-metadata/post-metadata.component.html` | New `post-info__item` span showing `post.id`, first item in the metadata line | Incident ID wasn't visible anywhere in the UI post-migration (it was on the legacy platform). `post-preview.component.html`/`post-details.component.html` both mount this one shared component unmodified for the list-item card and the detail view respectively, so this single addition covers both. |
| `apps/web-mzima-client/src/assets/locales/en.json` | New `post.id` key: `"ID: {{id}}"` | i18n string for the post-metadata ID span above, same `{{placeholder}}` convention as the adjacent `post.source` key. |
| `apps/web-mzima-client/src/app/settings/categories/create-category-form/create-category-form.component.html` / `.ts` / `.scss` | New `genericFormErrors` getter + a generic error banner rendering any `failed_validations` entry whose `field !== 'tag'` | The category edit form only ever rendered `tag`-field validation errors; a real backend validation failure on `role` (`child_parent_role_match`, fired when assigning a parent whose role differs) had no UI at all. Discovered while root-causing why parent assignment silently failed to persist for ~13 duplicate-named migrated categories (their `tag` uniqueness failure was the primary blocker, but this errors-are-invisible gap made *any* backend validation rejection on this form undiagnosable) — see `ushahidi-api/LIBERIA_CUSTOM.md`'s dedup migration entry. |
| `apps/web-mzima-client/src/app/settings/categories/categories.component.html` | Changed `category.parent.slug` to `category.parent?.slug` in the nested child's `[data-qa]` binding | Defensive null-safety for a stock backend bug (see `ushahidi-api/LIBERIA_CUSTOM.md`'s `Category::children()` entry): a category's `parent` object could be missing from the API response depending on resolution order, and the unguarded property access threw during change detection, blanking that category's entire row in the Settings → Categories tree. The backend fix addresses the root cause; this keeps a `[data-qa]` test-hook attribute from ever being able to crash real rendering again. |
| `docker/nginx.default.conf` | New `location /assets/locales/ { add_header Cache-Control "no-cache"; }` block | Confirmed live on production: this file had no `Cache-Control` header at all, so browsers applied their own heuristic caching and kept serving a stale, pre-deploy copy of `en.json` (missing the just-added `post.id` key above) without ever revalidating — even though the server's actual content was already correct. Same category of file as `/index.html`/`/env.json` just above (static path, no content hash, content can change between deploys) — those two already get `no-cache` upstream (`3a8f01e2 "chore(docker): mark non-cacheable resources"`), `assets/locales/` was just never added to that list. `no-cache` (not `no-store`) still lets browsers cache the response but forces revalidation via ETag/Last-Modified on every use. |
| `libs/sdk/src/lib/models/posts.interface.ts` | New `IncidentStatus` enum (alongside the existing `PostStatus`); `incident_status`/`'incident_status[]'` fields added to `PostResult`/`PostPropertiesInterface`/`GeoJsonFilter` | Admin-only Incident Status field, independent of `PostStatus`. Single source of truth every consumer below imports from — see the "Incident Status" section below for why it's decoupled from `status` rather than folded into `PostStatus`. |
| `libs/sdk/src/lib/services/posts.service.ts` | `updateIncidentStatus(id, incidentStatus)` method, next to the existing `updateStatus()`; `postParamsMapper()` gained a `incident_status` → `incident_status[]` block, same shape as the existing `tags`/`tags[]` one | Write path and filter-query-param mapping for the new field. |
| `apps/web-mzima-client/src/app/core/enums/roles.ts` | `Permissions.SetIncidentStatus = 'Set incident status'` | New permission string, mirrors backend `Permission::SET_INCIDENT_STATUS`, same convention as `Permissions.AccessAnalysis`. |
| `apps/web-mzima-client/src/app/post/post.module.ts` | Declares the new `IncidentStatusComponent` | Module registration for the new isolated component (below). |
| `apps/web-mzima-client/src/app/post/post-head/post-head.component.ts` / `.html` | Mounts `<app-incident-status>` as its own element (not inside the existing Publish/Put-under-review/Archive `mat-menu`), gated by `user?.permissions?.includes(Permissions.SetIncidentStatus)`; new `onIncidentStatusChanged()` handler mirrors the existing `publish()`/`archive()` `EventBusService.next({ type: EventType.StatusChange, ... })` pattern | Surfaces the new control as a genuinely separate, permission-gated element from the stock status menu, per PBO requirement that Incident Status and Publish/Archive stay independently settable. |
| `apps/web-mzima-client/src/app/post/post-metadata/post-metadata.component.html` / `.scss` | New `post-info__incident-status` badge, `*ngIf="post.incident_status"`, same structural pattern as the existing `post-info__status` chip | Shows the current Incident Status value without opening the edit control; already refreshes automatically via this component's existing `EventType.StatusChange` subscription (no new wiring needed there). |
| `apps/web-mzima-client/src/app/core/helpers/search-form.ts` | New `incidentStatuses` array (imports `IncidentStatus` from the SDK rather than redeclaring values); `incident_status: [[]]` added to `DEFAULT_FILTERS` | Data source for the new filter-sidebar section below; the codebase already has one local-enum-duplication mistake (`data-import.component.ts`'s own `PostStatus`) that this avoids repeating. |
| `apps/web-mzima-client/src/app/shared/components/search-form/search-form.component.ts` / `.html` | New `incidentStatuses` property (populated only when `isLoggedIn && user.permissions?.includes(Permissions.SetIncidentStatus)`, mirroring the existing `statuses`/`loggedOutStatuses` swap in `loadData()`); one more `<app-filter-control formControlName="incident_status">` block, reusing the existing generic `filter-control` component unmodified; `getActiveFilters()` gained an `'incident_status[]'` entry, gated by `this.incidentStatuses.length` (not just forwarding `values.incident_status` unconditionally) | Admin-only "Incident Status" filter section, separate from the existing "Status" filter. The `incidentStatuses.length` gate on `getActiveFilters()` matters even though the section is UI-hidden for unprivileged users: `MainViewComponent` (base of `FeedComponent`/`MapComponent`) restores its own `params` straight from the same `USH_filters` `localStorage` key on construction and feeds it through `PostsService.applyFilters()` with no permission awareness at all — found live, a stale `incident_status` value cached during an earlier admin session in the same browser otherwise leaks into a logged-out visitor's request. The real fix is the matching backend permission gate on the search filter itself (see `ushahidi-api/LIBERIA_CUSTOM.md`'s `EloquentPostRepository` entry) — this frontend gate is defense-in-depth, not the boundary. |
| `libs/sdk/src/lib/helpers/api.ts` | `incident_status` added to `ONLY.NEEDED_POSTS_LIST_PROPERTIES` | The feed/data-view list request explicitly whitelists which fields it fetches per post (unlike the single-post `GET /posts/{id}` call, which returns everything `Post::ALLOWED_FIELDS` allows). Without this, the Incident Status dropdown/badge showed correctly on the single-post detail view but not on feed list cards. |
| `apps/web-mzima-client/src/assets/locales/en.json` | New top-level `incident_status` block (`label`/`not_set`/`verification_in_progress`/`unverified`/`verified`/`responded`/`evaluated`); `global_filter.incident_status` key added next to the existing `global_filter.status` | i18n strings for the control, badge, and filter section above. |

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
platform's report builder used the commercial **Flexmonster** pivot-table
widget. This was first re-approximated with `@swimlane/ngx-charts` alone
(no real pivoting), then rebuilt around **WebDataRocks**
(`@webdatarocks/ngx-webdatarocks`) — the free sibling product from the
same vendor as Flexmonster, chosen specifically because Flexmonster itself
is commercial. WebDataRocks gives genuine arbitrary drag-and-drop
rows/columns/measures pivoting, matching the old platform far more closely
than the chart-picker approach did. The **Dashboard** tab is unaffected by
any of this — it never used Flexmonster (the old platform's equivalent was
a separate Chart.js-based `DashboardComponent`) and still uses
`@swimlane/ngx-charts`.

**WebDataRocks license constraints — do not try to work around these:**
- **Hard 1MB data-payload cap**, enforced in the library's own proprietary
  code (confirmed via its license agreement: "you may not... modify any
  limitations included in Proprietary Code, including the 1 MB limitation
  on the data size loaded to WebDataRocks"). This is why a dedicated lean
  backend endpoint exists (`PivotDataController`, see
  `ushahidi-api/LIBERIA_CUSTOM.md`) instead of feeding it stock post data.
- **"WebDataRocks.com" branding cannot be hidden** without a paid
  Flexmonster license (visible bottom-right of every pivot grid). Do not
  attempt to hide/remove it via CSS — that violates the license terms this
  deployment relies on to use the tool for free.
- WebDataRocks is **grid-only** — unlike paid Flexmonster, it has no
  built-in chart rendering. The Report Builder is a pivot table, not a
  chart; if PBO ever wants chart visuals *from* pivoted data, that needs a
  separate charting library wired to WebDataRocks' data events — not
  attempted here.

New isolated files (no stock-file diff beyond the table above):

| File | Purpose |
|---|---|
| `apps/web-mzima-client/src/app/core/guards/access-analysis.guard.ts` | Route guard checking `Permissions.AccessAnalysis` from `localStorage`, same pattern as `manage-settings.guard.ts`. |
| `apps/web-mzima-client/src/app/analysis/**` | `/analysis` page — a `mat-tab-group` shell (`analysis.component.ts`) with a **Dashboard** tab (total reports stat, reports-by-county pie chart, monthly + daily reports-trend line charts with prev/next year/month navigation, an All/Custom date-filter mode, and an independent survey selector scoping just the trend charts) and a **Report Builder** tab: a required survey picker + date range + status/tag filters, a "Load data" button, one or more `<app-wbr-pivot>` panels ("+ Add another pivot"), a "Show map" toggle, and "Save as Template" / "Load Template". PDF/Excel/HTML export is WebDataRocks' own built-in toolbar feature — no custom export code. Includes `save-template-dialog/` (name a new template) and `report-map/` (the map toggle's embedded choropleth, see below). |
| `apps/web-mzima-client/src/app/analysis/report-map/**` | Small, standalone Leaflet choropleth (not a reuse of the full page-level `MapComponent`, which is wired to global filter/results state) for the Report Builder's "Show map" toggle — colors counties/districts by report count, with a County/District toggle of its own. Reuses the same `assets/shapefiles/liberia/administrative-levels.zip` asset and `shpjs` parsing approach as `map.component.ts`'s `addBoundaryLayers()`. Purely presentational, driven by `@Input() countyData`/`@Input() districtData` (pre-aggregated counts computed client-side from the same pivot-data fetch — not tied to whatever dimensions a pivot's slice currently has, so it works regardless of what the user has dragged into rows/columns). |
| `apps/web-mzima-client/src/app/analysis-templates/**` | `/analysis-templates` page — lists all saved templates (`AnalysisTemplatesService`), with Apply (deep-links to `/analysis?template=<id>`), Edit (`rename-template-dialog/`), and Delete (via the stock `ConfirmModalService`) actions. |
| `libs/sdk/src/lib/services/analysis-templates.service.ts` | CRUD SDK client for `analysis_templates` (`v5/analysis-templates`), generic `ResourceService<T>`-based, same shape as `alerts.service.ts`. `AnalysisTemplate.report_config` is typed loosely (`any[]`) — its shape is a WebDataRocks `Report` object (library-defined, see `@webdatarocks/webdatarocks`'s own types), not something this codebase models. |
| `libs/sdk/src/lib/services/analysis-pivot-data.service.ts` | SDK client for `GET v5/analysis-pivot-data` (`PivotDataController`, see `ushahidi-api/LIBERIA_CUSTOM.md`) — lean flat per-post rows for the pivot table. Converts `status`/`tags` array params to the `status[]`/`tags[]` query-key convention (see `PostsService.postParamsMapper()`) internally, so callers just pass plain arrays. |
| `apps/web-mzima-client/src/assets/icons/chart-bar.svg` | Nav icon, same style/viewBox as the other icons in this set. |
| `package.json` | `pdfmake`/`html2canvas`/`@types/pdfmake` (from the first ngx-charts-based build) removed — no longer needed now that WebDataRocks' own toolbar handles export. `@webdatarocks/ngx-webdatarocks` added (pulls in `@webdatarocks/webdatarocks` as a dependency automatically). |
| `src/styles.scss` | `@import '~@webdatarocks/webdatarocks/webdatarocks.min.css';` added, same `~`-prefixed node_modules import convention already used for `quill`/`leaflet-control-geocoder` above it in the same file. |

**Report Builder data flow**: survey selection is **required** (not
optional "All surveys") — the pivot needs one survey's attribute set and a
bounded row count. "Load data" calls `AnalysisPivotDataService.list()`,
which returns `{count, total, truncated, results}` — `results` is an array
of flat `{ "Post ID", "Status", "Date", "Title", "County", "District",
<attribute label>: value, ... }` objects, one per post. WebDataRocks
**auto-detects pivotable fields from the data's own keys** — there is no
separate "attribute picker" UI or field-discovery code on the frontend
(unlike the first ngx-charts-based build, which had to fetch a survey's
fields separately to populate a group-by dropdown); whatever keys exist in
`results[0]` become draggable fields in WebDataRocks' own Fields panel.

**Multi-pivot template shape**: a saved template's `report_config` is an
array of WebDataRocks `Report` objects (each `{slice, options, ...}`, with
`dataSource` always stripped before saving — data is never persisted, only
re-fetched live on apply), one per `<app-wbr-pivot>` panel — the direct
equivalent of the old platform's "+ Add more charts" and, because
WebDataRocks' `slice.rows[]`/`columns[]`/`measures[]` shape closely matches
Flexmonster's own, a much higher-fidelity migration target than the
previous single-dimension `{group_by, chart_type}` shape was (see
`migration/migrate-liberia-analysis-templates.php` in the sibling
`ushahidi-api` repo). `status_filter`/`tags_filter` are template-wide
(apply to every pivot in `report_config`), mirroring the old platform's
`FilterCriteria` having `region`/`category` as siblings of `reportConfig[]`
rather than nested inside it.

**Two library-integration bugs found via live manual testing against the
real backend (not caught by `tsc`/`eslint`/build — WebDataRocks' JS runs
fine at compile time and only fails at runtime), fixed, and worth knowing
if you touch this code:**
- **Never call `getReport()` immediately after the `(ready)` event fires** —
  it throws inside the minified library (`TypeError: Cannot read
  properties of undefined`). `ready` fires as soon as the JS constructor
  returns, but the pivot's own internal state isn't fully settled yet.
  `saveAsTemplate()` wraps its `getReport()` call in try/catch (falls back
  to the pivot's last-known report) for this reason — a real save shortly
  after user interaction is very unlikely to hit the race, but it's cheap
  insurance.
- **`updateData()` does not reliably preserve a pre-configured `slice`**
  when transitioning a pivot from empty data to populated data — confirmed
  by manually applying a saved template (specific `slice.columns`
  configured) and watching WebDataRocks silently replace it with its own
  auto-generated default once real data arrived via `updateData()`. The
  fix (`loadData()` in `analysis-report-builder-tab.component.ts`):
  **always construct a fresh `<app-wbr-pivot>` with the data already baked
  into its initial `report` input**, rather than mounting an empty pivot
  and patching data in afterward. Each pivot's current slice is preserved
  across reloads by reading it live via `getReport()` where an instance is
  already mounted (e.g. changing the date filter and reloading), falling
  back to the last-known `initialReport.slice` otherwise (e.g. applying a
  template, where no instance exists yet). `<app-wbr-pivot>`'s own
  `[report]` `@Input()` is only ever read once, at its `ngOnInit()` (see
  `ngx-webdatarocks.component.mjs` — no `ngOnChanges` handling), which is
  exactly why this can't be fixed by just reassigning the input.
- Relatedly: **`AnalysisComponent` needs `[selectedIndex]` wired to the
  `?template=` query param.** `/analysis-templates`'s "Apply" action
  navigates to `/analysis?template=<id>`, which `AnalysisReportBuilderTabComponent`
  reads in its own `ngOnInit()` — but `mat-tab-group` doesn't mount
  inactive tab content, and Dashboard (index 0) is the default tab, so a
  fresh navigation would land on Dashboard and the Report Builder
  component (and its template-apply logic) would never even be created.
  `AnalysisComponent`'s constructor now sets `selectedTabIndex = 1`
  whenever the query param is present, verified live end-to-end (save a
  template → apply it via a fresh navigation → both filters and the
  pivot's slice come back correctly, re-populated with live data).

Both pages are gated end-to-end: nav link hidden unless
`isLoggedIn && Access analysis` (see `menu-list-links` row above), routes
guarded client-side by `AccessAnalysisGuard`, and the templates/pivot-data
APIs themselves re-check the same permission server-side
(`AnalysisTemplateController`/`PivotDataController`'s
`requireAccessAnalysis()` in the sibling `ushahidi-api` fork — see its
`LIBERIA_CUSTOM.md`) — the frontend guard alone is not the security
boundary.

`posts.mgmt_lev_1`/`mgmt_lev_2` (county/district) already existed
server-side for Get Alerts/LERN import but weren't exposed via the posts
API; the backend fork adds them to `Post::ALLOWED_FIELDS` (not
`$fillable` — that governs mass-assignment, not field selection) so the
Analysis dashboard's county chart can read them from `GET /api/v5/posts`.

One thing worth knowing if you touch the Dashboard tab's county fetch
(`loadCountyBreakdown()` in `dashboard-tab/` — the Report Builder's
equivalent now goes through `PivotDataController` instead, see above),
found while testing against the real ~5,700-post dataset:
`PostsService.searchPosts(url, query, params)` always merges a `q` param
in; pass `query` as `''`, never `undefined` — Angular's `HttpClient`
serializes an `undefined` param value as the literal string `"undefined"`,
which the backend's full-text search then treats as a real (zero-match)
search term, silently returning an empty result set.

## Incident Status

Restores the legacy UNICC fork's "Incident Status" workflow field (its 6-button status
group — Pending/Verification in progress/Unverified/Verified/Responded/Evaluated — plus a
*separate* publish on/off switch decoupled from that group), which had no equivalent on
this fork. Not admin-only in legacy — see the matching "Incident Status" section in
`ushahidi-api/LIBERIA_CUSTOM.md` for the full role allowlist
(`admin`/`super`/`Management User`/`operatoruser`) this fork now matches via
`20260824000001_liberia_extend_incident_status_permission_roles.php`; the frontend gate
below (`user.permissions?.includes(Permissions.SetIncidentStatus)`) was already
role-agnostic and needed no change to honor the wider grant. Confirmed live in the old fork's
`post-detail-actions.component.html`/`.ts`: an incident's workflow status and its
public-visibility state are two independent controls there, not one. This fork's
stock `status` (published/draft/archived) is a single mutually-exclusive value that
also drives visibility — folding the new values into it would have broken that
independence — so Incident Status is instead a brand-new, fully independent
`incident_status` field end to end (new DB column, new SDK enum/field, new
permission-gated control), never touching the stock Publish/Put-under-review/Archive
workflow. See the
matching "Incident Status" section in `ushahidi-api/LIBERIA_CUSTOM.md` for the backend
half (new column, permission, patch-endpoint extension, and — importantly — a
read-side permission gate on the search filter, not just the write path).

The permission-gated control (`apps/web-mzima-client/src/app/post/incident-status/`, a new
isolated component) is mounted as its own element in `post-head.component.html`,
deliberately *not* inside the existing Publish/Put-under-review/Archive `mat-menu` —
per PBO's explicit requirement that the two stay independently settable and visible.
Current value is also shown as a small badge in `post-metadata.component.html` (same
`post-info__status`-style chip pattern, new `post-info__incident-status` sibling), and
is filterable via its own "Incident Status" section in the filter sidebar, separate
from the existing "Status" filter — all three surfaces gated by
`user.permissions?.includes(Permissions.SetIncidentStatus)`.

**Worth knowing if you touch this code:** `MainViewComponent` (the shared base of
`FeedComponent`/`MapComponent`) restores cached filters straight from the
`USH_filters` `localStorage` key at construction time and pushes them through
`PostsService.applyFilters()` with no permission awareness — a stale `incident_status`
value cached during an earlier admin session in the same browser can otherwise leak
into what an unprivileged/logged-out visitor's request asks for. The frontend gates
this defensively (`search-form.component.ts`'s `getActiveFilters()`), but the actual
enforcement boundary is server-side: `EloquentPostRepository::setSearchCondition()`
only applies the `incident_status` `whereIn` for a user who holds `Set incident
status`, the same enforcement model `setGuestConditions()` already uses to force
`status='published'` for guests regardless of what they ask for — see
`ushahidi-api/LIBERIA_CUSTOM.md`.

## get-alerts / contact-us backend

Backend routes for `get-alerts`/`contact-us`/`lern-import` live in the
sibling `ushahidi-api` fork's `src/Ushahidi/Modules/V5/routes/liberia.php`,
loaded via a 6-line addition to `ServiceProvider.php::boot()`. Same
isolation principle: one separate route file, registered once.

## Staying in sync with upstream

Merge from upstream's latest **release** branch, not `development` (or `develop` for
`ushahidi-api`) — `development` moves continuously and pulls in unreviewed/unreleased work,
whereas a `release/*` branch is a stable, tagged snapshot. Check
`https://github.com/ushahidi/platform-client-mzima/branches` (or `git branch -a | grep
release/`) for the newest one before merging; as of this writing that's `release/2026.21`
(`release/2025.04` for `ushahidi-api`).

```bash
git fetch upstream
git merge upstream/release/2026.21   # replace with whatever is newest; release/2025.04 for ushahidi-api
```

Locale files (`src/assets/locales/*.json`) are the one place conflicts are expected on every
sync even outside the stock-file list — Transifex bot commits land on `development` between
release cuts, so our branch's translations for a key are often newer/more complete than a
release branch's snapshot of the same key. Resolve those by keeping our side (`HEAD`), not
upstream's.

Expect conflicts otherwise only in the small number of stock files listed above —
everything else is additive, isolated directories.
