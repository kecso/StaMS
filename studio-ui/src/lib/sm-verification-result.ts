import type { GmeClient } from '@/types/gme-global';
import type { SmVerificationResult } from '@/types/verification';

import { DEFAULT_VERIFICATION_REGISTRY_KEY } from '@/lib/gme-plugins';
import { PROJECT_ROOT } from '@/lib/sm-diagram-from-client';

export function readVerificationResult(
  client: GmeClient,
  registryKey = DEFAULT_VERIFICATION_REGISTRY_KEY,
  rootPath = PROJECT_ROOT
): SmVerificationResult | null {
  const root = client.getNode(rootPath);
  if (!root?.getRegistry) {
    return null;
  }
  const raw = root.getRegistry(registryKey);
  if (!raw || !String(raw).trim()) {
    return null;
  }
  try {
    return JSON.parse(String(raw)) as SmVerificationResult;
  } catch {
    return null;
  }
}
