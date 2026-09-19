import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

// A native handler that never writes a field its own output contract declares
// required is invisible at runtime for the locally dispatched tools: their
// results reach the client through BuildToolResult without passing the
// canonical projection or the schema validation the execute seam applies to
// everything else. manage_tools.list_categories has shipped without
// totalCategories under exactly that cover. The gate below is static instead:
// it reads the declared contracts out of the canonical registry and demands the
// plugin publish what they name.
const pluginPrivateRoot = resolve(
  process.cwd(),
  'plugins/McpAutomationBridge/Source/McpAutomationBridge/Private',
);
const dynamicToolsRoot = join(pluginPrivateRoot, 'MCP/DynamicTools');
const localDispatchSeamPath = join(
  pluginPrivateRoot,
  'MCP/Transport/McpNativeTransportDynamicTools.cpp',
);

// The schema shards under MCP/Generated spell every contract field as a
// TEXT("...") chunk, so a scan that reads them finds every field by
// construction and proves nothing.
const GENERATED_SHARD_DIR = join(pluginPrivateRoot, 'MCP/Generated');

interface CanonicalRecord {
  readonly id: string;
  readonly routing?: {
    readonly parentTool?: string;
    readonly dispatchAction?: string;
    readonly dispatchMode?: string;
  };
  readonly schemas: { readonly output: Record<string, unknown> };
}

const canonicalRecords = (
  JSON.parse(
    readFileSync(
      resolve(
        process.cwd(),
        'src/tools/catalog/capabilities/generated/canonical-registry.generated.json',
      ),
      'utf8',
    ),
  ) as { readonly records: readonly CanonicalRecord[] }
).records;

// `success` and `message` are reunited with the payload by the native execute
// seam (McpNativeGatewayExecuteReceiptBuild.cpp), so a handler is only
// accountable for the domain fields its own contract requires.
const SEAM_SUPPLIED_FIELDS: ReadonlySet<string> = new Set(['success', 'message']);

const requiredDomainFields = (record: CanonicalRecord): readonly string[] =>
  (Array.isArray(record.schemas.output.required) ? record.schemas.output.required : [])
    .filter((field): field is string => typeof field === 'string')
    .filter((field) => !SEAM_SUPPLIED_FIELDS.has(field));

const contractedRecords = canonicalRecords.filter(
  (record) => requiredDomainFields(record).length > 0,
);

interface PluginSource {
  readonly name: string;
  readonly source: string;
}

const collectSources = (dir: string, root: string): PluginSource[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      return full === GENERATED_SHARD_DIR ? [] : collectSources(full, root);
    }
    if (!entry.isFile() || !/\.(?:cpp|h)$/.test(entry.name)) return [];
    return [{ name: relative(root, full), source: readFileSync(full, 'utf8') }];
  });

const pluginSources = collectSources(pluginPrivateRoot, pluginPrivateRoot);
const dynamicToolSources = collectSources(dynamicToolsRoot, dynamicToolsRoot);

const publishesField = (source: string, field: string): boolean =>
  new RegExp(`Set(?:String|Number|Bool|Array|Object)Field\\(\\s*TEXT\\("${field}"\\)`).test(source);

/** The `{ ... }` block that follows `match`, balanced to its closing brace. */
const blockAfter = (source: string, from: number): string | undefined => {
  const open = source.indexOf('{', from);
  if (open < 0) return undefined;
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    else if (source[index] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(open + 1, index);
    }
  }
  return undefined;
};

/** The body of the `if (Action == TEXT("<action>"))` arm of HandleAction. */
const dispatchArm = (action: string): string | undefined => {
  const guard = new RegExp(`Action\\s*==\\s*TEXT\\("${action}"\\)`);
  for (const { source } of dynamicToolSources) {
    const hit = guard.exec(source);
    if (hit !== null) return blockAfter(source, hit.index + hit[0].length);
  }
  return undefined;
};

/** The body of `FMcpDynamicToolManager::<name>`, wherever it is defined. */
const managerMethodBody = (name: string): { file: string; body: string } | undefined => {
  const definition = new RegExp(`FMcpDynamicToolManager::${name}\\s*\\(`);
  for (const { name: file, source } of dynamicToolSources) {
    const hit = definition.exec(source);
    if (hit === null) continue;
    const body = blockAfter(source, hit.index);
    if (body !== undefined) return { file, body };
  }
  return undefined;
};

/** The manager method a dispatch arm hands the action to. */
const dispatchTarget = (arm: string): string | undefined =>
  /(?:return|Result\s*=)\s*([A-Z][A-Za-z0-9_]*)\s*\(/.exec(arm)?.[1];

// Which parent tool bypasses the canonical projection is stated by the seam
// itself, so the narrow tier follows the source rather than a list kept by hand.
const locallyDispatchedParentTool = ((): string => {
  const seam = readFileSync(localDispatchSeamPath, 'utf8');
  const claim = /ToolName\s*(?:!=|==)\s*TEXT\("([a-z_]+)"\)/.exec(seam);
  if (claim === null) {
    throw new Error('the local tool-call seam no longer names the parent tool it claims');
  }
  return claim[1];
})();

const managerRecords = contractedRecords.filter(
  (record) =>
    record.routing?.dispatchMode === 'local' &&
    record.routing.parentTool === locallyDispatchedParentTool,
);

describe('native output field contracts', () => {
  it('derives its scope from the canonical registry', () => {
    expect(canonicalRecords.length).toBeGreaterThan(0);
    // 34 at the time of writing; a lower bound so that adding a capability that
    // declares a required output widens the gate instead of breaking it.
    expect(contractedRecords.length).toBeGreaterThanOrEqual(34);
    expect(contractedRecords.map((record) => record.id)).toContain('manage_tools.list_categories');
  });

  it('reads the plugin sources without the generated schema shards', () => {
    expect(pluginSources.length).toBeGreaterThan(0);
    expect(pluginSources.some(({ name }) => name.startsWith('MCP/Generated/'))).toBe(false);
  });

  it('publishes every required output field somewhere in the plugin', () => {
    const offenders = contractedRecords.flatMap((record) =>
      requiredDomainFields(record)
        .filter((field) => !pluginSources.some(({ source }) => publishesField(source, field)))
        .map((field) => `${record.id}.${field}`),
    );

    expect(offenders).toEqual([]);
  });
});

describe('native output field contracts under local dispatch', () => {
  it('covers the locally dispatched family the seam hands to the tool manager', () => {
    expect(locallyDispatchedParentTool).toBe('manage_tools');
    expect(managerRecords.map((record) => record.id)).toContain('manage_tools.list_categories');
    expect(managerRecords.length).toBeGreaterThanOrEqual(8);
  });

  it('publishes every required output field inside the method that serves the action', () => {
    const offenders = managerRecords.flatMap((record) => {
      const action = record.routing?.dispatchAction;
      if (action === undefined) return [`${record.id}: the registry declares no dispatch action`];

      const arm = dispatchArm(action);
      if (arm === undefined) return [`${record.id}: HandleAction no longer guards on ${action}`];

      const target = dispatchTarget(arm);
      if (target === undefined) return [`${record.id}: the ${action} arm calls no manager method`];

      const method = managerMethodBody(target);
      if (method === undefined) return [`${record.id}: ${target} is not defined under DynamicTools`];

      return requiredDomainFields(record)
        .filter((field) => !publishesField(method.body, field))
        .map((field) => `${record.id}.${field} missing from ${target} (${method.file})`);
    });

    expect(offenders).toEqual([]);
  });
});
