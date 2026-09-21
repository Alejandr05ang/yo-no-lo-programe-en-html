import { getApps, initializeApp } from 'firebase/app'
import { browserPopupRedirectResolver, browserSessionPersistence, getAuth, initializeAuth, type Auth } from 'firebase/auth'

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
      persistence: browserSessionPersistence,
      popupRedirectResolver: browserPopupRedirectResolver,
    })
    auth.languageCode = 'es'
    return { auth, error: null }
  } catch {
    return { auth: null, error: 'No se pudo preparar el acceso al taller. Recarga la página o comunícaselo a tu docente.' }
  }
}
