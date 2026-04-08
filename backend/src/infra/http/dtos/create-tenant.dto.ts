import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString, Matches, MinLength } from 'class-validator'

export class CreateTenantDto {
  @ApiProperty({ example: 'Acme Corporação', description: 'Full display name of the company' })
  @IsString()
  @MinLength(2)
  name!: string

  @ApiProperty({ example: 'acme-corp', description: 'URL-safe slug (lowercase, hyphens only)' })
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'slug must be lowercase with hyphens only' })
  slug!: string

  @ApiPropertyOptional({
    example: 'plan-reseller',
    description: 'Plan ID to assign. Defaults to the platform default plan.',
  })
  @IsOptional()
  @IsString()
  planId?: string

  @ApiPropertyOptional({
    example: 'tenant-uuid-123',
    description: 'PLATFORM_OWNER only: assign this tenant to a specific reseller. Omit to create a new reseller tenant.',
  })
  @IsOptional()
  @IsString()
  resellerTenantId?: string
}
