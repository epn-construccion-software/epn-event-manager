import {
  IsOptional,
  IsString,
  MaxLength,
  IsNumber,
  Min,
} from 'class-validator';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string | undefined;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string | undefined;

  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number | undefined;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number | undefined;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string | undefined;
}
