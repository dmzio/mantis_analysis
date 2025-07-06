.PHONY: vis-run
vis-run:
	cd visualizer \
		&& npm install --no-fund --no-audit \
		&& npm run dev
