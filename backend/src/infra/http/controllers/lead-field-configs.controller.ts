import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common'
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger'
import { CurrentUser, CurrentUserPayload } from '@/infra/auth/decorators/current-user.decorator'
import { ListLeadFieldConfigsUseCase } from '@/domain/leads/application/use-cases/list-lead-field-configs/list-lead-field-configs.use-case'
import { CreateLeadFieldConfigUseCase } from '@/domain/leads/application/use-cases/create-lead-field-config/create-lead-field-config.use-case'
import { UpdateLeadFieldConfigUseCase } from '@/domain/leads/application/use-cases/update-lead-field-config/update-lead-field-config.use-case'
import { DeleteLeadFieldConfigUseCase } from '@/domain/leads/application/use-cases/delete-lead-field-config/delete-lead-field-config.use-case'
import { ReorderLeadFieldConfigsUseCase } from '@/domain/leads/application/use-cases/reorder-lead-field-configs/reorder-lead-field-configs.use-case'
import { CreateLeadFieldConfigDto } from '../dtos/create-lead-field-config.dto'
import { UpdateLeadFieldConfigDto } from '../dtos/update-lead-field-config.dto'
import { ReorderLeadFieldConfigsDto } from '../dtos/reorder-lead-field-configs.dto'
import { LeadFieldConfigPresenter } from '../presenters/lead-field-config.presenter'
import { FieldType } from '@/domain/leads/enterprise/entities/lead-field-config.entity'

@ApiTags('lead-field-configs')
@ApiBearerAuth('access-token')
@Controller('lead-field-configs')
export class LeadFieldConfigsController {
  constructor(
    private readonly listUseCase: ListLeadFieldConfigsUseCase,
    private readonly createUseCase: CreateLeadFieldConfigUseCase,
    private readonly updateUseCase: UpdateLeadFieldConfigUseCase,
    private readonly deleteUseCase: DeleteLeadFieldConfigUseCase,
    private readonly reorderUseCase: ReorderLeadFieldConfigsUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List lead field configs for the tenant' })
  @ApiResponse({ status: 200, description: 'List of lead field configurations.' })
  @ApiResponse({ status: 401, description: 'Not authenticated.' })
  async list(@CurrentUser() user: CurrentUserPayload) {
    const result = await this.listUseCase.execute({ tenantId: user.tenantId })
    if (result.isLeft()) throw result.value
    return LeadFieldConfigPresenter.toHttpList(result.value.configs)
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a custom lead field' })
  @ApiBody({ type: CreateLeadFieldConfigDto })
  @ApiResponse({ status: 201, description: 'Lead field config created successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid request body.' })
  @ApiResponse({ status: 401, description: 'Not authenticated.' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions.' })
  async create(@Body() dto: CreateLeadFieldConfigDto, @CurrentUser() user: CurrentUserPayload) {
    const result = await this.createUseCase.execute({
      tenantId: user.tenantId,
      label: dto.label,
      type: dto.type as FieldType,
      isRequired: dto.isRequired ?? false,
      options: dto.options ?? [],
    })
    if (result.isLeft()) throw result.value
    return LeadFieldConfigPresenter.toHttp(result.value.config)
  }

  // NOTE: reorder must be declared BEFORE :id to avoid Express param conflict
  @Patch('reorder')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reorder lead field configs' })
  @ApiBody({ type: ReorderLeadFieldConfigsDto })
  @ApiResponse({ status: 204, description: 'Field configs reordered.' })
  @ApiResponse({ status: 401, description: 'Not authenticated.' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions.' })
  async reorder(@Body() dto: ReorderLeadFieldConfigsDto, @CurrentUser() user: CurrentUserPayload) {
    const result = await this.reorderUseCase.execute({
      tenantId: user.tenantId,
      order: dto.order.map(o => ({ configId: o.configId, order: o.order })),
    })
    if (result.isLeft()) throw result.value
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a lead field config' })
  @ApiParam({ name: 'id', description: 'Lead field config ID' })
  @ApiBody({ type: UpdateLeadFieldConfigDto })
  @ApiResponse({ status: 200, description: 'Updated lead field config.' })
  @ApiResponse({ status: 401, description: 'Not authenticated.' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions.' })
  @ApiResponse({ status: 404, description: 'Lead field config not found.' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateLeadFieldConfigDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const result = await this.updateUseCase.execute({
      configId: id,
      tenantId: user.tenantId,
      updates: {
        label: dto.label,
        isRequired: dto.isRequired,
        isActive: dto.isActive,
        order: dto.order,
        options: dto.options,
      },
    })
    if (result.isLeft()) throw result.value
    return LeadFieldConfigPresenter.toHttp(result.value.config)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a custom lead field config' })
  @ApiParam({ name: 'id', description: 'Lead field config ID' })
  @ApiResponse({ status: 204, description: 'Lead field config deleted.' })
  @ApiResponse({ status: 400, description: 'Cannot delete a built-in field.' })
  @ApiResponse({ status: 401, description: 'Not authenticated.' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions.' })
  @ApiResponse({ status: 404, description: 'Lead field config not found.' })
  async remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    const result = await this.deleteUseCase.execute({ configId: id, tenantId: user.tenantId })
    if (result.isLeft()) throw result.value
  }
}
