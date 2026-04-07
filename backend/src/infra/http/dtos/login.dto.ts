import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, IsString, MinLength } from 'class-validator'

export class LoginDto {
  @ApiProperty({ example: 'tenant-uuid-123', description: 'Tenant ID' })
  @IsString()
  tenantId!: string

  @ApiProperty({ example: 'alice@company.com' })
  @IsEmail()
  email!: string

  @ApiProperty({ example: 'Secret@123' })
  @IsString()
  @MinLength(1)
  password!: string
}
