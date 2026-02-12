# Photo Composition Analyzer

**MVP to validate whether browser-based computer vision can meaningfully analyze photo composition and give actionable feedback.** No server, no uploads to the cloud — everything runs locally in your browser.

## What this project is

A **local photo composition analyzer**: you upload a photo, and the app scores it against classic composition rules and suggests concrete “nudges” (e.g. pan left, tilt down, rotate a few degrees) to improve the shot.

- **Guidelines** — Rule of thirds, phi grid, golden spiral, leading lines, diagonals, symmetry, horizon placement
- **Scorecard** — Each rule gets a 0–100 score with a short reason
- **Coach** — Prioritized suggestions (pan/tilt/rotate) with estimated gain vs effort

All analysis runs in the browser using **OpenCV.js (WASM)**. Optional web worker keeps the UI responsive.

## What I’m trying to do

- **Check if the idea is even possible:** Can we get useful composition feedback from edge detection, line detection, and simple heuristics (subject position, horizon, vanishing point) without a heavy ML stack?
- **Keep it local:** Privacy-first; no images leave the device.
- **Actionable, not just scores:** Not only “rule of thirds: 42/100” but “pan left and tilt up – place the subject on the nearest third.”

So far the MVP implements: subject estimation, horizon detection, leading lines (vanishing point), rule of thirds & phi grid scoring, golden spiral fit, symmetry, and diagonal alignment. The coach turns that into ranked suggestions (e.g. “Place the subject on the nearest third”, “Tilt to bring the horizon to the upper third”).

## Tech stack

- **React 19** + **TypeScript** + **Vite**
- **OpenCV.js** (WASM) via `opencv-react` — grayscale, resize, Canny edges, line detection, etc.
- **Zustand** for optional UI state; analysis state is in React

## Run it

```bash
yarn install
yarn dev
```

Open the app, wait for OpenCV to load, then upload an image. Use the sidebar to see scores and coach suggestions; the canvas can show the image with analysis (and re-run analysis after pan/zoom/rotate if wired up).

## Status

**Experimental / proof-of-concept.** The goal was to see if this approach is viable before investing in a fuller product. Accuracy and suggestions are heuristic-based and may be rough; the MVP is about validating feasibility, not polish.
