import { ApiProperty } from '@nestjs/swagger'
import { IsString, MinLength } from 'class-validator'

export class CreatePipelineDto {
  @ApiProperty({ example: 'Sales Pipeline' })
  @IsString()
  @MinLength(2)
  name!: string
}
