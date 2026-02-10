import {
  normalizeGatewayType,
  getGateway,
} from '../../src/gateway/registry';

describe('gateway registry', () => {
  describe('normalizeGatewayType', () => {
    it('maps lark to feishu', () => {
      expect(normalizeGatewayType('lark')).toBe('feishu');
    });

    it('returns feishu for empty or undefined', () => {
      expect(normalizeGatewayType('')).toBe('feishu');
      expect(normalizeGatewayType(undefined as unknown as string)).toBe('feishu');
    });

    it('trims and lowercases', () => {
      expect(normalizeGatewayType('  FEISHU  ')).toBe('feishu');
    });
  });

  describe('getGateway', () => {
    it('returns gateway instance for feishu', () => {
      const gw = getGateway('feishu');
      expect(gw).toBeDefined();
      expect(gw.id).toBe('feishu');
      expect(typeof gw.start).toBe('function');
      expect(typeof gw.reply).toBe('function');
      expect(typeof gw.send).toBe('function');
    });

    it('returns same instance on second call (cache)', () => {
      const a = getGateway('feishu');
      const b = getGateway('feishu');
      expect(a).toBe(b);
    });

    it('normalizes lark to feishu', () => {
      const gw = getGateway('lark');
      expect(gw.id).toBe('feishu');
    });

    it('throws for unknown gateway type with supported list', () => {
      expect(() => getGateway('unknown')).toThrow(/Unknown gateway/);
      expect(() => getGateway('unknown')).toThrow(/Supported:/);
    });
  });
});
