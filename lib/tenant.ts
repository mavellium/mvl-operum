import { getDefaultTenant, getTenantBySubdominio } from '@/services/tenantService'

export async function resolveTenantId(subdomain?: string): Promise<string> {
  if (subdomain) {
    const tenant = await getTenantBySubdominio(subdomain)
    if (!tenant) {
      throw new Error('Tenant não encontrado para o subdomínio informado')
    }
    return tenant.id
  }

  const defaultTenant = await getDefaultTenant()
  if (!defaultTenant) {
    throw new Error('Tenant padrão não encontrado')
  }
  return defaultTenant.id
}
