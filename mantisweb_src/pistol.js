const PISTOL_UTILITIES = (function() {
    let my = {};
	let margin = {top: 20, right: 0, bottom: 100, left: 0};
	let width = 2000;
	let height = 600;

	/**
	 * Initiate the tab for Pistol
	 * @function initiatePistol
	 * @memberof GRAPHICS
	 * @param {string} username
	 * @param {int} user_pk
	 * @param {string} user_secret_key
	 */
    my.initiatePistol = function(username, user_pk, user_secret_key) {
        $('#shotgun').removeClass("active-top-tab");
        $('#archery').removeClass("active-top-tab");
		$('#pistol').addClass("active-top-tab");
		$('#laser-academy').removeClass("active-top-tab");

		$('#trace-view-button').click(function(event) {
			$('#trace-view-button').addClass("active-top-tab");
			$('#holster-draw-button').removeClass("active-top-tab");
			$('#trace-view').removeClass("hide-content");
			$('#holster-draw-view').addClass("hide-content");
        });

		$('#holster-draw-button').click(function(event) {
			$('#holster-draw-button').addClass("active-top-tab");
			$('#trace-view-button').removeClass("active-top-tab");
			$('#trace-view').addClass("hide-content");
			$('#holster-draw-view').removeClass("hide-content");
		});
    }


	/**
	 * Initiate the tab for Pistol
	 * @function dateFilter
	 * @memberof GRAPHICS
	 */
	my.dateFilter = function(profiled_user_pk, user_pk, user_secret_key) {
		$('#this-year').addClass("date-filter-button");
		$("#gun-type").val("0");

		let now = new Date(Date.now());

		function reloadWithCurrentSettings() {
			let gun_type = $("#gun-type").val();
			let selectedDateRange = $('.date-filter-button').attr('id');

			if (selectedDateRange === 'this-month') {
				let thisMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
				my.reloadSessionAnalysis(profiled_user_pk, user_pk, user_secret_key, now, thisMonth, gun_type);
			} else if (selectedDateRange === 'six-months') {
				let sixMonths = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
				my.reloadSessionAnalysis(profiled_user_pk, user_pk, user_secret_key, now, sixMonths, gun_type);
			} else if (selectedDateRange === 'this-year') {
				let thisYear = new Date(now.getFullYear(), now.getMonth() - 12, now.getDate());
				my.reloadSessionAnalysis(profiled_user_pk, user_pk, user_secret_key, now, thisYear, gun_type);
			}
		}

		// Event handlers
		$('#this-month').click(function(event) {
			$('#this-month').addClass("date-filter-button");
			$('#six-months').removeClass("date-filter-button");
			$('#this-year').removeClass("date-filter-button");

			reloadWithCurrentSettings();
		});

		$('#six-months').click(function(event) {
			$('#this-month').removeClass("date-filter-button");
			$('#six-months').addClass("date-filter-button");
			$('#this-year').removeClass("date-filter-button");

			reloadWithCurrentSettings();
		});

		$('#this-year').click(function(event) {
			$('#this-month').removeClass("date-filter-button");
			$('#six-months').removeClass("date-filter-button");
			$('#this-year').addClass("date-filter-button");

			reloadWithCurrentSettings();
		});

		$('#gun-type').change(function(event) {
			reloadWithCurrentSettings();
		});

		reloadWithCurrentSettings();
	}


	/**
	 * Get time data from Session-shot
	 * @function getTimeData
	 * @memberof GRAPHICS
	 * @param {string} type
	 * @param {list} shots
	 */
	my.getTimeData = function(type, shots) {
		var tempData = [];
		shots.forEach((element) => {
		  tempData.push(element.shotTime[type]);
		});
		return tempData;
	}


	/**
	 * Calculate the average time for the shots
	 * @function calculateAverage
	 * @memberof GRAPHICS
	 * @param {list} shots
	 */
	my.calculateAverage = function(shots)  {
		var avgShotTime = {
			holster_shot_time: 0,
			holster_target_time: 0,
			holster_horizontal_time: 0,
			holster_pull_time: 0,
			holster_grip_time: 0,
			holster_total_time: 0,
		}

		shots.forEach((element, index) => {
			avgShotTime.holster_shot_time +=  element.horizontal_to_shot_time;
			avgShotTime.holster_target_time += element.holster_target_time;
			avgShotTime.holster_horizontal_time += element.horizontal_time;
			avgShotTime.holster_pull_time += element.holster_pull_time;
			avgShotTime.holster_grip_time += element.grip_time;
			avgShotTime.holster_total_time += element.holster_total_time;
		});

		var numberOfShots = shots.length;

		avgShotTime.holster_shot_time /= numberOfShots;
		avgShotTime.holster_target_time /= numberOfShots;
		avgShotTime.holster_horizontal_time /= numberOfShots;
		avgShotTime.holster_pull_time /= numberOfShots;
		avgShotTime.holster_grip_time /= numberOfShots;
		avgShotTime.holster_total_time /= numberOfShots;

		return {"index": 0, "shotTime": avgShotTime}
	}


	/**
	 * Order session into a dictionary
	 * @function generateShots
	 * @memberof GRAPHICS
	 * @param {list} shots
	 */
	my.generateShots = function(shots) {
		var tempShots = [];
		tempShots.push(my.calculateAverage(shots));
		shots.forEach((element, index) => {
		  tempShots.push({
			index: index + 1,
			shotTime: {
			  holster_total_time: element.holster_shot_time,
			  holster_shot_time: element.horizontal_to_shot_time,
			  holster_target_time: element.holster_target_time,
			  holster_horizontal_time: element.horizontal_time,
			  holster_pull_time: element.holster_pull_time,
			  holster_grip_time: element.grip_time,
		  }});
		});

		return tempShots;
	}


	/**
	 * Find max item in each shot type, to set height
	 * @function generateShots
	 * @memberof GRAPHICS
	 * @param {list} shots
	 */
	my.findMax = function(shots) {
		var stages = [0, 0, 0, 0, 0];
		shots.forEach((element, index) => {
		  if (stages[0] < element["shotTime"]["holster_shot_time"]) {
			stages[0] = element["shotTime"]["holster_shot_time"];
		  }

		  if (stages[1] < element["shotTime"]["holster_target_time"]) {
			stages[1] = element["shotTime"]["holster_target_time"];
		  }

		  if (stages[2] < element["shotTime"]["holster_horizontal_time"]) {
			stages[2] = element["shotTime"]["holster_horizontal_time"];
		  }

		  if (stages[3] < element["shotTime"]["holster_pull_time"]) {
			stages[3] = element["shotTime"]["holster_pull_time"];
		  }

		  if (stages[4] < element["shotTime"]["holster_grip_time"]) {
			stages[4] = element["shotTime"]["holster_grip_time"];
		  }
		});

		return stages;
	}


	/**
	 * Create shot for the bar chart
	 * @function getShotRectangle
	 * @memberof GRAPHICS
	 * @param {float} x
	 * @param {float} y
	 * @param {float} width
	 * @param {float} height
	 * @param {string} color
	 */
	function getShotRectangle(x, y, width, height, color) {
		var shotRect = GRAPHICS.getNode('rect', {
			x: x,
			y: y,
			width: width,
			height: height,
			fill: color
		});

		return shotRect;
	}


	/**
	 * Create text for the bar
	 * @function getRectangleText
	 * @memberof GRAPHICS
	 * @param {float} x
	 * @param {float} y
	 * @param {string} text
	 */
	function getRectangleText(x, y, text, mode="normal") {
		var dx = "-2.7em";
		var dy = -5;
		var color = "#FFFFFF";
		var textAnchor = '';

		if (text < 0.2 || mode == 'total') {
			color = "#000000";
			textAnchor = "start";
		}

		var totalText = GRAPHICS.getNode('text', {
			x: x,
			y: y,
			dx: dx,
			dy: dy,
			fill: color,
			'text-anchor': textAnchor,
		});

		totalText.textContent = text;

		return totalText;
	}

	/**
	 * Draws a holster draw analysis graph
	 * @function barChart
	 * @memberof GRAPHICS
	 * @param {object} svg
	 * @param {object} barData
	 * @param {string} mode
	 * @param {string} color
	 * @param {float} xTransform
	 * @param {float} height
	 * @param {string} label
	*/
	my.barChart = function(svg, barData, mode, color, xTransform, height, label) {

		var x = d3.scaleBand()
		  .domain(d3.range(0, barData.length))
		  .range([margin.left, 150 * barData.length])
		  .padding(0.02);

		var y = d3.scaleLinear()
		  .domain([0, d3.max(barData)]).nice()
		  .range([height - margin.bottom, margin.top]);

		// Draw bars
		const chartArea = GRAPHICS.getNode('g', { fill: color, transform: `translate(150, ${xTransform})` });
		var rects = GRAPHICS.getNode('g', {});
		barData.forEach(function(data, i) {
			var rect = getShotRectangle(x(i), y(data), x.bandwidth(), y(0) - y(data), color);
			rects.appendChild(rect); // Prompt to click on shot
		});
		chartArea.appendChild(rects);
		svg.appendChild(chartArea);

		// Draw labels
		const chartText = GRAPHICS.getNode('g', { "fill": "#FFFFFF", "text-anchor": "end", "font-family": "sans-serif", "font-size": 20 });
		var barTexts = GRAPHICS.getNode('g', {});
		barData.forEach(function(data, i) {
			text =  Math.round((data + Number.EPSILON) * 100) / 100;
			var text = getRectangleText(x(i) + 2 * x.bandwidth(), y(0) + xTransform, text);
			barTexts.appendChild(text); // Prompt to click on shot
		});
		chartText.appendChild(barTexts);
		svg.appendChild(chartText);

		var labelTransform = xTransform + height - 120;

		var totalText = svg.appendChild(GRAPHICS.getNode('text', {
			"class": "y label",
			"text-anchor": "end",
			"font-size": 30,
			"y": 10,
			"transform": `translate(100, ${labelTransform})`}));

		totalText.textContent = label;
	}


	/**
	 * Draws a holster draw analysis graph
	 * @function drawHolsterDrawAnalysis
	 * @memberof GRAPHICS
	 * @param {object} rawShots
	 * @param {object} options
	 */
	 my.drawHolsterDrawAnalysis = function(rawShots, options) {

		$('#trace-view').addClass("hide-content");
		$('#trace-view-button').addClass("hide-content");
		$('#holster-draw-view').removeClass("hide-content");

		// Remove existing holsterdraw, if it exists
		$('#'+options.holster_id).show().children().remove();

		var shots = my.generateShots(rawShots);

		var max_stages = my.findMax(shots);
		//max_total is the sum of each max
		var max_total = max_stages.reduce((partialSum, a) => partialSum + a, 0);

		// calculating constants
		const max_container_height = 2000;
		const min_section_height = 200;
		const max_section_height = 400;

		//figure out the max heights for each stage
		var shot_height = Math.min(Math.max(max_container_height * (max_stages[0] / max_total), min_section_height), max_section_height);
		var target_height = Math.min(Math.max(max_container_height * (max_stages[1] / max_total), min_section_height), max_section_height);
		var horizontal_height = Math.min(Math.max(max_container_height * (max_stages[2] / max_total), min_section_height), max_section_height);
		var pull_height = Math.min(Math.max(max_container_height * (max_stages[3] / max_total), min_section_height), max_section_height);
		var grip_height = Math.min(Math.max(max_container_height * (max_stages[4] / max_total), min_section_height), max_section_height);
		var container_height = shot_height + target_height + horizontal_height + pull_height + grip_height;

		$("#holster-draw").empty();

		const parentSvg = document.getElementById("holster-draw");
		parentSvg.setAttribute("height", "480");
		parentSvg.setAttribute("viewBox", `0 0 ${150 * rawShots.length} ${container_height - 400}`);

		var svg = GRAPHICS.getNode('g', {});
		parentSvg.appendChild(svg);

		var totalTimes = shots.map(shot => {
			return shot.shotTime.holster_grip_time +
				   shot.shotTime.holster_horizontal_time +
				   shot.shotTime.holster_pull_time +
				   shot.shotTime.holster_shot_time +
				   shot.shotTime.holster_target_time;
		});

		var x = d3.scaleBand()
		  .domain(d3.range(0, totalTimes.length))
		  .range([margin.left, 150 * totalTimes.length])
		  .padding(0.02);

		var y = d3.scaleLinear()
		  .domain([0, d3.max(totalTimes)]).nice()
		  .range([0 - margin.bottom, margin.top]);

		// Draw labels
		const chartText = GRAPHICS.getNode('g', { "fill": "#000000", "text-anchor": "end", "font-family": "sans-serif", "font-size": 20 });
		var barTexts = GRAPHICS.getNode('g', {});
		totalTimes.forEach(function(data, i) {
			text = data.toFixed(2) + "s";
			var text = getRectangleText(x(i) + 2 * x.bandwidth(), y(0) + 80, text, 'total');
			barTexts.appendChild(text); // Prompt to click on shot
		});

		chartText.appendChild(barTexts);
		svg.appendChild(chartText);

		var totalText = svg.appendChild(GRAPHICS.getNode('text', { "class": "y label", "text-anchor": "end", "font-size": 30, "y": 10, "transform": "translate(100, 10)"}));
		totalText.textContent = "Total";

		var mode = "holster_shot_time";
		var buffer = 0;
		var tempData = my.getTimeData(mode, shots);
		my.barChart(svg, tempData, mode, "#eb5847", buffer, shot_height, "Shot");

		buffer = buffer + shot_height - 100;

		var mode = "holster_target_time";
		var tempData = my.getTimeData(mode, shots);
		my.barChart(svg, tempData, mode, "#A2b45E", buffer, target_height, "Target");

		buffer = buffer + target_height - 100;

		var mode = "holster_horizontal_time";
		var tempData = my.getTimeData(mode, shots);
		my.barChart(svg, tempData, mode, "#32BBad", buffer, horizontal_height, "Horiz");

		buffer = buffer + horizontal_height - 100;

		var mode = "holster_pull_time";
		var tempData = my.getTimeData(mode, shots);
		my.barChart(svg, tempData, mode, "#2171A4", buffer, pull_height, "Pull");

		buffer = buffer + pull_height - 100;

		var mode = "holster_grip_time";
		var tempData = my.getTimeData(mode, shots);
		my.barChart(svg, tempData, mode, "#325d3d", buffer, grip_height, "Grip");

	}


	/**
	 * Initiate the graph for holster draw analysis
	 * @function activeHolsterDraw
	 * @memberof GRAPHICS
	 */
	 my.activeHolsterDraw = function() {
        $('#graphTab').removeClass("hide-content");
        $('#chartHolder').removeClass("hide-content");
    }


	/**
	 * Download session and shots csv for Pistol
	 * @function downloadCSV
	 * @memberof GRAPHICS
	 * @param {string} username
	 * @param {int} user_pk
	 * @param {string} user_secret_key
	 */
	my.downloadCSV = function(username, user_pk, user_secret_key) {
        $('#download_session_csv').click(function(event) {
			EFFECTS.snackBarStart('Preparing Download...');
			API.downloadFile("/user-sessions-csv/" + username + "/" + "pistol" + "/" );
			event.preventDefault();
        });

		$('#download_shots_csv').click(function(event) {
			EFFECTS.snackBarStart('Preparing Download...');
			API.downloadFile("/user-shots-csv/" + username + "/" + "pistol" + "/" );
			event.preventDefault();
		});
    }


	my.displayAwards = function(profiled_user_pk, user_pk, user_secret_key, callback) {
		$.post({
			url: config.URLs.user_awards,
			data: JSON.stringify({
				'user_pk': user_pk,
				'user_secret_key': user_secret_key,
				'session_pk': $(this).data('session_pk'),
				'profiled_user_pk': profiled_user_pk
			}),
			dataType: 'json',
			contentType: 'application/json',
			headers: { 'X-CSRFToken': MANAGER.getCookie('csrftoken') }
		}).done(function(data) {
			if (typeof callback === 'function') {
				callback(data["courses"]);
			}
		});
	};


	/**
	 * Returns an SVG object of the trace itself, but not any background.
	 * This algorithm uses bezier curves.
	 * @function animateTrace
	 * @memberof GRAPHICS
	 * @inner
	 * @param {object} shot
	 * @param {object} center
	 * @param {number} center.x
	 * @param {number} center.y
	 * @param {number} center.scale
	 * @returns {object} trace (SVG object)
	 */
	my.animateTrace = function(shot, center, options) {
		var button = "#traceview-" + shot.pk + "_btn";
		$(button).addClass("active-tab");

		var g = GRAPHICS.getNode('g', {'id': 'animation-frame'});
		if (typeof options.opacity === 'undefined') { options.opacity = 1; }
		if (typeof options.showpoints === 'undefined') { options.showpoints = true; }
		if (typeof options.showtext === 'undefined') { options.showtext = true; }

		let pointa = GRAPHICS.mapPitchAndYawToPoint(shot, center, 0);
		let point0 = GRAPHICS.mapPitchAndYawToPoint(shot, center, 0);

		let delay = 0;
		for(let i = 0; i < shot.yaw.length; i++) {
			/*
				Make the setTimeout ~ 10x if it is displaying for recoil
			*/

			if(i <= shot.pull_index) {
				delay += 10;
			} else if(i <= shot.shot_index) {
				delay += 30;
			} else {
				delay += 10;
			}

			setTimeout(function() {
				// Map shot.yaw and shot.pitch from (-.5, .5) to (0, 100)
				let point1 = GRAPHICS.mapPitchAndYawToPoint(shot, center, i);
				let next_i = Math.min(i+1, shot.yaw.length-1);
				let point2 = GRAPHICS.mapPitchAndYawToPoint(shot, center, next_i);

				const bezier_scale = (i < 50 ? .5 :
									i < 65 ? .3 :
									i < 70 ? .2 :
									i < 75 ? .1 : .1);

				// console.log({"pointa": pointa, "point0": point0, "point1": point1, "point2": point2});
				const d = GRAPHICS.bezier_curve(pointa, point0, point1, point2, bezier_scale);

				let point_class = 'fake';
				if(i <= shot.pull_index) {
					point_class = 'hold';
				} else if(i <= shot.shot_index) {
					point_class = 'pull';
				} else {
					point_class = 'recoil';
				}

				const fillcolor = (typeof options.color !== 'undefined' ? options.color :
					(i <= shot.pull_index ? config.graphics.trace_hold_color :
					(i <= shot.shot_index ? config.graphics.trace_pull_color : config.graphics.trace_shot_color )));

				// circle.classList.add(point_class);
				const path = GRAPHICS.getNode('path', {
					'class': point_class,
					'd': d,
					'stroke': fillcolor,
					'stroke-width': config.graphics.trace_path_width,
					'vector-effect': 'non-scaling-stroke',
					'fill': 'transparent',
					'opacity': options.opacity
				});
				// path.classList.add(point_class);
				const show_path_segment = (i <= shot.pull_index ? config.graphics.trace_show_hold_segment :
					i <= shot.shot_index ? config.graphics.trace_show_pull_segment : config.graphics.trace_show_shot_segment);

				if(show_path_segment) {
					if(i != 0) {
						g.appendChild(path);
					}
				}

				pointa = point0;
				point0 = point1;

				if (i == shot.yaw.length - 1) {
					animateTrigger = false;
					$(button).removeClass("active-tab")
					$(button).click()
				}

			}, delay);
		}

		return g;
	}


	/**
	 * Returns an SVG object of the trace itself, but not any background.
	 * This algorithm uses bezier curves.
	 * @function getTrace
	 * @memberof GRAPHICS
	 * @inner
	 * @param {object} shot
	 * @param {object} center
	 * @param {number} center.x
	 * @param {number} center.y
	 * @param {number} center.scale
	 * @returns {object} trace (SVG object)
	 */
	 my.getTrace = function(shot, center, options) {
		var g = GRAPHICS.getNode('g', {});
		if (typeof options.opacity === 'undefined') { options.opacity = 1; }
		if (typeof options.showpoints === 'undefined') { options.showpoints = true; }
		if (typeof options.showtext === 'undefined') { options.showtext = true; }

		let pointa = GRAPHICS.mapPitchAndYawToPoint(shot, center, 0);
		let point0 = GRAPHICS.mapPitchAndYawToPoint(shot, center, 0);
		for(var i = 0; i < shot.yaw.length; i++) {
			// Map shot.yaw and shot.pitch from (-.5, .5) to (0, 100)
			let point1 = GRAPHICS.mapPitchAndYawToPoint(shot, center, i);
			let next_i = Math.min(i+1, shot.yaw.length-1);
			let point2 = GRAPHICS.mapPitchAndYawToPoint(shot, center, next_i);

			const bezier_scale = (i < 50 ? .5 :
								i < 65 ? .3 :
								i < 70 ? .2 :
								i < 75 ? .1 : .1);

			const d = GRAPHICS.bezier_curve(pointa, point0, point1, point2, bezier_scale);

			let point_class = 'fake';
			if(i <= shot.pull_index) {
				point_class = 'hold';
			} else if(i <= shot.shot_index) {
				point_class = 'pull';
			} else {
				point_class = 'recoil';
			}

			const fillcolor = (typeof options.color !== 'undefined' ? options.color :
				(i <= shot.pull_index ? config.graphics.trace_hold_color :
				(i <= shot.shot_index ? config.graphics.trace_pull_color : config.graphics.trace_shot_color )));
			const circle = GRAPHICS.getNode('circle', {
				'class': 'traceview__point'+point_class,
				'cx': point1.x,
				'cy': point1.y,
				'r': config.graphics.trace_point_radius,
				'fill': fillcolor,
				'opacity': options.opacity
			});
			// circle.classList.add(point_class);
			const path = GRAPHICS.getNode('path', {
				'class': point_class,
				'd': d,
				'stroke': fillcolor,
				'stroke-width': config.graphics.trace_path_width,
				'vector-effect': 'non-scaling-stroke',
				'fill': 'transparent',
				'opacity': options.opacity
			});
			// path.classList.add(point_class);
			const show_path_segment = (i <= shot.pull_index ? config.graphics.trace_show_hold_segment :
				i <= shot.shot_index ? config.graphics.trace_show_pull_segment : config.graphics.trace_show_shot_segment);

			if(show_path_segment) {
				if(config.graphics.trace_show_points) {
					g.appendChild(circle);
				}
				if(i != 0) {
					g.appendChild(path);
				}
			}

			pointa = point0;
			point0 = point1;
		}
		// Add 'X' over shot
		const shot_break = GRAPHICS.mapPitchAndYawToPoint(shot, center, shot.shot_index);
		const shot_marker = GRAPHICS.get_shot_marker(shot_break, options, "shot");
		g.appendChild(shot_marker);
		if(config.graphics.trace_show_score) {
			var text = GRAPHICS.getNode('text', {
				'x': 3,
				'y': 10,
				'fill': config.graphics.trace_font_color,
				'font-size': config.graphics.trace_font_size,
				'font-family': config.graphics.trace_font_family,
				'font-weight': config.graphics.trace_font_weight
			});
			text.textContent = MANAGER.round(shot.score);
			// g.appendChild(text);
		}

		return g;
	}


	my.mapPitchAndYawToPoint = function(shot, center, i) {
		var dx = shot.yaw[i] - center.x;
		var dy = shot.pitch[i] - center.y;
		var x = 330 + 100*center.scale*dx;
		var y = 200 - 100*center.scale*dy;

		return {
			x: x,
			y: y
		};
	}


	/**
	 * Returns an SVG object of the trace itself, but not any background.
	 * This algorithm uses bezier curves.
	 * @function getStrokeoverlayTrace
	 * @memberof GRAPHICS
	 * @inner
	 * @param {object} shot
	 * @param {object} center
	 * @param {number} center.x
	 * @param {number} center.y
	 * @param {number} center.scale
	 * @returns {object} trace (SVG object)
	 */
	 my.getStrokeoverlayTrace = function(shot, center, options) {

		var g = GRAPHICS.getNode('g', {});
		if (typeof options.opacity === 'undefined') { options.opacity = 1; }
		if (typeof options.showpoints === 'undefined') { options.showpoints = true; }
		if (typeof options.showtext === 'undefined') { options.showtext = true; }

		center["scale"] = 0.03;

		// let pointa = GRAPHICS.mapPitchAndYawToPoint(shot, center, 0);
		// let point0 = GRAPHICS.mapPitchAndYawToPoint(shot, center, 0);
		// console.log(pointa);
		// console.log(point0);
		let pointa = {
			"x": 200,
			"y": 400
		};

		let point0 = pointa;
		// translate(300px, 200px) scale(0.03)

		let shot_index = shot.shot_index;
		let target_index = Math.max(shot_index - (shot["sample_rate"]  * shot["horizontal_to_shot_time"]), 0);
		let horizontal_index = Math.max(target_index - (shot["sample_rate"]  * shot["holster_target_time"]), 0);
		let pull_index = Math.max(horizontal_index - (shot["sample_rate"]  * shot["horizontal_time"]), 0);
		let grip_index = Math.max(pull_index - (shot["sample_rate"]  * shot["holster_pull_time"]), 0);

		for(var i = 0; i < shot.yaw.length; i++) {
			// Map shot.yaw and shot.pitch from (-.5, .5) to (0, 100)
			let point1 = my.mapPitchAndYawToPoint(shot, center, i);
			let next_i = Math.min(i+1, shot.yaw.length-1);
			let point2 = my.mapPitchAndYawToPoint(shot, center, next_i);

			const bezier_scale = (i < 50 ? .5 :
								i < 65 ? .3 :
								i < 70 ? .2 :
								i < 75 ? .1 : .1);

			const d = GRAPHICS.bezier_curve(pointa, point0, point1, point2, bezier_scale);

			let point_class = 'fake';
			if(i <= shot.pull_index) {
				point_class = 'hold';
			} else if(i <= shot.shot_index) {
				point_class = 'pull';
			} else {
				point_class = 'recoil';
			}

			var fillcolor = "#686868";

			if (options["main"] == true) {
				fillcolor = (i <= grip_index ? "#325D3D" :
							(i <= pull_index ? "#2171A4" :
							(i <= horizontal_index ? "#32BBAD" :
							(i <= target_index ? "#A2B45E" :
								"#EB5847" ))));
			}

			const path = GRAPHICS.getNode('path', {
				'class': point_class,
				'd': d,
				'stroke': fillcolor,
				'stroke-width': config.graphics.trace_path_width,
				'vector-effect': 'non-scaling-stroke',
				'fill': 'transparent',
				'opacity': options.opacity
			});

			if(i != 0) {
				g.appendChild(path);
			}

			pointa = point0;
			point0 = point1;
		}

		return g;
	}


	/**
	 * Returns an SVG object of concentric circles with decreasing intensity the larger they get.
	 * @function getTraceviewBackground
	 * @memberof GRAPHICS
	 * @inner
	 * @param {object} g
	 * @param {number} scale - default is 1
	 * @returns {object} - SVG object
	 */
	my.getTraceviewBackground = function(scale) {
		function axisLine(x1, y1, x2, y2) {
			return GRAPHICS.getNode('line', {
				'x1': x1,
				'y1': y1,
				'x2': x2,
				'y2': y2,
				'stroke-width': config.graphics.trace_axis_width,
				'vector-effect': 'non-scaling-stroke',
				'stroke': config.graphics.trace_axis_color,
			});
		}

		var g = GRAPHICS.getNode('g', {});
		g.appendChild(axisLine(50, -100, 50, 200));
		g.appendChild(axisLine(-100, 50, 200, 50));
		const begin = 5;
		const inc = 13;
		for(let i = 0; i < 10; i++) {
			g.appendChild(GRAPHICS.getNode('circle', {
				'r': (begin+i*inc)*scale,
				'cx': 50,
				'cy': 50,
				'stroke': config.graphics.axis_rings,
				'stroke-width': config.graphics.trace_ring_width,
				'vector-effect': 'non-scaling-stroke',
				'stroke-opacity': .1*(10-i),
				'fill': 'none'
			}));
		}

		return g;
	}


	/**
	 * Returns an SVG object of concentric circles with decreasing intensity the larger they get.
	 * @function getHolsterstrokeBackground
	 * @memberof GRAPHICS
	 * @inner
	 * @returns {object} - SVG object
	 */
	 my.getStrokeoverlayBackground = function() {
		function axisLine(x1, y1, x2, y2) {
			return GRAPHICS.getNode('line', {
				'x1': x1,
				'y1': y1,
				'x2': x2,
				'y2': y2,
				'stroke-width': config.graphics.trace_axis_width,
				'vector-effect': 'non-scaling-stroke',
				'stroke': config.graphics.trace_axis_color,
			});
		}

		var g = GRAPHICS.getNode('g', {});
		g.appendChild(axisLine(200, -100, 200, 500));
		g.appendChild(axisLine(-100, 450, 400, 450));

		return g;
	}


	/**
	 * Returns an SVG object of concentric circles with decreasing intensity the larger they get.
	 * @function getCenter
	 * @memberof PISTOL_UTILITIES
	 * @inner
	 * @param {shot} g
	 * @returns {object} - SVG object
	 */
	my.getCenter = function(shot) {
		var yawsum = 0;
		var pitchsum = 0;
		var foo = shot.yaw;

		if(shot.shot_index == 0) {
			shot.pull_index = 60;
			shot.shot_index = 75;
		}

		var aim_start = shot.shot_index - parseInt(.20 * shot.sample_rate);
		var aim_end = shot.shot_index - parseInt(.10 * shot.sample_rate);

		for(var i = aim_start; i < aim_end; i++) {
			yawsum += shot.yaw[i];
			pitchsum += shot.pitch[i];
		}

		var length = aim_end - aim_start;

		var x = yawsum/length;
		var y = pitchsum/length;

		// Scale to fit terrible shots
		var xmax = Math.max(Math.max.apply(null, shot.yaw.slice(shot.pull_index, shot.shot_index).map(function(num){ return Math.abs(num-x); })), .4);
		var ymax = Math.max(Math.max.apply(null, shot.pitch.slice(shot.pull_index, shot.shot_index).map(function(num){ return Math.abs(num-y); })), .4);
		var max = Math.max(xmax, ymax);

		var scale = .5/(max+.1);
		return { scale: scale, x: x, y: y };
	}


	/**
	 * Draw the traceview for a shot in the div. The div should be an SVG element.
	 * @function drawTraceview
	 * @memberof GRAPHICS
	 * @param {string} div_id
	 * @param {object} shot
	 * @param {object} options
	 */
	 my.drawTraceview = function(div_id, shot, options) {

		$('#trace-view').removeClass("hide-content");
		$('#trace-view-button').removeClass("hide-content");
		$('#holster-draw-view').addClass("hide-content");
		$('#holster-draw-button').addClass("hide-content");


		if(!shot) {
			console.log("ERROR: shot is null");
			return;
		}

		let svg = document.getElementById(div_id);
		if(svg) {
			if (animateTrigger) {
				// fetch current zoom of the div
				var zoom = d3.select('#'+div_id+'_g').attr("transform");
			}

			GRAPHICS.resetZoom(div_id, 1);

			let g = GRAPHICS.getNode('g', { 'id': div_id+'_g' });
			$('#'+div_id)
				.empty()
				.css({
					'background-color': config.graphics.trace_background_color,
					'width': options.trace_width,
					'border-radius': '5px'
				})
				.show();

			// add animate button
			let button = GRAPHICS.addAnimateButton();
			svg.appendChild(button);

			let center = my.getCenter(shot);
			g.appendChild(my.getTraceviewBackground(center.scale));
			if(!options.hide_trace) {
				if (options.animate) {
					g.appendChild(my.animateTrace(shot, center, {}));
				} else {
					g.appendChild(my.getTrace(shot, center, {}));
				}
				svg.appendChild(g);
			}
			if(!options.trace_disable_zoom) {
				GRAPHICS.addZooming(div_id, shot, center);
			}

			if (animateTrigger) {
				d3.select('#'+div_id+'_g')
					.attr("transform", zoom);
			}
		}
	}


	/**
	 * Draw the traceview for a shot in the div. The div should be an SVG element.
	 * @function drawStrokeOverlay
	 * @memberof GRAPHICS
	 * @param {string} div_id
	 * @param {object} shot
	 * @param {object} options
	 */
	my.drawStrokeOverlay = function(shots, options) {

		var div_id = 'holster-stroke-overlay';
		let svg = document.getElementById(div_id);

		svg.setAttribute("width", "400");
		svg.setAttribute("height", "600");
		svg.setAttribute("viewBox", `0 0 400 400`);

		$('#'+div_id)
		.empty()
		.css({
			'background-color': config.graphics.trace_background_color,
			'width': options.trace_width,
			'border-radius': '5px'
		})
		.show();

		svg.appendChild(my.getStrokeoverlayBackground());

		shots.forEach((shot, i) => {
			const trace_id = 'traceview-' + shot.pk;

			if(!shot) {
				console.log("ERROR: shot is null");
				return;
			}

			if(svg) {
				let g = GRAPHICS.getNode('g', {
							'id': trace_id,
						});

				let center = my.getCenter(shot);
				g.appendChild(my.getStrokeoverlayTrace(shot, center, {}));

				svg.appendChild(g);
			}
		});

		my.setOneStrokeView(shots[0]);
	}


	/**
	 * Set an active Stroke view
	 * @function setOneStrokeView
	 * @memberof GRAPHICS
	 * @param {object} shot
	 */
	my.setOneStrokeView = function(shot) {
		$('.active-stroke').remove();

		let svg = document.getElementById('holster-stroke-overlay');

		let g = GRAPHICS.getNode('g', {
			'id': 'traceview-' + shot.pk,
			'class': 'active-stroke'
		});

		let center = my.getCenter(shot);
		g.appendChild(my.getStrokeoverlayTrace(shot, center, {"main": true}));
		svg.appendChild(g);
	}


	/**
	 * Assign trace stroke view to each buttons
	 * @function populateStrokeOverlayMultiples
	 * @memberof GRAPHICS
	 * @param {object} session
	 * @param {object} options
	 */
	my.populateStrokeOverlayMultiples = function(session, options) {
		const $strokeoverlay = $('.holster-stroke-overlay');
		$strokeoverlay.remove();

		const container = document.getElementById('holster-stroke-div');
		const shot_selection = document.getElementById('shot-selection-stroke');

		$(".shot-label").remove();
		session.shots.forEach(function(shot, i) {

			const trace_id = 'traceview-' + shot.pk;

			var btn = document.createElement("BUTTON");
			btn.setAttribute("id", trace_id + "_btn");
			btn.setAttribute("class", "shot-label");
			btn.innerHTML = (i+1);

			shot_selection.parentNode.appendChild(btn);

			var btnId = "#" + trace_id + "_btn"
			$(btnId).on('mouseover', function(event) {
				if (!$(".shot-label").hasClass("active-tab") && !animateTrigger) {
					my.setOneStrokeView(session.shots[i])
				}
			});

			$(btnId).click(function(event) {
				if ($(btnId).hasClass("active-tab") && !animateTrigger) {
					$(".shot-label").removeClass("active-tab");
				} else if (!animateTrigger) {
					$(".shot-label").removeClass("active-tab");
					$("#" + trace_id + "_btn").addClass("active-tab")
					my.setOneStrokeView(session.shots[i])
				}
			});
		});

		// Switch Trace Views on key arrow clicks
		$(document).keydown(function(e){
			if (e.which == 37 && $(".active-tab").length > 0) {
				activeDivId = $(".active-tab")[0].id
				shotLabels = $(".shot-label")
				for (let i = 0; i < shotLabels.length; i++) {
					if (i != 0 && activeDivId == shotLabels[i].id) {
						$(".shot-label").removeClass("active-tab");
						$("#" + shotLabels[i - 1].id).addClass("active-tab");
						my.setOneStrokeView(session.shots[i - 1]);
						break;
					}
				}
				return false;
			}

			if (e.which == 39 && $(".active-tab").length > 0) {
				activeDivId = $(".active-tab")[0].id
				shotLabels = $(".shot-label")
				for (let i = 0; i < shotLabels.length; i++) {
					if (i != shotLabels.length - 1 && activeDivId == shotLabels[i].id) {
						$(".shot-label").removeClass("active-tab");
						$("#" + shotLabels[i + 1].id).addClass("active-tab");
						my.setOneStrokeView(session.shots[i + 1]);
						break;
					}
				}
				return false;
			}
		});

		let $hold_recoil = $('.hold, .recoil');
	}


	/**
	 * Draws the radar chart
	 * @function radarChart
	 * @memberof GRAPHICS
	 * @param {object} svg
	 * @param {object} data
	 * @param {object} options
	 * @param {object} levels
	*/
	my.radarChart = function(svg, data, options, levels) {

		var cfg = {
			w: 400, //Width of the circle
			h: 400, //Height of the circle
			margin: { top: 20, right: 20, bottom: 20, left: 20 }, //The margins of the SVG
			levels: 3, //How many levels or inner circles should there be drawn
			maxValue: 0, //What is the value that the biggest circle will represent
			labelFactor: 1.25, //How much farther than the radius of the outer circle should the labels be placed
			wrapWidth: 60, //The number of pixels after which a label needs to be given a new line
			opacityArea: 0.35, //The opacity of the area of the blob
			dotRadius: 1, //The size of the colored circles of each blog
			opacityCircles: 0.1, //The opacity of the circles of each blob
			strokeWidth: .5, //The width of the stroke around each blob
			roundStrokes: false, //If true the area and stroke will follow a round path (cardinal-closed)
			color: d3.scaleOrdinal(d3.schemeCategory10) //Color function
		};

		//Put all of the options into a variable called cfg
		if ("undefined" !== typeof options) {
			for (var i in options) {
				if ("undefined" !== typeof options[i]) {
					cfg[i] = options[i];
				}
			} //for i
		} //if

		//If the supplied maxValue is smaller than the actual one, replace by the max in the data
		var maxValue = Math.max(
			cfg.maxValue,
			d3.max(data, function(i) {
					return d3.max(
						i.map(function(o) {
							return o.value;
						})
					);
				})
		);

		var allAxis = data[0].map(function(i, j) {
			return i.axis;
		}), //Names of each axis
		total = allAxis.length, //The number of different axes
		radius = Math.min(cfg.w / 2, cfg.h / 2), //Radius of the outermost circle
		Format = d3.format(".0%"), //Percentage formatting
		angleSlice = (Math.PI * 2) / total; //The width in radians of each "slice"

		//Scale for the radius
		var rScale = d3
		.scaleLinear()
		.range([0, radius])
		.domain([0, maxValue]);

		/////////////////////////////////////////////////////////
		//////////// Create the container SVG and g /////////////
		/////////////////////////////////////////////////////////

		//Calculate width and height
		var height = cfg.h + cfg.margin.top + cfg.margin.bottom;
		var width = cfg.w + cfg.margin.left + cfg.margin.right;

		// Draw bars
		const g = GRAPHICS.getNode('g', { transform: "translate(" +
							100 +
							"," +
							(cfg.h / 2 + cfg.margin.top) +
							")"
						});
		svg.appendChild(g);


		/////////////////////////////////////////////////////////
		////////// Glow filter for some extra pizzazz ///////////
		/////////////////////////////////////////////////////////

		var defs = GRAPHICS.getNode('defs', {});
		var filter = GRAPHICS.getNode('filter', { "id": "glow"});
		var feGaussianBlur = GRAPHICS.getNode('feGaussianBlur', { "stdDeviation": "2.5", "result": "coloredBlur"});
		var feMerge = GRAPHICS.getNode('feMerge', {});
		var feMergeNode_1 = GRAPHICS.getNode("feMergeNode", {"in": "coloredBlur"});
		var feMergeNode_2 = GRAPHICS.getNode("feMergeNode", {"in": "SourceGraphic"});

		feMerge.append(feMergeNode_1);
		feMerge.append(feMergeNode_2);
		filter.append(feGaussianBlur);
		filter.append(feMerge);
		defs.appendChild(filter);
		g.append(defs);


		/////////////////////////////////////////////////////////
		/////////////// Draw the Circular grid //////////////////
		/////////////////////////////////////////////////////////

		//Wrapper for the grid & axes
		var axisGrid = GRAPHICS.getNode('g', { "class": "axisWrapper"});
		g.append(axisGrid);

		for (let i = cfg.levels; i >= 1; i--) {
			var circle = GRAPHICS.getNode('circle', { "class": "gridCircle",
													"r": (radius / cfg.levels) * i,
													"style": `fill: #CDCDCD;
																stroke: #CDCDCD;
																fill-opacity: ${cfg.opacityCircles};
																filter: url("#glow");`
													});
			axisGrid.append(circle);

			var text = GRAPHICS.getNode('text', { "class": "axisLabel",
												"x": 4,
												"y": (-i * radius) / cfg.levels,
												"dy": "0.4em",
												"fill": "#737373",
												"style": "font-size: 3px",
												});
			text.textContent = Format(levels[i-1]);
			axisGrid.append(text);
		}


		/////////////////////////////////////////////////////////
		//////////////////// Draw the axes //////////////////////
		/////////////////////////////////////////////////////////

		for (let i = 0; i < allAxis.length; i++) {
			const d = allAxis[i];

			var axis = GRAPHICS.getNode('g', { "class": "axis" });
			var line = GRAPHICS.getNode('line', { "x1": 0,
												"y1": 0,
												"x2": rScale(maxValue * 1.1) * Math.cos(angleSlice * i - Math.PI / 2),
												"y2": rScale(maxValue * 1.1) * Math.sin(angleSlice * i - Math.PI / 2),
												"class": "line",
												"style": "stroke: white; stroke-width: .5px"
												});

			var text = GRAPHICS.getNode('text', { "class": "legend",
												"style": "font-size: 3.5px;",
												"text-anchor": "middle",
												"dy": "0.35em",
												"x": rScale(maxValue * cfg.labelFactor) *
													Math.cos(angleSlice * i - Math.PI / 2),
												"y": rScale(maxValue * cfg.labelFactor) *
													Math.sin(angleSlice * i - Math.PI / 2)
												});
			text.textContent = d;

			axis.append(line);
			axis.append(text);
			axisGrid.append(axis);
		}


		/////////////////////////////////////////////////////////
		///////////// Draw the radar chart blobs ////////////////
		/////////////////////////////////////////////////////////

		//The radial line function
		var radarLine = d3
			.lineRadial()
			.curve(d3.curveLinearClosed)
			.radius(function(d) {
			return rScale(d.value);
			})
			.angle(function(d, i) {
			return i * angleSlice;
			});

		if (cfg.roundStrokes) {
			radarLine.curve(d3.curveLinearClosed);
		}

		for (let i = 0; i < data.length; i++) {
			const d = data[i];
			var blobWrapper = GRAPHICS.getNode('g', { "class": "radarWrapper" });

			var radarArea = GRAPHICS.getNode('path', { "class": "radarArea",
													   "d": radarLine(d),
													   "style": `fill: ${cfg.color(i)}; fill-opacity: ${cfg.opacityArea}`											 
											});
			blobWrapper.append(radarArea);

			var radarStroke = GRAPHICS.getNode('path', { "class": "radarStroke",
											   			 "d": radarLine(d),
											   			 "style": `stroke-width: ${cfg.strokeWidth}px;
																   stroke: ${cfg.color(i)};
																   fill: none;
																   filter: url("#glow");`
											 });
			blobWrapper.append(radarStroke);

			for (let j = 0; j < d.length; j++) {
				var value = d[j].value;
				var radarCircle = GRAPHICS.getNode('circle', { "class": "radarCircle",
															   "r": cfg.dotRadius,
															   "cx": rScale(value) * Math.cos(angleSlice * j - Math.PI / 2),
															   "cy": rScale(value) * Math.sin(angleSlice * j - Math.PI / 2),
															   "style": "fill: #737373; fill-opacity: 0.8;"
															 });
				blobWrapper.append(radarCircle);
			}

			g.append(blobWrapper);
		}

	}


	/**
	 * Draws the radar chart
	 * @function rangeOfShots
	 * @memberof GRAPHICS
	 * @param {object} data
	*/
	my.rangeOfShots = function(data) {
		$("#range-of-shots").empty();
		$("#range-of-shots").append(`<tr class="range-table-column">
										<th>Firearm Type</th>
										<th>Problem Area</th>
										<th>Shots</th>
										<th>Percentage</th>
										<th>Comments</th>
									 </tr>`);

		var rifleProblems = ["NOT ENOUGH TRIGGER FINGER",
							 "POOR FOLLOW THROUGH",
							 "SHOULDERING THE RIFLE",
							 "PULLING WITH THE FIRING HAND",
							 "PUSHING WITH FIRING HAND",
							 "SUPPORT HAND PUSHING",
							 "SUPPORT HAND PULLING",
							 "JERKING THE TRIGGER",
							 "BOTTOM FEEDER",
							 "RECOIL SPOIL",
							 "THE PULLER",
							 "JUMPING THE GUN",
							 "THE PUSHER",
							 "HIGH NOON SHOOTER"];

		var total = 0;
		for (let i = 0; i < data.length; ++i) {
			total += data[i]["value"];
		}

		for (let i = 0; i < data.length; i++) {
			if (data[i]["axis"] != null) {
				var percentage = data[i]["value"]/total * 100;
				percentage = Math.round(percentage * 10) / 10;
				var fireType = "Pistol";
				if (rifleProblems.includes(data[i]["axis"])) {
					fireType = "Rifle";
				}

				var comment = "";
				if (data[i]["axis"] == "GREAT SHOT") {
					comment = "Great Shooting!"
				} else if (percentage > 6) {
					comment = "Needs Work!"
				}

				var row = `<tr class="range-table-row">
								<td>{0}</td>
								<td>{1}</td>
								<td>{2}</td>
								<td>{3}</td>
								<td>{4}</td>
							</tr>`.f(fireType, data[i]["axis"], data[i]["value"], percentage + "%", comment);

				$("#range-of-shots").append(row);
			}
		}
	}


	/**
	 * Reload session analysis
	 * @function reloadSessionAnalysis
	 * @memberof GRAPHICS
	 */
	my.reloadSessionAnalysis = function(profiled_user_pk, user_pk, user_sk, start, end, gun_type) {
		var start = start.toISOString().split('T')[0];
		var end = end.toISOString().split('T')[0];

		console.log(start, end, gun_type);
		$("#pie-chart").empty();
		$("#pistol-correction-chart").empty();
		$("#session-scores").empty();
		$("#scoring-breakdown").empty();
		$("#range-of-shots").empty();

		PISTOL_UTILITIES.pistolCorrectionChart(profiled_user_pk, user_pk, user_sk, start, end, gun_type);
		PISTOL_UTILITIES.scoreTimeSeries(profiled_user_pk, user_pk, user_sk, start, end, gun_type);
		PISTOL_UTILITIES.scoringBreakdown(profiled_user_pk, user_pk, user_sk, start, end, gun_type);
	}


	/**
	 * Draws the radar chart
	 * @function pieChart
	 * @memberof GRAPHICS
	 * @param {object} data
	*/
	my.pieChart = function(data) {
		const N  = [];
		const V = [];
		const I = [];

		for (let i = 0; i < data.length; i++) {
			N.push(data[i]["axis"]);
			V.push(data[i]["value"]);
			I.push(i);
		}

		var width = 640; // outer width, in pixels
		var height = 400; // outer height, in pixels
		var innerRadius = 0; // inner radius of pie, in pixels (non-zero for donut)
		var outerRadius = Math.min(width, height) / 4; // outer radius of pie, in pixels
		var labelRadius = (innerRadius * 0.2 + outerRadius * 0.8); // center radius of labels
		var format = ","; // a format specifier for values (in the label)
		var names; // array of names (the domain of the color scale)
		var colors; // array of colors for names
		var stroke = innerRadius > 0 ? "none" : "white"; // stroke separating widths
		var strokeWidth = 1; // width of stroke separating wedges
		var strokeLinejoin = "round"; // line join of stroke separating wedges
		var padAngle = stroke === "none" ? 1 / outerRadius : 0; // angular separation between wedges
		var title;

		// Unique the names.
		if (names === undefined) names = N;
		names = new Set(names);

		colors = [];
		var nColors = names.size;

		var f = d3.interpolateHsl("rgb(209, 60, 75)", "rgb(252, 246, 173)");

		for (var i=0; i < nColors; i++)
		  colors.push(f(i/(nColors-1)));

		// Construct scales.
		const color = d3.scaleOrdinal(names, colors);

		// Compute titles.
		if (title === undefined) {
			const formatValue = d3.format(format);
			title = i => `${N[i]}\n${formatValue(V[i])}`;
		} else {
			const O = d3.map(data, d => d);
			const T = title;
			title = i => T(O[i], i, data);
		}

		// Construct arcs.
		const arcs = d3.pie().padAngle(padAngle).sort(null).value(i => V[i])(I);
		const arc = d3.arc().innerRadius(innerRadius).outerRadius(outerRadius);
		const arcLabel = d3.arc().innerRadius(labelRadius).outerRadius(labelRadius);

		$("#pie-chart").empty();

		const svg = document.getElementById("pie-chart");
		svg.setAttribute("width", "100%");
		svg.setAttribute("height", "600");
		svg.setAttribute("viewBox", `0 0 220 200`);

		var arcG = GRAPHICS.getNode('g', { "class": "arcs",
										   "transform": "translate(120, 100)",
										   "stroke": stroke,
										   "stroke-width": strokeWidth,
										   "stroke-linejoin": strokeLinejoin
										 });
		svg.append(arcG);

		var textG = GRAPHICS.getNode('g', {"class": "text",
										   "transform": "translate(120, 100)",
										   "font-family": "sans-serif",
										   "font-size": 4,
										   "text-anchor": "middle"
										  });

		for (let i = 0; i < arcs.length; i++) {
			var d = arcs[i];
			var path = GRAPHICS.getNode('path', { "class": "arc",
												  "fill": colors[d.data],
												  "d": arc(d)
												});

			var title = GRAPHICS.getNode('title', {});
			path.append(title);
			arcG.append(path);

			var text = GRAPHICS.getNode('text', {"transform": `translate(${arcLabel.centroid(d)})`});

			var lines = "";
			if ((d.endAngle - d.startAngle) > 0.25) {
				lines = `${N[d.data]}`.split(/\n/);
			}

			var label = GRAPHICS.getNode('tspan', {});
			label.textContent = lines;
			text.append(label);

			var count = GRAPHICS.getNode('tspan', { "x": "0",
													"y": "1.1em",
													"font-weight": "bold"
												  });
			count.textContent = V[i];
			text.append(count);

			textG.append(text);
		}

		svg.append(textG);

	}


	/**
	 * Draw Pistol Correction Chart
	 * @function pistolCorrectionChart
	 * @memberof GRAPHICS
	 * @param {string} username
	 * @param {int} user_pk
	 * @param {string} user_secret_key
	 */
	my.pistolCorrectionChart = function(profiled_user_pk, user_pk, user_secret_key, start_date, end_date, gun_type) {
		$.post({
			url: config.URLs.pistol_correction,
			data: JSON.stringify({
				'user_pk': user_pk,
				'start_date': start_date,
				'end_date': end_date,
				'user_secret_key': user_secret_key,
				'session_pk': $(this).data('session_pk'),
				'profiled_user_pk': profiled_user_pk,
				'gun_type': gun_type
			}),
			dataType: 'json',
			contentType: 'application/json',
			headers: { 'X-CSRFToken': MANAGER.getCookie('csrftoken') }
		}).done(function(data) {

			my.rangeOfShots(data["data"]);
			var rawData = data["data"];


			var total = 0;
			var max = 0;

			for (let i = 0; i < rawData.length; ++i) {
				total += rawData[i]["value"];
				if (rawData[i]["value"] > max) {
				  max = rawData[i]["value"];
				}
			}

			var maxPercentage = max/total;
			var levels = [];

			for (let i = 0; i < 5; ++i) {
				levels.push(maxPercentage * (i/4));
			}

			var data = [];
			var others = 0;
			for (let i = 0; i < rawData.length; ++i) {
				if (rawData[i]["axis"] != "GREAT SHOT") {
					if (!(rawData[i]["value"]/total < .04)) {
						data.push(rawData[i]);
					} else {
						others += rawData[i]["value"];
					}
				}
			}
			data.push({"axis": "OTHERS", "value": others});

			my.pieChart(data);

			$("#pistol-correction-chart").empty();

			const svg = document.getElementById("pistol-correction-chart");
			svg.setAttribute("width", "100%");
			svg.setAttribute("height", "600");
			svg.setAttribute("viewBox", `0 0 200 200`);
			svg.setAttribute("transform", `scale(.9)`);

			var data = [
				data,
			];

			var color = d3.scaleOrdinal().range(["#CA5C62", "#CC333F", "#00A0B0"]);

			var radarChartOptions = {
				w: 190,
				h: 126,
				margin: margin,
				maxValue: 0.5,
				levels: 5,
				roundStrokes: true,
				color: color
			};

			my.radarChart(svg, data, radarChartOptions, levels);
		});
    }


	/**
	 * Draws the time series
	 * @function drawTimeSeries
	 * @memberof GRAPHICS
	 * @param {object} data
	*/
	my.drawTimeSeries = function(data) {

		for (let i = 0; i < data.length; i++) {
			data[i]["date"] = new Date(data[i]["date"]);
		}

		xScale = d3.scaleTime()
			.domain(d3.extent(data, d => d.date))
			.range([margin.left, width - margin.right]);

		function calculateVariance(scores) {
			if(!scores.length) {
				return 0;
			};
			const sum = scores.reduce((acc, val) => acc + val);
			const { length: num } = scores;
			const median = sum / num;
			let variance = 0;
			scores.forEach(num => {
				variance += ((num - median) * (num - median));
			});
			variance /= num;
			return variance;
		}

		var scores = [];
		for (let i=0; i<data.length; ++i) {
			scores.push(data[i]["average_score"]);
		}

		var stdDeviation = parseInt(Math.sqrt(calculateVariance(scores)));

		// take the lowest score of the session as the value here
		lowerBound = stdDeviation;

		if (data.length > 0) {
			yScale = d3.scaleLinear()
				.domain([lowerBound, d3.max(data, (d) => d.average_score)]).nice()
				.range([height - margin.bottom, margin.top]);
		} else {
			yScale = d3.scaleLinear()
				.domain([0, 1])
				.range([height - margin.bottom, margin.top]);
		}

		line = d3.line()
			.defined(d => !isNaN(d.average_score))
			.curve(d3.curveMonotoneX)
			.x(d => xScale(d.date))
			.y(d => yScale(d.average_score));

		$("#session-scores").empty();

		const svg = document.getElementById("session-scores");
		svg.setAttribute("width", "100%");
		svg.setAttribute("height", "600");
		svg.setAttribute("viewBox", `0 0 1600 400`);
		svg.setAttribute("style", "transform: translate(0, -150px)");

		var g = GRAPHICS.getNode('g', {});
		svg.append(g);

		if (data.length > 0) {
			var l = GRAPHICS.getNode('path', {
											"d": line(data),
											"fill": "none",
											"stroke": "steelblue",
											"stroke-width": 2.5,
											"stroke-linejoin": "round",
											"stroke-linecap": "round",
											"transform": "translate(50, 0)",
										});
			g.append(l);
		}

		var gX = GRAPHICS.getNode('g', { "transform": "translate(50, 550)",
										 "fill": "none",
										 "font-size": "10",
										 "font-family": "sans-serif",
										 "text-anchor": "middle"
										});

		var xPath = GRAPHICS.getNode('path', { "class": "domain",
											   "stroke": "currentColor",
											   "d": "M0,6V0.5H1400.5V6"
										    });

		gX.append(xPath);

		Date.prototype.addDays = function(days) {
			var date = new Date(this.valueOf());
			date.setDate(date.getDate() + days);
			return date;
		}

		function getDates(startDate, stopDate) {
			var dateArray = new Array();
			var currentDate = startDate;
			while (currentDate <= stopDate) {
				dateArray.push(new Date (currentDate));
				currentDate = currentDate.addDays(1);
			}
			return dateArray;
		}

		if (data.length > 6) {
			var dates = getDates(data[0]["date"], data[data.length-1]["date"]);
			var offset = parseInt(dates.length / 6);
		} else {
			var dates = [];

			data.forEach((element) => {
				dates.push(element.date);
			});

			var offset = 1;
		}

		for (let i = 0; i < dates.length; i = i + offset) {
			var tick = GRAPHICS.getNode('g', { "class": "tick",
											   "opacity": "1",
											   "transform": `translate(${xScale(dates[i])}, 0)`
											  });

			var line = GRAPHICS.getNode('line', { "stroke": "currentColor",
												  "y2": "-6"
											    });

			var text = GRAPHICS.getNode('text', { "fill": "currentColor",
												  "y": "-9",
												  "dy": "0em"
											    });

			const month = ["January", "February", "March", "April", "May",
						   "June", "July", "August", "September", "October",
						   "November", "December"];
			text.textContent = month[dates[i].getMonth()];
			tick.append(line);
			tick.append(text);
			gX.appendChild(tick);
		};

		g.appendChild(gX);

		var gY = GRAPHICS.getNode('g', { "transform": "translate(50, 0)",
										 "fill": "none",
										 "font-size": "10",
										 "font-family": "sans-serif",
										 "text-anchor": "end"
									   });

		var yPath = GRAPHICS.getNode('path', { "class": "domain",
											   "stroke": "currentColor",
											   "d": "M-6,550.5H0.5V10.5H-6",
											});
		gY.append(yPath);

		for (let i = stdDeviation; i < 100; i = i+3) {
			var tick = GRAPHICS.getNode('g', { "class": "tick",
												"opacity": "1",
												"transform": `translate(0, ${yScale(i)})`
												});

			var line = GRAPHICS.getNode('line', { "stroke": "currentColor",
												  "x2": "-6"
												});

			var text = GRAPHICS.getNode('text', { "fill": "currentColor",
												  "x": "-9",
												  "dy": "0.32em"
												});

			text.textContent = i;
			tick.append(line);
			tick.append(text);
			gY.appendChild(tick);
		}

		g.appendChild(gY);

		var xLabel = GRAPHICS.getNode('text', { "text-anchor": "end",
												"x": width * .1,
												"y": -70,
												"font-size": "10",
												"transform": "translate(550, 670)"
											});
		xLabel.textContent = "Months";
		svg.append(xLabel);

		var yLabel = GRAPHICS.getNode('text', { "text-anchor": "end",
												"x": -135,
												"y": 0,
												"dy": ".75em",
												"transform": "rotate(-90)",
												"font-size": "10"
											});
		yLabel.textContent = "Scores";
		svg.append(yLabel);
	}


	/**
	 * Draw Score Time Series
	 * @function scoreTimeSeries
	 * @memberof GRAPHICS
	 * @param {string} username
	 * @param {int} user_pk
	 * @param {string} user_secret_key
	 */
	my.scoreTimeSeries = function(profiled_user_pk, user_pk, user_secret_key, start_date, end_date, gun_type) {
		$.post({
			url: config.URLs.score_time_series,
			data: JSON.stringify({
				'user_pk': user_pk,
				'start_date': start_date,
				'end_date': end_date,
				'user_secret_key': user_secret_key,
				'session_pk': $(this).data('session_pk'),
				'profiled_user_pk': profiled_user_pk,
				'gun_type': gun_type
			}),
			dataType: 'json',
			contentType: 'application/json',
			headers: { 'X-CSRFToken': MANAGER.getCookie('csrftoken') }
		}).done(function(data) {
			my.drawTimeSeries(data["data"]);
		});
    }


	/**
	 * Draws the scoring breakdown chart
	 * @function drawScoringBreakdown
	 * @memberof GRAPHICS
	 * @param {object} data
	*/
	my.drawScoringBreakdown = function(data) {
		$("#scoring-breakdown").empty();

		const svg = document.getElementById("scoring-breakdown");
		svg.setAttribute("width", "100%");
		svg.setAttribute("height", "600");
		svg.setAttribute("viewBox", `0 0 500 400`);

		height = 600;
		width = 500;

		margin = {top: 50, right: 50, bottom: 50, left: 50};

		x = d3.scaleLinear()
			.domain([0, d3.max(data, d => d.value)])
			.range([margin.left, width - margin.right]);

		y = d3.scaleBand()
			.domain(data.map(d => d.score))
			.range([margin.top, height - margin.bottom])
			.padding(0.1);

		format = x.tickFormat(20);

		var g = GRAPHICS.getNode('g', { "fill": "steelblue",
									    "transform": "translate(0, -100)"
									  });

		for (let i = 0; i < data.length; i++) {
			const d = data[i];
			var rect = GRAPHICS.getNode('rect', { "x": x(0),
												  "y": y(d.score),
												  "width": x(d.value) - x(0),
												  "height": y.bandwidth()
												});
			g.append(rect);
		}

		svg.append(g);

		var text = GRAPHICS.getNode('g', {  "fill": "white",
											"text-anchor": "end",
											"style": "font: 12px sans-serif",
											"transform": "translate(0, -100)"
										});

		for (let i = 0; i < data.length; i++) {
			const d = data[i];
			var t = GRAPHICS.getNode('text', { "x": x(d.value) - 4,
											   "y": y(d.score) + y.bandwidth() / 2,
											   "dy": "0.35em"
											 });
			t.textContent = format(d.value);
			text.append(t);
		}

		svg.append(text);

		var gX = GRAPHICS.getNode('g', { "transform": "translate(5, -50)",
										 "fill": "none",
										 "font-size": "10",
										 "font-family": "sans-serif",
										 "text-anchor": "middle"
										});

		var gY = GRAPHICS.getNode('g', { "transform": "translate(50, -80)",
										 "fill": "none",
										 "font-size": "10",
										 "font-family": "sans-serif",
										 "text-anchor": "end"
									   });

		var path = GRAPHICS.getNode('path', { "class": "domain",
											  "stroke": "currentColor",
											  "d": "M0.5,50.5V550.5"
										    });

		gY.append(path);

		for (let i = 0; i < data.length; i++) {
			const d = data[i];
			var tick = GRAPHICS.getNode('g', { "class": "tick",
											   "opacity": "1",
											   "transform": `translate(0, ${y(d.score)})`
											});

			var line = GRAPHICS.getNode('line', { "stroke": "currentColor",
												  "x2": "-6"
												});

			var text = GRAPHICS.getNode('text', { "fill": "currentColor",
												  "x": "-9",
												  "dy": "0.32em"
												});

			text.textContent = parseInt(d.score);
			tick.append(line);
			tick.append(text);
			gY.appendChild(tick);
		};

		var xMax = d3.max(data, d => d.value);

		if (xMax > 5) {
			var xOffset = parseInt(xMax/5);
		} else {
			var xOffset = 1;
		}

		for (let i = 0; i <= xMax; i = i+xOffset) {
			var tick = GRAPHICS.getNode('g', { "class": "tick",
					"opacity": "1",
					"transform": `translate(${x(i)}, 0)`
				});

			var line = GRAPHICS.getNode('line', { "stroke": "currentColor",
					"y2": "-6"
					});

			var text = GRAPHICS.getNode('text', { "fill": "currentColor",
					"y": "-9",
					"dy": "0em"
					});

			text.textContent = parseInt(x.invert(x(i)));
			tick.append(line);
			tick.append(text);
			gX.appendChild(tick);
		}

		svg.appendChild(gX);
		svg.appendChild(gY);

		var title = GRAPHICS.getNode('text', { "text-anchor": "end",
										       "x": width,
										       "y": -80,
											   "font-size": "12"
										    });
		title.textContent = "Scoring Breakdown of Shots";
		svg.append(title);

		var xLabel = GRAPHICS.getNode('text', { "text-anchor": "end",
												"x": width * .1,
												"y": -70,
												"font-size": "10"
											});
		xLabel.textContent = "Count";
		svg.append(xLabel);

		var yLabel = GRAPHICS.getNode('text', { "text-anchor": "end",
												"x": -135,
												"y": 0,
												"dy": ".75em",
												"transform": "rotate(-90)",
												"font-size": "10"
											});
		yLabel.textContent = "Score";
		svg.append(yLabel);
	}


	/**
	 * Draw Scoring Breakdown
	 * @function scoringBreakdown
	 * @memberof GRAPHICS
	 * @param {string} username
	 * @param {int} user_pk
	 * @param {string} user_secret_key
	 */
	my.scoringBreakdown = function(profiled_user_pk, user_pk, user_secret_key, start_date, end_date, gun_type) {
		$.post({
			url: config.URLs.scoring_breakdown,
			data: JSON.stringify({
				'user_pk': user_pk,
				'start_date': start_date,
				'end_date': end_date,
				'user_secret_key': user_secret_key,
				'session_pk': $(this).data('session_pk'),
				'profiled_user_pk': profiled_user_pk,
				'gun_type': gun_type
			}),
			dataType: 'json',
			contentType: 'application/json',
			headers: { 'X-CSRFToken': MANAGER.getCookie('csrftoken') }
		}).done(function(data) {
			my.drawScoringBreakdown(data["data"]);
		});
    }


    return my;
}

());

