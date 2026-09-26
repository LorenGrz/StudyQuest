import { describe, expect, it } from 'vitest'
import { normalizeUsernameInput } from './username'

describe('normalizeUsernameInput', () => {
  it('should lowercase what the user types', () => {
    expect(normalizeUsernameInput('JuanDev')).toBe('juandev')
  })

  it('should drop a typed leading @ because the prefix is already shown', () => {
    expect(normalizeUsernameInput('@@Loren')).toBe('loren')
  })

  it('should remove spaces', () => {
    expect(normalizeUsernameInput(' ana dev ')).toBe('anadev')
  })

  it('should return an empty string for an empty input', () => {
    expect(normalizeUsernameInput('')).toBe('')
  })
})
