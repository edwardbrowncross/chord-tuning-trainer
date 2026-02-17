import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useProgressState } from './useProgressState'

const PART_STORAGE_KEY = 'tuning-trainer:part'

beforeEach(() => {
  localStorage.clear()
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
})
