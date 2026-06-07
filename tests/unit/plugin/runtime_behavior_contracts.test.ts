import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const privateSource = (...parts: string[]): string =>
  readFileSync(
    resolve(
      process.cwd(),
      'plugins/McpAutomationBridge/Source/McpAutomationBridge/Private',
      ...parts,
    ),
    'utf8',
  );

describe('plugin runtime behavior contracts', () => {
  it('applies byte and enum JSON settings before rejecting unsupported properties', () => {
    const source = privateSource(
      'Foundation',
      'Reflection',
      'McpPropertyReflectionImport.cpp',
    );

    const byteHandler = source.indexOf(
      'if (FByteProperty* ByteProp = CastField<FByteProperty>(Property))',
    );
    const enumHandler = source.indexOf(
      'if (FEnumProperty* EnumProp = CastField<FEnumProperty>(Property))',
    );
    const unsupportedFallback = source.indexOf(
      'Unsupported property type: %s',
    );

    expect(byteHandler).toBeGreaterThan(-1);
    expect(enumHandler).toBeGreaterThan(byteHandler);
    expect(unsupportedFallback).toBeGreaterThan(enumHandler);
  });

  it('validates enum inputs before conversion and rejects hidden sentinels', () => {
    const source = privateSource(
      'Foundation',
      'Reflection',
      'McpPropertyReflectionImport.cpp',
    );

    expect(source).toContain("Name[Index] == TEXT('\\0')");
    expect(source).toContain('if (bContainsEmbeddedNull)');
    expect(source).toContain('FMath::IsFinite(Value)');
    expect(source).toContain('FMath::Frac(Value) != 0.0');
    expect(source).toContain(
      'Value < static_cast<double>(MIN_int64)',
    );
    expect(source).toContain('Value >= Int64UpperBound');
    expect(source).toContain('IntValue < MIN_int32');
    expect(source).toContain('IntValue > MAX_int32');
    expect(source).toContain('Enum->GetIndexByValue(OutValue)');
    expect(source).toContain('Enum->HasMetaData(TEXT("Hidden"), EnumIndex)');
    expect(source).toContain('Enum->NumEnums() - 1');
    expect(source).not.toContain('GenerateFullEnumName');
    expect(source).not.toContain(
      'OutValue == INDEX_NONE || !Enum->IsValidEnumValue(OutValue)',
    );
  });

  it('distinguishes omitted channel textures from failed channel texture loads', () => {
    const source = privateSource(
      'Domains',
      'Texture',
      'McpAutomationBridge_TextureHandlersChannelPack.cpp',
    );

    expect(source).not.toContain('Response->GetBoolField(TEXT("success"))');
    for (const channel of ['Red', 'Green', 'Blue', 'Alpha']) {
      expect(source).toContain(
        `if (!${channel}Path.IsEmpty() && !${channel}Tex)`,
      );
    }
  });

  it('resolves Blueprint root aliases even when no explicit root node exists', () => {
    const supportSource = privateSource(
      'Domains',
      'SCS',
      'McpAutomationBridge_SCSHandlers.cpp',
    );
    const addSource = privateSource(
      'Domains',
      'SCS',
      'McpAutomationBridge_SCSHandlersAddComponent.cpp',
    );

    expect(supportSource).toContain('bool IsSCSRootAlias(');
    expect(supportSource).toMatch(
      /IsSCSRootAlias\(ExpectedParentName\)[\s\S]*IsSCSRootNode\(SCS, Node\)/u,
    );
    expect(addSource).toContain('IsSCSRootAlias(ParentComponentName)');
    expect(addSource).toMatch(
      /IsSCSRootAlias\(ParentComponentName\)[\s\S]*SCS->GetRootNodes\(\)/u,
    );
  });

  it('adds Niagara modules through the stack graph utility', () => {
    const source = privateSource(
      'Domains',
      'NiagaraGraph',
      'McpAutomationBridge_NiagaraGraphHandlers.cpp',
    );

    expect(source).toContain(
      'FNiagaraStackGraphUtilities::AddScriptModuleToStack',
    );
    expect(source).not.toContain(
      'NewObject<UNiagaraNodeFunctionCall>(TargetGraph)',
    );
  });

  it('splices the Niagara parameter-map chain before removing stack modules', () => {
    const handlerSource = privateSource(
      'Domains',
      'NiagaraGraph',
      'McpAutomationBridge_NiagaraGraphHandlers.cpp',
    );
    const removalSource = privateSource(
      'Domains',
      'NiagaraGraph',
      'McpAutomationBridge_NiagaraGraphRemoval.cpp',
    );

    expect(handlerSource).toContain('RemoveNiagaraGraphNodeSafely(');
    expect(handlerSource).not.toContain(
      'TargetGraph->RemoveNode(TargetNode)',
    );
    expect(removalSource).toMatch(
      /TryCreateConnection\(\s*PreviousOutputPin,\s*NextInputPin\)[\s\S]*RemoveNode\(TargetNode\)/u,
    );
  });

  it('prefers an existing Niagara connection before attempting auto-connect', () => {
    const source = privateSource(
      'Domains',
      'NiagaraGraph',
      'McpAutomationBridge_NiagaraGraphPins.cpp',
    );
    const existingConnectionCheck = source.indexOf(
      'if (!FromCandidatePin->LinkedTo.IsEmpty())',
    );
    const connectionAttempt = source.indexOf(
      'TryCreateConnection(FromCandidatePin, ToCandidatePin)',
    );

    expect(existingConnectionCheck).toBeGreaterThan(-1);
    expect(connectionAttempt).toBeGreaterThan(-1);
    expect(existingConnectionCheck).toBeLessThan(connectionAttempt);
  });

  it('switches to a transient editor world before deleting active worlds', () => {
    const source = privateSource(
      'Safety',
      'McpSafeOperationsFolderDeleteAssets.h',
    );

    expect(source).toContain('GEditor->NewMap(false)');
    expect(source).not.toContain('TEXT("/Engine/Maps/');
  });

  it('verifies that map loading changed to the requested world package', () => {
    const source = privateSource('Safety', 'McpSafeOperationsMapLoad.h');

    expect(source).toContain('ResolveExpectedMapPackageName(');
    expect(source).toMatch(
      /FEditorFileUtils::LoadMap\(\*MapPath\)[\s\S]*LoadedWorldPackageName\.Equals\(\s*ExpectedPackageName/u,
    );
    expect(source).toContain(
      'McpSafeLoadMap: Editor world does not match requested map',
    );
  });

  it('emits subscribed logs as schema-valid structured automation events', () => {
    const source = privateSource(
      'Domains',
      'Log',
      'McpAutomationBridge_LogHandlers.cpp',
    );

    expect(source).toContain(
      'Event->SetStringField(TEXT("type"), TEXT("automation_event"))',
    );
    expect(source).toContain(
      'Event->SetObjectField(TEXT("payload"), Payload)',
    );
    expect(source).not.toContain(
      'TEXT("{\\"event\\":\\"log\\",\\"category\\"',
    );
  });

  it('does not attach a transient nested emitter to a new Niagara system', () => {
    const source = privateSource(
      'Domains',
      'NiagaraAuthoring',
      'McpAutomationBridge_NiagaraAuthoringHandlersSystems.cpp',
    );

    expect(source).not.toContain(
      'NewObject<UNiagaraEmitter>(NewSystem, FName(TEXT("DefaultEmitter")))',
    );
  });

  it('makes WebSocket listener shutdown idempotent and race-safe', () => {
    const header = privateSource(
      'Transport',
      'WebSocket',
      'McpBridgeWebSocket.h',
    );
    const lifecycleSource = privateSource(
      'Transport',
      'WebSocket',
      'McpBridgeWebSocket.cpp',
    );
    const serverSource = privateSource(
      'Transport',
      'WebSocket',
      'McpBridgeWebSocketServer.cpp',
    );

    expect(header).toContain('TAtomic<bool> bCloseStarted;');
    expect(header).toContain('FCriticalSection ListenSocketMutex;');
    expect(lifecycleSource).toContain('if (bCloseStarted.Exchange(true))');
    expect(lifecycleSource).toContain('CloseListenSocket();');
    expect(serverSource).toContain('ON_SCOPE_EXIT');
    expect(serverSource).toContain('DestroyListenSocket();');
    expect(serverSource).not.toMatch(
      /DestroySocket\(ListenSocket\)[\s\S]{0,80}ListenSocket = nullptr/u,
    );
  });
});
