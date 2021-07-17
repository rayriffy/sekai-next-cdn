sekai-next-cdn
===

Music and video content delivery generation with heavy caching strategy for [セカイ Wiki](https://sekai.rayriffy.com)

What does it do?
---

It will do folloing operations

1. Get previous built caches (prevent original CDN to overload)
2. Download missing assets
3. For those missing assets. Full version audio, and music video will get first ~9 seconds of silent trimmed out by [WebAssembly version of FFMPEG](https://github.com/ffmpegwasm/ffmpeg.wasm)
4. Deploy as new revision
5. Store everything back to cache
