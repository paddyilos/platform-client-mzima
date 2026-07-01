# Liberia PBO Custom Features

This fork of `ushahidi/platform-client-mzima` carries a small set of custom
public pages built for the Liberia Peacebuilding Office (PBO): **Get Alerts**,
**Contact Us**, and **About Us**. They replace the equivalent pages on the
old UNICC fork (`/dashboard/get-alerts`, `/dashboard/about-us`,
`/dashboard/contact-us`), now served flat at `/get-alerts`, `/about-us`,
`/contact-us`.

See `ireport/docs/MIGRATION_PLAN.md` (Phase 3) in the parent repo for the
full migration background.

## The pattern: minimize the stock-file diff

Every custom page lives in its own self-contained directory
(`get-alerts/`, `contact-us/`, `about-us/`) — module, routing module,
component. None of them import shared layout components or guards, so they
have no dependency surface beyond Angular Material and the SDK.

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
| `apps/web-mzima-client/src/polyfills.ts` | `window.global = window; window.Buffer = Buffer;` (from the `buffer` package) | Required for `shpjs`/`jszip` to work in the browser under webpack 5 — see above. |

**Adding a new Liberia public page:** add an entry to
`apps/web-mzima-client/src/app/liberia/liberia.routes.ts`, create the
feature directory the same way as the existing three. Don't touch
`app-routing.module.ts` directly.

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
