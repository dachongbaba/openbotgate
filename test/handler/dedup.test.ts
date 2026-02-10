import { isDuplicateMessage } from '../../src/handler/dedup';

jest.mock('../../src/utils/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

describe('dedup', () => {
  it('returns false on first call for an id', () => {
    const id = `msg-${Date.now()}-${Math.random()}`;
    expect(isDuplicateMessage(id)).toBe(false);
  });

  it('returns true on second call for same id', () => {
    const id = `msg-${Date.now()}-${Math.random()}`;
    expect(isDuplicateMessage(id)).toBe(false);
    expect(isDuplicateMessage(id)).toBe(true);
  });

  it('returns false for different ids', () => {
    const id1 = `msg-a-${Date.now()}`;
    const id2 = `msg-b-${Date.now()}`;
    expect(isDuplicateMessage(id1)).toBe(false);
    expect(isDuplicateMessage(id2)).toBe(false);
  });
});
