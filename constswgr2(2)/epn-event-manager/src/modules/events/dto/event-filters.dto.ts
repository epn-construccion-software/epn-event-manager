import { BadRequestException } from '@nestjs/common';

export const EVENT_ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'QUERY'] as const;

export type EventAction = (typeof EVENT_ACTIONS)[number];

export class EventFiltersDto {
  action?: EventAction;
  source?: string;
  entity?: string;

  static validate(filters: EventFiltersDto = {}): EventFiltersDto {
    const query = filters as Record<string, unknown>;
    const allowedFilters = ['action', 'source', 'entity'];
    const unknownFilter = Object.keys(query).find(
      (filter) => !allowedFilters.includes(filter),
    );

    if (unknownFilter) {
      throw new BadRequestException(
        `Filtro no reconocido: ${unknownFilter}. Use action, source o entity`,
      );
    }

    const validatedFilters: EventFiltersDto = {};

    if (query.action !== undefined) {
      const action = this.validateTextFilter('action', query.action);

      if (!EVENT_ACTIONS.includes(action as EventAction)) {
        throw new BadRequestException(
          `El filtro action debe ser uno de: ${EVENT_ACTIONS.join(', ')}`,
        );
      }

      validatedFilters.action = action as EventAction;
    }

    if (query.source !== undefined) {
      validatedFilters.source = this.validateTextFilter('source', query.source);
    }

    if (query.entity !== undefined) {
      validatedFilters.entity = this.validateTextFilter('entity', query.entity);
    }

    return validatedFilters;
  }

  private static validateTextFilter(name: string, value: unknown): string {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new BadRequestException(
        `El filtro ${name} debe ser una cadena no vacía`,
      );
    }

    return value.trim();
  }
}
