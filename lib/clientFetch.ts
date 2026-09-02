'use client'

/**
 * Wrapper de fetch do cliente.
 *
 * NÃO encerra a sessão em respostas 401. A sessão só termina nos fluxos
 * intencionais (logout, troca/reset de senha, conta inativa, fim do TTL),
 * nunca numa resposta transitória de navegação comum. Remover a sessão aqui
 * (via logoutAction) fazia o usuário ser deslogado ao reabrir a aba sempre
 * que UM endpoint devolvia 401 momentâneo. O redirect para /login por
 * sessão genuinamente inválida é responsabilidade do proxy/do servidor.
 */
export async function fetchWithSession(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return fetch(input, init)
}
