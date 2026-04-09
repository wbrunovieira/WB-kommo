import { ApiProperty } from '@nestjs/swagger'
import { IsArray, IsNumber, IsString, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'

class ReorderItem {
  @ApiProperty()
  @IsString()
  configId: string

  @ApiProperty()
  @IsNumber()
  order: number
}

export class ReorderLeadFieldConfigsDto {
  @ApiProperty({ type: [ReorderItem] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderItem)
  order: ReorderItem[]
}
