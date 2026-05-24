# MantisX JSON and Web Logic Reference

This document summarizes how the sample training data and the original `mantisweb_src` scripts interact. It is derived directly from the `.js` sources and the JSON files under `samples/sessions`.

## Session JSON fields

The session objects store general information about a training session. Fields seen in `11111027.json` include:

- `pk` – numeric primary key used as identifier.
- `date` and `time_stamp` – timestamp of the session.
- `user_pk`, `username` – owner information.
- `right_handed` and `right_handed_display` – handedness flags used when rendering spider targets.
- `fire_type` and `fire_type_display` – describe the firearm platform. The display string is shown in the UI.
- `gun_type` and `gun_type_display` – additional firearm classification.
- `average_score` – average of all shot scores. Graph functions read it when building charts【F:mantisweb_src/mantisweb.js†L663-L675】.
- `drill_id`, `drill_name` – identify the drill. If the drill is "Holster Draw Analysis" the holster charts are shown【F:mantisweb_src/mantisweb.js†L620-L632】.
- `extras` – miscellaneous metadata such as `hardware` and orientation offsets.
- `shots` – list of shot objects described below.

## Shot JSON fields

Shot objects contain raw sensor arrays and timing markers. The core fields used in the old scripts are:

- `pk` – shot identifier used for element IDs.
- `score` – numeric string parsed for averages and displayed with the trace【F:mantisweb_src/pistol.js†L672-L681】.
- `angle` – final movement direction measured at `shot_index`. It is expressed in degrees clockwise from east and used to classify problems in the old UI.
- `pitch` and `yaw` – arrays of orientation samples. Every point is mapped to screen coordinates via `mapPitchAndYawToPoint`,
  which uses `x = 330 + 100*scale*(yaw - center.x)` and a similar formula for `y`【F:mantisweb_src/pistol.js†L689-L699】.
- These numbers are **degrees of rotation** reported by the sensor. 0 means the sensor is perfectly level and pointing straight.
  Positive `pitch` raises the muzzle, while positive `yaw` rotates it to the right. Values typically stay within ±15° during normal firing
  but the raw arrays can contain much larger angles when the gun is moved or holstered.
- `sample_rate` – samples per second. Timing values such as `horizontal_to_shot_time` are converted into indices by multiplying with this rate【F:mantisweb_src/pistol.js†L736-L740】.
- `pull_index` and `shot_index` – array indices marking the trigger pull and the shot moment. They segment the trace into hold, pull and recoil parts.
- `hold_index` – beginning of the aiming hold (not referenced directly in the scripts).
- `trigger_pull` and `trigger_hold` – numeric strings for trigger phases. The archived code does not reference them.
- `split` – time between this shot and the previous one as a string in seconds.
- `absolute_pitch`, `absolute_roll`, `bullseye` and `extras` – stored but unused by the legacy scripts.

Additional timing fields such as `horizontal_to_shot_time`, `holster_target_time`, `horizontal_time`, `holster_pull_time`, `grip_time` and `holster_shot_time` are consulted when drawing holster‑draw charts. They are summed and averaged in `calculateAverage` and `generateShots`【F:mantisweb_src/pistol.js†L119-L170】.

## Shot processing logic

Important steps performed in `pistol.js` when preparing a trace:

1. **Center and scale calculation** – `getCenter` averages yaw and pitch between 20% and 10% before `shot_index` to find the center. The trace scale is computed from the maximum deviation between `pull_index` and `shot_index` using `scale = 0.5/(max + 0.1)`【F:mantisweb_src/pistol.js†L884-L905】.
2. **Index lookup** – Various time intervals are transformed into indices relative to `shot_index` using `sample_rate`. For example `target_index = shot_index - (sample_rate * horizontal_to_shot_time)`【F:mantisweb_src/pistol.js†L736-L740】.
3. **Bezier interpolation** – Consecutive orientation points are linked with cubic Bézier curves. A smoothing factor of 0.5, 0.3, 0.2 and 0.1 is used for successive ranges of points to soften the curve【F:mantisweb_src/pistol.js†L524-L535】.

## Shot visualization logic

- Points are converted to SVG coordinates with `mapPitchAndYawToPoint` and drawn as colored segments depending on whether they fall before the pull, between pull and shot, or after the shot【F:mantisweb_src/pistol.js†L689-L699】【F:mantisweb_src/pistol.js†L524-L569】.
- The shot marker (white X) is placed at `shot_index` after the path is drawn【F:mantisweb_src/pistol.js†L666-L675】.
- Holster draw charts group the timing values for all shots and render stacked bar charts for stages like "Shot" and "Target"【F:mantisweb_src/pistol.js†L330-L418】.
- **Trace trimming for scaling** – the scale factor is computed from the
  deviation between `pull_index` and `shot_index` only, effectively ignoring
  earlier aiming movement.  This prevents small trigger pulls from appearing too
  tiny when plotted【F:mantisweb_src/pistol.js†L895-L905】.

## Some logic excerpts from MantisX docs


[What do the red rings in the trace view mean?](https://mantisx.com/pages/faq) -
Each red circle of the simulated target represents a certain degree of movement away from the point of impact for a shot.
By locating the white X and identifying the nearest ring,
you can estimate the degree of movement that occurred to cause the point of impact to deviate from the point of aim.
The center ring of the simulated target in the Trace View represents 1/16th degree (3.75 MOA) of deviation.
Each ring after the first represents 1/8th degree (7.5 MOA) of deviation.