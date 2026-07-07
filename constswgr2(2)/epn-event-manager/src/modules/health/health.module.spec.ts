import { HealthModule } from './health.module';

describe('HealthModule', () => {
  it('is defined', () => {
    expect(new HealthModule()).toBeInstanceOf(HealthModule);
  });
});
