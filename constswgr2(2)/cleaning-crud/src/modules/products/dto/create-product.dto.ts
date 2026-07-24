import {
  IsNotEmpty,
  IsString,
  MaxLength,
  IsNumber,
  Min,
  IsOptional,
  Matches,
} from 'class-validator';

export class CreateProductDto {
  // [PREVENTIVE] allow optional id to assert duplicates in tests; normally auto-generated
  @IsOptional()
  @IsNumber()
  id?: number;

  @IsNotEmpty()
  @IsString()
  @Matches(/\S/, { message: 'name no puede contener solo espacios' })
  @MaxLength(100)
  name!: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/\S/, { message: 'category no puede contener solo espacios' })
  @MaxLength(50)
  category!: string;

  @IsNumber()
  @Min(0)
  quantity!: number;

  @IsNumber()
  @Min(0)
  price!: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;
}
