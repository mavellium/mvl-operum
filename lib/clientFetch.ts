'use client'

import { logoutAction } from '@/app/actions/auth'

let redirectingToLogin = false

export async function fetchWithSession(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, init)
  if (res.status === 401 && !redirectingToLogin) {
    redirectingToLogin = true
    try {
      await logoutAction()
    } catch {
      // noop
    } finally {
      redirectingToLogin = false
    }
  }
  return res
}