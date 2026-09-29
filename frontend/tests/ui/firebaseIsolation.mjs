// Firebase es el límite externo; AuthProvider, ApiClient, QueryClient y las pantallas son reales.
export const auth = { currentUser: null }
let changed = null
export function setAccount(uid) {
  auth.currentUser = uid ? { uid, email: `${uid}@example.test`, emailVerified: true, providerData: [], getIdToken: async (force) => { if (force) refreshCurrentUser(); return uid } } : null
  changed?.(auth.currentUser)
}
export function refreshCurrentUser() { changed?.(auth.currentUser) }
export function configureFirebaseAuth() { return { auth, error: null } }
export function onIdTokenChanged(_auth, listener) {
  changed = listener
  queueMicrotask(() => changed === listener && listener(auth.currentUser))
  return () => { if (changed === listener) changed = null }
}
export async function signOut() { setAccount(null) }
export async function reload() {}
export async function sendEmailVerification() {}
export async function sendPasswordResetEmail() {}
export async function signInWithEmailAndPassword(_auth, email) { setAccount(email.split('@')[0]); return { user: auth.currentUser } }
export const createUserWithEmailAndPassword = signInWithEmailAndPassword
export async function signInWithPopup() { return { user: auth.currentUser } }
export async function linkWithPopup() { return { user: auth.currentUser } }
export function getAdditionalUserInfo() { return { isNewUser: false } }
export class GoogleAuthProvider { setCustomParameters() {} }
