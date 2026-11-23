# User preferences

- Garrett uses Git Bash. Default user-facing terminal instructions to Git Bash syntax, including `/c/Users/...` paths and `npm` commands. Do not default to PowerShell or `npm.cmd` unless explicitly requested.

# Code changes

For any user-facing page or component, follow [Interface design](docs/interface-design.md).

Follow this workflow for intentional code changes:

1. Identify the affected code and tests. Preserve unrelated work and keep the change focused.
2. Run the relevant tests and type checks. Fix failures caused by the change and rerun the checks.
3. Review and commit the intended files, push a feature branch, and open or update its pull request against `main`.
4. Verify CI for the pushed commit. If the user has authorized merging, resolve any in-scope blockers, merge through GitHub, and confirm the pull request was merged into `main`.
5. Report the tests run, the pull request, and the verified merge status. If a step is blocked, state what remains and why.
