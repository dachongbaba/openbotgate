import {
  getGatewayCatalogEntry,
  listSupportedGateways,
  listImplementedGateways,
  GATEWAY_CATALOG,
} from '../../src/gateway/catalog';

describe('gateway catalog', () => {
  describe('getGatewayCatalogEntry', () => {
    it('returns entry for known id', () => {
      const entry = getGatewayCatalogEntry('feishu');
      expect(entry).toBeDefined();
      expect(entry?.id).toBe('feishu');
      expect(entry?.label).toBe('Feishu/Lark');
      expect(entry?.implemented).toBe(true);
    });

    it('returns undefined for unknown id', () => {
      expect(getGatewayCatalogEntry('unknown')).toBeUndefined();
    });

    it('normalizes id: case and trim', () => {
      expect(getGatewayCatalogEntry('FEISHU')).toBeDefined();
      const entry = getGatewayCatalogEntry('  feishu  ');
      expect(entry?.id).toBe('feishu');
    });
  });

  describe('listSupportedGateways', () => {
    it('returns all catalog entries', () => {
      const list = listSupportedGateways();
      expect(list).toHaveLength(GATEWAY_CATALOG.length);
      expect(list.map((e) => e.id).sort()).toEqual(
        ['discord', 'feishu', 'qq', 'telegram'].sort()
      );
    });
  });

  describe('listImplementedGateways', () => {
    it('returns only implemented entries', () => {
      const list = listImplementedGateways();
      expect(list.every((e) => e.implemented)).toBe(true);
      expect(list.length).toBe(GATEWAY_CATALOG.length);
    });
  });
});
