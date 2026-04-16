export type ViaCEPResult = {
  logradouro: string
  bairro: string
  cidade: string
  estado: string
}

/**
 * Consulta o endereço a partir de um CEP via API pública do ViaCEP.
 * Pode ser chamada tanto do cliente quanto do servidor.
 * Retorna null quando o CEP é inválido, não encontrado ou a API falha.
 */
export async function lookupCep(rawCep: string): Promise<ViaCEPResult | null> {
  const cep = rawCep.replace(/\D/g, '')
  if (cep.length !== 8) return null

  try {
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
      // Evita que o Next.js faça cache desse recurso externo
      cache: 'no-store',
    })
    if (!res.ok) return null

    const data = await res.json()

    // ViaCEP retorna { erro: true } para CEPs inexistentes
    if (data.erro) return null

    return {
      logradouro: data.logradouro ?? '',
      bairro: data.bairro ?? '',
      cidade: data.localidade ?? '',
      estado: data.uf ?? '',
    }
  } catch {
    return null
  }
}

/**
 * Formata uma string de 8 dígitos no padrão 00000-000.
 */
export function formatCep(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 5) return digits
  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}
