import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchAuthSettings } from './authSettings'

function respond(status: number, body: unknown) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response)
}

describe('fetchAuthSettings', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reads the realm the backend points at', async () => {
    vi.mocked(fetch).mockReturnValue(
      respond(200, { enabled: true, issuer: 'https://auth.example/realms/dev-hub', clientId: 'dev-hub-frontend', scope: 'openid' }),
    )

    await expect(fetchAuthSettings()).resolves.toEqual({
      enabled: true,
      issuer: 'https://auth.example/realms/dev-hub',
      clientId: 'dev-hub-frontend',
      scope: 'openid',
    })
  })

  it('accepts a deployment that runs without a login', async () => {
    vi.mocked(fetch).mockReturnValue(respond(200, { enabled: false }))

    await expect(fetchAuthSettings()).resolves.toMatchObject({ enabled: false })
  })

  it('fails instead of opening the app when the backend is unreachable', async () => {
    vi.mocked(fetch).mockReturnValue(respond(503, {}))

    await expect(fetchAuthSettings()).rejects.toThrow(/login settings/)
  })

  it('fails when a login is required but no realm is named', async () => {
    vi.mocked(fetch).mockReturnValue(respond(200, { enabled: true, clientId: 'dev-hub-frontend' }))

    await expect(fetchAuthSettings()).rejects.toThrow(/realm or client/)
  })
})
