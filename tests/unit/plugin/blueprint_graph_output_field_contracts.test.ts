import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { validateAgainstSubset } from '../gateway-discovery-suite/schema-subset.js';

// A graph handler that forgets one required output field is not a cosmetic
// defect: the native execute seam projects the handler Result onto the declared
// output contract and then validates it, so the omission is reported to the
// caller as OUTPUT_SCHEMA_VIOLATION on a call that actually mutated or read the
// graph. get_node_details shipped without `nodeId` and create_reroute_node
// without `nodeGuid`, and both were the readback step of a working operation:
// the node was in the graph, the client saw an error and never got the handle.
const pluginPrivateRoot = resolve(
  process.cwd(),
  'plugins/McpAutomationBridge/Source/McpAutomationBridge/Private',
);
const graphDomainRoot = join(pluginPrivateRoot, 'Domains/BlueprintGraph');
const domainRegistrationPath = join(
  pluginPrivateRoot,
  'Core/Subsystem/McpAutomationBridgeSubsystemBlueprintDomainRegistration.cpp',
);

interface CanonicalRecord {
  readonly id: string;
  readonly legacyIds: readonly { readonly tool: string; readonly action: string }[];
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
// seam (McpNativeGatewayExecuteReceiptBuild.cpp), so a domain handler is only
// accountable for the domain fields its own contract requires.
const SEAM_SUPPLIED_FIELDS: ReadonlySet<string> = new Set(['success', 'message']);

interface HandlerSource {
  readonly name: string;
  readonly source: string;
}

const collectHandlerSources = (dir: string): HandlerSource[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return collectHandlerSources(full);
    if (!entry.isFile() || !entry.name.endsWith('.cpp')) return [];
    return [{ name: relative(graphDomainRoot, full), source: readFileSync(full, 'utf8') }];
  });

// Recursive on purpose: list_node_types lives in Context/, so a gate that reads
// only the domain root would not see it.
const graphHandlerSources = collectHandlerSources(graphDomainRoot);

const publishesField = (source: string, field: string): boolean =>
  new RegExp(`Set(?:String|Number|Bool|Array|Object)Field\\(\\s*TEXT\\("${field}"\\)`).test(source);

/** The body of the function that claims `action`, from its sub-action guard to
 *  the enclosing function's column-0 closing brace. */
const guardedHandlerBody = (source: string, action: string): string | undefined => {
  const guard = new RegExp(`Context\\.SubAction\\s*(?:!=|==)\\s*TEXT\\("${action}"\\)`).exec(source);
  if (guard === null) return undefined;
  const rest = source.slice(guard.index + guard[0].length);
  const functionEnd = /^\}/m.exec(rest);
  return functionEnd === null ? rest : rest.slice(0, functionEnd.index);
};

const graphSubActions = ((): ReadonlySet<string> => {
  const registration = readFileSync(domainRegistrationPath, 'utf8');
  const declaration = /GraphSubActions\s*=\s*\{([\s\S]*?)\};/.exec(registration);
  if (declaration === null) {
    throw new Error('GraphSubActions is no longer declared in the blueprint domain registration');
  }
  return new Set(Array.from(declaration[1].matchAll(/TEXT\("([a-z_]+)"\)/g), (hit) => hit[1]));
})();

const graphCapabilities = canonicalRecords.filter(
  (record) =>
    record.id.startsWith('blueprint.') &&
    record.legacyIds.some((legacy) => graphSubActions.has(legacy.action)),
);

const requiredDomainFields = (record: CanonicalRecord): readonly string[] =>
  (Array.isArray(record.schemas.output.required) ? record.schemas.output.required : [])
    .filter((field): field is string => typeof field === 'string')
    .filter((field) => !SEAM_SUPPLIED_FIELDS.has(field));

const actionOf = (record: CanonicalRecord): string => {
  const legacy = record.legacyIds.find((candidate) => graphSubActions.has(candidate.action));
  if (legacy === undefined) throw new Error(`${record.id} has no graph sub-action`);
  return legacy.action;
};

// create_node is absent on purpose: it finalizes through the shared node-creation
// completion path rather than writing nodeGuid in the function that guards the
// sub-action, so only the domain-wide tier can speak for it.
const SELF_CONTAINED_READBACKS = [
  { id: 'blueprint.get_node_details', file: 'McpAutomationBridge_BlueprintGraphHandlersDetails.cpp' },
  { id: 'blueprint.create_reroute_node', file: 'McpAutomationBridge_BlueprintGraphHandlersNodeMutations.cpp' },
  { id: 'blueprint.get_graph_details', file: 'McpAutomationBridge_BlueprintGraphHandlersQueries.cpp' },
  { id: 'blueprint.get_pin_details', file: 'McpAutomationBridge_BlueprintGraphHandlersDetails.cpp' },
  { id: 'blueprint.list_node_types', file: 'Context/McpAutomationBridge_BlueprintGraphHandlersContextEditor.cpp' },
] as const;

const recordFor = (id: string): CanonicalRecord => {
  const record = canonicalRecords.find((candidate) => candidate.id === id);
  if (!record) throw new Error(`capability record ${id} is missing from the canonical registry`);
  return record;
};

describe('BlueprintGraph output field contracts', () => {
  it('covers every graph sub-action that declares a required output field', () => {
    const covered = graphCapabilities
      .filter((record) => requiredDomainFields(record).length > 0)
      .map((record) => record.id);

    expect(covered).toContain('blueprint.get_node_details');
    expect(covered).toContain('blueprint.create_reroute_node');
  });

  it('publishes every required output field somewhere in the graph handlers', () => {
    const offenders = graphCapabilities.flatMap((record) =>
      requiredDomainFields(record)
        .filter((field) => !graphHandlerSources.some(({ source }) => publishesField(source, field)))
        .map((field) => `${record.id}.${field}`),
    );

    expect(offenders).toEqual([]);
  });

  it('publishes the required output field inside the handler that claims the sub-action', () => {
    const offenders = SELF_CONTAINED_READBACKS.flatMap(({ id, file }) => {
      const record = recordFor(id);
      const handler = graphHandlerSources.find(({ name }) => name === file);
      if (handler === undefined) return [`${id}: handler source ${file} is gone`];
      const body = guardedHandlerBody(handler.source, actionOf(record));
      if (body === undefined) return [`${id}: ${file} no longer guards on ${actionOf(record)}`];
      return requiredDomainFields(record)
        .filter((field) => !publishesField(body, field))
        .map((field) => `${id}.${field} missing from ${file}`);
    });

    expect(offenders).toEqual([]);
  });

  it('keeps nodeId and nodeGuid the required readback fields of their contracts', () => {
    expect(recordFor('blueprint.get_node_details').schemas.output.required).toContain('nodeId');
    expect(recordFor('blueprint.create_reroute_node').schemas.output.required).toContain('nodeGuid');
  });
});

/** The native seam's canonical projection: reunite the transport success verdict,
 *  then keep only declared output properties (McpProjectCanonicalOutput). */
const nativeCanonicalOutput = (
  result: Record<string, unknown>,
  schema: Record<string, unknown>,
): Record<string, unknown> => {
  const withVerdict: Record<string, unknown> = { success: true, ...result };
  const properties = schema.properties as Record<string, unknown> | undefined;
  if (properties === undefined) return {};
  const projected: Record<string, unknown> = {};
  for (const name of Object.keys(properties)) {
    if (name in withVerdict) projected[name] = withVerdict[name];
  }
  return projected;
};

describe('BlueprintGraph readback payloads satisfy their output contract', () => {
  // What the handler emits beside the contract fields: a node comment under the
  // handler's own spelling, editor coordinates, and the verification fields
  // McpHandlerUtils::AddVerification stamps. None are declared, so the
  // projection drops them and they cannot mask a missing required field.
  const undeclaredHandlerFields = {
    nodeComment: '',
    x: 600,
    y: 6300,
    assetPath: '/Game/Blueprints/BP_Test',
    exists: true,
  } as const;

  const nodeDetailsPayload = {
    nodeName: 'K2Node_CallFunction_0',
    nodeTitle: 'Print String',
    pins: [{ pinName: 'exec', direction: 'Input', pinType: 'exec', linkedTo: [] }],
    ...undeclaredHandlerFields,
  } as const;

  it('rejects the get_node_details payload that omits nodeId', () => {
    const schema = recordFor('blueprint.get_node_details').schemas.output;
    const violation = validateAgainstSubset(nativeCanonicalOutput(nodeDetailsPayload, schema), schema);

    expect(violation?.reason).toBe('missing-required');
    expect(violation?.message).toBe("Missing required parameter 'nodeId'");
  });

  it('accepts the get_node_details payload that echoes the requested nodeId', () => {
    const schema = recordFor('blueprint.get_node_details').schemas.output;
    const payload = { ...nodeDetailsPayload, nodeId: '0F2A4C6E8A0C2E4F' };

    expect(validateAgainstSubset(nativeCanonicalOutput(payload, schema), schema)).toBeUndefined();
  });

  it('rejects the create_reroute_node payload that reports only nodeId', () => {
    const schema = recordFor('blueprint.create_reroute_node').schemas.output;
    // The Knot is created and nodeId names it, but the contract handle is
    // nodeGuid, so the caller is told the working call failed.
    const payload = { nodeId: '0F2A4C6E8A0C2E4F', nodeName: 'K2Node_Knot_0' };

    expect(validateAgainstSubset(nativeCanonicalOutput(payload, schema), schema)?.reason).toBe(
      'missing-required',
    );
  });

  it('accepts the create_reroute_node payload that reports nodeGuid', () => {
    const schema = recordFor('blueprint.create_reroute_node').schemas.output;
    const payload = { nodeId: '0F2A4C6E8A0C2E4F', nodeGuid: '0F2A4C6E8A0C2E4F', nodeName: 'K2Node_Knot_0' };

    expect(validateAgainstSubset(nativeCanonicalOutput(payload, schema), schema)).toBeUndefined();
  });
});
