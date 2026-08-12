import { useEffect, useRef } from 'react'

/**
 * Foca (e seleciona o conteúdo de) um input/textarea assim que o componente monta.
 * Extraído do padrão duplicado em vários formulários e modais do app.
 */
export function useFocusOnMount<T extends HTMLInputElement | HTMLTextAreaElement>() {
  const ref = useRef<T>(null)

  useEffect(() => {
    ref.current?.focus()
    ref.current?.select()
  }, [])

  return ref
}
