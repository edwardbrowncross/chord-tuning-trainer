import type { ModuleSpecification } from './types'

export const majorTriads: ModuleSpecification = {
  name: 'Major Triads',
  description: 'Learn to tune major triads in close voicings',
  levels: [
    {
      level: 1,
      chordType: 'major',
      voicing: '1513',
      partwiseDifficulty: [1, 2, 1, 2],
      repeats: 3,
    },
    {
      level: 2,
      chordType: 'major',
      voicing: '1351',
      partwiseDifficulty: [1, 2, 2, 2],
      repeats: 3,
    },
    {
      level: 3,
      chordType: 'major',
      voicing: '5131',
      partwiseDifficulty: [2, 3, 2, 3],
      repeats: 4,
    },
  ],
}
