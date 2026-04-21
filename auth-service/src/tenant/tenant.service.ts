import { Injectable, NotFoundException } from '@nestjs/common'
import { prisma } from '../prisma'

@Injectable()
export class TenantService {
  private readonly prisma = prisma

  async findBySubdomain(subdomain: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { subdomain, status: 'ACTIVE' },
      select: { id: true, name: true, subdomain: true, status: true },
    })
    if (!tenant) throw new NotFoundException('Tenant não encontrado')
    return tenant
  }
}
