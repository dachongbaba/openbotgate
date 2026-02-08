import type { GatewayCatalogEntry } from './types';

/**
 * Supported gateways (channel list), aligned with OpenClaw QuickStart.
 * implemented=true: has gateway instance in registry.
 */
export const GATEWAY_CATALOG: GatewayCatalogEntry[] = [
  { id: 'telegram', label: 'Telegram', selectionLabel: 'Telegram (Bot API)', implemented: true },
  { id: 'whatsapp', label: 'WhatsApp', selectionLabel: 'WhatsApp (QR link)', implemented: true },
  { id: 'discord', label: 'Discord', selectionLabel: 'Discord (Bot API)', implemented: true },
  { id: 'feishu', label: 'Feishu/Lark', selectionLabel: 'Feishu/Lark (飞书)', implemented: true },
  { id: 'qq', label: 'QQ 频道', selectionLabel: 'QQ 频道 (qq-guild-bot 官方)', implemented: true },
];

const byId = new Map(GATEWAY_CATALOG.map((e) => [e.id, e]));

export function getGatewayCatalogEntry(id: string): GatewayCatalogEntry | undefined {
  return byId.get(id.trim().toLowerCase());
}

export function listSupportedGateways(): GatewayCatalogEntry[] {
  return [...GATEWAY_CATALOG];
}

export function listImplementedGateways(): GatewayCatalogEntry[] {
  return GATEWAY_CATALOG.filter((e) => e.implemented);
}
