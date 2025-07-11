.PHONY: setup setup-python setup-vis vis-run

setup: setup-python setup-vis

setup-python:
        cd python && uv sync

setup-vis:
	cd visualizer \
	&& npm install --no-fund --no-audit \
	&& npx playwright install --with-deps

vis-run:
	cd visualizer \
	&& npm install --no-fund --no-audit \
	&& npm run dev
