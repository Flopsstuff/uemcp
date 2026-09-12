# Fork CI: review bases

This page is fork-local (`Flopsstuff/uemcp`). It describes how to get real CI
signal on a pull request whose base branch is **not** `main`, which is the
normal shape of work here: a change is reviewed against a verbatim snapshot of
`upstream/dev` before it is forwarded upstream.

## Why patching `main` is not enough

`ci.yml` and `smoke-test.yml` upstream declare:

```yaml
on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]
```

With that `pull_request` filter, a PR into `base/upstream-dev-*` runs only the
unconditional metadata checks (Labeler, Greetings, Validate PR Title) - no lint,
no build, no tests. A grey check list is easy to misread as "nothing to run".

Removing the filter on the fork's default branch alone changes nothing, because
GitHub Actions resolves a workflow definition for `pull_request` from **the tree
of the pull request itself** (its head, or the generated merge commit) - never
from the default branch. Only `schedule`, `workflow_dispatch`, `workflow_run`
and `repository_dispatch` read their definition from the default branch.

So the trigger patch has to be present in the branch under test. It is two
deletions:

```yaml
on:
  push:
    branches: [ main ]     # unchanged
  pull_request:            # no branches filter - any base
```

## Cutting a new review base

1. `git fetch upstream`
2. Push the snapshot commit as the base branch:
   `git push origin <upstream/dev sha>:refs/heads/base/upstream-dev-floNNN`
3. Commit the trigger patch **on top of that base branch** and push it.
4. Cut the feature branch from the already-patched base, then open the PR into
   it.

The patch commit is then present on both sides of the comparison, so
`base..head` stays a clean review diff, while the workflow definitions in the
PR tree still have no `branches` filter and CI starts.

If the base was pushed as a bare snapshot and the patch went onto the feature
branch instead, CI still runs (the PR tree is what matters), but the patch shows
up as `-2` lines in the review diff. Prefer the base-plus-patch shape for
anything a human has to read.

## Do not forward the patch upstream

When a fork change is forwarded to `ChiR24/Unreal_mcp`, cherry-pick only the
substantive commits. The trigger patch exists because we review against
non-`main` bases; upstream does not, and the filter is deliberate there.

## Dependency graph is a repository setting

`dependency-review` on the fork used to fail unconditionally because the
dependency graph was disabled, not because of anything in
`.github/workflows/dependency-review.yml`. It was enabled via the repository's
vulnerability-alerts / dependency-graph setting (`PUT
/repos/Flopsstuff/uemcp/vulnerability-alerts`). There is nothing to look for in
the workflow files - if that check goes unconditionally red again, check the
repository settings first.
