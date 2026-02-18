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

Exercise lifecycle lives in `src/exercise/`:

- **state/types** — `ExerciseResult` (stars, durationMs, meanOffsetCents), `Exercise` (fully-specified config: reference tone, target note as MIDI number, chord voices, thresholds, star cutoffs), `ExercisePhase` discriminated union (`idle | match-root | adjust-chord | result`), and `ExerciseAction` union. Each phase variant carries only the data it needs (e.g. `adjust-chord` has `startedAt` for scoring, `result` has `stars`, `durationMs`, and `meanOffsetCents`). Note: `referenceTone.pitchOffset` is the MIDI note the user initially matches; `targetNote` is the nearby MIDI note they must adjust to for the chord.
- **ExerciseScreen** — thin rendering component for a single exercise attempt. Receives props from `LevelScreen`: exercises, exercise index/count, results, and completion callback. Delegates all state management and side effects to `useExerciseState`. Renders phase-specific views (MatchRootView, AdjustChordView, ResultView) centered in a Stack. `LevelScreen` renders it when the level phase is `active`.
- **state/useExerciseState** — main entry-point hook for the exercise domain. Owns `useReducer(exerciseReducer)`, calls `usePhaseTransitions` internally, and manages all side effects: audio playback (reference tone in `match-root`, chord voices in `adjust-chord`, silence otherwise), pitch detector lifecycle (start on `match-root`, stop on `idle`), auto-start on mount/config change, and reporting results to the parent via `onChordMatched`. Returns `{ phase, pitch, sustainProgress, handleRetry, handleNext }`.
- **state/exerciseReducer** — pure reducer driving phase transitions. `idle/result → START_EXERCISE → match-root → ROOT_MATCHED → adjust-chord → CHORD_LOCKED → result`. `RESET` returns to `idle` from any phase. `calculateStars` computes 1–3 stars from duration and configurable thresholds.
- **state/usePhaseTransitions** — hook that bridges real-time pitch to discrete reducer dispatches. Uses refs (no useState) to track a wall-clock sustain timer. During `match-root`, derives Hz from `referenceTone.pitchOffset` and dispatches `ROOT_MATCHED` when pitch stays within `matchThresholdCents` for `matchSustainMs`. During `adjust-chord`, derives Hz from `targetNote` and dispatches `CHORD_LOCKED` similarly with tighter thresholds; also accumulates signed cents offsets for in-range measurements and computes the mean, passing `meanOffsetCents` in the `CHORD_LOCKED` action. Resets tracking on phase change or pitch dropout.
- **state/exerciseGenerator** — `generateExercises(level, part)` converts a `LevelSpecification` and voice `Part` into an `Exercise[]`. Picks random root notes within the singer's vocal range, computes just-intonation chord notes via `getMidiChord`, resolves vowel formants, generates 3 chord voices (all except the user's part), and applies a random pitch offset to the reference tone. `PART_RANGES` defines MIDI ranges per voice part; `PART_INDEX` maps part name to 0–3 index.
- **views/** — `MatchRootView` (target Hz, cents offset, pitch indicator), `AdjustChordView` (cents offset, pitch indicator, elapsed timer), `ResultView` (1–3 stars, duration, Retry/Next buttons).
- **components/** — `PitchIndicator` (horizontal bar showing cents offset with green threshold zone), `CircleIndicator` (circular pitch visualization).

Level lifecycle lives in `src/level/`:

- **state/types** — `LevelPhase` (`ready | active | complete`), `LevelState` (phase, exercises, exerciseIndex, results), `LevelAction` union (`START | EXERCISE_COMPLETED | RETRY`).
- **state/levelReducer** — pure reducer for level-internal state. `createLevelState(levelSpec, part)` generates exercises and returns initial `ready` state. `START` promotes `ready` to `active`. `EXERCISE_COMPLETED` appends result and either bumps exerciseIndex or transitions to `complete`. `RETRY` resets to `ready` with new exercises.
- **state/useLevelState** — hook that owns `useReducer(levelReducer)`, manages `currentResult` state for ExerciseDots feedback, calls `onLevelComplete(results)` when phase transitions to `complete`, and exposes `handleStart` (initializes AudioContext then dispatches START), `handleExerciseComplete`, `handleRetry`, and `dotsResults`.
- **LevelScreen** — component that takes `levelSpec`, `part`, and navigation callbacks as props. Calls `useLevelState` and renders phase-specific views: `LevelReadyView` (ready), `ExerciseScreen` + `ExerciseDots` (active), `LevelCompleteView` (complete). Navigation callbacks (`onNextLevel`, `onQuit`) are passed through to `LevelCompleteView` for the parent to handle.
- **views/LevelReadyView** — pre-exercise screen showing chord type, voicing, and the user's target tone. "Start Level" button begins the exercise. "Listen" button plays a chord preview using a fixed root (C3), staggering voices in ~500ms apart with the user's part entering last at slightly higher vocal effort; toggles to "Stop" during playback. Uses `getVowelPlayer()` ref getter to avoid the need-two-clicks issue on first audio context creation.
- **views/LevelCompleteView** — level results summary with per-exercise stars, duration, and tuning offset (sharp/flat), plus overall average duration and tuning bias. Retry/Next Level buttons (or "Complete Module" button on the last level).
- **components/ExerciseDots** — row of colored dots showing exercise progress: green=completed, blue=current, gray=future.

Module navigation lives in `src/module/`:

- **state/types** — `ModulePhase` discriminated union (`module-select | module-active`), `ModuleState` (phase, modules, `part: Part | null`, moduleScores), `ModuleAction` union (`SELECT_MODULE | LEVEL_COMPLETED | NEXT_LEVEL | BACK_TO_MODULES | SET_PART`).
- **state/scoreStorage** — localStorage persistence for scores, keyed by `tuning-trainer:scores`. Storage format is `Record<Part, Record<slug, Record<voicing, number>>>` — only non-null scores are stored, making it resilient to modules/levels being added, removed, or reordered. `loadScores(part, modules)` reads localStorage and maps slug/voicing lookups back to positional `(number | null)[][]` arrays matching the provided module/level order. `saveScores(part, modules, scores)` converts positional arrays to slug/voicing-keyed objects, merges into existing stored data (preserving other parts), and writes to localStorage.
- **state/moduleReducer** — pure reducer for module/level navigation. `sortModules(modules, part)` is an exported helper that sorts each module's `levels` descending by `partwiseEaseOfTuning[PART_INDEX[part]]` (easiest first) when part is non-null, otherwise copies without sorting. `createInitialState(modules, part, scores?)` accepts `Part | null` and optional pre-loaded scores array; calls `sortModules` internally and defaults to all-null scores if none provided. `SELECT_MODULE` accepts `moduleIndex` and optional `levelIndex` (defaults to 0), works from any phase (enables breadcrumb-driven level jumping), and transitions to `module-active`. `LEVEL_COMPLETED` updates moduleScores (computing sum of stars as level score, keeping the higher of old/new score). `NEXT_LEVEL` advances levelIndex within `module-active` or returns to `module-select` if module is complete. `BACK_TO_MODULES` returns to `module-select` from any phase. `SET_PART` changes voice part (only from `module-select`); accepts a `scores` field and passes it to `createInitialState`.
- **state/useModuleState** — hook that owns `useReducer(moduleReducer)`, handles deep linking from URL hash on initialization, and exposes named action handlers (`handleSelectModule`, `handleSelectLevel`, `handleLevelCompleted`, `handleNextLevel`, `handleBack`, `handleSetPart`). `loadPart()` reads from localStorage and returns `null` if no valid part is stored (no default fallback). Loads scores from localStorage on initialization (via `initState`) and on part change (via `handleSetPart`), using `sortModules` to ensure positional alignment. A `useEffect` saves scores to localStorage whenever `moduleScores` changes.
- **state/useNavigation** — bridge hook that syncs module state with browser URL and localStorage. Persists `state.part` to localStorage only when non-null. Uses hash-based routing for GitHub Pages SPA compatibility. Derives a hash from `state.phase` (`#/` for module-select, `#/module/:slug/level/:voicing` for module-active) and calls `history.pushState` when it changes. Listens for `popstate` events and dispatches `SELECT_MODULE` or `BACK_TO_MODULES`, using an `isPopstateRef` flag to prevent the sync effect from pushing a duplicate entry.
- **ModuleScreen** — top-level presentational component. Calls `useModuleState()` and `useNavigation(state, handlers)`. When `state.part` is null (no localStorage value), renders a non-dismissible Mantine `Modal` prompting the user to select their voice part; selecting a part dispatches `SET_PART` and the modal closes. On `module-select`, renders a voice part `NativeSelect` dropdown and `ModuleSelectView`. On `module-active`, renders `Breadcrumb` and `LevelScreen` (keyed by `${moduleIndex}-${levelIndex}` so switching levels remounts the component).
- **views/ModuleSelectView** — card list of modules with achieved/possible star count. Smart button labels: "Start" (fresh module), "Continue"/"Restart" (partially completed), "Restart" (all levels done). Clickable "N levels" text opens a Mantine `Modal` listing all levels with scores and "Play" buttons for direct level selection.
- **components/Breadcrumb** — navigation breadcrumb with clickable module name (back to module select) and a `Menu` dropdown on the current level name listing all levels with star scores for direct jumping.

Static module data lives in `src/data/`:

- **types** — Zod schemas (`levelSpecificationSchema`, `moduleSpecificationSchema`, `modulesSchema`) and derived TypeScript types (`LevelSpecification`, `ModuleSpecification`). `ModuleSpecification` fields: name, slug (lowercase kebab-case, used in URLs), description, difficulty, levels. `LevelSpecification` fields: chord type, voicing, partwiseEaseOfTuning, optional vowel/offset/threshold overrides, repeats.
- **chords.json** — all module and level data as a JSON array, validated at runtime by the Zod schema.
- **index** — imports `chords.json`, validates it with `modulesSchema.parse()`, and exports `allModules: ModuleSpecification[]`.

Shared types live in `src/types.ts`:

- **Part** — `'bass' | 'bari' | 'lead' | 'tenor'` voice part union, used across exercise, level, and module layers.

`main.tsx` renders `ModuleScreen` directly (wrapped in `MantineProvider` and `AudioProvider`).

## Testing

Tests live alongside source files as `*.test.ts`. Vitest is configured in `vite.config.ts` with the jsdom environment.
