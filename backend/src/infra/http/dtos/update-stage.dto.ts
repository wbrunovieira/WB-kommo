import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString } from 'class-validator'

export class UpdateStageDto {
  @ApiPropertyOptional({ example: 'Qualification' })
  @IsOptional()
  @IsString()
  name?: string

  @ApiPropertyOptional({ example: '#6c63ff' })
  @IsOptional()
  @IsString()
  color?: string
}
