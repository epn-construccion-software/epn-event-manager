import { AppService } from './app.service';

describe('AppService', () => {
  it('returns the application banner message', () => {
    expect(new AppService().getHello()).toContain('Cleaning CRUD is running');
  });
});
