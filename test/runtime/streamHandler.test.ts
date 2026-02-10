import { createStreamHandler } from '../../src/runtime/streamHandler';

describe('streamHandler', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: 0 });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('batches onOutput and calls reply once after throttle', async () => {
    const reply = jest.fn().mockResolvedValue(undefined);
    const { onOutput, complete } = createStreamHandler(reply);

    onOutput('a');
    onOutput('b');
    expect(reply).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1000);
    await Promise.resolve();
    expect(reply).toHaveBeenCalledTimes(1);
    expect(reply).toHaveBeenCalledWith('a\nb');
  });

  it('complete flushes remaining buffer', async () => {
    const reply = jest.fn().mockResolvedValue(undefined);
    const { onOutput, complete } = createStreamHandler(reply);

    onOutput('chunk');
    await complete();
    expect(reply).toHaveBeenCalledWith('chunk');
  });

  it('complete with no pending timeout does not leave buffer', async () => {
    const reply = jest.fn().mockResolvedValue(undefined);
    const { onOutput, complete } = createStreamHandler(reply);

    onOutput('x');
    jest.advanceTimersByTime(1000);
    await Promise.resolve();
    expect(reply).toHaveBeenCalledWith('x');
    reply.mockClear();

    await complete();
    expect(reply).not.toHaveBeenCalled();
  });
});
