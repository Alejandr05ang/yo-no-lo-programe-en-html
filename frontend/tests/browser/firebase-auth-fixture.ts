// Fake identity boundary; AuthProvider, ApiClient, router, caches and UI stay real.
const identities = {
  'alumno@example.com': { uid: 'stu', token: 'alumno' },
  'otro@example.com': { uid: 'stu2', token: 'otro' },
  'inst@example.com': { uid: 'ins', token: 'instructor' },
  'admin@example.com': { uid: 'adm', token: 'admin' },
}
type FixtureEmail = keyof typeof identities
function makeUser(email: FixtureEmail) {
  return { uid: identities[email].uid, email, emailVerified: true,
    providerData: [{ providerId: 'password', uid: identities[email].uid, email }],
    getIdToken: async () => identities[email].token }
}
const initial = sessionStorage.getItem('qa:fixture-email') as FixtureEmail | null
export const fixtureAuth = { currentUser: initial && identities[initial] ? makeUser(initial) : null }
const listeners = new Set<(user: typeof fixtureAuth.currentUser) => void>()
export function onIdTokenChanged(_auth: unknown, listener: (user: typeof fixtureAuth.currentUser) => void) {
  listeners.add(listener)
  queueMicrotask(() => { if (listeners.has(listener)) listener(fixtureAuth.currentUser) })
  return () => listeners.delete(listener)
}
export async function signInWithEmailAndPassword(_auth: unknown, email: string, password: string) {
  if (!(email in identities) || password !== 'qa-local') throw new Error('Usa una identidad ficticia y qa-local')
  sessionStorage.setItem('qa:fixture-email', email)
  fixtureAuth.currentUser = makeUser(email as FixtureEmail)
  listeners.forEach((listener) => listener(fixtureAuth.currentUser))
  return { user: fixtureAuth.currentUser }
}
export async function signOut() {
  sessionStorage.removeItem('qa:fixture-email')
  fixtureAuth.currentUser = null
  listeners.forEach((listener) => listener(null))
}
export async function reload() {}
export class GoogleAuthProvider { setCustomParameters() {} }
const unavailable = async () => { throw new Error('Operación fuera del fixture local') }
export const createUserWithEmailAndPassword = unavailable
export const signInWithPopup = unavailable
export const linkWithPopup = unavailable
export const sendEmailVerification = unavailable
export const sendPasswordResetEmail = unavailable
export const getAdditionalUserInfo = () => ({ isNewUser: false })
