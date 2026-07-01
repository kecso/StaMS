/**
 * WebGME deployment component settings (config/components.json).
 * @see https://github.com/webgme/webgme/wiki/Component-Settings
 */

export const STAMS_VERIFICATION_COMPONENT_ID = 'StaMS_Verification';

export type StamsZ3Settings = {
  command?: string;
  args?: string[];
  timeoutMs?: number;
};

export type StamsVerificationSettings = {
  maxDepth?: number;
  timeoutMs?: number;
  engine?: 'auto' | 'bounded' | 'z3';
  registry?: {
    result?: string;
  };
  z3?: StamsZ3Settings;
};

const DEFAULTS: StamsVerificationSettings = {
  maxDepth: 12,
  timeoutMs: 30000,
  engine: 'auto',
  registry: {
    result: 'stams/verification-result'
  },
  z3: {
    command: 'z3',
    args: ['-in', '-smt2'],
    timeoutMs: 30000
  }
};

function mergeSettings(
  base: StamsVerificationSettings,
  over?: StamsVerificationSettings | null
): StamsVerificationSettings {
  if (!over) {
    return { ...base, registry: { ...base.registry }, z3: { ...base.z3 } };
  }
  return {
    ...base,
    ...over,
    registry: { ...base.registry, ...over.registry },
    z3: { ...base.z3, ...over.z3 }
  };
}

/**
 * Read deployment defaults from WebGME (`GET /api/componentSettings/StaMS_Verification`).
 * Works in dev (Next rewrite) and production (same origin as WebGME).
 */
export async function fetchVerificationSettings(): Promise<StamsVerificationSettings> {
  try {
    const res = await fetch(`/api/componentSettings/${STAMS_VERIFICATION_COMPONENT_ID}`);
    if (!res.ok) {
      return mergeSettings(DEFAULTS);
    }
    const body = (await res.json()) as StamsVerificationSettings;
    return mergeSettings(DEFAULTS, body);
  } catch {
    return mergeSettings(DEFAULTS);
  }
}

export { DEFAULTS as VERIFICATION_SETTINGS_DEFAULTS };
