export interface SandboxRequest { method: string; url: string; headers: Record<string, string | string[] | undefined>; raw?: string }
export interface SandboxResponse { code: number; body?: unknown; stream?: boolean }
export function handle(req: SandboxRequest): Promise<SandboxResponse>
