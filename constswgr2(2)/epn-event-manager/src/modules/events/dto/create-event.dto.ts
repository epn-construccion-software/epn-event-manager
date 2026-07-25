import {
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

const VALID_ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'QUERY'] as const;

export class CreateEventDto {
  @IsString({
    message: 'source debe ser una cadena de texto',
  })
  @IsNotEmpty({
    message: 'source es obligatorio',
  })
  @Matches(/\S/, {
    message: 'source no puede estar vacío',
  })
  source!: string;

  @IsString({
    message: 'entity debe ser una cadena de texto',
  })
  @IsNotEmpty({
    message: 'entity es obligatorio',
  })
  @Matches(/\S/, {
    message: 'entity no puede estar vacío',
  })
  entity!: string;

  @IsString({
    message: 'action debe ser una cadena de texto',
  })
  @IsNotEmpty({
    message: 'action es obligatorio',
  })
  @IsIn(VALID_ACTIONS, {
    message: 'action debe ser CREATE, UPDATE, DELETE o QUERY',
  })
  action!: string;

  @IsString({
    message: 'title debe ser una cadena de texto',
  })
  @IsNotEmpty({
    message: 'title es obligatorio',
  })
  @Matches(/\S/, {
    message: 'title no puede estar vacío',
  })
  title!: string;

  @IsOptional()
  @IsString({
    message: 'description debe ser una cadena de texto',
  })
  description?: string;

  @IsObject({
    message: 'payload debe ser un objeto',
  })
  payload!: Record<string, unknown>;
}