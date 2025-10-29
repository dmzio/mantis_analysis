.PHONY: setup setup-python setup-vis vis-run

setup: setup-python setup-vis

setup-python:
	cd python && uv sync

setup-vis:
	cd visualizer \
	&& PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install --no-fund --no-audit

vis-run:
	cd visualizer \
        && PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install --no-fund --no-audit \
        && npm run dev
