import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator'
import { RoleType } from '@/domain/auth/enterprise/value-objects/user-role.vo'

export class RegisterUserDto {
  @IsString()
  tenantId!: string

  @IsString()
  @MinLength(2)
  name!: string

  @IsEmail()
  email!: string

  @IsString()
  @MinLength(8)
  password!: string

  @IsEnum(['RESELLER', 'ACCOUNT_ADMIN', 'MEMBER'])
  role!: RoleType

  @IsOptional()
  @IsString()
  timezone?: string

  @IsOptional()
  @IsString()
  language?: string
}
