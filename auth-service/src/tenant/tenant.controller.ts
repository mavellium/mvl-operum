import { Controller, Get, Param } from '@nestjs/common'
import { TenantService } from './tenant.service'
import { Public } from '../decorators/public.decorator'

@Controller('auth')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Public()
  @Get('tenants/:subdomain')
  findBySubdomain(@Param('subdomain') subdomain: string) {
    return this.tenantService.findBySubdomain(subdomain)
  }
}
