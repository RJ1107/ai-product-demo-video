# Validation

Validated on Windows with Node.js 24, Python 3.12, Chromium and FFmpeg 7.1 on 13 October 2026. The helpers target Node.js 22+ and Python 3.10+.

## Real case

The original Sprout Waves walkthrough used a real local application, a genuine model request for theme discovery, user acceptance of the returned suggestion, and actual manual theme creation. English synthetic narration and measured sentence captions were composed into a 1080p MP4. Fictional entries, prepared historical dates and accelerated typing were disclosed. Business source files were unchanged.

The public excerpt shows theme discovery and acceptance from that recorded case. No client application source or credentials are included in this repository.

## Generalized helpers

- Initialized a fresh recording project and adapted it to the actual live coding board.
- Recorded real overview and card-detail interactions through `capture.mjs`.
- Exported a clearly labeled 8.33-second silent preview with two captions.
- Imported existing real narration clips and recomposed actual Sprout footage into a 25-second narrated video with four captions.
- Independently checked H.264 video, AAC audio and 1920×1080 resolution; both exports fully decoded without errors.
- Checked cue counts and caption bounds against the measured output timeline, and visually reviewed representative frames.

Three offline helper tests passed: refusing to overwrite an existing recording project, failing before a network request when speech configuration is incomplete without printing the supplied test key, and importing supplied audio with its matching plan sentence. Run `python scripts/check.py`; set `NODE_BINARY` if Node.js is not on PATH.

No new paid TTS request was made during this generalized-helper validation. The original example used OpenRouter speech; new users must configure their own currently available model, voice and credentials or supply audio. The template still requires application-specific actions and visual/audio review. Recorder boundary timing may need adjustment; captions are sentence-aligned rather than word-aligned.
