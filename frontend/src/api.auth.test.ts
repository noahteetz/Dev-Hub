import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, configureAuth } from './api'

function respond(status: number, body = '[]') {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(body),
  } as Response)
}

function lastHeaders() {
  const call = vi.mocked(fetch).mock.calls.at(-1)
  return new Headers((call?.[1] as RequestInit).headers)
}

describe('api authentication', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    configureAuth({ accessToken: () => Promise.resolve(null), onSessionExpired: () => {} })
  })

  it('sends the access token with every call', async () => {
    configureAuth({ accessToken: () => Promise.resolve('token-abc'), onSessionExpired: () => {} })
    vi.mocked(fetch).mockReturnValue(respond(200))

    await api.projects.list()

    expect(lastHeaders().get('Authorization')).toBe('Bearer token-abc')
  })

  it('leaves the header off while nobody is signed in', async () => {
    configureAuth({ accessToken: () => Promise.resolve(null), onSessionExpired: () => {} })
    vi.mocked(fetch).mockReturnValue(respond(200))

    await api.projects.list()

    expect(lastHeaders().has('Authorization')).toBe(false)
  })

  it('asks for a new sign in when the token is no longer accepted', async () => {
    const onSessionExpired = vi.fn()
    configureAuth({ accessToken: () => Promise.resolve('stale'), onSessionExpired })
    vi.mocked(fetch).mockReturnValue(respond(401, ''))

    await expect(api.projects.list()).rejects.toThrow(/session has expired/)
    expect(onSessionExpired).toHaveBeenCalledOnce()
  })

  it('explains a missing role instead of bouncing the user to the login', async () => {
    const onSessionExpired = vi.fn()
    configureAuth({ accessToken: () => Promise.resolve('valid'), onSessionExpired })
    vi.mocked(fetch).mockReturnValue(respond(403, ''))

    await expect(api.projects.list()).rejects.toThrow(/devhub-user/)
    expect(onSessionExpired).not.toHaveBeenCalled()
  })
})
