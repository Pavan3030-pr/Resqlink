export const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? 'http://localhost:8080'
const TOKEN_KEY = 'resqlink.token'

export class ApiError extends Error {
  status: number
  fieldErrors?: Record<string, string>
  constructor(status: number, message: string, fieldErrors?: Record<string, string>) {
    super(message)
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

let onUnauthorized: (() => void) | null = null
export function setUnauthorizedHandler(fn: (() => void) | null) { onUnauthorized = fn }

export const tokenStore = {
  get: () => { try { return sessionStorage.getItem(TOKEN_KEY) } catch { return null } },
  set: (t: string) => { try { sessionStorage.setItem(TOKEN_KEY, t) } catch { /* storage unavailable */ } },
  clear: () => { try { sessionStorage.removeItem(TOKEN_KEY) } catch { /* storage unavailable */ } },
}

type Query = Record<string, string | number | boolean | undefined | null>

export function buildQuery(params?: Query): string {
  if (!params) return ''
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') sp.set(k, String(v))
  }
  const s = sp.toString()
  return s ? `?${s}` : ''
}

async function request<T>(method: string, path: string, opts: { body?: unknown; form?: FormData; query?: Query; idempotencyKey?: string } = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (opts.idempotencyKey) headers['Idempotency-Key'] = opts.idempotencyKey
  const token = tokenStore.get()
  if (token) headers.Authorization = `Bearer ${token}`
  let body: BodyInit | undefined
  if (opts.form) body = opts.form
  else if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(opts.body)
  }
  let res: Response
  try {
    res = await fetch(`${API_BASE}/api/v1${path}${buildQuery(opts.query)}`, { method, headers, body })
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Check your connection and try again.')
  }
  if (res.status === 401 && token) onUnauthorized?.()
  if (!res.ok) {
    let message = res.statusText || 'Request failed'
    let fieldErrors: Record<string, string> | undefined
    try {
      const j = await res.json()
      message = j.message ?? message
      fieldErrors = j.fieldErrors
    } catch { /* non-JSON error body */ }
    throw new ApiError(res.status, message, fieldErrors)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export const api = {
  get: <T>(path: string, query?: Query) => request<T>('GET', path, { query }),
  post: <T>(path: string, body?: unknown, idempotencyKey?: string) => request<T>('POST', path, { body: body ?? {}, idempotencyKey }),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, { body: body ?? {} }),
  postForm: <T>(path: string, form: FormData, idempotencyKey?: string) => request<T>('POST', path, { form, idempotencyKey }),
  /** Fetches an authenticated image and returns an object URL (img tags cannot send Authorization headers). */
  async imageBlobUrl(urlPath: string): Promise<string> {
    const token = tokenStore.get()
    const res = await fetch(`${API_BASE}${urlPath}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
    if (!res.ok) throw new ApiError(res.status, 'Image unavailable')
    return URL.createObjectURL(await res.blob())
  },
}
