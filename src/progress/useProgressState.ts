import { useReducer, useCallback, useEffect, useRef } from 'react'
import { allModules } from '../modules'
import type { Part } from '../exercise/types'
import type { ModuleSpecification } from '../modules/types'
import { progressReducer, createInitialState } from './progressReducer'
import type { ExerciseResult } from './types'

const PART_STORAGE_KEY = 'tuning-trainer:part'
const VALID_PARTS: Part[] = ['bass', 'bari', 'lead', 'tenor']

const LEVEL_PATH_RE = /^\/module\/(\d+)\/level\/([a-zA-Z0-9]+)$/

function loadPart(): Part {
  const stored = localStorage.getItem(PART_STORAGE_KEY)
  return VALID_PARTS.includes(stored as Part) ? (stored as Part) : 'lead'
}

function parseLevelPath(pathname: string): { moduleIndex: number; voicing: string } | null {
  const match = pathname.match(LEVEL_PATH_RE)
  if (!match) return null
  return { moduleIndex: Number(match[1]), voicing: match[2] }
}

function findLevelIndexByVoicing(modules: ModuleSpecification[], moduleIndex: number, voicing: string): number | null {
  const mod = modules[moduleIndex]
  if (!mod) return null
  const idx = mod.levels.findIndex(l => l.voicing === voicing)
  return idx >= 0 ? idx : null
}

function pathForPhase(
  phase: { type: string; moduleIndex?: number; levelIndex?: number },
  modules: ModuleSpecification[],
): string {
  if (phase.type !== 'module-select' && phase.moduleIndex != null && phase.levelIndex != null) {
    const voicing = modules[phase.moduleIndex]?.levels[phase.levelIndex]?.voicing
    if (voicing) return `/module/${phase.moduleIndex}/level/${voicing}`
  }
  return '/'
}

function initState({ modules, part }: { modules: typeof allModules; part: Part }) {
  const initial = createInitialState(modules, part)
  const parsed = parseLevelPath(window.location.pathname)
  if (parsed) {
    const levelIndex = findLevelIndexByVoicing(initial.modules, parsed.moduleIndex, parsed.voicing)
    if (levelIndex != null) {
      return progressReducer(initial, {
        type: 'SELECT_MODULE',
        moduleIndex: parsed.moduleIndex,
        levelIndex,
      })
    }
  }
  return initial
}

export function useProgressState() {
  const [state, dispatch] = useReducer(
    progressReducer,
    { modules: allModules, part: loadPart() },
    initState,
  )

  // Track whether a URL change was triggered by popstate so we don't push back
  const isPopstateRef = useRef(false)
  const modulesRef = useRef(state.modules)
  modulesRef.current = state.modules

  useEffect(() => {
    localStorage.setItem(PART_STORAGE_KEY, state.part)
  }, [state.part])

  // Sync URL when the navigable location (module/level identity) changes
  const currentPath = pathForPhase(state.phase, state.modules)
  useEffect(() => {
    if (isPopstateRef.current) {
      isPopstateRef.current = false
      return
    }
    if (window.location.pathname !== currentPath) {
      history.pushState(null, '', currentPath)
    }
  }, [currentPath])

  // Handle browser back/forward
  useEffect(() => {
    const handlePopState = () => {
      isPopstateRef.current = true
      const parsed = parseLevelPath(window.location.pathname)
      if (parsed) {
        const levelIndex = findLevelIndexByVoicing(modulesRef.current, parsed.moduleIndex, parsed.voicing)
        if (levelIndex != null) {
          dispatch({ type: 'SELECT_MODULE', moduleIndex: parsed.moduleIndex, levelIndex })
        } else {
          dispatch({ type: 'BACK_TO_MODULES' })
        }
      } else {
        dispatch({ type: 'BACK_TO_MODULES' })
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const handleSelectModule = useCallback((moduleIndex: number) => {
    dispatch({ type: 'SELECT_MODULE', moduleIndex })
  }, [])

  const handleSelectLevel = useCallback((moduleIndex: number, levelIndex: number) => {
    dispatch({ type: 'SELECT_MODULE', moduleIndex, levelIndex })
  }, [])

  const handleStartLevel = useCallback(() => {
    dispatch({ type: 'START_LEVEL' })
  }, [])

  const handleExerciseComplete = useCallback((result: ExerciseResult) => {
    dispatch({ type: 'EXERCISE_COMPLETED', result })
  }, [])

  const handleBack = useCallback(() => {
    dispatch({ type: 'BACK_TO_MODULES' })
  }, [])

  const handleNextLevel = useCallback(() => {
    dispatch({ type: 'NEXT_LEVEL' })
  }, [])

  const handleSetPart = useCallback((part: Part) => {
    dispatch({ type: 'SET_PART', part })
  }, [])

  return {
    state,
    handleSelectModule,
    handleSelectLevel,
    handleStartLevel,
    handleExerciseComplete,
    handleBack,
    handleNextLevel,
    handleSetPart,
  }
}
