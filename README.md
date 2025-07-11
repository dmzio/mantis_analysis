# mantis_analysis

this project aims to provide in-depth analytics of MantisX data for precision PCP shooters (mainly ISSF air pistol 10m).

Code allows:
- downloading of all available data about training sessions for configured MantisX account.
- in-depth analysis of session statistics and progress between sessions
- visualization of training sessions and statistics via HTML

## Setup

Run `make setup` from the project root to install Python and Node dependencies.
If you encounter deprecation warnings during setup or while running development
and test scripts, resolve them as soon as possible. Keeping dependencies free
from deprecated options ensures smoother upgrades. Always check that proposed
changes, such as adjusting environment variables, actually provide a benefit
before committing them.

## Architecture

### Data downloader

Python script, which connects to MantisX platform and downloads all available data.

To run - fill `python/config.json` with your data,
activate environment and from the `python` directory run `python scripts/data_download.py`

If a session includes an attached image it will be downloaded into
`data/sessions/session_photo` alongside the JSON files.


### Visualizer

Located in `./visualizer`. It is a Vite based Vue 3 application written in TypeScript.
Run `npm run dev` inside that directory to start the dev server or `npm run build` to produce the bundled site.
You can also execute `make vis-run` from the project root which installs missing dependencies and launches the dev server in one step.

The Visualizer uses PrimeVue's **styled** theming and the `lara-dark-blue`
preset for a dark appearance. It ships with a custom layout that features a
50&nbsp;px top bar, a 400&nbsp;px sidebar and a main content area that fills the
remaining viewport. PrimeVue allows customizing
the dark mode selector; see their
[Dark Mode guide](https://primevue.org/theming/styled/#darkmode) for details.

