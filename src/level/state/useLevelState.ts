import { useReducer, useCallback, useEffect, useRef, useState, useMemo } from 'react'
import { useAudio } from '../../audio/AudioProvider'
import { generateExercises } from '../../exercise/state/exerciseGenerator'
import type { LevelSpecification } from '../../data/types'
import type { Part } from '../../types'
import type { ExerciseResult } from '../../exercise/state/types'
import { levelReducer, createLevelState } from './levelReducer'

export function useLevelState({
  levelSpec,
  part,
  onLevelComplete,
}: {
  levelSpec: LevelSpecification
  part: Part
  onLevelComplete: (results: ExerciseResult[]) => void
}) {
  const [state, dispatch] = useReducer(levelReducer, { levelSpec, part }, ({ levelSpec, part }) =>
    createLevelState(levelSpec, part),
  )
  const { getOrCreateAudioContext } = useAudio()
  const [currentResult, setCurrentResult] = useState<ExerciseResult | null>(null)

  // Track whether we've already called onLevelComplete for the current complete phase
  const completedRef = useRef(false)
  useEffect(() => {
    if (state.phase === 'complete' && !completedRef.current) {
      completedRef.current = true
      onLevelComplete(state.results)
    }
    if (state.phase !== 'complete') {
      completedRef.current = false
    }
  }, [state.phase, state.results, onLevelComplete])

  const handleStart = useCallback(() => {
    getOrCreateAudioContext()
    dispatch({ type: 'START' })
  }, [getOrCreateAudioContext])

  const handleExerciseComplete = useCallback((result: ExerciseResult) => {
    setCurrentResult(null)
    dispatch({ type: 'EXERCISE_COMPLETED', result })
  }, [])

  const handleRetry = useCallback(() => {
    setCurrentResult(null)
    dispatch({ type: 'RETRY', exercises: generateExercises(levelSpec, part) })
  }, [levelSpec, part])

  const dotsResults = useMemo(() => {
    const levelResults = state.results
    return currentResult ? [...levelResults, currentResult] : levelResults
  }, [state.results, currentResult])

  return {
    state,
    handleStart,
    handleExerciseComplete,
    handleRetry,
    currentResult,
    setCurrentResult,
    dotsResults,
  }
}
