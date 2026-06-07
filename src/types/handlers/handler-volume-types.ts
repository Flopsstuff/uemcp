/**
 * Volume and zone handler argument types.
 */
import type { HandlerArgs, Rotator, Vector3 } from './handler-common-types.js';

// ============================================================================
// Volumes & Zones Types (Phase 24)
// ============================================================================

/**
 * Volume-specific properties for different volume types
 */
export interface VolumeProperties {
    // Physics Volume
    bWaterVolume?: boolean;
    fluidFriction?: number;
    terminalVelocity?: number;
    priority?: number;

    // Pain Causing Volume
    bPainCausing?: boolean;
    damagePerSec?: number;
    damageType?: string;
    bEntryPain?: boolean;
    painInterval?: number;

    // Audio Volume
    bEnabled?: boolean;

    // Reverb Volume
    reverbSettings?: {
        bApplyReverb?: boolean;
        volume?: number;
        fadeTime?: number;
        reverbEffect?: string;
    };

    // Cull Distance Volume
    cullDistances?: Array<{
        size: number;
        cullDistance: number;
    }>;

    // Nav Modifier Volume
    areaClass?: string;
    bDynamicModifier?: boolean;

    // Post Process Volume (Note: Full PP config is Phase 29.5)
    bUnbound?: boolean;
    blendRadius?: number;
    blendWeight?: number;
}

/**
 * Arguments for manage_volumes tool (Phase 24)
 *
 * Covers:
 * - Trigger Volumes: trigger_volume, trigger_box, trigger_sphere, trigger_capsule
 * - Gameplay Volumes: blocking, kill_z, pain_causing, physics, audio, reverb
 * - Rendering Volumes: cull_distance, precomputed_visibility, lightmass_importance
 * - Navigation Volumes: nav_mesh_bounds, nav_modifier, camera_blocking
 * - Volume Configuration: extent, properties
 */
export interface VolumesArgs extends HandlerArgs {
    // Volume identification
    volumeName?: string;
    volumePath?: string;
    volumeClass?: string;

    // Location and transform
    location?: Vector3;
    rotation?: Rotator;

    // Volume extent/size
    extent?: Vector3;
    brushType?: 'Additive' | 'Subtractive';

    // Trigger shape parameters
    sphereRadius?: number;
    capsuleRadius?: number;
    capsuleHalfHeight?: number;
    boxExtent?: Vector3;

    // Volume-specific properties
    properties?: VolumeProperties;

    // Pain Causing Volume specific
    bPainCausing?: boolean;
    damagePerSec?: number;
    damageType?: string;

    // Physics Volume specific
    bWaterVolume?: boolean;
    fluidFriction?: number;
    terminalVelocity?: number;
    priority?: number;

    // Audio Volume specific
    bEnabled?: boolean;

    // Reverb Volume specific
    reverbEffect?: string;
    reverbVolume?: number;
    fadeTime?: number;

    // Cull Distance Volume specific
    cullDistances?: Array<{
        size: number;
        cullDistance: number;
    }>;

    // Nav Modifier Volume specific
    areaClass?: string;
    bDynamicModifier?: boolean;

    // Post Process Volume (basic - full config in Phase 29.5)
    bUnbound?: boolean;
    blendRadius?: number;
    blendWeight?: number;

    // Lightmass Importance Volume specific
    bLightmassReplacementPrimitive?: boolean;

    // Query parameters
    filter?: string;
    volumeType?: string;

    // Save option
    save?: boolean;
}
