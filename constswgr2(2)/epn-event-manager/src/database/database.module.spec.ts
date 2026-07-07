import { DatabaseModule } from './database.module';

describe('DatabaseModule', () => {
  it('is defined', () => {
    expect(new DatabaseModule()).toBeInstanceOf(DatabaseModule);
  });
});
