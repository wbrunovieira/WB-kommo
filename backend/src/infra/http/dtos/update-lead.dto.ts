import { ApiPropertyOptional, PartialType } from '@nestjs/swagger'
import { IsEnum, IsOptional } from 'class-validator'
import { CreateLeadDto } from './create-lead.dto'

export class UpdateLeadDto extends PartialType(CreateLeadDto) {
  @ApiPropertyOptional({ enum: ['OPEN', 'WON', 'LOST'] })
  @IsOptional()
  @IsEnum(['OPEN', 'WON', 'LOST'])
  status?: 'OPEN' | 'WON' | 'LOST'

  @ApiPropertyOptional()
  @IsOptional()
  customFields?: Record<string, unknown>
}
