import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { CurrentUser, CurrentUserPayload } from '@/infra/auth/decorators/current-user.decorator'
import { CreateLeadUseCase } from '@/domain/leads/application/use-cases/create-lead/create-lead.use-case'
import { ListLeadsUseCase } from '@/domain/leads/application/use-cases/list-leads/list-leads.use-case'
import { GetLeadUseCase } from '@/domain/leads/application/use-cases/get-lead/get-lead.use-case'
import { UpdateLeadUseCase } from '@/domain/leads/application/use-cases/update-lead/update-lead.use-case'
import { SoftDeleteLeadUseCase } from '@/domain/leads/application/use-cases/soft-delete-lead/soft-delete-lead.use-case'
import { RestoreLeadUseCase } from '@/domain/leads/application/use-cases/restore-lead/restore-lead.use-case'
import { CreateLeadDto } from '../dtos/create-lead.dto'
import { UpdateLeadDto } from '../dtos/update-lead.dto'
import { RoleType } from '@/domain/auth/enterprise/value-objects/user-role.vo'
import { LeadPresenter } from '../presenters/lead.presenter'

@ApiTags('leads')
@ApiBearerAuth('access-token')
@Controller('leads')
export class LeadsController {
  constructor(
    private readonly createLeadUseCase: CreateLeadUseCase,
    private readonly listLeadsUseCase: ListLeadsUseCase,
    private readonly getLeadUseCase: GetLeadUseCase,
    private readonly updateLeadUseCase: UpdateLeadUseCase,
    private readonly softDeleteLeadUseCase: SoftDeleteLeadUseCase,
    private readonly restoreLeadUseCase: RestoreLeadUseCase,
  ) {}

  // ─── POST /leads ──────────────────────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new lead' })
  @ApiResponse({ status: 201, description: 'Lead created successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid request body.' })
  @ApiResponse({ status: 401, description: 'Not authenticated.' })
  @ApiResponse({ status: 422, description: 'Plan lead limit reached.' })
  async create(
    @Body() dto: CreateLeadDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const result = await this.createLeadUseCase.execute({
      tenantId: user.tenantId,
      actorUserId: user.sub,
      pipelineId: dto.pipelineId,
      stageId: dto.stageId,
      name: dto.name,
      value: dto.value,
      assignedToId: dto.assignedToId,
      tags: dto.tags,
    })
    if (result.isLeft()) throw result.value
    return {
      id: result.value.leadId,
      tenantId: user.tenantId,
      pipelineId: dto.pipelineId,
      stageId: dto.stageId,
      name: dto.name,
      value: dto.value,
      status: 'OPEN',
      assignedToId: dto.assignedToId ?? user.sub,
      tags: dto.tags ?? [],
    }
  }

  // ─── GET /leads ───────────────────────────────────────────────────────────────

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List leads for the current tenant' })
  @ApiResponse({ status: 200, description: 'List of leads.' })
  @ApiResponse({ status: 401, description: 'Not authenticated.' })
  async list(@Query() query: Record<string, string>, @CurrentUser() user: CurrentUserPayload) {
    const result = await this.listLeadsUseCase.execute({
      tenantId: user.tenantId,
      actorUserId: user.sub,
      actorRole: user.role as RoleType,
      actorIdentityId: user.sub,
      filters: {
        pipelineId: query.pipelineId,
        stageId: query.stageId,
        status: query.status as 'OPEN' | 'WON' | 'LOST' | undefined,
      },
    })
    if (result.isLeft()) throw result.value
    return LeadPresenter.toHttpList(result.value)
  }

  // ─── GET /leads/:id ───────────────────────────────────────────────────────────

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a single lead by ID' })
  @ApiParam({ name: 'id', description: 'Lead ID' })
  @ApiResponse({ status: 200, description: 'Lead data.' })
  @ApiResponse({ status: 401, description: 'Not authenticated.' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions.' })
  @ApiResponse({ status: 404, description: 'Lead not found.' })
  async getOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    const result = await this.getLeadUseCase.execute({
      leadId: id,
      tenantId: user.tenantId,
      actorUserId: user.sub,
      actorRole: user.role as RoleType,
      actorIdentityId: user.sub,
    })
    if (result.isLeft()) throw result.value
    return LeadPresenter.toHttp(result.value)
  }

  // ─── PATCH /leads/:id ─────────────────────────────────────────────────────────

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a lead' })
  @ApiParam({ name: 'id', description: 'Lead ID' })
  @ApiResponse({ status: 200, description: 'Updated lead data.' })
  @ApiResponse({ status: 401, description: 'Not authenticated.' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions.' })
  @ApiResponse({ status: 404, description: 'Lead not found.' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateLeadDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const result = await this.updateLeadUseCase.execute({
      leadId: id,
      tenantId: user.tenantId,
      actorUserId: user.sub,
      actorRole: user.role as RoleType,
      actorIdentityId: user.sub,
      updates: {
        name: dto.name,
        pipelineId: dto.pipelineId,
        stageId: dto.stageId,
        value: dto.value,
        status: dto.status,
        assignedToId: dto.assignedToId,
        tags: dto.tags,
      },
    })
    if (result.isLeft()) throw result.value
    return LeadPresenter.toHttp(result.value)
  }

  // ─── DELETE /leads/:id ────────────────────────────────────────────────────────

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a lead' })
  @ApiParam({ name: 'id', description: 'Lead ID' })
  @ApiResponse({ status: 204, description: 'Lead soft deleted.' })
  @ApiResponse({ status: 401, description: 'Not authenticated.' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions.' })
  @ApiResponse({ status: 404, description: 'Lead not found.' })
  async softDelete(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    const result = await this.softDeleteLeadUseCase.execute({
      leadId: id,
      tenantId: user.tenantId,
      actorUserId: user.sub,
      actorRole: user.role as RoleType,
    })
    if (result.isLeft()) throw result.value
  }

  // ─── POST /leads/:id/restore ─────────────────────────────────────────────────

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore a soft-deleted lead' })
  @ApiParam({ name: 'id', description: 'Lead ID' })
  @ApiResponse({ status: 200, description: 'Lead restored.' })
  @ApiResponse({ status: 401, description: 'Not authenticated.' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions.' })
  @ApiResponse({ status: 404, description: 'Lead not found.' })
  async restore(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    const result = await this.restoreLeadUseCase.execute({
      leadId: id,
      tenantId: user.tenantId,
      actorUserId: user.sub,
      actorRole: user.role as RoleType,
    })
    if (result.isLeft()) throw result.value
    return result.value
  }
}
