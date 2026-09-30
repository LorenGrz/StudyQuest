import { describe, expect, it } from 'vitest'
import { apiErrorData, friendlyApiErrorMessage } from './apiErrors'

describe('apiErrorData', () => {
  it('should read the response body of an axios-style error', () => {
    const err = { response: { status: 409, data: { code: 'SIMILAR_SUBJECTS', message: 'x' } } }
    expect(apiErrorData(err)).toEqual({ code: 'SIMILAR_SUBJECTS', message: 'x' })
  })

  it('should return undefined for errors with no response body', () => {
    expect(apiErrorData(new Error('network error'))).toBeUndefined()
    expect(apiErrorData(null)).toBeUndefined()
    expect(apiErrorData('boom')).toBeUndefined()
  })
})

describe('friendlyApiErrorMessage', () => {
  it('should explain rate limiting when the status is 429', () => {
    expect(friendlyApiErrorMessage(429)).toMatch(/Demasiadas solicitudes/)
  })

  it('should hide server details when the status is 5xx', () => {
    expect(friendlyApiErrorMessage(500)).toMatch(/nuestro lado/)
    expect(friendlyApiErrorMessage(503)).toMatch(/nuestro lado/)
  })

  it('should report a connection problem when there is no response', () => {
    expect(friendlyApiErrorMessage(undefined)).toMatch(/conexión/)
  })

  it('should keep the backend message for client errors', () => {
    expect(friendlyApiErrorMessage(400)).toBeNull()
    expect(friendlyApiErrorMessage(404)).toBeNull()
    expect(friendlyApiErrorMessage(409)).toBeNull()
  })
})
