# State Machine Studio — Design Document

This file summarizes `smstudio.docx` at the repository root.

## Vision

A WebGME application demonstrating:

- Langium DSL for state machines
- Monaco editor visualizer with Langium LSP in a Web Worker
- Sprotty + ELK read-only diagrams derived from the model
- Domain-aware semantic merge with WebGME branching and 3-way diff

## Key references

- Full design: `smstudio.docx` or `smstudio-extracted.txt`
- Meta-model: `src/common/meta-model.js`
- Langium grammar: `src/common/language/state-machine.langium`
- Example DSL: `examples/turnstile.sm`

## Project layout

Matches design doc section 8 with additions:

- `studio-ui/` — React/Next.js front-end (replaces stock WebGME UI)
- `src/routers/StudioAssets/` — serves `build/` artifacts
- `scripts/build-seed.js` — seed export helper
