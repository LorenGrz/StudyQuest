import type { Career } from '../services/universityService'

/** Sentinel `careerId` value for "Otra (no está en la lista)": reveals a free-text input. */
export const OTHER_CAREER_VALUE = '__other__'
export const OTHER_CAREER_LABEL = 'Otra (no está en la lista)'

const OTHER_FACULTY_LABEL = 'Sin facultad'

export interface CareerGroup {
  faculty: string
  careers: Career[]
}

/** Groups active careers by faculty (alphabetically; "Sin facultad" last). */
export function groupCareersByFaculty(careers: Career[]): CareerGroup[] {
  const map = new Map<string, Career[]>()
  for (const career of careers) {
    const key = career.faculty ?? OTHER_FACULTY_LABEL
    const list = map.get(key) ?? []
    list.push(career)
    map.set(key, list)
  }
  return Array.from(map.entries())
    .map(([faculty, list]) => ({ faculty, careers: list }))
    .sort((a, b) => {
      if (a.faculty === OTHER_FACULTY_LABEL) return 1
      if (b.faculty === OTHER_FACULTY_LABEL) return -1
      return a.faculty.localeCompare(b.faculty)
    })
}
