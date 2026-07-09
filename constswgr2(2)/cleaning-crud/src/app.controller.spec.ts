import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  it('returns the root message from AppService', () => {
    const appService: jest.Mocked<Pick<AppService, 'getHello'>> = {
      getHello: jest.fn(() => 'Cleaning CRUD is running'),
    };
    const controller = new AppController(appService as AppService);

    expect(controller.getHello()).toBe('Cleaning CRUD is running');
    expect(appService.getHello).toHaveBeenCalledTimes(1);
  });

  it('returns the health payload', () => {
    const controller = new AppController(new AppService());

    expect(controller.getHealth()).toMatchObject({
      status: 'OK',
      message: expect.stringContaining('Cleaning CRUD is healthy'),
    });
  });
});
