# User preferences

- Garrett uses Git Bash. Default user-facing terminal instructions to Git Bash syntax, including `/c/Users/...` paths and `npm` commands. Do not default to PowerShell or `npm.cmd` unless explicitly requested.

- Never infer campaign requirements from faction/alliance eligibility, usefulness, or a planning priority. Only verified mandatory characters may be called required. Optional helpers must be explicitly selected/planned and labeled as helpers; unverified completion is not proof a campaign is unfinished. Calgar and Azrael are not mandatory campaign characters.

- Apply game-rule corrections across the entire game character catalog, not just the current owned roster or named examples. Check every character and relevant campaign/mode, cover different user roster subsets, and include regressions that automatically cover newly added catalog entries. Named examples are regression cases, never an exception list.

# Code changes

For any user-facing page or component, follow [Interface design](docs/interface-design.md).

Follow this workflow for intentional code changes:

1. Identify the affected code and tests. Preserve unrelated work and keep the change focused.
2. Run the relevant tests and type checks. Fix failures caused by the change and rerun the checks.
3. Review and commit the intended files, push a feature branch, and open or update its pull request against `main`.
4. Verify CI for the pushed commit. If the user has authorized merging, resolve any in-scope blockers, merge through GitHub, and confirm the pull request was merged into `main`.
5. Report the tests run, the pull request, and the verified merge status. If a step is blocked, state what remains and why.
