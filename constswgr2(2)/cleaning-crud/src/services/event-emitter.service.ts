import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { LoggerService } from './logger.service';

@Injectable()
export class EventEmitterService {
  // [ADAPTIVE] endpoint moved to env var
  private readonly eventHubUrl =
    process.env.EVENT_HUB_URL || 'http://localhost:3000/events';

  constructor(private readonly logger: LoggerService) {}

  async emitEvent(
    action: string,
    entity: string,
    title: string,
    description: string,
    payload: Record<string, unknown>,
  ): Promise<unknown | undefined> {
    try {
      const event = {
        source: 'cleaning-crud',
        entity: entity,
        action: action,
        title: title,
        description: description,
        payload: payload,
      };

      const response = await axios.post(this.eventHubUrl, event, {
        timeout: 3000,
      });
      this.logger.info(`Event emitted: ${action}`, {
        entity,
        title,
        status: response.status,
      });
      return response.data;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      // [PREVENTIVE] Do not throw to avoid breaking CRUD flow; log error
      this.logger.error(`Error emitting event [${action}]: ${errorMessage}`);
      // Return undefined explicitly so callers can continue
      return undefined;
    }
  }
}
