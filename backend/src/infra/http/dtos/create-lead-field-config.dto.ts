import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsArray, IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator'

export enum FieldTypeEnum {
  TEXT = 'TEXT',
  NUMBER = 'NUMBER',
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  DATE = 'DATE',
  SELECT = 'SELECT',
}

export class CreateLeadFieldConfigDto {
  @ApiProperty({ example: 'Budget' })
  @IsString()
  label: string

  @ApiProperty({ enum: FieldTypeEnum })
  @IsEnum(FieldTypeEnum)
  type: FieldTypeEnum

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isRequired?: boolean

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  options?: string[]
}
