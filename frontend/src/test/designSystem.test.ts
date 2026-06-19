import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8')

describe('design-system cascade', () => {
  it('keeps global margin and padding resets inside Tailwind base layer', () => {
    const baseLayer = css.match(/@layer base\s*\{[\s\S]*?\n\}/)?.[0] ?? ''
    expect(baseLayer).toContain('box-sizing: border-box')
    expect(baseLayer).toContain('margin: 0')
    expect(baseLayer).toContain('padding: 0')
  })

  it('does not declare an unlayered universal spacing reset', () => {
    const beforeBaseLayer = css.split('@layer base')[0]
    expect(beforeBaseLayer).not.toMatch(/\*\s*,[\s\S]*padding:\s*0/)
  })
})
