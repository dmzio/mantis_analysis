.PHONY: setup setup-python setup-vis vis-run e2e-test test-e2e

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

e2e-test:
	docker run --rm \
		-v "$$PWD":/workspace \
		-w /workspace/visualizer \
		mcr.microsoft.com/playwright:v1.53.2-jammy \
		/bin/bash -lc "npm install && npm run test:e2e"

test-e2e: e2e-test
