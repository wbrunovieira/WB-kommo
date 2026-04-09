import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsInt, IsOptional, IsString, Min } from 'class-validator'

export class CreateStageDto {
  @ApiProperty({ example: 'Qualification' })
  @IsString()
  name!: string

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number

  @ApiPropertyOptional({ example: '#6c63ff' })
  @IsOptional()
  @IsString()
  color?: string
}
