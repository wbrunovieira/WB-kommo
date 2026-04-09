import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsString, IsUUID, IsOptional, IsNumber, IsArray, Min } from 'class-validator'

export class CreateLeadDto {
  @ApiProperty({ example: 'Acme Corp - New Deal' })
  @IsString()
  name!: string

  @ApiProperty({ example: 'pipeline-uuid' })
  @IsUUID()
  pipelineId!: string

  @ApiProperty({ example: 'stage-uuid' })
  @IsUUID()
  stageId!: string

  @ApiPropertyOptional({ example: 5000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  value?: number

  @ApiPropertyOptional({ example: 'user-uuid' })
  @IsOptional()
  @IsUUID()
  assignedToId?: string

  @ApiPropertyOptional({ example: ['hot', 'enterprise'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[]

  @ApiPropertyOptional()
  @IsOptional()
  customFields?: Record<string, unknown>
}
