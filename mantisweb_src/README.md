Files in this directory are copies of source files from https://train.mantisx.com
all copyrights belong to MantisX developers.
These files shouldn't be directly reused in other system or components without permission.These files placed here only as a reference examples of how API data may be handled.

## Notes on Data Processing

While inspecting the original sources a few important details were found about
how raw JSON shot data is converted into graphics and statistics:

* **Center calculation and scaling** – before rendering, yaw and pitch samples
  between 20% and 10% prior to the shot are averaged to find the aiming center.
  The trace is scaled according to the maximum deviation using the formula
  `scale = 0.5 / (max + 0.1)`【F:mantisweb_src/pistol.js†L884-L905】.

* **Index lookup via sample rate** – timing values expressed in seconds are
  converted to array indices by multiplying by `sample_rate`.  For example the
  index of the trigger pull is computed as
  `target_index = shot_index - (sample_rate * horizontal_to_shot_time)` and
  subsequent offsets for other phases are derived from it【F:mantisweb_src/pistol.js†L736-L740】.

* **Bezier smoothing** – each segment of the movement trace is interpolated
  using cubic Bézier curves.  The smoothing coefficient varies depending on the
  point index with values `0.5`, `0.3`, `0.2` and `0.1` for successive ranges
  of points【F:mantisweb_src/pistol.js†L524-L535】.

* **Mapping to screen coordinates** – points are mapped to an SVG viewport using
  `x = 330 + 100 * scale * (yaw - center.x)` and a similar formula for `y` so
  that the trace fits the display area【F:mantisweb_src/pistol.js†L692-L699】.

These rules influence both the generated statistics and how traces are shown in
the UI.  They are preserved in the rewritten components in this repository.