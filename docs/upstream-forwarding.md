# Upstream forwarding (fork → ChiR24/Unreal_mcp)

This repository is a fork of [ChiR24/Unreal_mcp](https://github.com/ChiR24/Unreal_mcp).
Fixes land here first, then get forwarded upstream as cross-fork pull requests
targeting `dev`.

## The credential gotcha

The default `gh` auth on the automation host is a **fine-grained** PAT scoped to
this fork's owner. Fine-grained PATs cannot create pull requests on repositories
outside their resource owner — even public ones — so with the default auth:

```
gh pr create --repo ChiR24/Unreal_mcp --base dev --head Flopsstuff:<branch>
# → GraphQL: Resource not accessible by personal access token (createPullRequest)
```

This is a hard boundary of the token type, not a transient failure. Do not retry
it with the default auth.

## The working mechanism

A **classic** PAT with `public_repo` scope is stored on the automation host at
`~/.secrets/gh-classic` (file mode `600`; the token value is never committed
anywhere). Prefix individual commands with it instead of switching the global
`gh` login:

```
GH_TOKEN=$(cat ~/.secrets/gh-classic) gh pr create \
  --repo ChiR24/Unreal_mcp --base dev \
  --head Flopsstuff:<branch> \
  --title "<title>" --body-file <file>
```

Leave the default keyring auth untouched; use the classic token only for actions
the fine-grained PAT cannot perform (cross-fork PRs and other upstream-facing
writes).

## Forwarding checklist

- Cut the branch from `upstream/dev` so the diff stays clean (1 logical change,
  0 commits behind).
- Strip any fork-internal notes from the PR body before forwarding.
- Reference fork issues in fully-qualified form (`Flopsstuff/uemcp#N`). A bare
  `#N` autolinks to an unrelated upstream issue or PR.
- Plugin (C++) changes cannot be compiled on the ARM64 automation host — state
  that in the PR body and include in-editor verification steps for the
  maintainer.
- Keep the head branch alive on the fork until the upstream PR is merged or
  closed.
