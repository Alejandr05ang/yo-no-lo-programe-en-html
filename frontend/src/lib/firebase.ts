import { getApps, initializeApp } from 'firebase/app'
import {
  browserLocalPersistence,
  browserPopupRedirectResolver,
  browserSessionPersistence,
  getAuth,
  indexedDBLocalPersistence,
  initializeAuth,
  type Auth,
} from 'firebase/auth'

const STORES = {
  indexedDBLocal: indexedDBLocalPersistence,
  browserLocal: browserLocalPersistence,
  browserSession: browserSessionPersistence,
}

/**
 * Stores to keep the signed-in user in, tried in this order: the first one the
 * browser actually grants wins.
 *
 * The two local stores come first so that closing the browser at the end of one
 * class and opening it at the start of the next does not sign the student out.
 * Session storage stays last for private or locked-down windows, where no local
 * store is writable and the alternative would be no sign-in at all.
 *
 * Spelled as names because that is the part a test can still read: bundled for
 * Node, every store collapses onto one in-memory stub, so comparing the objects
 * themselves would pass whichever order they were in.
 */
export const AUTH_PERSISTENCE_ORDER = ['indexedDBLocal', 'browserLocal', 'browserSession'] as const

/**
 * Passed to initializeAuth rather than applied later with setPersistence, so
 * the store is settled before any sign-in can run and a first login cannot land
 * in the wrong one.
 */
export const AUTH_PERSISTENCE = AUTH_PERSISTENCE_ORDER.map((name) => STORES[name])

/** Only public Firebase web configuration belongs here. No Admin credentials. */
export function configureFirebaseAuth(): { auth: Auth | null; error: string | null } {
  const config = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY?.trim(),
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN?.trim(),
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim(),
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET?.trim(),
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim(),
    appId: import.meta.env.VITE_FIREBASE_APP_ID?.trim(),
  }
  if (!config.apiKey || !config.authDomain || !config.projectId || !config.appId) {
    return { auth: null, error: 'El acceso al taller está pendiente de configuración. Comunícaselo a tu docente.' }
  }
  try {
    const existing = getApps().find((app) => app.name === 'tutorias-auth')
    const auth = existing ? getAuth(existing) : initializeAuth(initializeApp(config, 'tutorias-auth'), {
      persistence: AUTH_PERSISTENCE,
      popupRedirectResolver: browserPopupRedirectResolver,
    })
    auth.languageCode = 'es'
    return { auth, error: null }
  } catch {
    return { auth: null, error: 'No se pudo preparar el acceso al taller. Recarga la página o comunícaselo a tu docente.' }
  }
}
