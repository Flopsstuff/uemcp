# src/tools/handlers

Domain-specific TypeScript action handlers. Implementation files are grouped by tool domain, with larger animation, audio, and level areas split by responsibility. They do argument cleanup and then dispatch to Unreal; they should not contain editor-side business logic that belongs in C++.

## STRUCTURE
```
handlers/
|-- index.ts                      # handler export surface
|-- foundation/
|   |-- arguments/                # argument extraction and validation
|   |-- dispatch/                 # automation dispatch, action requirements, timeouts
|   |-- normalization/            # UE path and transform normalization
|   `-- responses/                # response promotion helpers
|-- animation/{authoring,runtime}/
|-- audio/{authoring,runtime}/
|-- level/{structure,runtime}/
`-- <domain>/                     # one folder per remaining parent-tool domain
```

## WHERE TO LOOK
| Task | File | Notes |
|------|------|-------|
| Add action branch | matching `<domain>/*-handlers.ts` | Match the parent tool domain and existing switch style |
| Dispatch to Unreal | `foundation/dispatch/common-handlers.ts` | Use `executeAutomationRequest(action, params)` |
| Require action | `foundation/dispatch/common-handlers.ts` | Use `requireAction(args)` for action-based tools |
| Parse/format errors | `foundation/dispatch/common-handlers.ts` | Preserve tool/action context in returned errors |
| Normalize common inputs | `foundation/arguments/`, `foundation/normalization/` | Reuse existing coercion helpers |

## CONVENTIONS
- Switch on `args.action` after validating that arguments are records.
- Keep TS action names exactly aligned with C++ action registration and native MCP schema strings.
- Normalize paths, vectors, rotations, and transforms before bridge dispatch.
- Console commands must pass through `CommandValidator`; do not create alternate command execution paths.
- Return MCP tool responses through the shared response/parser helpers so output validation remains meaningful.

### Handler Pattern
```typescript
export async function handleFoo(args: unknown): Promise<ToolResponse> {
  const action = requireAction(args);
  switch (action) {
    case 'bar': {
      const params = { /* validated and normalized fields */ };
      return executeAutomationRequest('foo_bar', params);
    }
  }
}
```

## ANTI-PATTERNS
- Raw `AutomationBridge` or WebSocket calls from handler modules.
- Broad catch blocks that erase the action/tool name from errors.
- Accepting path-like strings without `sanitizePath()` or a domain-specific normalizer.
- Adding permissive fallbacks for unreleased draft action shapes.
- Stubbed or "not implemented" branches in public action enums.
