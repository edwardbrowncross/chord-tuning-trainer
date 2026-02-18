import type { ModuleSpecification } from './types'
import { modulesSchema } from './types'
import chordsData from './chords.json'

export const allModules: ModuleSpecification[] = modulesSchema.parse(chordsData)
