import type { IGateway } from './types';
import {
  getGatewayCatalogEntry,
  listImplementedGateways,
  listSupportedGateways,
} from './catalog';

export function normalizeGatewayType(raw: string | undefined): string {
  const v = (raw ?? '').trim().toLowerCase();
  if (v === 'lark') return 'feishu';
  return v || 'feishu';
}

/** Lazy load gateway modules so optional native deps (e.g. Matrix crypto on Windows) are only loaded when that gateway is used. */
const GATEWAY_LOADERS: Record<string, () => IGateway> = {
  feishu: () => require('./feishu').feishu,
  telegram: () => require('./telegram').telegram,
  whatsapp: () => require('./whatsapp').whatsapp,
  discord: () => require('./discord').discord,
  qq: () => require('./qq').qq,
};

const gatewayCache: Record<string, IGateway> = {};

export function getGateway(type: string): IGateway {
  const normalized = normalizeGatewayType(type);
  const entry = getGatewayCatalogEntry(normalized);
  if (!entry) {
    throw new Error(`Unknown gateway: ${type}. Supported: ${listSupportedGateways().map((e) => e.id).join(', ')}`);
  }
  const cached = gatewayCache[normalized];
  if (cached) return cached;
  const loader = GATEWAY_LOADERS[normalized];
  if (loader) {
    const gw = loader();
    gatewayCache[normalized] = gw;
    return gw;
  }
  throw new Error(
    `Gateway "${entry.label}" (${entry.id}) is not implemented yet. Implemented: ${listImplementedGateways().map((e) => e.id).join(', ')}`
  );
}
