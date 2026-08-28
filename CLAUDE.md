# Working conventions

## Git workflow

- Never commit or push directly to `main`.
- For every change, create a new branch first (e.g. `claude/<short-description>`), make edits there, and push that branch.
- Open a pull request against `main` for review once the change is ready — do not merge it yourself.
- Each unrelated task/request gets its own branch and PR; don't stack unrelated changes onto an existing open PR's branch.
