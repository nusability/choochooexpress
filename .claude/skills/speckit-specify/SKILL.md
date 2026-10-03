---
name: "speckit-specify"
description: "Add a feature to (or create) the single game specification at specs/spec.md from a natural language feature description."
argument-hint: "Describe the feature you want to specify"
compatibility: "Requires spec-kit project structure with .specify/ directory"
metadata:
  author: "github-spec-kit"
  source: "templates/commands/specify.md"
user-invocable: true
disable-model-invocation: false
---


## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Pre-Execution Checks

**Check for extension hooks (before specification)**:
- Check if `.specify/extensions.yml` exists in the project root.
- If it exists, read it and look for entries under the `hooks.before_specify` key
- If the YAML cannot be parsed or is invalid, do not skip silently: tell the user that `.specify/extensions.yml` could not be read (include the parser error) and that no hooks were checked, including any mandatory (`optional: false`) hooks registered there, then continue normally
- Filter out hooks where `enabled` is explicitly `false`. Treat hooks without an `enabled` field as enabled by default.
- For each remaining hook, do **not** attempt to interpret or evaluate hook `condition` expressions:
  - If the hook has no `condition` field, or it is null/empty, treat the hook as executable
  - If the hook defines a non-empty `condition`, skip the hook and leave condition evaluation to the HookExecutor implementation
- When constructing command invocations from hook command names, replace dots (`.`) with hyphens (`-`). For example, `speckit.git.commit` → `/speckit-git-commit`.
- For each executable hook, output the following based on its `optional` flag:
  - **Optional hook** (`optional: true`):
    ```
    ## Extension Hooks

    **Optional Pre-Hook**: {extension}
    Command: `/{command}`
    Description: {description}

    Prompt: {prompt}
    To execute: `/{command}`
    ```
  - **Mandatory hook** (`optional: false`):
    ```
    ## Extension Hooks

    **Automatic Pre-Hook**: {extension}
    Executing: `/{command}`
    EXECUTE_COMMAND: {command}

    Wait for the result of the hook command before proceeding to the Outline.
    ```
    After emitting the block above you MUST actually invoke the hook and wait for it to finish before continuing. Run it the same way you would run the command yourself in this agent/session (the invocation may differ from the literal `{command}` id shown above, e.g. a skills-mode agent runs it as `/skill:speckit-...` or `$speckit-...`). Emitting the block alone does not run the hook.
- If no hooks are registered or `.specify/extensions.yml` does not exist, skip silently

## Outline

The text the user typed after `/speckit-specify` in the triggering message **is** the feature description. Assume you always have it available in this conversation even if `$ARGUMENTS` appears literally below. Do not ask the user to repeat it unless they provided an empty command.

Given that feature description, do this.

> **SINGLE-SPEC MODE (project adaptation)**: This project keeps exactly ONE specification,
> `specs/spec.md`, for the whole game. Never create `specs/NNN-name/` directories or a
> second spec file. Every `/speckit-specify` run either creates that file (first run) or
> **adds a feature to it / amends it** (every later run). `.specify/feature.json` is not used.

1. **Generate a concise feature name** (2-4 words) for the feature, e.g. "Track Building",
   "Cargo Delivery", "Day/Night Cycle". It is used as the feature heading, not as a directory.

2. **Branch creation** (optional, via hook):

   If a `before_specify` hook ran successfully in the Pre-Execution Checks above, it may have
   created/switched to a git branch. Note it for reference; it has no effect on where the spec lives.

3. **Ensure the single spec exists**:

   Run `.specify/scripts/bash/ensure-spec.sh --json` from repo root and parse `SPEC_FILE`,
   `SPEC_DIR` and `SPEC_EXISTED`. The script seeds `specs/spec.md` from the resolved
   `spec-template` when it does not exist yet, and never creates anything else.

4. Load the resolved active `spec-template` (`.specify/templates/spec-template.md`, or an
   override) to understand required sections and the ID rules in its header comment.

5. **IF EXISTS**: Load `.specify/memory/constitution.md` for project principles and governance constraints.

6. **Decide the mode**:
   - **Create** (`SPEC_EXISTED` is false, or the spec still contains only template placeholders):
     the description describes the game and/or its first feature. Fill Vision, Platform & Play
     Context, Core Game Loop, Global Requirements, and add the first feature as `F-001`.
   - **Add feature** (default when the spec already has content): append a new
     `### F-NNN: <Feature Name>` block at the end of the "Features" section, using the next
     unused F number.
   - **Amend feature**: if the description clearly changes an existing feature (it names it, or
     overlaps it substantially), edit that feature's block in place instead of adding a new one,
     and say so in the completion report. When genuinely unsure between adding and amending,
     add a new feature and note the possible overlap.

7. Follow this execution flow:
    1. Parse user description from arguments
       If empty: ERROR "No feature description provided"
    2. Read the whole existing spec and record the highest IDs in use (F, US, FR, NFR, SC).
       New items continue those sequences; **never renumber or reuse an existing ID**.
    3. Extract key concepts from the description
       Identify: player actions, game objects, rules, goals, constraints
    4. For unclear aspects:
       - Make informed guesses based on context, the existing spec, and common game-design patterns
       - Only mark with [NEEDS CLARIFICATION: specific question] if:
         - The choice significantly impacts scope or the player experience
         - Multiple reasonable interpretations exist with different implications
         - No reasonable default exists
       - **LIMIT: Maximum 3 new [NEEDS CLARIFICATION] markers per run**
       - Prioritize clarifications by impact: scope > player experience > privacy > technical details
    5. Write the feature's User Stories (globally numbered US#, each with priority, independent
       test, and Given/When/Then acceptance scenarios)
       If no clear player flow: ERROR "Cannot determine player scenarios"
    6. Write the feature's Functional Requirements (FR-###) and Edge Cases. Each requirement must be testable.
       Mobile-specific edge cases (rotation, backgrounding, small screens, interrupted touch) must be considered.
    7. Update the shared sections only where this feature changes them: Core Game Loop,
       Global Requirements (NFR-###), Key Entities, Success Criteria (tag feature-specific ones
       with `(F-NNN)`), Assumptions, Out of Scope.
    8. Check the new feature against existing ones for contradictions (conflicting rules,
       duplicate requirements, controls that collide). Resolve them in the spec or raise them
       as one of the clarification markers.
    9. Add a Changelog row: date, what changed, IDs added/changed/removed. Update **Last Updated**.
    10. Return: SUCCESS (spec ready for planning)

8. Write the result to SPEC_FILE, preserving the template's section order and headings and
   **all content belonging to other features**. Removed requirements are struck through with a
   reason (see template header), not deleted.

9. **Specification Quality Validation**: After writing the initial spec, validate it against quality criteria:

   a. **Create or refresh the Spec Quality Checklist**: Write the checklist file at `specs/checklists/requirements.md` (one file for the whole spec; overwrite it on each run) using the checklist template structure with these validation items:

      ```markdown
      # Specification Quality Checklist: [GAME NAME]

      **Purpose**: Validate specification completeness and quality before proceeding to planning
      **Created**: [DATE]
      **Spec**: [Link to spec.md] | **Last feature checked**: [F-NNN]

      ## Content Quality

      - [ ] No implementation details (languages, frameworks, rendering engine, APIs)
      - [ ] Focused on user value and business needs
      - [ ] Written for non-technical stakeholders
      - [ ] All mandatory sections completed

      ## Requirement Completeness

      - [ ] No [NEEDS CLARIFICATION] markers remain
      - [ ] Requirements are testable and unambiguous
      - [ ] Success criteria are measurable
      - [ ] Success criteria are technology-agnostic (no implementation details)
      - [ ] All acceptance scenarios are defined
      - [ ] Edge cases are identified
      - [ ] Scope is clearly bounded
      - [ ] Dependencies and assumptions identified
      - [ ] Mobile play context covered (touch input, orientation, interruptions, small screens)
      - [ ] IDs are unique and sequential; no existing ID was renumbered or reused
      - [ ] New feature does not contradict existing features or global requirements

      ## Feature Readiness

      - [ ] All functional requirements have clear acceptance criteria
      - [ ] User scenarios cover primary flows
      - [ ] Feature meets measurable outcomes defined in Success Criteria
      - [ ] No implementation details leak into specification

      ## Notes

      - Items marked incomplete require spec updates before `/speckit-clarify` or `/speckit-plan`
      ```

   b. **Run Validation Check**: Review the spec against each checklist item:
      - For each item, determine if it passes or fails
      - Document specific issues found (quote relevant spec sections)

   c. **Handle Validation Results**:

      - **If all items pass**: Mark checklist complete and proceed to the Mandatory Post-Execution Hooks section

      - **If items fail (excluding [NEEDS CLARIFICATION])**:
        1. List the failing items and specific issues
        2. Update the spec to address each issue
        3. Re-run validation until all items pass (max 3 iterations)
        4. If still failing after 3 iterations, document remaining issues in checklist notes and warn user

      - **If [NEEDS CLARIFICATION] markers remain**:
        1. Extract all [NEEDS CLARIFICATION: ...] markers from the spec
        2. **LIMIT CHECK**: If more than 3 markers exist, keep only the 3 most critical (by scope/security/UX impact) and make informed guesses for the rest
        3. For each clarification needed (max 3), present options to user in this format:

           ```markdown
           ## Question [N]: [Topic]

           **Context**: [Quote relevant spec section]

           **What we need to know**: [Specific question from NEEDS CLARIFICATION marker]

           **Suggested Answers**:

           | Option | Answer | Implications |
           |--------|--------|--------------|
           | A      | [First suggested answer] | [What this means for the feature] |
           | B      | [Second suggested answer] | [What this means for the feature] |
           | C      | [Third suggested answer] | [What this means for the feature] |
           | Custom | Provide your own answer | [Explain how to provide custom input] |

           **Your choice**: _[Wait for user response]_
           ```

        4. **CRITICAL - Table Formatting**: Ensure markdown tables are properly formatted:
           - Use consistent spacing with pipes aligned
           - Each cell should have spaces around content: `| Content |` not `|Content|`
           - Header separator must have at least 3 dashes: `|--------|`
           - Test that the table renders correctly in markdown preview
        5. Number questions sequentially (Q1, Q2, Q3 - max 3 total)
        6. Present all questions together before waiting for responses
        7. Wait for user to respond with their choices for all questions (e.g., "Q1: A, Q2: Custom - [details], Q3: B")
        8. Update the spec by replacing each [NEEDS CLARIFICATION] marker with the user's selected or provided answer
        9. Re-run validation after all clarifications are resolved

   d. **Update Checklist**: After each validation iteration, update the checklist file with current pass/fail status

## Mandatory Post-Execution Hooks

**You MUST complete this section before reporting completion to the user.**

Check if `.specify/extensions.yml` exists in the project root.
- If it does not exist, or no hooks are registered under `hooks.after_specify`, skip to the Completion Report.
- If it exists, read it and look for entries under the `hooks.after_specify` key.
- If the YAML cannot be parsed or is invalid, do not skip silently: tell the user that `.specify/extensions.yml` could not be read (include the parser error) and that no hooks were checked, including any mandatory (`optional: false`) hooks registered there, then continue to the Completion Report.
- Filter out hooks where `enabled` is explicitly `false`. Treat hooks without an `enabled` field as enabled by default.
- For each remaining hook, do **not** attempt to interpret or evaluate hook `condition` expressions:
  - If the hook has no `condition` field, or it is null/empty, treat the hook as executable
  - If the hook defines a non-empty `condition`, skip the hook and leave condition evaluation to the HookExecutor implementation
- When constructing command invocations from hook command names, replace dots (`.`) with hyphens (`-`). For example, `speckit.git.commit` → `/speckit-git-commit`.
- For each executable hook, output the following based on its `optional` flag:
  - **Mandatory hook** (`optional: false`) — **You MUST emit `EXECUTE_COMMAND:` for each mandatory hook**:
    ```
    ## Extension Hooks

    **Automatic Hook**: {extension}
    Executing: `/{command}`
    EXECUTE_COMMAND: {command}
    ```
    After emitting the block above you MUST actually invoke the hook and wait for it to finish before continuing. Run it the same way you would run the command yourself in this agent/session (the invocation may differ from the literal `{command}` id shown above, e.g. a skills-mode agent runs it as `/skill:speckit-...` or `$speckit-...`). Emitting the block alone does not run the hook.
  - **Optional hook** (`optional: true`):
    ```
    ## Extension Hooks

    **Optional Hook**: {extension}
    Command: `/{command}`
    Description: {description}

    Prompt: {prompt}
    To execute: `/{command}`
    ```

## Completion Report

Report completion to the user with:
- `SPEC_FILE` — the spec file path (always `specs/spec.md`)
- Mode (created / added feature F-NNN / amended feature F-NNN) and the IDs added or changed
- Checklist results summary
- Readiness for the next phase (`/speckit-clarify` or `/speckit-plan`)

**NOTE:** Branch creation is handled by the `before_specify` hook (git extension). The single spec file is created only by `ensure-spec.sh` via this command.

## Quick Guidelines

- Focus on **WHAT** users need and **WHY**.
- Avoid HOW to implement (no tech stack, APIs, code structure).
- Written for business stakeholders, not developers.
- DO NOT create any checklists that are embedded in the spec. That will be a separate command.

### Section Requirements

- **Mandatory sections**: Must be completed in the spec (shared sections once; User Stories + Functional Requirements for every feature)
- **Optional sections**: Include only when relevant to the feature
- When a section doesn't apply, remove it entirely (don't leave as "N/A")

### For AI Generation

When creating this spec from a user prompt:

1. **Make informed guesses**: Use context, industry standards, and common patterns to fill gaps
2. **Document assumptions**: Record reasonable defaults in the Assumptions section
3. **Limit clarifications**: Maximum 3 [NEEDS CLARIFICATION] markers - use only for critical decisions that:
   - Significantly impact feature scope or user experience
   - Have multiple reasonable interpretations with different implications
   - Lack any reasonable default
4. **Prioritize clarifications**: scope > security/privacy > user experience > technical details
5. **Think like a tester**: Every vague requirement should fail the "testable and unambiguous" checklist item
6. **Common areas needing clarification** (only if no reasonable default exists):
   - Feature scope and boundaries (include/exclude specific use cases)
   - User types and permissions (if multiple conflicting interpretations possible)
   - Security/compliance requirements (when legally/financially significant)

**Examples of reasonable defaults** (don't ask about these):

- Data retention: Industry-standard practices for the domain
- Performance targets: The Global Requirements defaults for a mobile web game unless specified
- Error handling: User-friendly messages with appropriate fallbacks
- Controls: Standard touch conventions (tap to select/act, drag to move/draw, pinch to zoom only if the camera needs it)
- Persistence: Local, on-device progress; no accounts unless the description asks for them

### Success Criteria Guidelines

Success criteria must be:

1. **Measurable**: Include specific metrics (time, percentage, count, rate)
2. **Technology-agnostic**: No mention of frameworks, languages, databases, or tools
3. **User-focused**: Describe outcomes from user/business perspective, not system internals
4. **Verifiable**: Can be tested/validated without knowing implementation details

**Good examples**:

- "Users can complete checkout in under 3 minutes"
- "System supports 10,000 concurrent users"
- "95% of searches return results in under 1 second"
- "Task completion rate improves by 40%"

**Bad examples** (implementation-focused):

- "API response time is under 200ms" (too technical, use "Users see results instantly")
- "Database can handle 1000 TPS" (implementation detail, use user-facing metric)
- "React components render efficiently" (framework-specific)
- "Redis cache hit rate above 80%" (technology-specific)

## Done When

- [ ] Specification written to `SPEC_FILE` and validated against quality checklist
- [ ] Extension hooks dispatched or skipped according to the rules in Mandatory Post-Execution Hooks above
- [ ] Completion reported to user with spec file path, feature ID(s) touched, and checklist results
