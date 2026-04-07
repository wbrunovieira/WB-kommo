import { ApiProperty } from '@nestjs/swagger'
import { IsString, MinLength } from 'class-validator'

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token received at login or from the last token rotation' })
  @IsString()
  @MinLength(1)
  refreshToken!: string
}
