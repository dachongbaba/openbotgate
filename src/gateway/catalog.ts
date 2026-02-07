import type { GatewayCatalogEntry } from './types';

/**
 * Supported gateways (channel list), aligned with OpenClaw QuickStart.
 * Only entries with implemented=true have a runtime implementation in OpenGate.
 */
export const GATEWAY_CATALOG: GatewayCatalogEntry[] = [
  { id: 'telegram', label: 'Telegram', selectionLabel: 'Telegram (Bot API)', implemented: false },
  { id: 'whatsapp', label: 'WhatsApp', selectionLabel: 'WhatsApp (QR link)', implemented: false },
  { id: 'discord', label: 'Discord', selectionLabel: 'Discord (Bot API)', implemented: false },
  { id: 'googlechat', label: 'Google Chat', selectionLabel: 'Google Chat (Chat API)', implemented: false },
  { id: 'slack', label: 'Slack', selectionLabel: 'Slack (Socket Mode)', implemented: false },
  { id: 'signal', label: 'Signal', selectionLabel: 'Signal (signal-cli)', implemented: false },
  { id: 'feishu', label: 'Feishu/Lark', selectionLabel: 'Feishu/Lark (飞书)', implemented: true },
  { id: 'nostr', label: 'Nostr', selectionLabel: 'Nostr (NIP-04 DMs)', implemented: false },
  { id: 'msteams', label: 'Microsoft Teams', selectionLabel: 'Microsoft Teams (Bot Framework)', implemented: false },
  { id: 'mattermost', label: 'Mattermost', selectionLabel: 'Mattermost (plugin)', implemented: false },
  { id: 'nextcloud-talk', label: 'Nextcloud Talk', selectionLabel: 'Nextcloud Talk (self-hosted)', implemented: false },
  { id: 'matrix', label: 'Matrix', selectionLabel: 'Matrix (plugin)', implemented: false },
  { id: 'bluebubbles', label: 'BlueBubbles', selectionLabel: 'BlueBubbles (macOS app)', implemented: false },
  { id: 'line', label: 'LINE', selectionLabel: 'LINE (Messaging API)', implemented: false },
  { id: 'zalo', label: 'Zalo', selectionLabel: 'Zalo (Bot API)', implemented: false },
  { id: 'zalouser', label: 'Zalo Personal', selectionLabel: 'Zalo (Personal Account)', implemented: false },
  { id: 'tlon', label: 'Tlon', selectionLabel: 'Tlon (Urbit)', implemented: false },
  { id: 'imessage', label: 'iMessage', selectionLabel: 'iMessage (imsg)', implemented: false },
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
