Drift Detection and Correction
==============================

Context
-------
MantisX orientation traces (yaw/pitch) may include a slow baseline drift
caused by gyro bias. On short shots (≈3–10 s) this appears as a gentle
walk through the “hold” window and can skew derived metrics and the
pre‑shot trace vs. SCATT comparisons.

Goals
-----
- Detect whether appreciable drift is present using only the session data
  (no external references).
- Remove first‑order drift while preserving shot dynamics (press, recoil).
- Keep the implementation small, testable, and reproducible offline.

Algorithms
----------
Implementation lives in `visualizer/src/shotProcessor.ts` and is entirely
JavaScript/TypeScript. The current approach is a session‑level, hold
window detrend with robust statistics:

1. **Per‑shot slope estimate** – fit yaw(t) and pitch(t) with ordinary
   least squares on [hold_index, pull_index − margin]. Default margin is
   0.15 s to avoid the fast trigger press portion.
2. **Outlier rejection** – use median and median absolute deviation to
   discard shots whose slopes deviate strongly from the session median.
3. **Session drift** – recompute the median slopes on the filtered set.
   Drift magnitude is `sqrt(my² + mp²) · duration_median`. The default
   threshold is 0.8°.
4. **Correction** – subtract the session slopes from each shot using the
   hold window midpoint as the anchor so the hold centroid stays fixed.

Notes
-----
- Arrays are consumed in their native units (Mantis exports degrees).
  All slopes are “degrees per second”; amplitudes are degrees.
- If the hold index or sample rate is missing the algorithm skips that
  shot.

Visualizer Usage
----------------
- `estimateSessionDrift(shots, options)` returns the robust session
  slopes (`yawSlope`, `pitchSlope`), shot counts, and whether drift is
  worth correcting.
- `applySessionDriftToShot(shot, drift, options)` returns a copy of the
  shot with corrected `pitch`/`yaw` arrays plus metadata.
- The **Raw** tab in the Shot Detail view exposes a “Drift correction”
  switch. When enabled it recomputes both the stability plot and the raw
  trace with corrected data. The track view also resets its zoom so that
  the entire target is visible by default.

Testing
-------
- Vitest tests in `visualizer/tests/unit/Drift.spec.ts` cover synthetic
  session detection (including outlier rejection) and the correction
  step.

Tuning
------
- `marginSeconds` (default 0.15) controls how much of the pull window is
  excluded from the fit.
- `amplitudeThreshold` (default 0.8) determines when the UI enables the
  correction by default.
- For non‑linear drift you can extend the helpers with an alternative
  baseline estimator (e.g., EMA high‑pass) while keeping the same
  session‑level detection step.
