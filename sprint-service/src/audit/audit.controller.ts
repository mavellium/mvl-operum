import { Controller, Get, Post, Body, Query, Headers, BadRequestException } from '@nestjs/common'
import { AuditService } from './audit.service'

@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  list(
    @Headers('x-tenant-id') tenantId: string,
    @Query('entity') entity?: string,
    @Query('entityId') entityId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditService.list(tenantId, entity, entityId, Number(page ?? 1), Number(limit ?? 50))
  }

  @Post()
  log(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') userId: string,
    @Body() body: { action: string; entity: string; entityId?: string; details?: object },
  ) {
    if (!body.action || !body.entity) throw new BadRequestException('action e entity são obrigatórios')
    return this.auditService.log(tenantId, userId || undefined, body.action, body.entity, body.entityId, body.details)
  }
}
