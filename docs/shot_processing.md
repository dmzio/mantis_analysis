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

