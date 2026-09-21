import assert from 'node:assert/strict'
import test from 'node:test'
import { ApiError, createApiClient } from '../src/lib/http.ts'

const options = {
  baseUrl: 'http://localhost:8000',
  browserOrigin: 'http://localhost:5173',
  development: true,
  getSessionKey: () => 'student-a',
  getIdToken: async () => 'test-id-token',
}

test('sends a token only to the configured API, without cookies or redirects', async () => {
  const client = createApiClient({ ...options, fetcher: async (input, init) => {
    assert.equal(String(input), 'http://localhost:8000/api/auth/bootstrap')
    assert.equal(new Headers(init?.headers).get('Authorization'), 'Bearer test-id-token')
    assert.equal(init?.credentials, 'omit')
    assert.equal(init?.redirect, 'error')
    assert.equal(init?.body, undefined)
    return Response.json({ ok: true })
  } })
  assert.deepEqual(await client.request('/auth/bootstrap', { method: 'POST' }), { ok: true })
})

test('rejects absolute, protocol-relative, encoded and traversal paths before obtaining a token', async () => {
  let tokensRequested = 0
  const client = createApiClient({ ...options, getIdToken: async () => { tokensRequested++; return 'token' } })
  for (const path of ['https://attacker.invalid/x', '//attacker.invalid/x', '/../../../x', '/%2e%2e/x', '/x\\y']) {
    await assert.rejects(client.request(path), (error: unknown) => error instanceof ApiError && error.code === 'INVALID_API_URL')
  }
  assert.equal(tokensRequested, 0)
})

test('refuses nonlocal HTTP backends and URLs containing credentials', () => {
  for (const baseUrl of ['http://backend.invalid', 'https://user:password@backend.invalid', 'https://backend.invalid?x=1']) {
    assert.throws(() => createApiClient({ ...options, baseUrl }), ApiError)
  }
  assert.throws(() => createApiClient({ ...options, development: false }), ApiError)
})

test('refreshes an expired token once and retries with the new token', async () => {
  const refreshes: boolean[] = []
  const seenTokens: (string | null)[] = []
  const client = createApiClient({ ...options,
    getIdToken: async (force) => { refreshes.push(force); return force ? 'new-token' : 'expired-token' },
    fetcher: async (_input, init) => {
      seenTokens.push(new Headers(init?.headers).get('Authorization'))
      return seenTokens.length === 1 ? Response.json({ error: { code: 'AUTH_REQUIRED' } }, { status: 401 }) : Response.json({ saved: true })
    },
  })
  assert.deepEqual(await client.request('/me'), { saved: true })
  assert.deepEqual(refreshes, [false, true])
  assert.deepEqual(seenTokens, ['Bearer expired-token', 'Bearer new-token'])
})

test('stops after the second unauthorized response and never exposes server messages', async () => {
  let calls = 0
  const client = createApiClient({ ...options, fetcher: async () => {
    calls++
    return Response.json({ detail: 'private server trace', error: { code: 'AUTH_REQUIRED', message: 'database password' } }, { status: 401 })
  } })
  await assert.rejects(client.request('/me'), (error: unknown) => {
    assert.ok(error instanceof ApiError)
    assert.equal(error.status, 401)
    assert.doesNotMatch(error.message, /trace|password/)
    return true
  })
  assert.equal(calls, 2)
})

test('does not retry forbidden, validation or rate-limited requests', async () => {
  for (const status of [403, 422, 429, 500]) {
    let calls = 0
    const client = createApiClient({ ...options, fetcher: async () => { calls++; return Response.json({ detail: 'SQL secret' }, { status }) } })
    await assert.rejects(client.request('/me'), (error: unknown) => error instanceof ApiError && error.status === status && !error.message.includes('SQL'))
    assert.equal(calls, 1)
  }
})

test('does not send a request if the account changes during token retrieval', async () => {
  let uid = 'student-a'
  let calls = 0
  const client = createApiClient({ ...options, getSessionKey: () => uid,
    getIdToken: async () => { uid = 'student-b'; return 'old-token' },
    fetcher: async () => { calls++; return Response.json({ private: 'student-a' }) },
  })
  await assert.rejects(client.request('/me'), (error: unknown) => error instanceof ApiError && error.code === 'SESSION_CHANGED')
  assert.equal(calls, 0)
})

test('discards a private response when the user signs out before it arrives', async () => {
  let uid: string | null = 'student-a'
  const client = createApiClient({ ...options, getSessionKey: () => uid,
    fetcher: async () => { uid = null; return Response.json({ private: 'student-a' }) },
  })
  await assert.rejects(client.request('/me'), (error: unknown) => error instanceof ApiError && error.code === 'SESSION_CHANGED')
})

test('fails closed on anonymous calls and network failures', async () => {
  const anonymous = createApiClient({ ...options, getSessionKey: () => null })
  await assert.rejects(anonymous.request('/me'), (error: unknown) => error instanceof ApiError && error.code === 'AUTH_REQUIRED')
  const offline = createApiClient({ ...options, fetcher: async () => { throw new TypeError('private backend details') } })
  await assert.rejects(offline.request('/me'), (error: unknown) => error instanceof ApiError && error.code === 'NETWORK_ERROR' && !error.message.includes('private'))
})
