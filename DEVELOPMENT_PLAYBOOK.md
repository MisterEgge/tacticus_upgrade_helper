# Development Playbook

Portable working agreement for AI-assisted development. Copy this file into a new project and adapt the project settings at the end.

## Autonomous delivery loop

1. Inspect the current state and identify the highest-value, clearly justified improvement.
2. Create a small branch from the approved baseline. Never edit `main` directly.
3. Implement one coherent change.
4. Test, typecheck, build, and exercise the affected behavior.
5. Fix every failure found within scope.
6. Commit the working milestone and merge according to the project's explicit merge policy.
7. Verify the approved baseline, branch again, and continue.

Do not stop at a plan, partial implementation, or passing unit test. A change is complete only after the validation gate and merge policy are satisfied.

Do not ask for routine approval. Ask only when blocked by missing access, an irreversible action, a material product decision, conflicting evidence, or a scope expansion that cannot be reasonably inferred.

## Evidence and data integrity

- Never invent data. Treat user data, screenshots, live APIs, historical snapshots, and community research as distinct evidence classes.
- Preserve stable IDs when they exist. Do not substitute a guessed display-name match.
- Do not infer precise facts from ambiguous icons, visual ordering, or incomplete sources.
- When evidence is insufficient, show `UNKNOWN`, `RESEARCHING`, or manual review. Explain the uncertainty rather than fabricating a recommendation.
- Keep live state, historical observations, research guidance, and derived recommendations visibly separate.
- Keep source, confidence, and limitations with recommendations where practical.

## Architecture and implementation

- Build and test the model before polishing the display.
- Put reusable business rules in small, pure, strongly typed domain functions.
- Separate ingestion, normalization, analysis, recommendation, and presentation.
- Centralize shared mappings and terminology. Do not duplicate rank arrays, status definitions, or parsing rules across pages.
- Add deterministic tests for business rules and every fixed regression.
- Never use a default value that looks verified when data is actually missing.

## Product and UI rules

- Confirm whether a list is an assignment, a set of alternatives, a ranked queue, or historical reference before imposing uniqueness, limits, or ordering.
- Do not turn an example into a universal rule. Identify the underlying goal.
- Keep views focused on decisions and next actions; remove filler that does not help the user act.
- Inspect existing pages before adding UI. Reuse established layouts, wording, controls, spacing, and interaction patterns.
- Reuse approved visual language: if Campaigns uses a chevron collapsible control, another expandable section should use the same treatment rather than inventing a text button.
- Match structure to task: vertical lists for expandable sequences, tables for comparable rows, cards for independent summaries.
- Keep summaries visible when details collapse. Make controls local to the item they affect.
- Preserve responsive behavior and use accessible controls (`button`, `label`, `aria-expanded`, useful names for icon buttons).
- Browser-exercise meaningful UI changes. A production build does not prove an interaction works.

### Team planners: source fidelity and usable assignments

- A partial team pattern (for example, a three-character core plus separate flex usage) is not an actual five-character team. Never fill its remaining slots by faction, screen order, or highest individual flex usage and present the result as source-backed.
- Keep three-person core evidence and exact five-person lineup evidence separate. Cross-reference them before recommending a finished team; show the matched five-person record, its observed use count, and its win/defense result.
- Rank finished teams from the full-lineup record, not from faction identity or the core's popularity alone. If the recorded five is weak, use a better supported recorded lineup—or label the core as needing more evidence.
- When the product goal is to field multiple teams, enforce the real constraint: each selected lineup must be distinct and no character may appear in more than one active team. A duplicate warning is not an acceptable substitute for preventing invalid selections.
- Default team slots must be computed as a maximum-quality non-overlapping set, not simply the first N candidates. Dropdown choices that conflict with already selected teams must be unavailable.
- Do not display unowned characters as active upgrade work. If a source lineup cannot be fielded from the account roster, exclude it from the current assignment and keep it only as a clearly labelled future/reference record.
- Treat a user correction about a source or lineup as a data-model problem first. Re-read the supplied source, repair the extraction/selection rule, add a regression test, and only then adjust the UI.

## Git and merge discipline

- Start with `git status`, current branch, and recent history.
- Preserve unrelated user changes. Never reset, force-push, delete, or overwrite broad targets to simplify work.
- Use a new small branch for each task: `feature/...`, `fix/...`, or `docs/...`.
- Stage only task-related files and commit an outcome-focused message.
- Never claim a merge succeeded until the remote update succeeds.
- Follow the explicit merge policy set by the owner:
  - Per-change authorization: do not merge until asked.
  - Continuous merge authorization: merge every tested coherent change, verify the baseline, then continue.

## Validation gate

Adapt commands to the repository, but do not weaken the intent. For this Next.js project, every milestone requires:

```bash
npm run typecheck
npm test
npm run build
npm run test:smoke
git diff --check
```

Also run focused validation where relevant: browser/route checks for UI interactions, tests for new domain logic and parsing, validation of displayed source data, and a final `git status --short` for unrelated changes.

If any command fails, investigate and fix it before committing. A partial gate is not completion.

## Communication

- Start work with a brief statement of the outcome being pursued.
- Give concise updates during long work.
- Report facts: what changed, what was tested, and whether it merged.
- Surface mistakes quickly, explain the cause plainly, fix them, and add regression coverage when possible.
- Do not claim background work continues after ending a response.

## Project settings to carry forward

| Setting | Value |
| --- | --- |
| Approved baseline | `main` |
| Merge policy | Continuous merge authorization for tested coherent changes unless the owner says otherwise |
| Validation commands | `npm run typecheck && npm test && npm run build && npm run test:smoke && git diff --check` |
| Data rule | Never fabricate account, source, or recommendation data; label uncertainty clearly |
| UI rule | Reuse established page patterns before creating new controls or layouts |
| Completion | Implemented, validated, committed, remote merge confirmed, and baseline ready for the next branch |

## Pre-merge checklist

- [ ] New branch; not `main`.
- [ ] The implementation matches the underlying goal, not just one example.
- [ ] All displayed facts have supporting evidence.
- [ ] Existing visual and interaction patterns were reused where applicable.
- [ ] Multi-team assignments are source-backed, fully fieldable, and contain no duplicate characters.
- [ ] Full validation passed after the final edit.
- [ ] Regression coverage exists for changed rules or fixed bugs.
- [ ] Only task-related files are staged.
- [ ] Remote merge/update succeeded.
