import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useProgressState } from './useProgressState'

const PART_STORAGE_KEY = 'tuning-trainer:part'

beforeEach(() => {
  localStorage.clear()
  // Reset to root path
  history.replaceState(null, '', '/')
})

describe('useProgressState', () => {
  describe('localStorage persistence', () => {
    it('defaults to lead when localStorage is empty', () => {
      const { result } = renderHook(() => useProgressState())
      expect(result.current.state.part).toBe('lead')
    })

    it('loads a stored part from localStorage', () => {
      localStorage.setItem(PART_STORAGE_KEY, 'bass')
      const { result } = renderHook(() => useProgressState())
      expect(result.current.state.part).toBe('bass')
    })

    it('falls back to lead when localStorage contains an invalid value', () => {
      localStorage.setItem(PART_STORAGE_KEY, 'soprano')
      const { result } = renderHook(() => useProgressState())
      expect(result.current.state.part).toBe('lead')
    })

    it('persists part to localStorage when it changes', () => {
      const { result } = renderHook(() => useProgressState())
      act(() => result.current.handleSetPart('tenor'))
      expect(localStorage.getItem(PART_STORAGE_KEY)).toBe('tenor')
    })

    it('persists the initial part to localStorage on mount', () => {
      localStorage.setItem(PART_STORAGE_KEY, 'bari')
      renderHook(() => useProgressState())
      expect(localStorage.getItem(PART_STORAGE_KEY)).toBe('bari')
    })
  })

  describe('URL sync', () => {
    it('starts at / for module-select', () => {
      renderHook(() => useProgressState())
      expect(window.location.pathname).toBe('/')
    })

    it('pushes a level URL when a module is selected', () => {
      const { result } = renderHook(() => useProgressState())
      act(() => result.current.handleSelectModule(0))
      // URL uses the voicing of the first sorted level
      const firstVoicing = result.current.state.modules[0].levels[0].voicing
      expect(window.location.pathname).toBe(`/module/0/level/${firstVoicing}`)
    })

    it('pushes a level URL when a specific level is selected', () => {
      const { result } = renderHook(() => useProgressState())
      act(() => result.current.handleSelectLevel(0, 1))
      const secondVoicing = result.current.state.modules[0].levels[1].voicing
      expect(window.location.pathname).toBe(`/module/0/level/${secondVoicing}`)
    })

    it('returns to / when navigating back to modules', () => {
      const { result } = renderHook(() => useProgressState())
      act(() => result.current.handleSelectModule(0))
      const firstVoicing = result.current.state.modules[0].levels[0].voicing
      expect(window.location.pathname).toBe(`/module/0/level/${firstVoicing}`)
      act(() => result.current.handleBack())
      expect(window.location.pathname).toBe('/')
    })

    it('updates URL when advancing to next level', () => {
      const { result } = renderHook(() => useProgressState())
      act(() => result.current.handleSelectModule(0))
      act(() => result.current.handleStartLevel())
      // Complete all exercises to reach level-complete
      const exercises = result.current.state.phase.type === 'level-active'
        ? (result.current.state.phase as { level: { exercises: unknown[] } }).level.exercises
        : []
      for (let i = 0; i < exercises.length; i++) {
        act(() => result.current.handleExerciseComplete({ stars: 3, durationMs: 1000 }))
      }
      expect(result.current.state.phase.type).toBe('level-complete')
      act(() => result.current.handleNextLevel())
      const secondVoicing = result.current.state.modules[0].levels[1].voicing
      expect(window.location.pathname).toBe(`/module/0/level/${secondVoicing}`)
    })

    it('does not change URL when phase changes within same level', () => {
      const pushStateSpy = vi.spyOn(history, 'pushState')
      const { result } = renderHook(() => useProgressState())
      act(() => result.current.handleSelectModule(0))
      const firstVoicing = result.current.state.modules[0].levels[0].voicing
      pushStateSpy.mockClear()

      // level-ready → level-active: same level, no URL push
      act(() => result.current.handleStartLevel())
      expect(pushStateSpy).not.toHaveBeenCalled()
      expect(window.location.pathname).toBe(`/module/0/level/${firstVoicing}`)

      pushStateSpy.mockRestore()
    })
  })

  describe('deep linking', () => {
    it('restores level-ready state from a level URL', () => {
      // Use a known voicing from module 0 (Augmented Triads)
      history.replaceState(null, '', '/module/0/level/5351')
      const { result } = renderHook(() => useProgressState())
      expect(result.current.state.phase.type).toBe('level-ready')
      const phase = result.current.state.phase as { moduleIndex: number; levelIndex: number }
      expect(phase.moduleIndex).toBe(0)
      // levelIndex depends on sorted order, just verify it resolved
      expect(typeof phase.levelIndex).toBe('number')
    })

    it('falls back to module-select for invalid module index', () => {
      history.replaceState(null, '', '/module/999/level/1513')
      const { result } = renderHook(() => useProgressState())
      expect(result.current.state.phase.type).toBe('module-select')
    })

    it('falls back to module-select for invalid voicing', () => {
      history.replaceState(null, '', '/module/0/level/9999')
      const { result } = renderHook(() => useProgressState())
      expect(result.current.state.phase.type).toBe('module-select')
    })
  })

  describe('popstate (browser back/forward)', () => {
    it('navigates back to module-select on popstate to /', () => {
      const { result } = renderHook(() => useProgressState())
      act(() => result.current.handleSelectModule(0))
      expect(result.current.state.phase.type).toBe('level-ready')

      // jsdom doesn't fully simulate history.back(), so replaceState + popstate
      act(() => {
        history.replaceState(null, '', '/')
        window.dispatchEvent(new PopStateEvent('popstate'))
      })
      expect(result.current.state.phase.type).toBe('module-select')
    })

    it('navigates to a level on popstate with level URL', () => {
      const { result } = renderHook(() => useProgressState())
      act(() => result.current.handleSelectModule(0))
      const firstVoicing = result.current.state.modules[0].levels[0].voicing
      act(() => result.current.handleSelectLevel(0, 1))

      act(() => {
        history.replaceState(null, '', `/module/0/level/${firstVoicing}`)
        window.dispatchEvent(new PopStateEvent('popstate'))
      })
      const phase = result.current.state.phase as { moduleIndex: number; levelIndex: number }
      expect(phase.moduleIndex).toBe(0)
      expect(phase.levelIndex).toBe(0)
    })
  })
})
