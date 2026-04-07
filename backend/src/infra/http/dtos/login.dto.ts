import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, IsString, MinLength } from 'class-validator'

export class LoginDto {
  @ApiProperty({
    example: 'wb-digital-solutions',
    description: 'Workspace slug — identifies the tenant (visible in your account settings)',
  })
  @IsString()
  workspace!: string

  @ApiProperty({ example: 'alice@company.com' })
  @IsEmail()
  email!: string

  @ApiProperty({ example: 'Secret@123' })
  @IsString()
  @MinLength(1)
  password!: string
}
