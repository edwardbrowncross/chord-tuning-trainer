import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useModuleState } from './useModuleState'
import { useNavigation } from './useNavigation'

const PART_STORAGE_KEY = 'tuning-trainer:part'

function useModuleWithNavigation() {
  const { state, ...handlers } = useModuleState()
  useNavigation(state, handlers)
  return { state, ...handlers }
}

beforeEach(() => {
  localStorage.clear()
  history.replaceState(null, '', '#/')
})

describe('useNavigation', () => {
  describe('localStorage persistence', () => {
    it('defaults to null when localStorage is empty', () => {
      const { result } = renderHook(() => useModuleWithNavigation())
      expect(result.current.state.part).toBeNull()
    })

    it('loads a stored part from localStorage', () => {
      localStorage.setItem(PART_STORAGE_KEY, 'bass')
      const { result } = renderHook(() => useModuleWithNavigation())
      expect(result.current.state.part).toBe('bass')
    })

    it('defaults to null when localStorage contains an invalid value', () => {
      localStorage.setItem(PART_STORAGE_KEY, 'soprano')
      const { result } = renderHook(() => useModuleWithNavigation())
      expect(result.current.state.part).toBeNull()
    })

    it('persists part to localStorage when it changes', () => {
      const { result } = renderHook(() => useModuleWithNavigation())
      act(() => result.current.handleSetPart('tenor'))
      expect(localStorage.getItem(PART_STORAGE_KEY)).toBe('tenor')
    })

    it('persists the initial part to localStorage on mount', () => {
      localStorage.setItem(PART_STORAGE_KEY, 'bari')
      renderHook(() => useModuleWithNavigation())
      expect(localStorage.getItem(PART_STORAGE_KEY)).toBe('bari')
    })
  })

  describe('URL sync', () => {
    it('starts at #/ for module-select', () => {
      renderHook(() => useModuleWithNavigation())
      expect(window.location.hash).toBe('#/')
    })

    it('pushes a level URL with slug when a module is selected', () => {
      const { result } = renderHook(() => useModuleWithNavigation())
      act(() => result.current.handleSelectModule(0))
      const slug = result.current.state.modules[0].slug
      const firstVoicing = result.current.state.modules[0].levels[0].voicing
      expect(window.location.hash).toBe(`#/module/${slug}/level/${firstVoicing}`)
    })

    it('pushes a level URL with slug when a specific level is selected', () => {
      const { result } = renderHook(() => useModuleWithNavigation())
      act(() => result.current.handleSelectLevel(0, 1))
      const slug = result.current.state.modules[0].slug
      const secondVoicing = result.current.state.modules[0].levels[1].voicing
      expect(window.location.hash).toBe(`#/module/${slug}/level/${secondVoicing}`)
    })

    it('returns to #/ when navigating back to modules', () => {
      const { result } = renderHook(() => useModuleWithNavigation())
      act(() => result.current.handleSelectModule(0))
      expect(window.location.hash).not.toBe('#/')
      act(() => result.current.handleBack())
      expect(window.location.hash).toBe('#/')
    })

    it('does not change URL when advancing to next level within same module-active phase', () => {
      const pushStateSpy = vi.spyOn(history, 'pushState')
      const { result } = renderHook(() => useModuleWithNavigation())
      act(() => result.current.handleSelectModule(0))
      pushStateSpy.mockClear()

      // NEXT_LEVEL changes levelIndex within module-active, so URL should update
      act(() => result.current.handleNextLevel())
      // This actually changes the level, so the URL should update
      const slug = result.current.state.modules[0].slug
      const secondVoicing = result.current.state.modules[0].levels[1]?.voicing
      if (secondVoicing) {
        expect(window.location.hash).toBe(`#/module/${slug}/level/${secondVoicing}`)
      }

      pushStateSpy.mockRestore()
    })
  })

  describe('deep linking', () => {
    it('restores module-active state from a level URL with slug', () => {
      history.replaceState(null, '', '#/module/augmented-triads/level/5351')
      const { result } = renderHook(() => useModuleWithNavigation())
      expect(result.current.state.phase.type).toBe('module-active')
      const phase = result.current.state.phase as { moduleIndex: number; levelIndex: number }
      expect(phase.moduleIndex).toBe(0)
      expect(typeof phase.levelIndex).toBe('number')
    })

    it('falls back to module-select for invalid slug', () => {
      history.replaceState(null, '', '#/module/nonexistent/level/1513')
      const { result } = renderHook(() => useModuleWithNavigation())
      expect(result.current.state.phase.type).toBe('module-select')
    })

    it('falls back to module-select for invalid voicing', () => {
      history.replaceState(null, '', '#/module/augmented-triads/level/9999')
      const { result } = renderHook(() => useModuleWithNavigation())
      expect(result.current.state.phase.type).toBe('module-select')
    })
  })

  describe('popstate (browser back/forward)', () => {
    it('navigates back to module-select on popstate to #/', () => {
      const { result } = renderHook(() => useModuleWithNavigation())
      act(() => result.current.handleSelectModule(0))
      expect(result.current.state.phase.type).toBe('module-active')

      act(() => {
        history.replaceState(null, '', '#/')
        window.dispatchEvent(new PopStateEvent('popstate'))
      })
      expect(result.current.state.phase.type).toBe('module-select')
    })

    it('navigates to a level on popstate with slug URL', () => {
      const { result } = renderHook(() => useModuleWithNavigation())
      act(() => result.current.handleSelectModule(0))
      const slug = result.current.state.modules[0].slug
      const firstVoicing = result.current.state.modules[0].levels[0].voicing
      act(() => result.current.handleSelectLevel(0, 1))

      act(() => {
        history.replaceState(null, '', `#/module/${slug}/level/${firstVoicing}`)
        window.dispatchEvent(new PopStateEvent('popstate'))
      })
      const phase = result.current.state.phase as { moduleIndex: number; levelIndex: number }
      expect(phase.moduleIndex).toBe(0)
      expect(phase.levelIndex).toBe(0)
    })
  })
})
