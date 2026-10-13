# Recording contract

`plan.json` contains `baseUrl`, an optional `viewport`, accurate `disclosures`, and `scenes` with unique lowercase ASCII IDs, titles, minimum durations and English narration sentences. `storageState` optionally points to a local Playwright auth state file; keep it private.

In `record.mjs`, call `recordDemo(async ({page,context,plan,scene}) => {...})`. Perform each scene through `await scene('scene-id', async () => { ...real actions... })`. The wrapper records the actual browser, timestamps scene boundaries and saves end-state screenshots. Every planned scene must run exactly once. The video is finalized by awaiting context closure, following [Playwright's recording documentation](https://playwright.dev/docs/videos).

Use assertions on actual application results. Prefer role/label locators, wait for saved-state indicators and responses, and avoid assuming that a model returns a predetermined label or order. If model output varies, revise the narration to describe the recorded result. Prepare only the fictional data required for the demonstration. Do not hide a mocked backend behind claims of a real model call.

Prepare authentication before the scenes when appropriate, but keep password entry outside the published cuts. Do not record secret settings screens. A recording can be scripted and edited while still being genuine product footage; disclose accelerated typing or prepared historical dates.

The baseline composer uses a continuous raw capture with timestamped scene cuts. Recorder initialization can add small boundary jitter; inspect cuts and adjust timestamps in `build/recording.json` when needed. Captions are aligned to the measured per-sentence narration audio, not to guessed reading speed. The composer preserves the interaction duration and holds the final frame if narration lasts longer. For a different pace or a split-screen design, adapt the recording project while preserving truthful footage and measured audio timing.

The bundled speech helper uses [OpenRouter's speech endpoint](https://openrouter.ai/docs/guides/overview/multimodal/tts). Configure an available model/voice rather than assuming all chat models support speech. Existing or externally generated audio can be imported with `--audio-dir` using names `SCENE-ID-0.wav` or `.mp3`, one clip per sentence. Listen to clips and ensure their words match the plan before import.
