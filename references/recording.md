# Recording contract

`plan.json` contains `baseUrl`, an optional `viewport`, accurate `disclosures`, and `scenes` with unique lowercase ASCII IDs, titles, minimum durations and English narration sentences. `storageState` optionally points to a local Playwright auth state file; keep it private.

Optional `plan.json` settings:

| Key | Default | Effect |
| --- | --- | --- |
| `viewport` | 1920×1080 | Browser size while recording. Dense interfaces read better recorded smaller, for example 1360×765, and scaled up |
| `layout` | `"framed"` | `"framed"` places the footage at 1600×900 with the scene title above and captions below, so neither covers the product. `"full"` keeps the footage edge to edge and draws both on top |
| `background` | `"0B0D12"` | Six-digit hex colour around framed footage |
| `pointer` | `true` | Draws a pointer in the page, because browser recordings do not include the system cursor. Set `false` to omit it |

In `record.mjs`, call `recordDemo(async ({page,context,plan,scene,pointer}) => {...})`. Perform each scene through `await scene('scene-id', async () => { ...real actions... })`. The wrapper records the actual browser, timestamps scene boundaries and saves end-state screenshots. Every planned scene must run exactly once. The video is finalized by awaiting context closure, following [Playwright's recording documentation](https://playwright.dev/docs/videos).

`pointer.move(target)` and `pointer.click(target)` take a locator or selector, glide the pointer to the element's centre at a readable speed, and then act. They are real mouse events, not an animation added afterwards. Plain `locator.click()` still works but the pointer jumps. The pointer stays above modal dialogs. Actions that do not come from the mouse, such as a command-line update the page reacts to, need no pointer.

Use assertions on actual application results. Prefer role/label locators, wait for saved-state indicators and responses, and avoid assuming that a model returns a predetermined label or order. If model output varies, revise the narration to describe the recorded result. Prepare only the fictional data required for the demonstration. Do not hide a mocked backend behind claims of a real model call.

Prepare authentication before the scenes when appropriate, but keep password entry outside the published cuts. Do not record secret settings screens. A recording can be scripted and edited while still being genuine product footage; disclose accelerated typing or prepared historical dates.

The baseline composer uses a continuous raw capture with timestamped scene cuts. Recorder initialization can add small boundary jitter; inspect cuts and adjust timestamps in `build/recording.json` when needed. Captions are aligned to the measured per-sentence narration audio, not to guessed reading speed. The composer preserves the interaction duration and holds the final frame if narration lasts longer. For a different pace or a split-screen design, adapt the recording project while preserving truthful footage and measured audio timing.

## Narration sources

One clip per sentence, from any of three sources:

- `node speech.mjs` calls the configured speech endpoint. The default is [OpenRouter's speech endpoint](https://openrouter.ai/docs/guides/overview/multimodal/tts). Configure an available model and voice rather than assuming all chat models support speech. This is a paid request on the user's account.
- `node speech.mjs --system-voice [NAME]` uses the operating system's own voices: installed SAPI voices on Windows, `say` on macOS, `espeak-ng` on Linux. It is free and offline. These voices sound more mechanical than a neural voice, so treat the result as a draft unless the user accepts it, and say which voice was used.
- `node speech.mjs --audio-dir DIRECTORY` imports existing clips named `SCENE-ID-0.wav`, `.mp3`, `.m4a`, `.ogg` or `.aiff`. Listen to clips and ensure their words match the plan before import.

## Tools outside PATH

- FFmpeg: `compose.py` and `preview.py` look at `--ffmpeg`, then `DEMO_FFMPEG`, then PATH, then the binary shipped with the optional `imageio-ffmpeg` Python package.
- Browser: set `CHROMIUM_EXECUTABLE` to reuse an installed Chromium. Playwright still needs its own small video encoder to record; if recording fails with a missing `ffmpeg` message, run `npx playwright install ffmpeg` or point `PLAYWRIGHT_BROWSERS_PATH` at a cache that has it.

## Short previews

`python preview.py --project . --start 9 --duration 12` writes `exports/preview.webp`, a silent looping excerpt of the composed demo. Use `--input` for another video and an `--out` name ending in `.gif` for a GIF. Animated WebP is far smaller for interface footage and plays in GitHub READMEs. Neither format carries sound, so link the MP4 beside it.
