import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8')

/**
 * Extracts the full content of an `@layer <name> { ... }` block by counting
 * brace depth, so nested rules containing `}` do not prematurely end the match.
 */
function extractLayer(source: string, name: string): string {
  const start = source.search(new RegExp(`@layer\\s+${name}\\s*\\{`))
  if (start === -1) return ''
  const openBrace = source.indexOf('{', start)
  if (openBrace === -1) return ''
  let depth = 0
  for (let i = openBrace; i < source.length; i++) {
    if (source[i] === '{') depth++
    else if (source[i] === '}') {
      depth--
      if (depth === 0) return source.slice(start, i + 1)
    }
  }
  return '' // unclosed block — treat as not found
}

const migratedFiles = [
  'src/pages/AuthPage.tsx',
  'src/components/SubjectComponents.tsx',
  'src/pages/FriendsPage.tsx',
]

it.each(migratedFiles)('%s has no removed legacy layout classes', (file) => {
  const source = readFileSync(resolve(process.cwd(), file), 'utf8')
  expect(source).not.toMatch(/\b(search-bar|filter-chips|subject-list-item|page-header|card-body|row-gap|list-item|auth-switch|link-btn)\b/)
})

describe('design-system cascade', () => {
  it('keeps global margin and padding resets inside Tailwind base layer', () => {
    const baseLayer = extractLayer(css, 'base')
    expect(baseLayer).toContain('box-sizing: border-box')
    expect(baseLayer).toContain('margin: 0')
    expect(baseLayer).toContain('padding: 0')
  })

  it('does not declare an unlayered universal spacing reset', () => {
    const beforeBaseLayer = css.split('@layer base')[0]
    expect(beforeBaseLayer).not.toMatch(/\*\s*,[\s\S]*padding:\s*0/)
  })
})
