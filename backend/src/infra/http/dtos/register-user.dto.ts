import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator'
import { RoleType } from '@/domain/auth/enterprise/value-objects/user-role.vo'

export class RegisterUserDto {
  @ApiProperty({ example: 'tenant-uuid-123', description: 'ID of the tenant where the user will be created' })
  @IsString()
  tenantId!: string

  @ApiProperty({ example: 'Alice Smith', description: 'Full name of the user' })
  @IsString()
  @MinLength(2)
  name!: string

  @ApiProperty({ example: 'alice@company.com', description: 'Unique email within the tenant' })
  @IsEmail()
  email!: string

  @ApiProperty({ example: '••••••••', description: 'Password (min 8 chars, uppercase, number, special character)' })
  @IsString()
  @MinLength(8)
  password!: string

  @ApiProperty({ enum: ['PLATFORM_OWNER', 'RESELLER', 'ACCOUNT_ADMIN', 'MEMBER', 'AGENT'], example: 'MEMBER' })
  @IsEnum(['PLATFORM_OWNER', 'RESELLER', 'ACCOUNT_ADMIN', 'MEMBER', 'AGENT'])
  role!: RoleType

  @ApiPropertyOptional({ example: 'America/Sao_Paulo' })
  @IsOptional()
  @IsString()
  timezone?: string

  @ApiPropertyOptional({ example: 'pt-BR' })
  @IsOptional()
  @IsString()
  language?: string
}
