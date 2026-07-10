import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(() => {
    controller = new HealthController();
  });

  it('check returns status ok', () => {
    expect(controller.check()).toEqual(
      expect.objectContaining({ status: 'ok' }),
    );
  });

  it('check returns timestamp as string', () => {
    const result = controller.check();

    expect(typeof result.timestamp).toBe('string');
    expect(result.timestamp.length).toBeGreaterThan(0);
  });
});
