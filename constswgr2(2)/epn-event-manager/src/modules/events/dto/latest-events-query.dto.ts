import { BadRequestException } from '@nestjs/common';

export const DEFAULT_LATEST_EVENTS_LIMIT = 10;
export const MAX_LATEST_EVENTS_LIMIT = 100;

export class LatestEventsQueryDto {
  limit?: number;

  static validate(rawLimit: unknown): number {
    if (rawLimit === undefined) {
      return DEFAULT_LATEST_EVENTS_LIMIT;
    }

    if (typeof rawLimit !== 'string' && typeof rawLimit !== 'number') {
      throw new BadRequestException(
        `El parámetro limit debe ser un entero entre 1 y ${MAX_LATEST_EVENTS_LIMIT}`,
      );
    }

    const value = Number(rawLimit);

    if (
      !Number.isInteger(value) ||
      value < 1 ||
      value > MAX_LATEST_EVENTS_LIMIT
    ) {
      throw new BadRequestException(
        `El parámetro limit debe ser un entero entre 1 y ${MAX_LATEST_EVENTS_LIMIT}`,
      );
    }

    return value;
  }
}
