import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  IsNumber,
  Min,
  ValidateIf,
} from 'class-validator';

export class UpdateProductDto {
  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsNotEmpty()
  @IsString()
  @Matches(/\S/, { message: 'name no puede contener solo espacios' })
  @MaxLength(100)
  name?: string | undefined;

  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsNotEmpty()
  @IsString()
  @Matches(/\S/, { message: 'category no puede contener solo espacios' })
  @MaxLength(50)
  category?: string | undefined;

  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsNumber()
  @Min(0)
  quantity?: number | undefined;

  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsNumber()
  @Min(0)
  price?: number | undefined;

  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsString()
  @MaxLength(300)
  description?: string | undefined;
}
