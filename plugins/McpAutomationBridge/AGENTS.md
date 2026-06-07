# Plugins/McpAutomationBridge

Editor-only Unreal Engine 5.0-5.8 Preview plugin. Version source is `McpAutomationBridge.uplugin` (`VersionName` currently `0.5.30`). It provides the WebSocket automation bridge used by the TypeScript server and an optional native MCP HTTP/SSE endpoint.

## STRUCTURE
```
McpAutomationBridge/
|-- McpAutomationBridge.uplugin
|-- Config/                       # plugin defaults and packaging filters
`-- Source/McpAutomationBridge/
    |-- McpAutomationBridge.Build.cs
    |-- Public/
    |   |-- McpAutomationBridgeSettings.h
    |   |-- McpAutomationBridgeSubsystem.h
    |   `-- McpConnectionManager.h
    `-- Private/
        |-- Core/                 # module, settings, subsystem, request dispatch
        |-- Domains/              # one folder per automation domain
        |-- Foundation/           # reflection and shared implementation support
        |-- MCP/                  # native MCP transport and self-describing tools
        |-- Safety/               # UE-safe save/load/delete wrappers
        |-- Transport/            # WebSocket and connection management
        `-- UI/                   # plugin UI implementation
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Add action handler | `Private/Domains/<Domain>/<Responsibility>/` | Keep dispatchers/contracts at the domain root and implementations in the matching responsibility folder |
| Register handler | `Private/Core/Subsystem/` | Add to `InitializeHandlers()` |
| Declare handler | matching `Private/Domains/<Domain>/` header or subsystem header | Match existing declaration location |
| Route requests | `Private/Core/Requests/` | Game-thread dispatch, unsafe-state deferral, reentrancy guard |
| WebSocket bridge | `Private/Transport/` | Listen host, ports, token auth, rate limits |
| Native MCP | `Private/MCP/` | See nested AGENTS for `/mcp` transport and tool registry rules |
| Settings | `Public/McpAutomationBridgeSettings.h`, `Private/Core/Settings/McpAutomationBridgeSettings.cpp` | Loopback, TLS, token, native MCP, debug knobs |
| Shared implementation | `Private/Foundation/` | Bridge helpers, reflection, Blueprint and handler utilities |
| Safe Unreal operations | `Private/Safety/` | Save/load/delete wrappers and guards |
| Packaging | `scripts/package-plugin.*`, `Config/FilterPlugin.ini` | RunUAT package, installed flag, zip output |

## CONVENTIONS
- Handlers run through the subsystem request queue and game-thread dispatch. Do not execute editor API calls from socket threads.
- `InitializeHandlers()` is the authoritative action string map for WebSocket automation requests.
- Defer work while Unreal is saving packages, garbage collecting, or async loading; do not add bypasses around unsafe-state checks.
- Build configuration is intentionally version-aware: keep `Build.cs` feature probes and optional dependency guards when adding engine modules.
- Optional plugin features should fail gracefully when the UE module/plugin is unavailable.
- Keep dense domain implementations grouped by responsibility; a source folder should not accumulate more than 25 direct `.cpp`/`.h` files.

## UE SAFETY
- Use `McpSafeAssetSave`, `McpSafeLevelSave`, and `McpSafeLoadMap` from `McpSafeOperations.h` instead of raw package save/load calls.
- For Blueprint SCS work, create nodes/templates through SCS ownership patterns (`CreateNode`, `AddNode`) instead of assigning arbitrary outers.
- Avoid `ANY_PACKAGE`; use modern lookup helpers or `nullptr`-based lookups.
- Avoid modal asset saves on newly created assets; they can crash editor/D3D12 paths.

## SECURITY
- Default binding is loopback-only. `bAllowNonLoopback` must be explicit before binding LAN addresses.
- Capability-token auth applies to both WebSocket and native MCP when `bRequireCapabilityToken` is enabled.
- Path helpers must reject traversal and absolute host paths before touching the filesystem.
- Message/request rate limits are settings-driven; do not remove enforcement in connection code.

## ANTI-PATTERNS
- Blocking the game thread from socket accept/read/write loops.
- Adding handler actions without TS schema/action coverage and integration tests.
- Hardcoded `C:\`/`X:\` paths or project-local absolute paths in handlers/scripts.
- Editing generated plugin outputs: skip `Binaries/`, `Intermediate/`, `Saved/`, `DerivedDataCache/`, and repo-root `build/` packaging output.
