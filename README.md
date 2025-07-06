# mantis_analysis

this project aims to provide in-depth analytics of MantisX data for precision PCP shooters (mainly ISSF air pistol 10m).

Code allows:
- downloading of all available data about training sessions for configured MantisX account.
- in-depth analysis of session statistics and progress between sessions
- visualization of training sessions and statistics via HTML


## Architecture

### Data downloader

Python script, which connects to MantisX platform and downloads all available data.

to run - fill config.json with your data,
activate environment and run `python data_download.py`


### Visualizer

Located in `./visualizer`. It is a Vite based Vue 3 application written in TypeScript.
Run `npm run dev` inside that directory to start the dev server or `npm run build` to produce the bundled site.
You can also execute `make vis-run` from the project root which installs missing dependencies and launches the dev server in one step.

