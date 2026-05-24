# Performance Strategy

## Observations

### Data acquisition
- `python/scripts/data_download.py:379-390` writes each session with full fidelity and pretty printing. Every JSON therefore carries the entire `shots` payload plus `absolute_pitch`, `absolute_roll`, `extras`, and comments. The current dataset holds 33 files under `data/sessions` totaling roughly 258 MB, and each shot stores 1.6 k–4.4 k samples per axis.
- Because the files are only trimmed by the downloader, the browser must parse the exact same payloads, and we have no compact manifest to support incremental loading.

### Visualizer loading and state
- `visualizer/src/dataLoader.ts:19-83` enumerates every JSON, parses it, preprocesses every shot immediately, and stores both the raw session plus the processed copy. The processed shot includes the original `pitch`/`yaw` arrays (see `visualizer/src/shotProcessor.ts:516-575`), so each shot is effectively duplicated in memory.
- `visualizer/src/store.ts:18-34` uses deep reactivity, meaning Vue proxies every numeric sample. With ~500 k floats, simple state changes require touching hundreds of thousands of proxies.
- Components such as `SessionView` (`visualizer/src/components/SessionView.ts:15-37`) and `ShotDetailView` (`visualizer/src/components/ShotDetailView.ts:41-66`) pull `session.shots` directly, so heavy arrays stay attached to the reactive graph and keep the UI thread busy.

### Rendering
- `visualizer/src/components/TraceVisualizerBase.ts:42-90` rebuilds the d3 scene whenever `shots` changes and `updatePaths` iterates over every point on every animation tick. The slider therefore drives O(total_points) DOM writes each frame.
- `visualizer/src/components/SessionViewer.ts:70-167` recreates d3 selections whenever the user scrubs the slider. Playing long sessions means repeatedly rebuilding SVG paths instead of incrementally drawing points, which causes visible stalls.

## Improvement plan

1. **Raw JSON first, smarter streaming**  
   Keep the browser workflow centered around the API-exported JSON files so users can drop exactly what the downloader produced. Instead of offline packing, stage the loader to discover all files quickly, parse every payload, and keep the dashboard hidden until the metric aggregate for the entire batch is available. This avoids the “jumping” cabinet of rows and lets the table appear with all sessions together; a prominent spinner or banner can surface while the work runs so people know processing is still happening.

2. **Loader feedback + durable caches**  
   Replace the current “parse everything eagerly” approach with a concurrent workflow that reads files in batches, uses the worker for shot preprocessing, and keeps heavy arrays inside `Map` caches marked with `markRaw` so Vue only reacts when each session becomes ready. While the loader runs, surface a banner/status widget that reports “N/M sessions processed – aggregations updating in background” so users know work is ongoing, but hold the dashboard rows behind the indicator until all available sessions are ready and presented together.

3. **Worker-based processing**  
   All JSON continues to be loaded directly in the browser, but the costly transforms (`preprocessShot`, `aggregateFields`, `computeSessionMetrics`) run inside a dedicated Web Worker. Each session payload is streamed to the worker via `structuredClone` (transferable typed arrays where possible), the worker emits aggregates and processed shots, and the dashboard updates immediately upon receipt. This keeps the main thread responsive without asking users to run offline preprocessing.

4. **Storage + reactivity control**  
   Once `store.sessions[pk]` is copied, drop its `shots` array. The processed shot already carries `pitch` and `yaw`, so we retain all data without keeping two copies. Convert those arrays to `Float32Array` instances and stash them inside `markRaw`/`shallowRef` caches (e.g., `Map<number, ShotBuffer>`). Expose tiny reactive descriptors (`{ pk, status, metrics }`) for the dashboard while keeping the bulk data outside Vue’s proxy layer. Components that need the heavy arrays request them through helper hooks so only targeted consumers ever touch the raw buffers.

5. **Rendering pipeline**  
   Switch `TraceVisualizerBase` to a `<canvas>` renderer that draws one shot at a time through `requestAnimationFrame`. Precompute screen-space coordinates into typed arrays and reuse the same drawing routine for every shot. For a “play all shots” feature, maintain a playback scheduler that feeds one shot at a time to the renderer, clearing the canvas between shots so per-frame work stays bounded. Consider WebGL instancing when dozens of shots must be visible at once.

6. **Diagnostics-first workflow**  
   Enrich the loader queue (both main thread and worker) with the performance probes from `perfMetrics`. Log per-session durations so we can see if file I/O, parsing, or aggregate math dominates wall time. CI can later assert that typical datasets process under a budget without introducing a separate packing step.

## Instrumentation

- `visualizer/src/perfMetrics.ts` exposes a shared profiler store plus helpers (`recordPerf`, `measureAsync`, `usePerfMetrics`). It keeps the latest 200 samples and aggregates totals, min, and max per label. Tests live in `visualizer/tests/unit/perfMetrics.spec.ts`.
- `visualizer/src/dataLoader.ts` records loader timings via `loader:enumerate`, `loader:fileRead`, `loader:parse`, `loader:preprocess`, `loader:aggregate`, `loader:photos`, and `loader:total`. Each sample includes the session id and supporting metadata such as byte size or shot count.
- To inspect data while the dev server runs:
  ```ts
  import { usePerfMetrics } from '@/perfMetrics';
  const perf = usePerfMetrics();
  console.table(perf.summary);   // aggregated timings
  console.table(perf.events);    // most recent samples
  ```
- The recorded spans let us spot whether disk I/O, JSON parsing, preprocessing, or aggregation dominates wall time for a given dataset.

## Smooth multi-shot playback

1. Introduce a `ShotPlaybackStore` that owns the active shot id, progress, playback speed, and cached coordinate buffers. Components would bind to this store rather than pushing whole shot arrays down into every viewer.
2. Convert the visualizer to draw via `<canvas>` (or `OffscreenCanvas`) instead of SVG, reusing precomputed buffers. `requestAnimationFrame` can advance along each buffer, drawing a handful of points per frame, which ensures steady progress even with 4 k samples per shot.
3. Implement a sequencer that iterates across shots: reset the buffer cursor, render shot N, then continue with shot N+1. This produces the requested “play all shots point by point” behavior without keeping thousands of DOM nodes alive.
4. Keep heavyweight analytics (ellipse fit, drift detection) inside the preprocessing worker so the playback renderer itself only consumes ready-to-plot coordinates.

Aligning data packing, staged loading, worker-based preprocessing, and canvas playback will eliminate the current stalls while keeping every data point accessible for analysis.

### Next steps
- Investigate persisting the processed caches (`sessionData`) in IndexedDB so even a full reload can hydrate sessions without rerunning the worker. Store per-session blobs keyed by pk and clear them only when the folder handle changes.
- Monitor `perfMetrics` output for `loader:*` spans; if parsing or worker tasks dominate even after streaming, consider bundling compressed typed arrays (Float32Sequence) alongside the JSON manifest to accelerate cloning and reduce GC pressure.
- If dashboards still feel heavy after many sessions, add a lazy aggregation viewport (cache chart data per ring) so scrolling/filter changes only read from derived summaries rather than revisiting every shot buffer. Continuous replay without horizontal scroll should stay intact.
