import type { Part } from '../../types'
import type { ModuleSpecification } from '../../data/types'

const STORAGE_KEY = 'tuning-trainer:scores'

type StoredScores = Record<string, Record<string, Record<string, number>>>

function readStore(): StoredScores {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeStore(store: StoredScores): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

export function loadScores(part: Part, modules: ModuleSpecification[]): (number | null)[][] {
  const store = readStore()
  const partScores = store[part] ?? {}
  return modules.map(mod => {
    const modScores = partScores[mod.slug] ?? {}
    return mod.levels.map(level => modScores[level.voicing] ?? null)
  })
}

export function saveScores(part: Part, modules: ModuleSpecification[], scores: (number | null)[][]): void {
  const store = readStore()
  const partScores: Record<string, Record<string, number>> = store[part] ?? {}
  for (let i = 0; i < modules.length; i++) {
    const mod = modules[i]
    const modScores: Record<string, number> = partScores[mod.slug] ?? {}
    for (let j = 0; j < mod.levels.length; j++) {
      const score = scores[i]?.[j]
      if (score != null) {
        modScores[mod.levels[j].voicing] = score
      }
    }
    if (Object.keys(modScores).length > 0) {
      partScores[mod.slug] = modScores
    }
  }
  store[part] = partScores
  writeStore(store)
}
