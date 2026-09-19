# 1. Gate upstream output-contract omissions statically, do not change the dispatch seam

Date: 2026-09-20
Status: accepted

## Context

Capability records in the canonical registry declare required output fields.
Three defects of the same shape have now been found, each a handler that never
publishes a field its own contract marks required:

- `blueprint.get_node_details` missing `nodeId`
- `blueprint.create_reroute_node` missing `nodeGuid`
- `manage_tools.list_categories` missing `totalCategories`

The first two surface loudly. They dispatch through the native execute seam,
which projects the handler result onto the declared output properties
(`McpProjectCanonicalOutput`) and then required-checks the closed schema, so a
successful, committed operation is reported to the caller as
`OUTPUT_SCHEMA_VIOLATION`.

The third surfaces not at all. `manage_tools` is dispatched locally:
`FMcpNativeTransport::TryHandleLocalToolCall` calls `ToolManager.HandleAction`
and hands the result straight to `FMcpJsonRpc::BuildToolResult`. There is no
projection and no validation on that path, so a declared-required field that no
one publishes is simply absent from a 200 response. Nine capability records
route this way.

So the underlying mechanism has two faces: where validation exists it converts
the omission into a false failure, and where it does not exist it hides the
omission entirely.

## Options

1. **Route local dispatch through projection and validation.** Removes the blind
   spot at runtime and makes the two paths consistent.
2. **Detect the omission statically, from the registry, in CI.** Covers both
   paths without touching either.
3. Fix each defect as it is reported.

## Decision

Option 2. Every capability record whose output contract requires a field beyond
the seam-supplied `success`/`message` is checked in CI against the plugin
sources, generated from the registry rather than from a hand-maintained list.
Option 3 is rejected outright: the same omission has now landed three times, in
two different domains.

Option 1 is rejected **for this fork's contributions**, not on its merits. It is
a runtime change to a live tool family in a repository we do not own, and it is
not behaviour-preserving: canonical projection drops undeclared fields, so every
`manage_tools` response would lose whatever it emits beyond its declared
properties, and a required-field miss would turn a working call into an error
receipt rather than a quietly incomplete one. That is a maintainer's call about
their own compatibility surface, and it wants a deprecation path. We report the
mechanism in the forwarding pull request and leave the decision upstream.

## Consequences

- The gate is static, so it needs no engine, no editor and no plugin build, and
  it runs on a stock hosted runner like the rest of CI.
- It reads C++ sources by pattern (`Set*Field(TEXT("name")`). That is coarse:
  a field published anywhere in the plugin satisfies the registry-wide tier. A
  narrower tier that demands publication inside the function guarding the
  sub-action is worth adding per handler family, and exists for the blueprint
  graph domain, but it cannot be generated for all 380 records because handlers
  do not share one dispatch shape.
- The local-dispatch blind spot remains. A future omission on that path is
  caught by CI before release, not by any runtime signal, which is why the gate
  and not the fix is the durable part of this work.
- Reversible. If upstream later validates the local path, the gate stays useful
  and simply stops being the only line of defence.
