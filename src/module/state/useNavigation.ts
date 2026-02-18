import { useEffect, useRef } from 'react'
import type { ModuleSpecification } from '../../data/types'
import type { ModuleState } from './types'

const PART_STORAGE_KEY = 'tuning-trainer:part'

function getHashPath(): string {
  return window.location.hash || '#/'
}

const LEVEL_PATH_RE = /^#\/module\/([a-z0-9-]+)\/level\/([a-zA-Z0-9]+)$/

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

function hashForPhase(
  phase: ModuleState['phase'],
  modules: ModuleSpecification[],
): string {
  if (phase.type === 'module-active') {
    const mod = modules[phase.moduleIndex]
    const voicing = mod?.levels[phase.levelIndex]?.voicing
    if (mod && voicing) return `#/module/${mod.slug}/level/${voicing}`
  }
  return '#/'
}

export function useNavigation(
  state: ModuleState,
  handlers: {
    handleSelectModule: (moduleIndex: number) => void
    handleSelectLevel: (moduleIndex: number, levelIndex: number) => void
    handleBack: () => void
  },
) {
  const isPopstateRef = useRef(false)
  const modulesRef = useRef(state.modules)
  useEffect(() => {
    modulesRef.current = state.modules
  }, [state.modules])

  // Persist part to localStorage
  useEffect(() => {
    if (state.part != null) {
      localStorage.setItem(PART_STORAGE_KEY, state.part)
    }
  }, [state.part])

  // Sync URL when the navigable location (module/level identity) changes
  const currentHash = hashForPhase(state.phase, state.modules)
  useEffect(() => {
    if (isPopstateRef.current) {
      isPopstateRef.current = false
      return
    }
    if (getHashPath() !== currentHash) {
      history.pushState(null, '', currentHash)
    }
  }, [currentHash])

  // Handle browser back/forward
  useEffect(() => {
    const handlePopState = () => {
      isPopstateRef.current = true
      const parsed = parseLevelPath(getHashPath())
      if (parsed) {
        const moduleIndex = findModuleIndexBySlug(modulesRef.current, parsed.slug)
        if (moduleIndex != null) {
          const levelIndex = findLevelIndexByVoicing(modulesRef.current, moduleIndex, parsed.voicing)
          if (levelIndex != null) {
            handlers.handleSelectLevel(moduleIndex, levelIndex)
          } else {
            handlers.handleBack()
          }
        } else {
          handlers.handleBack()
        }
      } else {
        handlers.handleBack()
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [handlers])
}
