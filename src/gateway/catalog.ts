import type { GatewayCatalogEntry } from './types';

/**
 * Supported gateways (channel list), aligned with OpenClaw QuickStart.
 * implemented=true: has gateway instance in registry.
 */
export const GATEWAY_CATALOG: GatewayCatalogEntry[] = [
  { id: 'telegram', label: 'Telegram', selectionLabel: 'Telegram (Bot API)', implemented: true },
  { id: 'whatsapp', label: 'WhatsApp', selectionLabel: 'WhatsApp (QR link)', implemented: true },
  { id: 'discord', label: 'Discord', selectionLabel: 'Discord (Bot API)', implemented: true },
  { id: 'googlechat', label: 'Google Chat', selectionLabel: 'Google Chat (Chat API)', implemented: true },
  { id: 'slack', label: 'Slack', selectionLabel: 'Slack (Socket Mode)', implemented: true },
  { id: 'signal', label: 'Signal', selectionLabel: 'Signal (signal-cli)', implemented: true },
  { id: 'feishu', label: 'Feishu/Lark', selectionLabel: 'Feishu/Lark (飞书)', implemented: true },
  { id: 'nostr', label: 'Nostr', selectionLabel: 'Nostr (NIP-04 DMs)', implemented: true },
  { id: 'msteams', label: 'Microsoft Teams', selectionLabel: 'Microsoft Teams (Bot Framework)', implemented: true },
  { id: 'mattermost', label: 'Mattermost', selectionLabel: 'Mattermost (plugin)', implemented: true },
  { id: 'nextcloud-talk', label: 'Nextcloud Talk', selectionLabel: 'Nextcloud Talk (self-hosted)', implemented: true },
  { id: 'matrix', label: 'Matrix', selectionLabel: 'Matrix (plugin)', implemented: true },
  { id: 'bluebubbles', label: 'BlueBubbles', selectionLabel: 'BlueBubbles (macOS app)', implemented: true },
  { id: 'line', label: 'LINE', selectionLabel: 'LINE (Messaging API)', implemented: true },
  { id: 'zalo', label: 'Zalo', selectionLabel: 'Zalo (Bot API)', implemented: true },
  { id: 'zalouser', label: 'Zalo Personal', selectionLabel: 'Zalo (Personal Account)', implemented: true },
  { id: 'tlon', label: 'Tlon', selectionLabel: 'Tlon (Urbit)', implemented: true },
  { id: 'imessage', label: 'iMessage', selectionLabel: 'iMessage (imsg)', implemented: true },
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
