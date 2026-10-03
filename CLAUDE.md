# Choo Choo Express Delivery 3D

A mobile web toy-train puzzle game built with three.js + Rapier (TypeScript + Vite), developed with
[Spec Kit](https://github.com/github/spec-kit) in **single-spec mode**.

## Spec Kit: single-spec mode

This repo's Spec Kit has been changed to keep ONE spec for the whole game instead of one per feature:

- `specs/spec.md` is the only spec. Features are `### F-NNN` sections inside it.
- `specs/plan.md`, `specs/tasks.md`, `specs/research.md`, `specs/data-model.md`,
  `specs/contracts/`, `specs/quickstart.md`, `specs/checklists/` sit beside it, also one of each.
- Never create `specs/NNN-feature/` directories. `.specify/feature.json` is not used.
- IDs (F, US, FR, NFR, SC, T) are global and stable. Never renumber or reuse them; strike
  through removed items.
- `/speckit-plan` and `/speckit-tasks` update the existing files in place. Existing tasks keep
  their IDs and checkbox state.

Workflow: `/speckit-specify <feature>` → `/speckit-clarify` → `/speckit-plan` →
`/speckit-tasks` → `/speckit-analyze` → `/speckit-implement`.

Project principles (mobile-first, performance budget, logic/render separation, testing) are in
`.specify/memory/constitution.md`. Follow them.

### Local changes to Spec Kit (re-apply after `specify init --force` or an upgrade)

- `.specify/scripts/bash/common.sh` → `get_feature_paths` always resolves to `specs/`
  (unless `SPECIFY_FEATURE_DIRECTORY` is set).
- `.specify/scripts/bash/ensure-spec.sh` replaces `create-new-feature.sh`.
- `.specify/templates/{spec,plan,tasks}-template.md` are game- and single-spec-specific.
- `.claude/skills/speckit-{specify,plan,tasks}/SKILL.md` contain "SINGLE-SPEC MODE" instructions.
