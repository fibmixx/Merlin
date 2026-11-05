# Merlin

A flashcard grimoire for learning Korean vocabulary. Use it **in your browser** (phone or computer, no install) or as a standalone **Windows desktop app** built with Python and Tkinter.

### ▶ [Open Merlin in your browser](https://fibmixx.github.io/Merlin/)

<p align="center">
  <img src="https://i.imgur.com/ZR80WBG.png" alt="Merlin App Preview" width="600">
</p>

---

## Web app

The web version lives in [`web/`](web) and is served by GitHub Pages straight from the `main` branch (the root `index.html` just redirects to `web/`), so every push updates it.

- **Smart review (spaced repetition):** grade each card with *Knew it* / *Didn't know*. Known words come back after 1, 3, 7, 14 and 30 days; missed words come back a few cards later.
- **Three ways to practice:** flip cards, type the answer, and Korean → meaning, meaning → Korean or mixed.
- **Pronunciation:** 🔊 reads Korean words aloud (uses your device's Korean voice), plus an approximate romanization under each word.
- **Grimoire:** create, rename and delete sets; add, edit and search words; paste many `word - meaning` lines at once.
- **Starter decks:** greetings, Sino-Korean and native numbers, everyday words.
- **Progress:** daily streak, words reviewed today, mastery per set and your trickiest words.
- **Works offline / installable:** add it to your phone's home screen like an app.
- **Same format as the desktop app:** export/import `vocabulary.json` to move your decks between the web and desktop versions.

Your words are stored in the browser (localStorage). Use *Export vocabulary.json* to back them up.

Keyboard: `Space` show answer · `1` didn't know · `2`/`Enter` knew it · `P` pronounce.

To run it locally: `python -m http.server -d web` and open http://localhost:8000.

---

## Desktop app (Windows)

You don't need Python installed to run the application on Windows.

1. Head over to the **[Latest Release](https://github.com/fibmixx/Merlin/releases/latest)**.
2. Download and extract the Windows `.zip`.
3. Keep `MerlinAPP.exe`, `MerlinAPP.png`, and `vocabulary.json` in the same directory.
4. Run `MerlinAPP.exe`.

> **Note on Windows SmartScreen:** Because this is an unsigned community build, Windows may show a protective prompt on first launch. Click **"More info"** $\rightarrow$ **"Run anyway"** to launch.

---

## Features

- **Multiple Sets / Decks:** Create distinct sets for different topics or languages, or select **All** to practice your full library in one go.
- **Interactive Flashcards:** Practice mode with card-flipping to test and reveal answers.
- **Keyboard Shortcuts:**
  - `Space` $\rightarrow$ Flip flashcard / Reveal answer.
  - `Enter` $\rightarrow$ Next card.
- **Merlin the Guide:** Real-time feedback and messages guiding you through actions.
- **Local Persistence:** All decks and terms are automatically stored locally in `vocabulary.json`.

---

## Releasing a new desktop version

The workflow in `.github/workflows/release.yml` builds `MerlinAPP.exe` with PyInstaller on GitHub's Windows runners and attaches `Merlin-windows.zip` to a release. Just push a tag:

```bash
git tag v1.1.0
git push origin v1.1.0
```
