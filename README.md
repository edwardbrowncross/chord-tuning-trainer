# Chord Tuning Trainer

A web app for training barbershop quartet singers to tune chords by ear using real-time pitch detection and synthesised vowel sounds.

## **[Try it live](https://edwardbrowncross.github.io/chord-tuning-trainer/)**

## How it works

1. **Select a chord** — choose a chord type to practise (major triads, dominant sevenths, etc.).
2. **Match the reference tone** — the app plays a sung note and you match it with your voice.
3. **Tune the chord** — three other voices join, slightly off from where you're singing. Adjust your pitch to lock in a pure just-intonation chord.
4. **Get rated** — earn 1–3 stars based on how quickly you find the right tuning.
5. **Progress** — work through levels of increasing difficulty across different voicings, pitches, and vowels.

## Tech stack

- **React 19** + **TypeScript** + **Vite 7**
- **Mantine v8** — UI components
- **Framer Motion** — animations
- **pitchfinder** — Macleod algorithm for real-time pitch detection via Web Audio API
- **cantor-digitalis** — voice synthesiser for realistic sung vowel sounds
