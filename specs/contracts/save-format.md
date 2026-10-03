# Contract: Save format v1 (`localStorage["ccxd3d.save"]`)

```json
{
  "version": 1,
  "levels": {
    "1": { "stars": 3, "best": 1000, "secret": false },
    "22": { "stars": 3, "best": 1300, "secret": true }
  },
  "settings": { "muted": false }
}
```

| Field | Type | Rules |
|-------|------|-------|
| `version` | integer | Must be `1`. Other values → treated as corrupt (fresh start), unless a migration exists. |
| `levels` | object | Keys are level numbers `"1"`–`"28"`; unknown keys are dropped. |
| `levels[n].stars` | integer 0–3 | Best stars ever (never decreases). |
| `levels[n].best` | integer ≥ 0 | Best score ever (never decreases). |
| `levels[n].secret` | boolean | `true` once the secret route was taken (levels 22–28 only). |
| `settings.muted` | boolean | Sound off when `true`. |

## Rules

- **Unlocking is derived**, never stored: level 1 is always unlocked; level `n > 1` is unlocked
  when level `n − 1` has `stars ≥ 1` (FR-047). A biome is open when its first level is unlocked.
- **Parsing**: any JSON error, wrong type or out-of-range value → the whole save is replaced by
  the default `{ version: 1, levels: {}, settings: { muted: false } }` (FR-050). Never throws.
- **Writing**: after every delivered run and every settings change; failures are swallowed and
  surface once as the "progress will not be kept" notice.
- **Availability probe**: on boot, write and remove `ccxd3d.probe`; failure → notice + in-memory
  save for the session.
- `?reset=1` clears the key (test/debug helper).
