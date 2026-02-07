import type { IGateway } from './types';
import {
  getGatewayCatalogEntry,
  listImplementedGateways,
  listSupportedGateways,
} from './catalog';
import { feishu } from './feishu';

/**
 * Resolve gateway type from env (e.g. feishu, lark -> feishu).
 */
export function normalizeGatewayType(raw: string | undefined): string {
  const v = (raw ?? '').trim().toLowerCase();
  if (v === 'lark') return 'feishu';
  return v || 'feishu';
}

/**
 * Return the gateway instance for the given type.
 * Only implemented gateways return an instance; others throw.
 */
export function getGateway(type: string): IGateway {
  const normalized = normalizeGatewayType(type);
  const entry = getGatewayCatalogEntry(normalized);
  if (!entry) {
    const ids = listSupportedGateways().map((e) => e.id);
    throw new Error(`Unknown gateway: ${type}. Supported: ${ids.join(', ')}`);
  }
  if (!entry.implemented) {
    const ids = listImplementedGateways().map((e) => e.id);
    throw new Error(
      `Gateway "${entry.label}" (${entry.id}) is not implemented yet. Implemented: ${ids.join(', ')}`
    );
  }
  if (normalized === 'feishu') {
    return feishu;
  }
  throw new Error(`Gateway "${normalized}" has no implementation.`);
}
