# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

We are in the early stages of building an app to train singers in a barbershop quartet to tune chords. The flow of the app will be as follows:

1. The user selects a chord to practice (e.g. Major triad).
2. The app plays a sung note and has the user match that tone.
3. Three other voices start together with the other three notes of the chord, but slightly flat or sharp from where the user is singing.
4. The user tries to adjust their pitch to achieve a pure chord.
5. The app provides real-time feedback on the user's pitch and how it compares to the target chord.
6. When the user gets the right note, they are given a star rating based on how quickly they got there.
7. The user repeats this at varying pitch, vowel, and voicing, starting with the easiest voicings and ending with harder ones.

The exercises will actually be organised hierarchically as follows:

- Top level: Module - Represents a collection of related exercises (e.g. "Major Triads", "Minor Triads", "Dominant Sevenths", etc.). It contains many levels:
- Mid level: Level - Represents a single instance of the module's chord to be practised, for example: "Major triad in a 1513 voicing". To reinforce learning, the same chord will be practised at different pitches and with different vowels. These are called "exercises":
- Low level: Exercise - Represents a single attempt at tuning a chord.

## Commands

- **Dev server:** `npm run dev` (Vite with HMR)
- **Build:** `npm run build` (runs `tsc -b && vite build`)
- **Lint:** `npm run lint` (ESLint 9 flat config)
- **Type check:** `npx tsc --noEmit`
- **Test:** `npm test` (Vitest, single run) / `npm run test:watch` (watch mode)

## Tech Stack

- React 19, TypeScript (strict), Vite 7
- Mantine v8 for UI components
- pitchfinder (Macleod algorithm) for pitch detection via Web Audio API
- cantor-digitalis a voice synthesiser for generating realistic sung vowel sounds.

## Architecture

Real-time pitch detection app. Audio is captured from the microphone, analysed via Web Audio API's AnalyserNode, and processed through the Macleod pitch detection algorithm.

Audio utilities live in `src/audio/`:

- **AudioProvider** — React context provider that manages a shared `AudioContext`. Exposes `getOrCreateAudioContext()` for lazy creation (satisfies browser autoplay policy), a reactive `state` field, a `vowelPlayer` (`VowelPlayer | null`), and a `pitchDetector` (`PitchDetector | null`) — both created automatically when the `AudioContext` is initialized. Also exposes ref-based getters `getVowelPlayer()` and `getPitchDetector()` that return the instance synchronously (even before the next React render after `getOrCreateAudioContext()`), useful in event handlers that create the context and immediately need the player/detector. The `useAudio()` hook provides access to the full context value. The `useVowelPlayer()` hook returns the `VowelPlayer` instance (or `null` before initialization). The `usePitchDetector()` hook returns `{ isRunning, start, stop, pitch }` with median-smoothed pitch; it wraps the `PitchDetector`'s `useSyncExternalStore`-compatible API and intercepts the subscribe callback to feed raw pitch values into a `useMedianBuffer` before notifying React, keeping snapshot and smoothed pitch in sync within a single render pass. Mounted in `main.tsx` wrapping the entire app.
- **PitchDetector** — plain class (no React dependency) that manages mic access, an AnalyserNode, and a requestAnimationFrame loop running Macleod pitch detection. Exposes `subscribe()`/`getSnapshot()` for `useSyncExternalStore`, plus `start()`/`stop()` methods. Both are idempotent (start when running and stop when stopped are no-ops). Emits raw pitch on every frame (no deduplication) so consumers like median buffers receive repeated readings.
- **generatePartials** — converts cantor-digitalis `SynthParams` into `Float32Array` pairs (real/imag) suitable for `createPeriodicWave`. Reads `f0` from the provided `SynthParams`, computes harmonic frequencies as multiples of `f0`, and samples `Voice.getFrequencyResponse` to get partial amplitudes. Callers are responsible for calling `generateSynthParams` first.
- **makeVoice** — factory function that creates a `PerceptualParams` object for a given MIDI pitch offset with sensible defaults (auto-detects falsetto for pitches ≥ 52). Accepts optional `Partial<PerceptualParams>` overrides. Shared by `exerciseGenerator` and `LevelReadyView`.
- **VowelPlayer** — playback class that bridges `generatePartials` output to Web Audio oscillators. Accepts `PerceptualParams` (single or array), converts to `SynthParams` via `generateSynthParams`, builds `PeriodicWave` oscillators with gate gain ramps, and routes through a master `GainNode` to `ctx.destination`. Exposes `play()` (stops existing voices first), `addVoices()` (adds without stopping — supports `totalVoiceCount` for correct gain when staggering entries), `stop()`, and `setGain()` methods. `play` and `addVoices` share a private `startVoices` method internally.
- **intervals** — just intonation music theory utilities. `JUST_INTERVALS` maps interval names to semitone offsets derived from frequency ratios (e.g. major third = 5:4 ≈ 3.86 semitones). `CHORD_TYPES` maps chord names (`major`, `dominant`, `minor`, `diminished`, `half-diminished`, `augmented`, `suspended`, `minor-sixth`) to their constituent chord tones and intervals. `getMidiNote(noteString)` parses a note string like "C4" or "Bb3" to a MIDI number. `midiToString(midi)` converts back (rounds fractional values). `getMidiChord(rootNote, chordType, voicing)` takes a root note, chord type, and 4-character voicing string (chord tone numbers like "1513") and returns four fractional MIDI values in just intonation; octave wrapping occurs automatically when a tone number is ≤ the previous tone.
- **cents** — pure utility functions: `centsDistance(f1, f2)` returns signed cents between two frequencies; `midiToHz(midi)` converts (possibly fractional) MIDI note numbers to Hz.

Hooks live in `src/hooks/`:

- **useMedianBuffer** — rolling median filter with configurable window size. Exposes push/shift/clear methods and a reactive `value` (useState-backed).
- **useLastValue** — returns the most recent non-null value passed to it (ref-backed).

Exercise lifecycle lives in `src/exercise/`:

- **types** — `Part` (bass/bari/lead/tenor), `Exercise` (fully-specified config: reference tone, target note as MIDI number, chord voices, thresholds, star cutoffs), `ExercisePhase` discriminated union (`idle | match-root | adjust-chord | result`), and `ExerciseAction` union. Each phase variant carries only the data it needs (e.g. `adjust-chord` has `startedAt` for scoring, `result` has `stars` and `durationMs`). Note: `referenceTone.pitchOffset` is the MIDI note the user initially matches; `targetNote` is the nearby MIDI note they must adjust to for the chord.
- **exerciseReducer** — pure reducer driving phase transitions. `idle/result → START_EXERCISE → match-root → ROOT_MATCHED → adjust-chord → CHORD_LOCKED → result`. `RESET` returns to `idle` from any phase. `calculateStars` computes 1–3 stars from duration and configurable thresholds.
- **usePhaseTransitions** — hook that bridges real-time pitch to discrete reducer dispatches. Uses refs (no useState) to track a wall-clock sustain timer. During `match-root`, derives Hz from `referenceTone.pitchOffset` and dispatches `ROOT_MATCHED` when pitch stays within `matchThresholdCents` for `matchSustainMs`. During `adjust-chord`, derives Hz from `targetNote` and dispatches `CHORD_LOCKED` similarly with tighter thresholds. Resets tracking on phase change or pitch dropout.
- **exerciseGenerator** — `generateExercises(level, part)` converts a `LevelSpecification` and voice `Part` into an `Exercise[]`. Picks random root notes within the singer's vocal range, computes just-intonation chord notes via `getMidiChord`, resolves vowel formants, generates 3 chord voices (all except the user's part), and applies a random pitch offset to the reference tone. `PART_RANGES` defines MIDI ranges per voice part; `PART_INDEX` maps part name to 0–3 index.
- **ExerciseScreen** — orchestrator component for a single exercise attempt. Receives props from `ProgressScreen`: exercises, exercise index/count, results, and completion callback. Owns its own `useReducer(exerciseReducer)` for the real-time audio phases. Auto-starts on mount via a `useEffect` that dispatches `START_EXERCISE` (no idle/start-button screen — the "Start Level" gate lives in `ProgressScreen`). When the user clicks "Next" on a result, `onComplete` is called which bumps `exerciseIndex` in the parent; the resulting config change triggers auto-start of the next exercise. Wires `usePitchDetector`, `useVowelPlayer`, and `usePhaseTransitions`. Audio `useEffect` keyed on phase starts/stops voices: single reference tone in `match-root`, 3 chord voices in `adjust-chord`, silence in `idle`/`result`. Pitch detector starts on `match-root`, stays running through `adjust-chord` and `result`, stops on `idle`. Layout: phase-specific view centered in middle, `ExerciseDots` at bottom. `ProgressScreen` renders it with a `key` of `moduleIndex-levelIndex` so that switching levels via breadcrumb remounts the component, resetting the local exercise reducer to `idle`.
- **views/** — `MatchRootView` (target Hz, cents offset, pitch indicator), `AdjustChordView` (cents offset, pitch indicator, elapsed timer), `ResultView` (1–3 stars, duration, Retry/Next buttons), `PitchIndicator` (horizontal bar showing cents offset with green threshold zone), `ExerciseDots` (row of colored dots showing exercise progress: green=completed, blue=current, gray=future).

Progress state management lives in `src/progress/`:

- **types** — `ExerciseResult` (stars, durationMs), `LevelProgress` (exerciseIndex, exercises, results), `ProgressPhase` discriminated union (`module-select | level-ready | level-active | level-complete`), `ProgressState` (phase, modules, part, moduleScores), `ProgressAction` union.
- **progressReducer** — pure reducer for module/level navigation. `createInitialState(modules, part)` deep-copies each module's `levels` array and sorts them descending by `partwiseEaseOfTuning[PART_INDEX[part]]` (easiest levels first), then builds initial state with null scores. `SELECT_MODULE` accepts `moduleIndex` and optional `levelIndex` (defaults to 0), works from any phase (enables breadcrumb-driven level jumping), generates exercises via `generateExercises`, and transitions to `level-ready`. `START_LEVEL` promotes `level-ready` to `level-active`. `EXERCISE_COMPLETED` appends result and either bumps exerciseIndex or transitions to `level-complete` (computing sum of stars as level score, keeping the higher of old/new score). `NEXT_LEVEL` advances to next level (→ `level-ready`) or returns to `module-select` if module is complete. `BACK_TO_MODULES` returns to `module-select` from any phase. `SET_PART` changes voice part (only from `module-select`); fully resets state via `createInitialState` since exercises, scores, and level sort order are part-specific.
- **useProgressState** — hook that owns the `progressReducer`, persists the selected voice part to `localStorage` (key: `tuning-trainer:part`), and syncs browser history. Loads the part on initialization (falling back to `lead` if missing or invalid) and uses a `useEffect` on `state.part` to save changes. URL sync: uses hash-based routing for GitHub Pages SPA compatibility. Derives a hash from the current phase (`#/` for module-select, `#/module/:slug/level/:voicing` for any level phase) and calls `history.pushState` when it changes; URLs use the module's `slug` and level's voicing string (e.g. `#/module/major-triads/level/1513`) as stable identifiers. Sub-phase transitions within the same level don't push. Deep linking: on mount, parses `window.location.hash`, resolves the slug to a module index and voicing to a level index, and feeds a `SELECT_MODULE` through the reducer if the hash matches a valid module/voicing. Popstate: listens for browser back/forward and dispatches accordingly, using a ref flag to prevent the sync effect from pushing a duplicate entry. Returns `state` and named action handlers (`handleSelectModule`, `handleSelectLevel`, `handleStartLevel`, `handleExerciseComplete`, `handleBack`, `handleNextLevel`, `handleSetPart`).
- **ProgressScreen** — top-level presentational component. Consumes `useProgressState` for state and action handlers. On the `module-select` screen, renders a voice part `NativeSelect` dropdown (top-right) and `ModuleSelectView` below; the dropdown calls `handleSetPart` and only appears on this screen. For `level-ready`, renders a "Start Level" screen that initializes the `AudioContext` and dispatches `START_LEVEL`. For `level-active` and `level-complete` phases, renders a shared layout with `Breadcrumb` at top and either `ExerciseScreen` or `LevelCompleteView` as content. Communication with ExerciseScreen is callback-based: "Next" calls `onComplete(result)` which dispatches `EXERCISE_COMPLETED`.
- **views/LevelReadyView** — pre-exercise screen showing chord type, voicing, and the user's target tone. "Start Level" button begins the exercise. "Listen" button plays a chord preview using a fixed root (C3), staggering voices in ~500ms apart with the user's part entering last at slightly higher vocal effort; toggles to "Stop" during playback. Uses `getVowelPlayer()` ref getter to avoid the need-two-clicks issue on first audio context creation.
- **views/ModuleSelectView** — card list of modules with achieved/possible star count. Smart button labels: "Start" (fresh module), "Continue"/"Restart" (partially completed), "Restart" (all levels done). Clickable "N levels" text opens a Mantine `Modal` listing all levels with scores and "Play" buttons for direct level selection.
- **views/LevelCompleteView** — level results summary with per-exercise stars, average duration, Retry/Next Level buttons (or "Complete Module" button on the last level).
- **views/Breadcrumb** — navigation breadcrumb with clickable module name (back to module select) and a `Menu` dropdown on the current level name listing all levels with star scores for direct jumping.

Static module data lives in `src/modules/`:

- **types** — Zod schemas (`levelSpecificationSchema`, `moduleSpecificationSchema`, `modulesSchema`) and derived TypeScript types (`LevelSpecification`, `ModuleSpecification`). `ModuleSpecification` fields: name, slug (lowercase kebab-case, used in URLs), description, difficulty, levels. `LevelSpecification` fields: chord type, voicing, partwiseEaseOfTuning, optional vowel/offset/threshold overrides, repeats.
- **chords.json** — all module and level data as a JSON array, validated at runtime by the Zod schema.
- **index** — imports `chords.json`, validates it with `modulesSchema.parse()`, and exports `allModules: ModuleSpecification[]`.

`App.tsx` renders `ProgressScreen`.

## Testing

Tests live alongside source files as `*.test.ts`. Vitest is configured in `vite.config.ts` with the jsdom environment.
