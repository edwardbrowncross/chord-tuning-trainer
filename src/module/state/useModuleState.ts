import { useReducer, useCallback, useEffect } from 'react'
import { allModules } from '../../data'
import type { Part } from '../../types'
import type { ModuleSpecification } from '../../data/types'
import type { ExerciseResult } from '../../exercise/state/types'
import { moduleReducer, createInitialState, sortModules } from './moduleReducer'
import { loadScores, saveScores } from './scoreStorage'

const PART_STORAGE_KEY = 'tuning-trainer:part'
const VALID_PARTS: Part[] = ['bass', 'bari', 'lead', 'tenor']

const LEVEL_PATH_RE = /^#\/module\/([a-z0-9-]+)\/level\/([a-zA-Z0-9]+)$/

function loadPart(): Part | null {
  const stored = localStorage.getItem(PART_STORAGE_KEY)
  return VALID_PARTS.includes(stored as Part) ? (stored as Part) : null
}

function parseLevelPath(hash: string): { slug: string; voicing: string } | null {
  const match = hash.match(LEVEL_PATH_RE)
  if (!match) return null
  return { slug: match[1], voicing: match[2] }
}

function findModuleIndexBySlug(modules: ModuleSpecification[], slug: string): number | null {
  const idx = modules.findIndex(m => m.slug === slug)
  return idx >= 0 ? idx : null
}

function findLevelIndexByVoicing(modules: ModuleSpecification[], moduleIndex: number, voicing: string): number | null {
  const mod = modules[moduleIndex]
  if (!mod) return null
  const idx = mod.levels.findIndex(l => l.voicing === voicing)
  return idx >= 0 ? idx : null
}

function getHashPath(): string {
  return window.location.hash || '#/'
}

function initState({ modules, part }: { modules: typeof allModules; part: Part | null }) {
  // Sort first so we can load scores in the correct positional order
  // (createInitialState will sort again, but sort is stable/idempotent)
  const sorted = sortModules(modules, part)
  const scores = part != null ? loadScores(part, sorted) : undefined
  const initial = createInitialState(modules, part, scores)
  const parsed = parseLevelPath(getHashPath())
  if (parsed) {
    const moduleIndex = findModuleIndexBySlug(initial.modules, parsed.slug)
    if (moduleIndex != null) {
      const levelIndex = findLevelIndexByVoicing(initial.modules, moduleIndex, parsed.voicing)
      if (levelIndex != null) {
        return moduleReducer(initial, {
          type: 'SELECT_MODULE',
          moduleIndex,
          levelIndex,
        })
      }
    }
  }
  return initial
}

export function useModuleState() {
  const [state, dispatch] = useReducer(
    moduleReducer,
    { modules: allModules, part: loadPart() },
    initState,
  )

  const handleSelectModule = useCallback((moduleIndex: number) => {
    dispatch({ type: 'SELECT_MODULE', moduleIndex })
  }, [])

  const handleSelectLevel = useCallback((moduleIndex: number, levelIndex: number) => {
    dispatch({ type: 'SELECT_MODULE', moduleIndex, levelIndex })
  }, [])

  const handleLevelCompleted = useCallback((results: ExerciseResult[], moduleIndex: number, levelIndex: number) => {
    dispatch({ type: 'LEVEL_COMPLETED', results, moduleIndex, levelIndex })
  }, [])

  // Save scores after every level completion
  const { part, modules, moduleScores } = state
  useEffect(() => {
    if (part != null) {
      saveScores(part, modules, moduleScores)
    }
  }, [moduleScores, part, modules])

  const handleNextLevel = useCallback(() => {
    dispatch({ type: 'NEXT_LEVEL' })
  }, [])

  const handleBack = useCallback(() => {
    dispatch({ type: 'BACK_TO_MODULES' })
  }, [])

  const handleSetPart = useCallback((part: Part) => {
    const sorted = sortModules(allModules, part)
    const scores = loadScores(part, sorted)
    dispatch({ type: 'SET_PART', part, scores })
  }, [])

  return {
    state,
    handleSelectModule,
    handleSelectLevel,
    handleLevelCompleted,
    handleNextLevel,
    handleBack,
    handleSetPart,
  }
}
