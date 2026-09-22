import assert from 'node:assert/strict'
import test from 'node:test'
import { parseSession } from '../src/lib/backendTypes.ts'
import { accessDecision, onboardingPath, friendlyAuthError, SessionRequests } from '../src/features/auth/session.ts'

const session = {
  user: { id: 'user-id', email: 'student@example.test', full_name: '', display_name: '', description: '', hobbies: [], avatar_path: null, github_url: null, linkedin_url: null, website_url: null, role: 'student', email_verified: true, profile_completed_at: null, is_active: true },
  onboarding: { state: 'PROFILE_REQUIRED' },
}

test('rejects malformed backend roles and states instead of opening a protected route', () => {
  assert.equal(parseSession(session).user.role, 'student')
  assert.throws(() => parseSession({ ...session, user: { ...session.user, role: 'superuser' } }))
  assert.throws(() => parseSession({ ...session, onboarding: { state: 'COMPLETE' } }))
  assert.throws(() => parseSession({ ...session, user: { ...session.user, email_verified: 'true' } }))
  assert.throws(() => parseSession({ ...session, user: { ...session.user, is_active: false } }))
})

test('the profile the student sees comes from the backend, hobbies included', () => {
  // hobbies dejo de vivir en localStorage: si el backend no lo manda, la sesion
  // no es utilizable y es mejor saberlo aqui que pintar un portafolio vacio.
  assert.deepEqual(parseSession({ ...session, user: { ...session.user, hobbies: ['Ajedrez'] } }).user.hobbies, ['Ajedrez'])
  assert.throws(() => parseSession({ ...session, user: { ...session.user, hobbies: undefined } }))
  assert.throws(() => parseSession({ ...session, user: { ...session.user, hobbies: 'Ajedrez' } }))
  assert.throws(() => parseSession({ ...session, user: { ...session.user, hobbies: [1, 2] } }))
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

test('a guard waits for Firebase instead of treating a restoring session as anonymous', () => {
  // While the persisted store is still being read the user is not visible yet.
  assert.equal(accessDecision(false, null), 'pending')
  assert.equal(accessDecision(false, { uid: 'student-a' }), 'pending')
  // Only once Firebase has resolved does the absence of a user mean anonymous.
  assert.equal(accessDecision(true, { uid: 'student-a' }), 'granted')
  assert.equal(accessDecision(true, null), 'anonymous')
})

test('signing out of a restored session ends it instead of leaving the route open', () => {
  const restored = accessDecision(true, { uid: 'student-a' })
  assert.equal(restored, 'granted')
  // signOut clears the user without moving Firebase back to uninitialised.
  assert.equal(accessDecision(true, null), 'anonymous')
})
