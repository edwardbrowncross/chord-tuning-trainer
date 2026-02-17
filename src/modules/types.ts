import { z } from 'zod'
import { CHORD_TYPES } from '../audio/intervals'
import type { ChordType } from '../audio/intervals'

const chordTypeKeys = Object.keys(CHORD_TYPES) as [ChordType, ...ChordType[]]

export const levelSpecificationSchema = z.object({
  chordType: z.enum(chordTypeKeys),
  voicing: z.string(),
  partwiseEaseOfTuning: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  chordTypeName: z.string().optional(),
  vowel: z.string().optional(),
  minOffsetCents: z.number().optional(),
  maxOffsetCents: z.number().optional(),
  offsetDirection: z.enum(['up', 'down', 'either']).optional(),
  starThresholds: z.tuple([z.number(), z.number()]).optional(),
  repeats: z.number().optional(),
})

export const moduleSpecificationSchema = z.object({
  name: z.string(),
  description: z.string(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  levels: z.array(levelSpecificationSchema),
})

export const modulesSchema = z.array(moduleSpecificationSchema)

export type LevelSpecification = z.infer<typeof levelSpecificationSchema>
export type ModuleSpecification = z.infer<typeof moduleSpecificationSchema>
