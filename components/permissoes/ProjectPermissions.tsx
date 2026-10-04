'use client'

import { createContext, useContext, useMemo } from 'react'
import { TODAS, type Permissao } from '@/lib/permissoes'

const Context = createContext<ReadonlySet<Permissao> | null>(null)

export function ProjectPermissionsProvider({ permissions, children }: { permissions: Permissao[]; children: React.ReactNode }) {
  const value = useMemo(() => new Set(permissions), [permissions])
  return <Context.Provider value={value}>{children}</Context.Provider>
}

/** Páginas de projeto fornecem o resultado do servidor. Fora delas mantém o contrato visual dos componentes reutilizáveis; o servidor sempre autoriza as operações. */
export function useProjectPermissions() {
  return useContext(Context) ?? new Set(TODAS)
}
