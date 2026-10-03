# Contract: Save format v2 (`localStorage["ccxd3d.save"]`)

```json
{
  "version": 2,
  "levels": {
    "1": { "stars": 3, "best": 1000, "secret": false },
    "40": { "stars": 2, "best": 912, "secret": false }
  },
  "settings": { "muted": false }
}
```

| Field | Type | Rules |
|-------|------|-------|
| `version` | integer | `2`. A `1` save (28-level campaign) is migrated as it is (FR-085); other values → fresh start. |
| `levels` | object | Keys are level numbers `"1"`, `"2"`, … with no upper limit (≤ 999 999); other keys are dropped. |
| `levels[n].stars` | integer 0–3 | Best stars ever (never decreases). |
| `levels[n].best` | integer ≥ 0 | Best score ever (never decreases). |
| `levels[n].secret` | boolean | `true` once the secret detour was taken with a perfect payload (F-012). |
| `settings.muted` | boolean | Sound off when `true`. |

## Rules

- **Unlocking is derived**, never stored: level 1 is always unlocked; level `n > 1` is unlocked
  when level `n − 1` has `stars ≥ 1` (FR-047). The map reaches one world past the furthest
  unlocked level.
- **Parsing**: any JSON error, wrong type or out-of-range value → the whole save is replaced by
  the default `{ version: 2, levels: {}, settings: { muted: false } }` (FR-050). Never throws.
- **Writing**: after every delivered run and every settings change; failures are swallowed and
  surface once as the "progress will not be kept" notice.
- **Availability probe**: on boot, write and remove `ccxd3d.probe`; failure → notice + in-memory
  save for the session.
- `?reset=1` clears the key (test/debug helper).
