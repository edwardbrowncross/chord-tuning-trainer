import { useReducer, useCallback, useEffect } from 'react'
import { allModules } from '../modules'
import type { Part } from '../exercise/types'
import { progressReducer, createInitialState } from './progressReducer'
import type { ExerciseResult } from './types'

const PART_STORAGE_KEY = 'tuning-trainer:part'
const VALID_PARTS: Part[] = ['bass', 'bari', 'lead', 'tenor']

function loadPart(): Part {
  const stored = localStorage.getItem(PART_STORAGE_KEY)
  return VALID_PARTS.includes(stored as Part) ? (stored as Part) : 'lead'
}

export function useProgressState() {
  const [state, dispatch] = useReducer(
    progressReducer,
    { modules: allModules, part: loadPart() },
    ({ modules, part }) => createInitialState(modules, part),
  )

  useEffect(() => {
    localStorage.setItem(PART_STORAGE_KEY, state.part)
  }, [state.part])

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
