import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsArray, IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator'

export class UpdateLeadFieldConfigDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  label?: string

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isRequired?: boolean

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  order?: number

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  options?: string[]
}
