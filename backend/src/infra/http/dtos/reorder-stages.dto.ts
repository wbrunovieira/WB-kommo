import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsArray, IsInt, IsString, IsUUID, Min, ValidateNested } from 'class-validator'

export class StageOrderItemDto {
  @ApiProperty({ example: 'uuid-here' })
  @IsUUID()
  stageId!: string

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  order!: number
}

export class ReorderStagesDto {
  @ApiProperty({ type: [StageOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StageOrderItemDto)
  order!: StageOrderItemDto[]
}
