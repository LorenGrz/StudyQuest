/**
 * User-facing text for failures the user can't act on through the backend's
 * own message: rate limiting, server errors and no connection. Returns null
 * when the backend message should be shown as-is (validation, 404, 409…).
 */
export function friendlyApiErrorMessage(status: number | undefined): string | null {
  if (status === undefined) {
    return 'No pudimos conectarnos con el servidor. Revisá tu conexión y volvé a intentar.'
  }
  if (status === 429) {
    return 'Demasiadas solicitudes. Esperá un momento y volvé a intentar.'
  }
  if (status >= 500) {
    return 'Algo falló de nuestro lado. Probá de nuevo en unos minutos.'
  }
  return null
}
