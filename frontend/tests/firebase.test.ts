import assert from 'node:assert/strict'
import test from 'node:test'
import { AUTH_PERSISTENCE, AUTH_PERSISTENCE_ORDER } from '../src/lib/firebase.ts'

// These assert the declared order, not the persistence objects: resolved for
// Node, firebase/auth hands back one in-memory stub for all three stores, so
// comparing the objects would pass whichever order they were listed in.

test('the signed-in user is kept in a local store, so closing the browser does not sign them out', () => {
  assert.notEqual(AUTH_PERSISTENCE_ORDER[0], 'browserSession')
  assert.match(AUTH_PERSISTENCE_ORDER[0], /Local$/)
  assert.equal(AUTH_PERSISTENCE.length, AUTH_PERSISTENCE_ORDER.length)
})

test('session-only storage is the last resort, for windows that grant no local store', () => {
  const session = AUTH_PERSISTENCE_ORDER.indexOf('browserSession')
  assert.equal(session, AUTH_PERSISTENCE_ORDER.length - 1)
  const locals = AUTH_PERSISTENCE_ORDER.filter((name) => name.endsWith('Local'))
  assert.ok(locals.length > 0)
  for (const name of locals) assert.ok(AUTH_PERSISTENCE_ORDER.indexOf(name) < session)
})
