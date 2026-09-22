import type { OnboardingState } from '../../lib/backendTypes.ts'
import { ApiError } from '../../lib/http.ts'

export function onboardingPath(state: OnboardingState): string {
  const paths: Record<OnboardingState, string> = {
    EMAIL_VERIFICATION_REQUIRED: '/verificar-email',
    PROFILE_REQUIRED: '/onboarding/perfil',
    JOIN_CLASS_REQUIRED: '/onboarding/clase',
    READY: '/cuenta',
  }
  return paths[state]
}

/**
 * 'pending' while Firebase is still reading its persisted store — a restored
 * user is not visible yet, and treating that moment as anonymous would bounce
 * the student to /login only to sign them back in a tick later.
 */
export type AccessDecision = 'pending' | 'granted' | 'anonymous'

export function accessDecision(initialized: boolean, user: unknown): AccessDecision {
  if (!initialized) return 'pending'
  return user ? 'granted' : 'anonymous'
}

export function friendlyAuthError(error: unknown): string {
  if (error instanceof ApiError) return error.message
  const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : ''
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found': return 'No pudimos iniciar sesión. Revisa tu correo y contraseña.'
    case 'auth/email-already-in-use': return 'No pudimos crear la cuenta con esos datos. Prueba iniciar sesión o recuperar tu contraseña.'
    case 'auth/invalid-email': return 'Escribe una dirección de correo válida.'
    case 'auth/weak-password':
    case 'auth/password-does-not-meet-requirements': return 'La contraseña no cumple los requisitos. Usa al menos 6 caracteres y revisa las indicaciones.'
    case 'auth/too-many-requests': return 'Has realizado varios intentos. Espera un momento antes de volver a intentarlo.'
    case 'auth/account-exists-with-different-credential': return 'Primero inicia sesión con el método que ya usabas. Después elige «Vincular Google» desde tu cuenta.'
    case 'auth/credential-already-in-use': return 'Esa cuenta de Google ya está vinculada a otra cuenta. Inicia sesión con la cuenta que deseas conservar.'
    case 'auth/provider-already-linked': return 'Google ya está conectado a esta cuenta.'
    case 'auth/popup-blocked': return 'El navegador bloqueó la ventana de Google. Permite las ventanas emergentes e inténtalo de nuevo.'
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request': return 'Se cerró la ventana de Google. Puedes intentarlo de nuevo.'
    case 'auth/network-request-failed': return 'No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.'
    case 'auth/requires-recent-login': return 'Por seguridad, cierra sesión y vuelve a entrar antes de hacer este cambio.'
    case 'auth/operation-not-allowed':
    case 'auth/unauthorized-domain':
    case 'auth/configuration-not-found': return 'Este método de acceso todavía no está disponible. Comunícaselo a tu docente.'
    default: return 'No se pudo completar la operación. Inténtalo de nuevo.'
  }
}

interface SessionRequest { uid: string; signal: AbortSignal; generation: number }

/** Prevent slow bootstrap responses from restoring an earlier user's permissions. */
export class SessionRequests {
  private controller: AbortController | null = null
  private generation = 0
  begin(uid: string): SessionRequest {
    this.cancel()
    this.controller = new AbortController()
    return { uid, signal: this.controller.signal, generation: this.generation }
  }
  isCurrent(request: SessionRequest, uid: string | null): boolean {
    return !request.signal.aborted && request.generation === this.generation && request.uid === uid
  }
  cancel(): void {
    this.controller?.abort()
    this.generation++
  }
}
