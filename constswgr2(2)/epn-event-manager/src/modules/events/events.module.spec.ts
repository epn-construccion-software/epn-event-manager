import { EventsModule } from './events.module';

describe('EventsModule', () => {
  it('is defined', () => {
    expect(new EventsModule()).toBeInstanceOf(EventsModule);
  });
});
