# src/tools

Canonical TypeScript MCP tool contracts and dispatch glue. This directory defines 23 parent tools and hundreds of action variants; Unreal execution still happens through handlers and the plugin bridge.

## STRUCTURE
```
tools/
|-- catalog/                          # consolidated definitions and schema composition
|-- definitions/                      # category/domain-specific tool contracts
|-- dynamic/                          # runtime enable/disable by tool/category
|-- editor/                           # editor facade modules
|-- environment/                      # environment-oriented tool tests/support
|-- level/                            # level facade and operations
|-- orchestration/                    # registration, routing, dispatch, call utilities
|-- schemas/                          # shared schema fragments for core tools
`-- handlers/                         # domain action handlers; see nested AGENTS
```

## WHERE TO LOOK
| Task | File | Notes |
|------|------|-------|
| Add or change tool schema | `catalog/consolidated-tool-definitions.ts`, `definitions/` | Keep action enum, input schema, category, and output schema aligned |
| Route parent tool | `orchestration/consolidated-tool-handlers.ts` | Register only through `registerDefaultHandlers()` |
| Enable/disable tool sets | `dynamic/` | Categories are `core`, `world`, `gameplay`, `utility`, `all` |
| Implement action logic | `handlers/<domain>/*-handlers.ts` | Validate/normalize, then use `executeAutomationRequest()` |
| Shared handler helpers | `handlers/foundation/` | Action requirements, argument parsing, normalization, dispatch, and responses |

## CONVENTIONS
- Parent tools are canonical public names. Do not reintroduce former child tool names as exposed MCP tools.
- Action strings must stay aligned across `catalog/consolidated-tool-definitions.ts`, handler switches, native WebSocket handler registration, native MCP tool schemas, and tests.
- Output schemas should be registered and validated before responses leave the MCP server.
- `manage_tools` and `inspect` are protected from disablement; keep dynamic-tool behavior consistent with native MCP.
- Use `unknown` plus type guards/interfaces for untrusted tool arguments.

## ANTI-PATTERNS
- Calling handler functions directly instead of going through the MCP registry and consolidated dispatch path.
- Adding placeholder actions or schemas without TS handler, C++ handler, and test coverage.
- Sending user paths or console commands to Unreal before applying the relevant `src/utils` guards.
- Logging via `console.log` from runtime tool code; stdout must remain JSON-RPC clean.

## NOTES
- `src/server/AGENTS.md` owns MCP request/list/call registration behavior.
- `handlers/AGENTS.md` owns domain handler implementation rules.
