import { PART_INDEX } from '../../exercise/state/exerciseGenerator'
import type { Part } from '../../types'
import type { ModuleSpecification } from '../../data/types'
import type { ModuleState, ModuleAction } from './types'

export function sortModules(modules: ModuleSpecification[], part: Part | null): ModuleSpecification[] {
  return part != null
    ? modules.map(mod => ({
        ...mod,
        levels: [...mod.levels].sort(
          (a, b) => b.partwiseEaseOfTuning[PART_INDEX[part]] - a.partwiseEaseOfTuning[PART_INDEX[part]],
        ),
      }))
    : modules.map(mod => ({ ...mod, levels: [...mod.levels] }))
}

export function createInitialState(
  modules: ModuleSpecification[],
  part: Part | null,
  scores?: (number | null)[][],
): ModuleState {
  const sortedModules = sortModules(modules, part)
  return {
    phase: { type: 'module-select' },
    modules: sortedModules,
    part,
    moduleScores: scores ?? sortedModules.map(m => m.levels.map(() => null)),
  }
}

export function moduleReducer(state: ModuleState, action: ModuleAction): ModuleState {
  switch (action.type) {
    case 'SELECT_MODULE': {
      const mod = state.modules[action.moduleIndex]
      if (!mod) return state
      const levelIndex = action.levelIndex ?? 0
      const levelSpec = mod.levels[levelIndex]
      if (!levelSpec) return state
      return {
        ...state,
        phase: {
          type: 'module-active',
          moduleIndex: action.moduleIndex,
          levelIndex,
        },
      }
    }

    case 'LEVEL_COMPLETED': {
      const { results, moduleIndex, levelIndex } = action
      const levelScore = results.reduce((sum, r) => sum + r.stars, 0)
      const newScores = state.moduleScores.map(row => [...row])
      const prev = newScores[moduleIndex][levelIndex]
      if (prev === null || levelScore > prev) {
        newScores[moduleIndex][levelIndex] = levelScore
      }
      return { ...state, moduleScores: newScores }
    }

    case 'NEXT_LEVEL': {
      if (state.phase.type !== 'module-active') return state
      const { moduleIndex, levelIndex } = state.phase
      const mod = state.modules[moduleIndex]
      const nextLevelIndex = levelIndex + 1

      if (nextLevelIndex >= mod.levels.length) {
        return { ...state, phase: { type: 'module-select' } }
      }

      return {
        ...state,
        phase: {
          type: 'module-active',
          moduleIndex,
          levelIndex: nextLevelIndex,
        },
      }
    }

    case 'BACK_TO_MODULES':
      return { ...state, phase: { type: 'module-select' } }

    case 'SET_PART': {
      if (state.phase.type !== 'module-select') return state
      return createInitialState(state.modules, action.part, action.scores)
    }
  }
}
