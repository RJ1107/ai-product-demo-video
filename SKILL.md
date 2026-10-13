---
name: real-demo-video
description: Create a client-ready 1080p demo from real application interactions, with browser automation, English narration, timed captions and repeatable scripts. Use for product walkthroughs, not synthetic interface videos.
---

# Real Demo Video

Produce a walkthrough of the working product, not an invented interface. Use generative AI for scripting, narration and editing decisions while the product footage comes from real recorded interactions.

## Establish what is real

Inspect the project instructions, startup commands and actual feature implementation. Run the application and verify the intended path before writing the final story. Do not infer functionality from old screenshots or marketing language. If a promised feature is absent, report that and demonstrate the implemented behavior.

Use isolated, fictional data and disclose prepared history or accelerated footage. If the demonstrated feature calls a model, use its actual configured backend. Missing credentials are a real blocker to demonstrating that feature; do not replace its response with an invented model result. Preparing sample data is separate from changing business rules.

## Prepare a reusable recording project

Use Node.js 22+, Python 3.10+, Playwright and an FFmpeg build with H.264, AAC and the `subtitles` filter. Use available tools first. If a dependency is missing, install it within the user's authorized environment or explain the limitation.

From this skill directory:

```text
node scripts/init.mjs --out "/path/to/project/demo-video"
```

The output contains `plan.json`, `record.mjs`, `capture.mjs`, `speech.mjs`, `compose.py`, `preview.py`, `.env.example` and a pinned Playwright dependency. In that recording project, install the dependency and browser when needed:

```text
npm install
npx playwright install chromium
```

Write a concise English story in `plan.json`: one scene per useful outcome and short sentences suitable for speech. Adapt `record.mjs` to the actual application. Use stable role/label locators and assertions that verify the intended result. Click through `pointer.click(locator)` so the recording shows a pointer travelling to each target; browser video does not include the system cursor. The template deliberately contains no fabricated working feature. Read [the recording contract](references/recording.md) before adapting it.

## Voice, record and compose

Narration is one audio clip per sentence, from one of three sources. Pick with the user when it costs money or affects quality:

- **Configured speech service.** After the user fills `.env` from `.env.example`, `node speech.mjs` calls the bundled OpenRouter helper. This is the natural-sounding option and a paid request on the user's account. The helper never prints credentials. Do not look for or reuse a key the user has not configured for this recording.
- **System voice.** `node speech.mjs --system-voice [NAME]` uses the voices that ship with Windows, macOS or Linux (`espeak-ng`). Free and offline, but more mechanical. Use it for drafts, or as the final only when the user accepts it; name the voice in the disclosure.
- **Supplied clips.** `node speech.mjs --audio-dir /path/to/clips` imports files named `SCENE-ID-0.mp3`, `SCENE-ID-1.wav`, etc.

Do not claim narration was generated when only text or silence was produced, and do not describe how a voice sounds unless someone has listened to it.

```text
node speech.mjs
node record.mjs
python compose.py --project .
python preview.py --project . --start 9 --duration 12
```

The helper records a real browser video, then aligns sentence captions to measured audio durations and assembles the scenes into a 1920×1080 H.264/AAC MP4. By default the footage is framed at 1600×900 with the scene title above and captions below, so neither covers the product; set `"layout": "full"` in `plan.json` for edge-to-edge footage. Longer interactions remain visible; shorter footage holds its final frame while narration finishes. This is sentence-level synchronization, not word-level forced alignment. `preview.py` exports a short silent animated WebP or GIF for a README or chat message.

FFmpeg is found from `--ffmpeg`, `DEMO_FFMPEG`, PATH or the `imageio-ffmpeg` package. For an installed browser outside Playwright's cache, set `CHROMIUM_EXECUTABLE`; recording also needs Playwright's own video encoder (`npx playwright install ffmpeg`). Read [the recording contract](references/recording.md) for every option.

If no narration route is available, create a silent **preview** only with `python compose.py --project . --silent-preview`. Clearly label it as a preview; keep the requested narrated final deliverable outstanding.

## Review and deliver

Check the encoded resolution, audio, subtitle readability, visual timing and application results. Watch representative sections and inspect frames, especially model results and transitions. Verify narration matches the recorded product, not the planned story when the actual result differs. Read [the review checklist](references/review.md) for recording-specific checks.

Deliver the MP4, SRT, plain English narration and reusable recording project, excluding `.env`, credentials, account databases, private logs, dependency caches and unnecessary source code. Include a short disclosure of sample data, synthetic voice and any footage speed changes. Keep business code unchanged unless the user authorizes a local demo aid; document any such changes.

The skill is usable by any agent with file/shell access and browser automation. Native skill discovery is optional: the user may ask the agent to read this `SKILL.md`. Browser-only helpers do not record native desktop applications; choose a genuine screen recorder for a desktop app rather than claiming this template supports it.
