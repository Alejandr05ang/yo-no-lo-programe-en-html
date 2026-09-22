/**
 * La clave con la que el backend identifica un reto. Va en minúscula porque así
 * la siembra backend/app/catalog/seed.py ('e1'..'e11') y la comparación en
 * require_challenge_access es exacta: con mayúscula el reto no existe y todo el
 * progreso del alumno respondía 404.
 */
export function challengeKeyFromNumero(numero: number): string {
  return `e${numero}`
}

/**
 * Inverso de challengeKeyFromNumero: 'e1'..'e11' → 1..11. Devuelve null cuando la
 * clave no encaja con ese patrón (retos manuales, claves nuevas), para no fabricar
 * enlaces a /portafolio?e=NaN.
 */
export function numeroFromChallengeKey(key: string): number | null {
  const coincidencia = /^e([1-9][0-9]*)$/.exec(key)
  return coincidencia ? Number(coincidencia[1]) : null
}
