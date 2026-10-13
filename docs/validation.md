# Validation

Two rounds, both on Windows on 13 October 2026. The helpers target Node.js 22+ and Python 3.10+. macOS and Linux have not been run, including the `say` and `espeak-ng` branches of the system-voice option.

## Round 2: full run from Claude Code

Node.js 24, Python 3.13, Chromium 153 driven by Playwright 1.62.1, FFmpeg 7.1.

A Claude Code session read `SKILL.md` and produced the walkthrough at the top of the README, of a running local app (AI Coding Kanban):

- Initialized a fresh recording project with `init.mjs` and wrote four scenes with seven narration sentences.
- `speech.mjs --system-voice "Microsoft Zira Desktop"` produced seven WAV clips offline, with no credentials configured.
- `record.mjs` recorded at 1360×765 with the on-page pointer. Board changes in the footage were real commands run against the app during capture, and the script asserted on results: cards in their new columns, and clipboard contents after the copy button was clicked. No page errors were recorded.
- `compose.py` exported 41.9 s of 1920×1080 H.264 with AAC audio in the framed layout and wrote seven SRT cues. The file decodes end to end without errors.
- `preview.py` exported the animated WebP in the README (0.6 MB for 13 s at 960 px), and it was rendered in Chromium to confirm it plays.
- `compose.py --silent-preview` exported a labeled 36.9 s preview from the same recording.
- Contact sheets and full-size frames were reviewed for each scene: titles and captions sit outside the footage, the pointer is visible including above a modal dialog, and narration matches what is on screen.

The narration was then regenerated through the configured speech route: `speech.mjs` with ElevenLabs Multilingual v2, voice Brian, on OpenRouter produced seven MP3 clips (about 490 characters in total), and `compose.py` rebuilt the video from the same recording. The published walkthrough is that version: 38.2 s, seven cues, decoding without errors. The system-voice export described above was the first pass and is no longer published.

What this round did not establish: the assistant cannot hear. Loudness was measured (mean −26.0 dB, peak −4.5 dB for the published version) and each clip was generated from its caption sentence, but pronunciation and pacing rest on the owner's review.

Problems found by running the skill as written, all addressed in this version:

- The scene title was drawn over the app's own header. The default layout now frames the footage; `"layout": "full"` restores the previous look.
- Recordings had no cursor, so clicks appeared from nowhere. `capture.mjs` now draws a pointer and offers `pointer.click` and `pointer.move`.
- FFmpeg was installed but not on PATH. `compose.py` now also checks `DEMO_FFMPEG` and the `imageio-ffmpeg` package.
- `CHROMIUM_EXECUTABLE` alone was not enough to record: Playwright also needs its own video encoder. This is now documented.
- There was no way to narrate without a paid key or pre-made clips. `--system-voice` was added.

## Round 1: the original client case, with Codex

Node.js 24, Python 3.12, Chromium, FFmpeg 7.1.

The Sprout Waves walkthrough used a real local application, a genuine model request for theme discovery, user acceptance of the returned suggestion, and actual manual theme creation. English synthetic narration from OpenRouter's speech endpoint and measured sentence captions were composed into a 1080p MP4. Fictional entries, prepared historical dates and accelerated typing were disclosed. Business source files were unchanged. The public excerpt shows theme discovery and acceptance from that case; no client application source or credentials are included.

The generalized helpers were then checked by recording a second app, exporting a silent preview, importing the existing narration clips and recomposing the Sprout footage into a 25-second narrated video, and independently confirming H.264, AAC and 1920×1080.

## Offline tests

`python scripts/check.py` runs five tests; set `NODE_BINARY` if Node.js is not on PATH:

- Refusing to overwrite an existing recording project.
- Failing before any network request when speech configuration is incomplete, without printing the supplied test key.
- Importing supplied audio against its matching plan sentence.
- Narrating with the system voice, offline and with no credentials (Windows and macOS only; skipped elsewhere).
- Shipping `preview.py` with a new project and refusing an output format other than WebP or GIF.

The tests do not need FFmpeg or a browser, so they do not cover recording, composing or preview encoding; those were exercised by the runs above.

## Limits that remain

The template still requires application-specific actions and a human review of picture and sound. Recorder boundary timing may need adjustment. Captions are sentence-aligned rather than word-aligned. New users must configure their own currently available speech model, voice and credentials, use a system voice, or supply audio.
