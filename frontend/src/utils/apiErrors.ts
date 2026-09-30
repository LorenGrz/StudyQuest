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

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : undefined
}

/**
 * Structural read of an axios-style error body (`{ response: { data } }`).
 * Unlike an `AxiosError` instance check, this also works for rejections
 * mocked directly in tests, so callers that need fields beyond `message`
 * (error `code`, `suggestions`, `suggestedName`...) can read them from an
 * `unknown` catch value without an `any` cast.
 */
export function apiErrorData(err: unknown): Record<string, unknown> | undefined {
  const response = asRecord(asRecord(err)?.response)
  return asRecord(response?.data)
}
