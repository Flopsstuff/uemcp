import { manageToolsToolDefinition } from './manage-tools-tool.js';
import { manageAssetToolDefinition } from './manage-asset-tool.js';
import { manageBlueprintToolDefinition } from './manage-blueprint-tool.js';
import { controlActorToolDefinition } from './control-actor-tool.js';
import { controlEditorToolDefinition } from './control-editor-tool.js';
import { manageLevelToolDefinition } from './manage-level-tool.js';
import { buildEnvironmentToolDefinition } from './build-environment-tool.js';
import { animationPhysicsToolDefinition } from './animation-physics-tool.js';
import { systemControlToolDefinition } from './system-control-tool.js';
import { manageSequenceToolDefinition } from './manage-sequence-tool.js';
import { inspectToolDefinition } from './inspect-tool.js';
import { manageAudioToolDefinition } from './manage-audio-tool.js';
import { manageGeometryToolDefinition } from './manage-geometry-tool.js';
import { managePcgToolDefinition } from './manage-pcg-tool.js';
import { manageEffectToolDefinition } from './manage-effect-tool.js';
import { manageGasToolDefinition } from './manage-gas-tool.js';
import { manageCharacterToolDefinition } from './manage-character-tool.js';
import { manageCombatToolDefinition } from './manage-combat-tool.js';
import { manageAiToolDefinition } from './manage-ai-tool.js';
import { manageInventoryToolDefinition } from './manage-inventory-tool.js';
import { manageInteractionToolDefinition } from './manage-interaction-tool.js';
import { manageNetworkingToolDefinition } from './manage-networking-tool.js';
import { manageLevelStructureToolDefinition } from './manage-level-structure-tool.js';
import type { ToolDefinition } from './tool-definition.js';

export const allToolDefinitions: ToolDefinition[] = [
  manageToolsToolDefinition,
  manageAssetToolDefinition,
  manageBlueprintToolDefinition,
  controlActorToolDefinition,
  controlEditorToolDefinition,
  manageLevelToolDefinition,
  buildEnvironmentToolDefinition,
  animationPhysicsToolDefinition,
  systemControlToolDefinition,
  manageSequenceToolDefinition,
  inspectToolDefinition,
  manageAudioToolDefinition,
  manageGeometryToolDefinition,
  managePcgToolDefinition,
  manageEffectToolDefinition,
  manageGasToolDefinition,
  manageCharacterToolDefinition,
  manageCombatToolDefinition,
  manageAiToolDefinition,
  manageInventoryToolDefinition,
  manageInteractionToolDefinition,
  manageNetworkingToolDefinition,
  manageLevelStructureToolDefinition
];
