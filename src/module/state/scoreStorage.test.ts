import { describe, it, expect, beforeEach } from 'vitest'
import { loadScores, saveScores } from './scoreStorage'
import type { ModuleSpecification } from '../../data/types'

const modules: ModuleSpecification[] = [
  {
    name: 'Major Triads',
    slug: 'major-triads',
    description: 'Major triads',
    difficulty: 'beginner',
    levels: [
      { chordType: 'major', voicing: '1513', partwiseEaseOfTuning: [1, 1, 1, 1] },
      { chordType: 'major', voicing: '1351', partwiseEaseOfTuning: [2, 2, 2, 2] },
    ],
  },
  {
    name: 'Minor Triads',
    slug: 'minor-triads',
    description: 'Minor triads',
    difficulty: 'beginner',
    levels: [
      { chordType: 'minor', voicing: '1513', partwiseEaseOfTuning: [1, 1, 1, 1] },
    ],
  },
]

beforeEach(() => {
  localStorage.clear()
})

describe('loadScores', () => {
  it('returns all nulls when nothing is stored', () => {
    expect(loadScores('bass', modules)).toEqual([[null, null], [null]])
  })

  it('returns all nulls when stored data is corrupt', () => {
    localStorage.setItem('tuning-trainer:scores', 'not json')
    expect(loadScores('bass', modules)).toEqual([[null, null], [null]])
  })

  it('loads saved scores by slug and voicing', () => {
    localStorage.setItem('tuning-trainer:scores', JSON.stringify({
      bass: { 'major-triads': { '1513': 7 } },
    }))
    expect(loadScores('bass', modules)).toEqual([[7, null], [null]])
  })

  it('ignores scores for unknown slugs', () => {
    localStorage.setItem('tuning-trainer:scores', JSON.stringify({
      bass: { 'unknown-module': { '1513': 9 } },
    }))
    expect(loadScores('bass', modules)).toEqual([[null, null], [null]])
  })

  it('returns different scores per part', () => {
    localStorage.setItem('tuning-trainer:scores', JSON.stringify({
      bass: { 'major-triads': { '1513': 7 } },
      tenor: { 'minor-triads': { '1513': 5 } },
    }))
    expect(loadScores('bass', modules)).toEqual([[7, null], [null]])
    expect(loadScores('tenor', modules)).toEqual([[null, null], [5]])
  })
})

describe('saveScores', () => {
  it('saves non-null scores keyed by slug and voicing', () => {
    saveScores('bass', modules, [[7, null], [5]])
    const stored = JSON.parse(localStorage.getItem('tuning-trainer:scores')!)
    expect(stored.bass).toEqual({
      'major-triads': { '1513': 7 },
      'minor-triads': { '1513': 5 },
    })
  })

  it('preserves scores for other parts', () => {
    localStorage.setItem('tuning-trainer:scores', JSON.stringify({
      tenor: { 'major-triads': { '1351': 9 } },
    }))
    saveScores('bass', modules, [[7, null], [null]])
    const stored = JSON.parse(localStorage.getItem('tuning-trainer:scores')!)
    expect(stored.tenor).toEqual({ 'major-triads': { '1351': 9 } })
    expect(stored.bass).toEqual({ 'major-triads': { '1513': 7 } })
  })

  it('merges with existing scores for the same part', () => {
    saveScores('bass', modules, [[7, null], [null]])
    saveScores('bass', modules, [[null, 6], [null]])
    const stored = JSON.parse(localStorage.getItem('tuning-trainer:scores')!)
    expect(stored.bass['major-triads']).toEqual({ '1513': 7, '1351': 6 })
  })

  it('overwrites existing score for the same voicing', () => {
    saveScores('bass', modules, [[7, null], [null]])
    saveScores('bass', modules, [[9, null], [null]])
    const stored = JSON.parse(localStorage.getItem('tuning-trainer:scores')!)
    expect(stored.bass['major-triads']['1513']).toBe(9)
  })
})

describe('round-trip', () => {
  it('load after save returns the same scores', () => {
    const scores: (number | null)[][] = [[7, 6], [5]]
    saveScores('lead', modules, scores)
    expect(loadScores('lead', modules)).toEqual(scores)
  })

  it('handles modules being reordered', () => {
    saveScores('lead', modules, [[7, 6], [5]])
    const reordered = [modules[1], modules[0]]
    expect(loadScores('lead', reordered)).toEqual([[5], [7, 6]])
  })

  it('handles a level being added to a module', () => {
    saveScores('lead', modules, [[7, 6], [5]])
    const extended: ModuleSpecification[] = [
      {
        ...modules[0],
        levels: [
          ...modules[0].levels,
          { chordType: 'major', voicing: '5131', partwiseEaseOfTuning: [3, 3, 3, 3] },
        ],
      },
      modules[1],
    ]
    expect(loadScores('lead', extended)).toEqual([[7, 6, null], [5]])
  })

  it('handles a module being removed', () => {
    saveScores('lead', modules, [[7, 6], [5]])
    expect(loadScores('lead', [modules[0]])).toEqual([[7, 6]])
  })
})
