import { fixtureAuth } from './firebase-auth-fixture'
export function configureFirebaseAuth() {
  if (!import.meta.env.DEV || !['localhost', '127.0.0.1'].includes(location.hostname)) throw new Error('Solo QA local')
  return { auth: fixtureAuth, error: null }
}
