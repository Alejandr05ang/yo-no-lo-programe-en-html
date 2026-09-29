const firebase = new URL('./firebaseIsolation.mjs', import.meta.url).href
export async function resolve(specifier, context, next) {
  if (specifier === 'firebase/auth' || (context.parentURL?.endsWith('/features/auth/AuthProvider.tsx') && specifier === '../../lib/firebase')) {
    return { url: firebase, shortCircuit: true }
  }
  const resolved = await next(specifier, context)
  return resolved.url.endsWith('/src/lib/firebase.ts') ? { url: firebase, shortCircuit: true } : resolved
}
