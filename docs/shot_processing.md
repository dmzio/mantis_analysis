# Shot Processing Basics

This project preprocesses each shot immediately after loading the JSON files. The processing logic mirrors the original MantisX web implementation and is implemented in `visualizer/src/shotProcessor.ts`.

## Hold centre calculation

The hold centre is averaged from the yaw and pitch samples captured between 20 % and 10 % prior to the `shot_index`.  These averages are used as the reference when converting all pitch and yaw values to relative deviations expressed in minutes of angle (MOA).

## Angle conversions

MOA values are derived from degrees. Conversion helpers are provided:

```ts
const moa = degToMoa(0.5);      // degrees → MOA
const deg = moaToDeg(moa);       // MOA → degrees
```

## Trace trimming

The `findStartIndex` helper scans backwards from `shot_index` and returns the last sample that lies more than 70 MOA away from the hold centre.  This effectively trims the trace to the point where the shooter first settles on target.

Processed results are stored separately from the raw JSON.  Each session record
in the Vue store retains its original `shots` array and an accompanying
`processed` object containing the derived `shots` array.

## Reference dimensions

The following table lists the current ISSF 10 m pistol target dimensions.  These values may be adjusted if another discipline is analysed.

| Item | Diameter (mm) | Radius (mm) | Angle (°) | Angle (MOA) |
|-----------------|---------------:|------------:|----------:|------------:|
| 10-ring | 11.50 | 5.75 | 0.03295 | 1.98 |
| Black field | 59.50 | 29.75 | 0.17045 | 10.23 |
| 20 cm radius (offset of aiming start) | 400.00 | 200.00 | 1.14576 | 68.75 |


## Additional metrics

The processor derives further data used throughout the visualizer:

- **pull_index_calc** – index located 0.25&nbsp;s before the shot.
- **length_1s** – path length covered during the last second before the shot in millimetres.
- **delta_pull** – distance between the pull index and the shot point in millimetres.
- **percent_10** – fraction of the trimmed trace that stays within the 10&nbsp;ring (1.98&nbsp;MOA).
- **speed_pitch_mm_s / speed_yaw_mm_s** – vertical and horizontal speeds on the target in mm/s.

The default conversion of MOA to millimetres assumes the ISSF 10&nbsp;m pistol target where one MOA equals approximately 2.9&nbsp;mm.
