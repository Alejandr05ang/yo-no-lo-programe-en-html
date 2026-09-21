import assert from 'node:assert/strict'
import test from 'node:test'
import { parseSession } from '../src/lib/backendTypes.ts'
import { onboardingPath, friendlyAuthError, SessionRequests } from '../src/features/auth/session.ts'

const session = {
  user: { id: 'user-id', email: 'student@example.test', full_name: '', display_name: '', description: '', avatar_path: null, github_url: null, linkedin_url: null, website_url: null, role: 'student', email_verified: true, profile_completed_at: null, is_active: true },
  onboarding: { state: 'PROFILE_REQUIRED' },
}

test('rejects malformed backend roles and states instead of opening a protected route', () => {
  assert.equal(parseSession(session).user.role, 'student')
  assert.throws(() => parseSession({ ...session, user: { ...session.user, role: 'superuser' } }))
  assert.throws(() => parseSession({ ...session, onboarding: { state: 'COMPLETE' } }))
  assert.throws(() => parseSession({ ...session, user: { ...session.user, email_verified: 'true' } }))
  assert.throws(() => parseSession({ ...session, user: { ...session.user, is_active: false } }))
})

test('routes incomplete accounts to the backend-selected step', () => {
  assert.equal(onboardingPath('EMAIL_VERIFICATION_REQUIRED'), '/verificar-email')
  assert.equal(onboardingPath('PROFILE_REQUIRED'), '/onboarding/perfil')
  assert.equal(onboardingPath('JOIN_CLASS_REQUIRED'), '/onboarding/clase')
  assert.equal(onboardingPath('READY'), '/cuenta')
})

test('an older bootstrap cannot replace the session after account switch or logout', async () => {
  const requests = new SessionRequests()
  const first = requests.begin('student-a')
  assert.equal(requests.isCurrent(first, 'student-a'), true)
  const second = requests.begin('student-b')
  assert.equal(first.signal.aborted, true)
  assert.equal(requests.isCurrent(first, 'student-a'), false)
  assert.equal(requests.isCurrent(second, 'student-b'), true)
  requests.cancel()
  assert.equal(second.signal.aborted, true)
  assert.equal(requests.isCurrent(second, 'student-b'), false)
})

test('provider collisions instruct authentication before explicit linking, with no raw message leakage', () => {
  const collision = friendlyAuthError({ code: 'auth/account-exists-with-different-credential', message: 'sensitive provider details' })
  assert.match(collision, /inicia sesión/i)
  assert.match(collision, /Vincular Google/)
  assert.doesNotMatch(collision, /sensitive/)
  assert.doesNotMatch(friendlyAuthError({ code: 'auth/unknown', message: 'private token' }), /private token/)
  assert.equal(friendlyAuthError({ code: 'auth/user-not-found' }), friendlyAuthError({ code: 'auth/wrong-password' }))
})
