# Private/MCP

Native plugin MCP implementation. This subtree is separate from the TypeScript stdio server and WebSocket automation bridge; it exposes the plugin directly over Streamable HTTP/SSE at `/mcp`.

## STRUCTURE
```
MCP/
|-- DynamicTools/                 # runtime enable/disable and protected tools
|-- Protocol/                     # JSON-RPC response/error helpers
|-- Registry/                     # tool registry, definitions, schema builder
|-- Routing/                      # consolidated native action routing
|-- Transport/                    # raw socket HTTP/SSE transport
`-- Tools/
    |-- Core/
    |-- Gameplay/
    |-- Utility/
    `-- World/
```

## WHERE TO LOOK
| Task | File | Notes |
|------|------|-------|
| Change HTTP/SSE behavior | `Transport/` | `GET /mcp`, `POST /mcp`, `DELETE /mcp`, sessions, SSE writes |
| Change JSON-RPC shape | `Protocol/` | Centralize result/error envelope formatting |
| Add native tool metadata | `Tools/<Category>/McpTool_*.cpp` | Subclass `FMcpToolDefinition` and use `MCP_REGISTER_TOOL` |
| Change schema construction | `Registry/McpSchemaBuilder.*` | Keep schema JSON generated through builder helpers |
| Change tool filtering | `DynamicTools/` | Core-only/default-all behavior, protected tools/categories |
| Change canonical list | `Registry/McpToolRegistry.cpp` | Only 23 parent tool names are accepted |
| Change native action routing | `Routing/` | Keep parent tools and action aliases aligned |

## TRANSPORT CONVENTIONS
- `GET /mcp` opens a persistent SSE notification stream.
- `POST /mcp` handles JSON-RPC methods including `initialize`, `tools/list`, and `tools/call`.
- `DELETE /mcp` tears down an initialized session.
- `initialize` creates the session and returns protocol version, `capabilities.tools.listChanged`, server info, and optional instructions.
- Requests after initialization require `Mcp-Session-Id`.
- Progress uses `notifications/progress`; tool results are MCP `content[]` plus `isError`.

## TOOL CONVENTIONS
- Tools self-register statically with `MCP_REGISTER_TOOL`.
- Registry accepts only canonical parent tools: do not expose child/legacy tool names.
- Pattern A dispatch returns the parent tool name from `GetDispatchAction()` and lets handlers read sub-actions.
- Pattern B returns an empty dispatch action and extracts the sub-action from the configured argument field.
- Normalize older `subAction` payloads only where current handlers require it.
- `manage_tools` is intercepted locally by the native dynamic tool manager.
- `manage_tools`, `inspect`, and the `core` category are protected from disablement.

## SECURITY AND LIFECYCLE
- Binding is loopback-only unless plugin settings explicitly allow non-loopback.
- Capability-token auth uses `X-MCP-Capability-Token` when enabled.
- Keep request-size, session-timeout, and async-write accounting intact; shutdown pumps game-thread tasks to avoid deadlocks.
- Do not block socket threads on Unreal editor work; route execution through the subsystem/game-thread path.

## ANTI-PATTERNS
- Hand-building tool schemas with ad hoc JSON when `McpSchemaBuilder` can express them.
- Registering non-canonical names or duplicate tool definitions.
- Returning raw handler JSON without MCP `content[]` wrapping.
- Adding transport behavior that only works for one client and bypasses JSON-RPC helpers.
