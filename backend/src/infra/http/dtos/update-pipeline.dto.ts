import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator'

export class UpdatePipelineDto {
  @ApiPropertyOptional({ example: 'Updated Pipeline Name' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
