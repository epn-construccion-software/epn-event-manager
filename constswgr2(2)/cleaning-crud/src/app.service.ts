import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return '🧹 Cleaning CRUD is running!';
  }
}
