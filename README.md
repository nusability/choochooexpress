# Choo Choo Express Delivery 3D

A cozy toy-train puzzle game for mobile browsers, built with three.js and Rapier.

Flip track switches to send a toy train under the right factory hoppers in the right order, fill
the wagons without spilling a pile onto the rails, and deliver the Toy Store's order. 28 levels
across four biomes: Living Room Rug, Candy Kingdom, Garden Sandbox and Space Playroom. Every
level is generated from a fixed seed, and the Space Playroom levels hide a faster secret route.

**Play:** <https://nusability.github.io/choochooexpress/> (published from `main`). Made for
phones in portrait (reference device: iPhone 16); landscape and desktop work too.

## Development

Requires Node 22.12+.

```sh
npm ci
npm run dev        # http://localhost:5173 (add -- --host to open it on a phone on the same Wi-Fi)
npm run check      # typecheck + lint + unit tests + production build
npm run test:e2e   # Playwright smoke tests (mobile emulation) against the production build
```

Handy URL parameters: `?level=12` (open an unlocked level), `?autoplay=1` (the train drives the
standard route itself), `?speed=4` (1–8× simulation speed), `?debug=1` (fps, draw calls, toys),
`?quality=0` (pin render quality 0–4 instead of adapting it), `?reset=1` (clear saved progress).

## Layout

| Path | What lives there |
|------|------------------|
| `src/engine/` | Deterministic game logic: PRNG, campaign, level generator, track graph, simulation, scoring, saves. No three.js, Rapier or DOM (ESLint enforces it). |
| `src/physics/` | Rapier toy physics. Presentation only; scores come from the engine. |
| `src/graphics/` | three.js scene: board, track, buildings, train, toys, effects, camera. |
| `src/ui/`, `src/input/`, `src/audio/` | HUD, overlays, meta map; touch gestures; synthesized sound. |
| `src/app/` | Screens that connect the engine to graphics, physics, input and UI. |
| `tests/unit/`, `tests/e2e/` | Vitest engine tests; Playwright smoke tests. |
| `specs/` | The spec, plan and tasks (see below). |

## Publishing

`.github/workflows/deploy.yml` runs the checks and the smoke tests on every pull request and
push. A push to `main` also publishes `dist/` to GitHub Pages. One-time setup: **Settings → Pages →
Build and deployment → Source: GitHub Actions**.

## Spec

Development is spec-driven with [Spec Kit](https://github.com/github/spec-kit), changed to keep a
**single spec** for the whole game: [`specs/spec.md`](specs/spec.md), with
[`plan.md`](specs/plan.md) and [`tasks.md`](specs/tasks.md) beside it. See
[CLAUDE.md](CLAUDE.md) for the workflow.
