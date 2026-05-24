// "use strict"

  (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
  (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
  })(window,document,'script','https://www.google-analytics.com/analytics.js','ga');

  ga('create', 'UA-101425983-1', 'auto');
  ga('send', 'pageview');

const colors = {
	DARKRED: "#C2272C",
	RED: "#DB061F",
	DARKGRAY: "#B2B2B2",
	LIGHTGRAY: "#E6E6E4",
	GREEN: "green",
	BLACK: "#333",
	WHITE: "white"
}

const LIGHT = true;
var point = {};
var animateTrigger = false;
var currentShot = 0;
var loaded_session_pks = [];

const config = {
	IDs: {
		search_results: "search-results",
		user_search_box: "user-search-box",
		group_search_box: "group-search-box"
	},
	URLs: {
		groups: "/groups",
		session: "/session",
		user: "/user",
		search_groups: "/search-groups",
		search_people: "/search-people",
		get_following: "/get-following",
		get_session: "/get-session",
		delete_sessions: "/delete-sessions",
		home: "/",
		verify: "/verify",
		login_with_facebook: "/login-with-facebook",
		create_user: "/create-user",
		add_to_group: "/add-to-group",
		delete_from_group: "/delete-from-group",
		join_group: "/join-group",
		leave_group: "/leave-group",
		create_group: "/create-group",
		edit_group: "/edit-group",
		delete_group: '/delete-group',
		follow: "/follow",
		unfollow: "/unfollow",
		accept_follower: "/accept-follower",
		remove_follower: "/remove-follower",
		post_comment: "/post-comment",
		weekly_shot_count: "/weekly-shot-count",
		session_history: "/session-history",
		shot_correction: "/shot-correction",
		session_unique_dates: "/session-unique-dates",
		sparkline_stats: "/sparkline-stats",
		user_awards: "/user-awards",
		sessions_with_angles: "/sessions-with-angles",
		firearm_stats: "/firearm-stats",
		mark_notifications_read: "/mark-notifications-read",
		send_recovery_email: "/recover-password",
		laser_academy_registration: "/registration/activate/",
		raven_registration: "/registration/activate-raven/",
		submit_feedback: "/submit-feedback",
		update_profile_pic: "/update-profile-pic",
		update_profile_settings: "/update-profile-settings",
		default_pic: "https://mantis-media.s3.amazonaws.com/static/mantisx/profile_default.jpg",
		add_order_serial: "/add-order-serial",
		get_user_gun_types: "/get-user-gun-types",
		pistol_correction: "/pistol-correction",
		score_time_series: "/score-time-series",
		scoring_breakdown: "/scoring-breakdown",
		delete_account: "/delete-account"
	},
	graphics: {
		DARKRED: colors.DARKRED,
		RED: colors.RED,
		DARKGRAY: colors.DARKGRAY,
		LIGHTGRAY: colors.LIGHTGRAY,
		GREEN: colors.GREEN,
		axis_rings: "#C2272D",
		trace_point_radius: .5,
		trace_path_width: 2,
		trace_path_width_focus: 10,
		font_family: 'Montserrat, Roboto, Arial',
		trace_background_color: colors.BLACK,
		trace_ring_color: colors.RED,
		trace_ring_width: 2,
		trace_hold_color: "#3185FC",
		trace_pull_color: "#F9DC5C",
		trace_shot_color: "#FF334B",
		trace_marker_color: "#FFFFFF",
		trace_show_score: true,
		trace_font_color: "white",
		trace_font_size: 7,
		trace_font_family: "Montserrat, Roboto, Arial",
		trace_font_weight: "bold",
		trace_score_show: true,
		trace_axis_width: 2,
		trace_axis_color: "#B2B2B2",
		trace_show_hold_segment: true,
		trace_show_pull_segment: true,
		trace_show_shot_segment: true,
		trace_show_points: true,
		spider_sector_color: colors.RED,
		spider_sector_border_color: "white",
		spider_sector_border_width: 1,
		spider_sector_border_hover_color: colors.BLACK,
		spider_target_background_color: colors.LIGHTGRAY,
		spider_target_border_color: colors.DARKGRAY,
		spider_target_border_width: 3,
		spider_score_font_family: "Montserrat, Roboto, Arial",
		spider_score_font_color: LIGHT ? colors.BLACK : colors.WHITE,
		spider_score_font_size: 27,
		spider_label_font_family: "Montserrat, Roboto, Arial",
		spider_label_font_color: LIGHT ? colors.BLACK : colors.WHITE,
		spider_label_font_size: 10,
		spider_label_show: false,
		spider_great_shot_color: colors.BLACK,
		spider_great_shot_radius: 3,
		spider_donut_hole_color: "transparent",
		linegraph_background_color: colors.LIGHTGRAY,
		linegraph_hover_color: "rgba(150, 150, 150, .7)",
		linegraph_line_color: colors.BLACK,
		linegraph_point_radius: 2.5,
		linegraph_point_color: colors.RED,
		linegraph_point_border_color: colors.BLACK,
		linegraph_point_border_width: 1,
		linegraph_axis_color: colors.BLACK,
		linegraph_axis_width: 2,
		linegraph_font_family: "Montserrat, Roboto, Arial",
		linegraph_font_weight: "bold",
		linegraph_font_size: 8,
		linegraph_font_color: colors.BLACK,
		colchart_column_color: colors.DARKGRAY,
		colchart_highlighted_column_color: colors.RED,
		universe_background_color: colors.LIGHTGRAY,
		universe_border_color: colors.DARKGRAY,
		universe_star_color: colors.RED
	},
	cutoffs: {
		great_shot_score: 95,
		spider_max_score: 100, // Increasing this decreases the size of the sectors on the spiderchart, and vice versa.
	}
};

function assert(condition, message) {
	if (!condition) {
		message = message || "Assertion failed!";
		EFFECTS.snackBar(message);
		throw message;
	}
}

const STRING_FORMAT = (function() {
	// Adds Python-like string formatting.
	// Fx "My name is {0} {1}.".f("Jared", "Nielsen") -> "My name is Jared Nielsen."
	String.prototype.format = String.prototype.f = function() {
		var s = this,
			i = arguments.length;

		while (i--) {
			s = s.replace(new RegExp('\\{' + i + '\\}', 'gm'), arguments[i]);
		}
		return s;
	};
}());

const TIMER = (function() {
	// Times a function and logs the result in seconds to the console
	return {
		timeIt: function(name, func) {
			const start = new Date().getTime() / 1000;
			const result = func();
			const end = new Date().getTime() / 1000;
			const runtime = (end-start).toFixed(5);
			console.log("{0} executed in {1} seconds".f(name, runtime));
			return result;
		}
	};
}());

const LOADER = (function() {
	let my = {};

	my.loadOfflineScript = function(url) {
		document.write('<script src="{0}"><\/script>'.f(url));
	};

	return my;
}());

/**
 * Contains all SVG drawing functions.
 * @constructor
 */
const GRAPHICS = (function() {
	const my = {};

	/**
	 * Returns an SVG element.
	 * @function getNode
	 * @memberof GRAPHICS
	 * @inner
	 * @param {string} n - element type
	 * @param {object} v - element attributes
	 * @returns {object} SVG element
	 */
	my.getNode = function(n, v) {
	  n = document.createElementNS("http://www.w3.org/2000/svg", n);
	  for (let p in v)
		n.setAttributeNS(null, p, v[p]);
	  return n;
	}

	my.drawSparkline = function(div_id, data_array, color_string, width) {
		if (data_array.length > 1) {
			google.charts.load('current', {'packages':['corechart']});
			google.charts.setOnLoadCallback(function() {
				let data = new google.visualization.DataTable();
				data.addColumn('string', 'Index');
				data.addColumn('number', 'CO2');

				data_array.forEach((value, index) => {
					if (index > 0) {
						data.addRow([index.toString(), value[0]]);
					}
				});

				let options = {
					width: width,
					height: 30,
					legend: 'none',
					chartArea: {width: '95%', height: '80%'},
					enableInteractivity: false,
					hAxis: {
						textPosition: 'none',
						gridlines: {color: 'transparent'},
						baselineColor: 'transparent'
					},
					vAxis: {
						textPosition: 'none',
						gridlines: {color: 'transparent'},
						baselineColor: 'transparent'
					},
					series: {
						0: { color: color_string }
					}
				};

				let chart = new google.visualization.LineChart(document.getElementById(div_id));
				chart.draw(data, options);
			});
		} else {
			console.error("Data array is empty or not properly formatted");
		}
	};

	my.drawShotsSparkline = function(div_id, shots, color_string) {
		if (shots != []) {
			let data_array = [
				['Shot Score'],
			];
			shots.forEach(function(shot) {
				data_array.push([parseFloat(shot.score)]);
			});
			my.drawSparkline(div_id, data_array, color_string, 200);
		};
	}

	my.setSmallMultiplesTraceSettings = function() {
        config.graphics.trace_ring_width = 2/3;
        config.graphics.trace_show_points = false;
        config.graphics.trace_background_color = colors.DARKGRAY;
        config.graphics.trace_axis_width = 0;
	}

	my.setFullTraceSettings = function() {
		config.graphics.trace_ring_width = 1;
		config.graphics.trace_show_points = true;
		config.graphics.trace_background_color = colors.BLACK;
		config.graphics.trace_axis_width = 1;
	}

	my.drawUniverse = function(sessions, user_pk, user_secret_key, options) {
		// CONSTELLATION VIEW

		const SVG_CX = 150;
		const SVG_CY = 150;
		const SVG_RADIUS = 149;
		let svg = document.getElementById('universe-history');
		let background_circle = my.getNode('circle', {
			'cx': SVG_CX,
			'cy': SVG_CY,
			'r': SVG_RADIUS,
			'fill': config.graphics.universe_background_color,
			'stroke': config.graphics.universe_border_color
		});
		svg.appendChild(background_circle);

		let now = new Date(Date.now());
		const one_day = 24*60*60*1000;
		$.each(sessions, function(pk, session) {
			let days_since_session = (now - new Date(session.date))/one_day;
			if(days_since_session > 14) {
				console.log("STOP!");
				return;
			}
			let big_r = 0+(days_since_session*SVG_RADIUS/14);
			// let big_r = Math.floor(Math.random()*100)+50;
			let big_angle = CALC.getSessionAverageAngle(session);
			// let big_angle = Math.random()*(2*Math.PI);//session.angle;
			let cx = SVG_CX+big_r*Math.cos(big_angle);
			let cy = SVG_CY+big_r*(-1*Math.sin(big_angle));
			let r = Math.sqrt(15-(15/50)*(session.average_score-50));

			let opacity = Math.exp(-1*days_since_session);
			opacity = 1.5 - (days_since_session/14);
			// console.log(session.date, days_since_session, opacity, cx, cy);
			let session_circle = my.getNode('circle', {
				'class': 'constellation-session',
				'data-session_pk': pk,
				'cx': cx,
				'cy': cy,
				'r': r,
				'fill': config.graphics.universe_star_color,
				'opacity': opacity
			});
			session_circle.addEventListener('mouseover', function(e) {
				session_circle.setAttribute('r', 10);
			});
			session_circle.addEventListener('mouseout', function(e) {
				session_circle.setAttribute('r', r);
			});
			session_circle.addEventListener('click', function(e) {
				console.log(session);
			});
			svg.appendChild(session_circle);
			my.addUpdateSpiderOnClickHandler(session_circle, undefined, user_pk, user_secret_key, session.pk, options)

		});
	};

	/**
	 * Draws a session column chart in the given SVG block.
	 * The div should have a ViewBox 250x150.
	 * The 'pivot' is the session id, fx (rect id='session32col')
	 * @function drawSessionsColumn
	 * @memberof GRAPHICS
	 * @param {object[]} sessions - list of (pk, score) tuples
	 * @param {object} options
	 * @param {string} options.column_id
	 * @param {string} options.spider_id
	 * @param {number} options.spider_width
	 * @param {string} options.line_id
	 * @param {number} options.line_width
	 * @param {string} options.trace_id
	 * @param {number} options.trace_width
	 * @param {string} options.url - Optional link on spiderchart click.
	 */
	my.drawSessionsColumn = function(session_scores, sessions, user_pk, user_secret_key, options) {
		var designOptions = {
			width: options.column_width || 250,
			height: 150,
			scale: 1,
			backgroundColor: 'none',
			textColor: colors.BLACK,
			axisColor: '#CACACA',
			columnColor: config.graphics.DARKGRAY
		};
		var svg = document.getElementById(options.column_id);
		//svg.style['overflow'] = 'visible'; // display tooltips
		//var background = my.getNode('rect', { 'x': 0, 'y': 0, 'width': designOptions.width*designOptions.scale, 'height': designOptions.height*designOptions.scale, 'fill': designOptions.backgroundColor});
		//svg.appendChild(background);

		// Draw columns
		var columns = my.getNode('g', {
			'class': 'session_score',
		});
		var columns_child = my.getNode('g', { 'class': 'session_score_child' });
		session_scores.forEach(function(session, i, arr) {
			// var svgIndex = columnDisplayIndex(i, arr.length);
			let svgIndex = i;
			var score = Math.round(parseInt(session.average_score));
			options.thisColumnColor = (svgIndex == 0 ? config.graphics.RED : designOptions.columnColor);
			var col = getColumn(score, options.thisColumnColor, "placeholder", '#282729', session.pk, svgIndex, i+1);
			my.addUpdateSpiderOnClickHandler(col, sessions[session.pk], user_pk, user_secret_key, session.pk, options);
			columns_child.appendChild(col);
		})

		columns.appendChild(columns_child);
		svg.appendChild(columns);

		var yaxis = getColumnYAxis(designOptions);
		svg.appendChild(yaxis);


		svg.style.width = columns.getBoundingClientRect().width + 60;
		svg.parentElement.scrollLeft = 1000000;
		svg.parentElement.addEventListener('scroll', function(evt) {
			$(yaxis).find('rect').attr('x', this.scrollLeft);
			$(yaxis).find('text').attr('x', 20+this.scrollLeft);
			$(yaxis).find('line').attr('x1', 40+this.scrollLeft).attr('x2', 40+this.scrollLeft);
		});

		// var x_min = 40 * columnDisplayIndex(0, session_scores.length);
		// my.addPanning('.session_score', '.session_score_child', x_min, designOptions.width); //offsetWidth is likely 250
	}

	/**
	 * Returns an SVG <g> element containing the colored column and its index,
	 * so they scroll smoothly together.
	 * @function getColumn
	 * @memberof GRAPHICS
	 * @inner
	 * @param {number} score
	 * @param {string} colColor
	 * @param {string} textColor
	 * @param {number} session_pk
	 * @param {number} svgIndex - fx [-3,-2,...,4], columnDisplayIndex(trueIndex)
	 * @param {number} trueIndex - [0,1,...,7]
	 * @returns {object} col
	 */
	function getColumn(score, colColor, date, textColor, session_pk, svgIndex, trueIndex) {
		const x_begin = 60+40*svgIndex;
		const width = 30;
		const x_mid = x_begin + width/2;
		const y_tt_begin = 150;

		const col_g = my.getNode('g', {});
		const col = my.getNode('rect', {
			'x': x_begin,
			'y': 105-score,
			'width': 30,
			'height': score,
			'fill': colColor,
			'id': 'session'+session_pk+'col',
			'class': 'chart-column'
		});
		const label_g = my.getNode('g', {});
		const label_text = my.getNode('text', {
			'x': x_mid,
			'y': 130,
			'fill': textColor,
			'text-anchor': 'middle',
			'alignment-baseline': 'central',
			'dominant-baseline': 'central',
			'font-size': 14,
			'font-family': config.graphics.font_family,
			'stroke-width': .1,
			'cursor': 'pointer',
		});
		const label_border = my.getNode('circle', {
			'cx': x_mid,
			'cy': 130,
			'r': 17,
			'fill': 'transparent',
			'stroke-width': 1,
			'cursor': 'pointer'
		});
		const tooltip_g = my.getNode('g', {
			'id': 'session'+session_pk+'tooltip',
			'class': 'session-tooltip'
		});
		const tooltip_border_arrow = my.getNode('rect', {
			'x': x_begin+10,
			'y': y_tt_begin-5,
			'width': 10,
			'height': 10,
			//'transform': 'rotate(45deg)',
			'transform-origin': 'center',
			'fill': '#fff',
			'stroke': 'rgba(0, 0, 0, .15)',
			'stroke-dasharray': '10,20,10', // only get top sides
			'box-shadow': '0 0 5px rgba(0, 0, 0, .5)',
		});
		tooltip_border_arrow.style.transform = 'rotate(45deg)';

		const x_tt_begin = x_begin-5;
		const tt_width = 155;
		const tooltip_border = my.getNode('rect', {
			'x': x_tt_begin,
			'y': y_tt_begin,
			'width': tt_width,
			'height': 30,
			'rx': 15,
			'rx': 15,
			'stroke': 'rgba(0, 0, 0, .15)',
			'stroke-width': '1px',
			'box-shadow': '0 0 5px rgba(0, 0, 0, .5)',
			'color': config.graphics.DARKRED,
			'fill': '#fff'
		});
		const tooltip_text = my.getNode('text', {
				'id': 'session{0}tooltip-text'.f(session_pk),
				'x': x_tt_begin + tt_width/2,
				'y': y_tt_begin+15,
				'fill': config.graphics.DARKRED,
				'text-anchor': 'middle',
				'alignment-baseline': 'central',
				'dominant-baseline': 'central',
				'font-size': 14,
				'font-family': config.graphics.font_family,
				'stroke-width': .1,
		});
		tooltip_text.textContent = 'fake';

		tooltip_g.appendChild(tooltip_border);
		tooltip_g.appendChild(tooltip_border_arrow);
		tooltip_g.appendChild(tooltip_text);
		// tooltip_g is never added due to issues rendering outside the SVG. possible fix later
		label_text.textContent = trueIndex;
		label_g.appendChild(label_border);
		label_g.appendChild(label_text);
		addLabelEventHandler(label_g, label_text, label_border, date, session_pk);
		col_g.appendChild(col);
		col_g.appendChild(label_g);
		return col_g;
	}

	function addLabelEventHandler(label_g, label_text, label_border, text, session_pk) {
		function hoverHandler() {
			return function() {
				label_border.setAttribute('stroke', config.graphics.DARKRED);
				label_border.setAttribute('fill', config.graphics.LIGHTGRAY);
			}
		}
		function exitHandler() {
			return function() {
				label_border.setAttribute('stroke', 'none');
				label_border.setAttribute('fill', 'transparent');
			}
		}
		function clickHandler() {
			return function() {
				// location.href = config.URLs.session + "/" + session_pk;
			}
		}
		label_g.addEventListener("mouseover", hoverHandler());
		label_g.addEventListener("mouseout", exitHandler());
		label_g.addEventListener("click", clickHandler());
		label_g.addEventListener("click", clickHandler());
	}

	/**
	 * Maps [0,1,2,3,4]->[0,1,2,3,4] and [0,1,2,3,4,5,6]->[-2,-1,0,1,2,3,4]
	 * @function columnDisplayIndex
	 * @memberof GRAPHICS
	 * @inner
	 * @param {number} i - initial array location, 0-indexed
	 * @param {number} session_count - number of sessions
	 * @returns {number} display index, 0-indexed, stops at 4
	 */
	function columnDisplayIndex(i, session_count) {
		return i - Math.max(0, session_count-5);
	}

	// Draw y-axis numbers on top of white background (40x110 to left)
	/**
	 * Draw y-axis numbers and vertical line on top of white background in box (0,0)->(40,110).
	 * @function getColumnYAxis
	 * @memberof GRAPHICS
	 * @inner
	 * @param {object} designOptions
	 * @param {string} designOptions.textColor
	 * @param {string} designOptions.axisColor
	 * @returns {object} SVG node
	 */
	function getColumnYAxis(designOptions) {
		var yaxis = my.getNode('g', {});
		var yaxis_background = my.getNode('rect', { 'x': 0, 'y': 0, 'width': 40, 'height': designOptions.height, 'fill': 'white' });
		yaxis.appendChild(yaxis_background);
		for(var i = 0; i < 6; i++) {
			var text = my.getNode('text', {
				'x': 20,
				'y': 20*i,
				'stroke': designOptions.textColor,
				'text-anchor': 'end',
				'alignment-baseline': 'hanging',
				'dominant-baseline': 'hanging',
				'font-size': 10,
				'font-family': config.graphics.font_family,
				'stroke-width': .7,
			});
			text.textContent = 100 - 20*i;
			yaxis.appendChild(text);
		}
		// Draw y-axis
		var vertical_line = my.getNode('line', { 'x1': 40, 'y1': 5, 'x2': 40, 'y2': 105, 'stroke': designOptions.axisColor });
		yaxis.appendChild(vertical_line);
		return yaxis;
	}

	/**
	 * When the column is clicked, it will either link to a new page or draw a spider target,
	 * depending on whether options.url or options.spider_id is set.
	 * If both are set, the link takes priority. If neither are set, nothing happens.
	 * @function addClickHandler
	 * @memberof GRAPHICS
	 * @inner
	 * @param {object} col - SVG node
	 * @param {object} session
	 * @param {object} options
	 * @param {string} options.url Link to redirect to.
	 * @param {string} options.spider_id Div to redraw.
	 * @returns {object} col - SVG node
	 */
	my.addUpdateSpiderOnClickHandler = function(col, session, user_pk, user_secret_key, session_pk, options) {
		/*
		This functions adds on-click listeners to all of the highlights
		and sessions. So that when we click it, it'll request /get-session.
		Spider graph visualizes last session with their shots on a graph.
		Whenever we click another session, it loads the specific data
		of the session async.
		*/

		function onSessionReceivedHandler(session) {
			my.updateSpiderTarget(session, options);

			if (session["drill_name"] == "Holster Draw Analysis") {
				PISTOL_UTILITIES.activeHolsterDraw();
				options.holster_id = "holster-draw";
				my.generateHolsterDraw(session, options);
			}

			if(options.show_delete_button) {
				$('#delete_modal_menu').removeClass('hide');
				$('#delete_content').click(function(e) {
					if (session_pk == $('.focus').data('session_pk')) {
						API.deleteSession(user_pk, user_secret_key, session_pk);
					}
				});
			}
		}

		// Closures and anonymous functions
		function clickHandler() {
			return function() {
				GRAPHICS.removeTraceView()
				my.highlightSessionSelectors(session_pk);
				if(session) {
					onSessionReceivedHandler(session);
				} else {
					API.loadSession(options, session_pk, user_pk, user_secret_key, onSessionReceivedHandler);
				}
			}
		}
		col.addEventListener("click", clickHandler());
	}

	my.highlightSessionSelectors = function(session_pk) {
		$('.focus').removeClass('focus');
		$('[data-session_pk='+session_pk+']').addClass('focus');
	}

	my.generateHolsterDraw = function(session, options) {
		PISTOL_UTILITIES.drawHolsterDrawAnalysis(session.shots, session.right_handed, session.fire_type_display, session.drill_name, options);
		PISTOL_UTILITIES.drawStrokeOverlay(session.shots, options);
		PISTOL_UTILITIES.populateStrokeOverlayMultiples(session, options);
	}

	my.updateSpiderTarget = function(session, options) {
		// Spider Target is updated and the shot trace-views are visualized
		if(options.url) { options.url = MANAGER.getSessionLink(session.pk); }

		// display only if the mode is pistol
		if (options.mode == "pistol") {
			my.drawSpiderTarget(session, options);
			my.drawShotsSparkline('shots-sparkline', session.shots, "#DB061F");
		}

		my.highlightColumn(session);
		$('#session-shot-count').text(session.shots.length);
		my.drawLineGraph(session.shots, options);
		EFFECTS.populateTraceviewSmallMultiples(session, options);
		EFFECTS.populateSessionComments(session);
		EFFECTS.populateSessionWithNotes(session["notes"]);
		EFFECTS.populateSessionImage(session["extras"]["server_image_uri"])

		if(options.trace_id) {
			if (options["mode"] == 'pistol') {
				PISTOL_UTILITIES.drawTraceview(options.trace_id, session.shots[0], options);
			} else if (options["mode"] == 'archery') {
				ARCHERY_UTILITIES.drawTraceview(options.trace_id, session.shots[0], options);
			} else if (options["mode"] == 'shotgun') {
				SHOTGUN_UTILITIES.drawTraceview(options.trace_id, session.shots[0], options);
			}
		}
		if(options.show_delete_button) {
			$('#session-delete-button').text('Delete?').show().click(function(e) {
				API.deleteSession()
			})
		}
	}

	/**
	 * On the column chart, return all columns to their default color and highlight the selected one.
	 * Hides all tooltips except the highlighted column's tooltip.
	 * @function highlightColumn
	 * @memberof GRAPHICS
	 * @param {object} session
	 * @param {string} defaultColor - default DARKGRAY
	 * @param {string} highlightColor - default config.graphics.RED
	 */
	my.highlightColumn = function(session) {
		var cols = document.getElementsByClassName('chart-column');
		for(let i = 0; i < cols.length; i++) {
			cols[i].style.fill = config.graphics.colchart_column_color;
		}
		const highlightedCol = document.getElementById('session{0}col'.f(session.pk));
		if(highlightedCol) {
			highlightedCol.style.fill = config.graphics.colchart_highlighted_column_color;
		}
	};

	/**
	 * Populates and displays the tooltip with id 'session32index', where 32 is the session pk.
	 * @function writeTooltip
	 * @memberof GRAPHICS
	 * @param {object} session
	 */
	my.writeTooltip = function(session) {
		var date = MANAGER.prettyDate(session.date);

		var tooltip = document.getElementById('session{0}tooltip-text'.f(session.pk));
		tooltip.textContent = date;
		tooltip.style.display = 'inline';
	}

	/**
	 * Draws a line graph in the given SVG div. ViewBox 200x100.
	 * @function drawLineGraph
	 * @memberof GRAPHICS
	 * @param {object[]} shots
	 * @param {object[]} options
	 */
	my.drawLineGraph = function(shots, options) {
		const strokeColor = options.strokeColor || 'black';
		const pointColor = options.pointColor || config.graphics.RED;
		const average_score = (shots.length > 0 ? shots.reduce(function(a, b) { return a+parseFloat(b.score) }, 0)/shots.length : 85);

		$('#'+options.line_id).show().children().remove();
		const svg = document.getElementById(options.line_id);
		if(svg) {
			const x_min = 30*lineDisplayIndex(0, shots.length);
			const zoom = shouldZoomIn(shots);

			const graphArea = my.getNode('g', { class: 'graph'});
			const graphArea_child = my.getNode('g', { class: 'graph_g' });
			const background = getBackground(config.graphics.linegraph_background_color);
			const rects = getShotRectangles(shots, options.trace_id); // highlight on focus
			const dashed_average = getDashedAverage(average_score, 35+x_min, zoom);
			const lines = getLines(shots, strokeColor, pointColor, zoom);
			const yAxis = getLineYAxis();
			const yAxisScores = getYAxisScores(shots, zoom);

			graphArea_child.appendChild(rects);
			graphArea_child.appendChild(dashed_average);
			graphArea_child.appendChild(lines);
			graphArea.appendChild(graphArea_child);

			svg.appendChild(background);
			svg.appendChild(graphArea);
			svg.appendChild(yAxis);
			svg.appendChild(yAxisScores);

			my.addPanning('.graph', '.graph_g', x_min, options.line_width);
		}
	}
	/**
	 * Returns an SVG object background that will fill its parent.
	 * @function getBackground
	 * @memberof GRAPHICS
	 * @inner
	 * @param {string} backgroundColor
	 * @returns {object} background (SVG object)
	 */
	function getBackground(backgroundColor) {
		return my.getNode('rect', { width: '100%', height: '100%', fill: backgroundColor });
	}
	/**
	 * Maps [0,1,2,3,4,5]->[0,1,2,3,4,5] and [0,1,2,3,4,5,6,7]->[-2,-1,0,1,2,3,4,5]
	 * @function lineDisplayIndex
	 * @memberof GRAPHICS
	 * @inner
	 * @param {number} i - 0-based index
	 * @param {number} shot_count - number of shots
	 * @returns {number} index with max value 5.
	 */
	function lineDisplayIndex(i, shot_count) {
		return i - Math.max(0, shot_count-6);
	}
	/**
	 * Draw the background onto the line graph, for detecting all clicks. All rectangles are drawn, but only the last six are visible.
	 * @function getShotRectangles
	 * @memberof GRAPHICS
	 * @inner
	 * @param shots {object[]}
	 * @param trace_id {string}
	 * @param backgroundColor {string}
	 * @returns {object} rects (SVG object)
	 */
	function getShotRectangles(shots, trace_id) {
		var rects = my.getNode('g', {});
		shots.forEach(function(shot, i, arr) {
			var svgIndex = lineDisplayIndex(i, arr.length);
			var rect = getShotRectangle(25+30*(svgIndex), 0, 30, 100, shot, trace_id);
			rects.appendChild(rect); // Prompt to click on shot
		});
		return rects;
	}
	/**
	 * Create the background click area for a single shot.
	 * @function getShotRectangle
	 * @memberof GRAPHICS
	 * @inner
	 * @param x {number}
	 * @param y {number}
	 * @param width {number}
	 * @param height {number}
	 * @param defaultColor {string}
	 * @param focusColor {string}
	 * @param shot {object}
	 * @param trace_id {string}
	 * @returns {object} rect (SVG object)
	 */
	function getShotRectangle(x, y, width, height, shot, trace_id, index) {
		var shotRect = my.getNode('rect', {
			x: x,
			y: y,
			width: width,
			height: height,
			fill: 'transparent'
		});
		shotRect.addEventListener('mouseover', function() {
			this.style.fill = config.graphics.linegraph_hover_color;
		});
		shotRect.addEventListener('mouseout', function() {
			this.style.fill = 'transparent';
		});
		const my_trace_id = trace_id;
		const my_shot = shot;
		shotRect.addEventListener("click", function() {
				var width = $('#'+trace_id).css('width');
				if (options["mode"] == 'pistol') {
					PISTOL_UTILITIES.drawTraceview(trace_id, shot, {'trace_width': width});
				} else if (options["mode"] == 'archery') {
					ARCHERY_UTILITIES.drawTraceview(trace_id, shot, {'trace_width': width});
				} else if (options["mode"] == 'shotgun') {
					SHOTGUN_UTILITIES.drawTraceview(trace_id, shot, {'trace_width': width});
				}

				my.highlightTraceviewBubble(index);
				window.event.cancelBubble = true;
		});
		return shotRect;
	}

	my.highlightTraceviewBubble = function(index) {

	}

	/**
	 * Returns a y-axis SVG object.
	 * @function getLineYAxis
	 * @memberof GRAPHICS
	 * @inner
	 * @param {string} strokeColor
	 * @returns {object} yaxis (SVG object)
	 */
	function getLineYAxis() {
		return my.getNode('line', {
			x1: 25,
			y1: 5,
			x2: 25,
			y2: 95,
			stroke: config.graphics.linegraph_axis_color,
			'stroke-width': config.graphics.linegraph_axis_width,
		});
	}

	/**
	 * Returns a dashed line SVG object parallel to the x-axis, the average of all scores.
	 * @function getDashedAverage
	 * @memberof GRAPHICS
	 * @inner
	 * @param {number} average - [0,100]
	 * @param {string} strokeColor
	 * @param {number} x-min - Pixel location of leftmost (possibly hidden) shot rectangle.
	 * @returns {object} dashed_average (SVG object)
	 */
	function getDashedAverage(average, x_min, zoom) {
		const y = yFromScore(zoom ? stretchScore(average) : average);
		return my.getNode('line', {
			'stroke-dasharray': '3,3',
			x1: x_min,
			y1: y,
			x2: 190,
			y2: y,
			stroke: config.graphics.linegraph_axis_color,
			'stroke-width': config.graphics.linegraph_axis_width,
			'pointer-events': 'none'
		});
	}

	/**
	 * Returns an SVG object with "20-40-60-80-100" listed vertically.
	 * @function getYAxisScores
	 * @memberof GRAPHICS
	 * @inner
	 * @param {object[]} shots
	 * @param {string} backgroundColor
	 * @param {string} strokeColor
	 * @returns {object} scores (SVG object)
	 */
	function getYAxisScores(shots, zoom) {
		var scores = my.getNode('g', { 'class': 'scores' });
		var background = my.getNode('rect', { x: 0, y: 0, width: 25, height: '100%', fill: config.graphics.linegraph_background_color });
		scores.appendChild(background);
		const begin = zoom ? 70 : 0;
		const inc = zoom ? 10 : 20;
		for(let i = begin; i <= 100; i += inc) {
			const text = my.getNode('text', {
				x: 20,
				y: yFromScore(zoom ? stretchScore(i) : i),
				'text-anchor': 'end',
				'alignment-baseline': 'middle',
				'dominant-baseline': 'middle', // support Firefox
				'font-size': config.graphics.linegraph_font_size,
				'font-weight': config.graphics.linegraph_font_weight,
				'font-family': config.graphics.linegraph_font_family,
				'fill': config.graphics.linegraph_font_color,
			});
			text.textContent = i;
			scores.appendChild(text);
		}
		return scores;
	}

	/**
	 * Returns a line graph SVG object connecting all the scores.
	 * @function getLines
	 * @memberof GRAPHICS
	 * @inner
	 * @param {object[]} shots
	 * @param {string} strokeColor
	 * @param {string} pointColor
	 * @returns {object} lines (SVG object)
	 */
	function getLines(shots, strokeColor, pointColor, zoom) {
		// Display index [0, 1, 2, 3, 4] with [...-3, -2, -1] hidden to the left
		var lines = my.getNode('g', { class: 'lines' });
		for(let i = 0; i < shots.length; i++) {
			const svgIndex = i - Math.max(0, shots.length-6);
			const shot1y = yFromScore(zoom ? stretchScore(shots[i].score) : shots[i].score);
			if(i != shots.length-1) {
				const shot2y = yFromScore(zoom ? stretchScore(shots[i+1].score) : shots[i+1].score);
				lines.appendChild(my.getNode('line', {
					x1: 10+30*(svgIndex+1),
					y1: shot1y,
					x2: 10+30*(svgIndex+2),
					y2: shot2y,
					stroke: config.graphics.linegraph_line_color,
					'pointer-events': 'none'
				}));
			}
			lines.appendChild(my.getNode('circle', {
				cx: 10+30*(svgIndex+1),
				cy: shot1y,
				r: config.graphics.linegraph_point_radius,
				stroke: config.graphics.linegraph_point_border_color,
				'stroke-width': config.graphics.linegraph_point_border_width,
				fill: config.graphics.linegraph_point_color,
				'pointer-events': 'none'
			}));
		}
		return lines;
	}

	/**
	 * Converts a score in the range [0, 100] to a y-value for the line graph in the range [5, 95]. A score of 100 returns 5,
	 * since SVGs are calculated from the top left.
	 */
	function yFromScore(score) {
		return 5+(9/10)*(100 - score);
	}

	/**
	 * Converts a score in the range [70, 100] into a score in the range [0, 100]. Used before calling yToScore on a zoomed-in
	 * range.
	 */
	function stretchScore(score) {
		return (10/3)*(score-70);
	}

	/**
	 * Returns true if the lowest score is greater than 70
	 */
	function shouldZoomIn(shots) {
		if(shots.length == 0) {
		  return true;
		}
		return shots.filter(function(a) { return (parseFloat(a.score) <= 70); }).length == 0;
	}

	my.drawSpiderTarget = function(session, options) {
		my.drawSpiderTargetHelper(session.shots, session.firearm, session.average_score, session.right_handed, session.fire_type_display, session.drill_name, options);
	}

	/**
	 * Draws a spider target in the given div.
	 * @function drawSpiderTargetHelper
	 * @memberof GRAPHICS
	 * @param {string} svg_id
	 * @param {object[]} sectors - in session.sectors
	 * @param {number} score
	 * @param {object[]} options
	 */
	my.drawSpiderTargetHelper = function(shots, firearm, score, right_handed, fire_type_string, drill_name, options) {
		const svg = document.getElementById(options.spider_id);
		// Remove existing spiderchart, if it exists
		 $('#'+options.spider_id).show().children().remove();
		if(svg) {
			const great_shot_count = shots.reduce(function(count, shot) {
				return count + (shot.score > config.cutoffs.great_shot_score ? 1 : 0);
			}, 0);
			const inner_circle = getInnerCircle(score, great_shot_count, options.show_score_label);
			const octants = draw_spider_octants(options.spider_id, shots, right_handed, options);

			svg.appendChild(my.getNode('rect', { width: '100%', height: 200, fill: 'transparent'}));
			// Transparent inner circle
			svg.appendChild(my.getNode('circle', {
				cx: 100,
				cy: 100,
				r: 60,
				stroke: config.graphics.spider_target_background_color,
				'stroke-width': 40,
				fill: 'none'
			}));
			svg.appendChild(my.getNode('circle', {
				cx: 100,
				cy: 100,
				r: 80,
				stroke: config.graphics.spider_target_border_color,
				'stroke-width': config.graphics.spider_target_border_width,
				fill: 'none'
			}));
			svg.appendChild(inner_circle);
			svg.appendChild(octants);

			if(shots.length > 0) {
				$('.score-link').attr('href', config.URLs.session+"/"+shots[0].session_pk);
				$('#session-shot-count').text(shots.length);
				const inline_details = (right_handed ? "Right-handed" : "Left-handed") + ", " + fire_type_string;
				$('#session-drill-name').text(drill_name);
				$('#session-inline-details').text(inline_details);
				$('#firearm-detail').text(firearm.make + " " + firearm.model + " " + firearm.caliber);

			}
		}
	}

	/**
	 * Draws a blank spiderchart to the div.
	 * @function drawBlankSpider
	 * @memberof GRAPHICS
	 * @param {object[]} options
	 * @param {string} options.spider_id - Div id
	 */
	my.drawBlankSpider = function(options) {
		my.drawSpiderTarget({
			"shots": [],
		}, options);
	}

	// Requires Montserrat from Google Fonts API
	/**
	 * Draws the center of the spiderchart, with thick gray border, and the score. Requires Montserrat from Google Fonts API.
	 * @function getInnerCircle
	 * @memberof GRAPHICS
	 * @inner
	 * @param {string} strokeColor
	 * @param {string} backgroundColor
	 * @param {string} textColor
	 * @param {number} score
	 * @returns {object} inner_circle (SVG object)
	 */
	function getInnerCircle(score, great_shot_count, show_score_label) {
		const inner_circle = my.getNode('g', { class: 'inner_circle' });
		const circle = my.getNode('circle', {
			cx: 100,
			cy: 100,
			r: 40,
			stroke: config.graphics.spider_target_border_color,
			'stroke-width': config.graphics.spider_target_border_width,
			fill: config.graphics.spider_donut_hole_color
		});
		const score_label = my.getNode('text', {
			x: 100,
			y: 85,
			'text-anchor': 'middle',
			'alignment-baseline': 'central',
			'dominant-baseline': 'central',
			fill: config.graphics.spider_label_font_color,
			'font-size': config.graphics.spider_label_font_size,
			'font-family': config.graphics.font_family
		});
		const text = my.getNode('text', {
			x: 100,
			y: 100,
			'text-anchor': 'middle',
			'alignment-baseline': 'central',
			'dominant-baseline': 'central',
			fill: config.graphics.spider_score_font_color,
			'font-size': config.graphics.spider_score_font_size,
			'font-family': config.graphics.font_family
		});
		const great_shots = my.getNode('g', { class: 'great_shots' });

		const radius = 32;
		const increment = 2*Math.PI/24;
		const begin_angle = 3/2 * Math.PI - (great_shot_count-1)/2*increment;
		for(let i = 0; i < great_shot_count; i++) {
			let cx = 100 + radius*Math.cos(begin_angle + i*increment);
			let cy = 100 - radius*Math.sin(begin_angle + i*increment);
			let great_shot_circle = my.getNode('circle', {
				cx: cx,
				cy: cy,
				r: config.graphics.spider_great_shot_radius,
				fill: config.graphics.spider_great_shot_color
			});
			great_shots.appendChild(great_shot_circle);
		}

		score_label.textContent = "SCORE";
		if(score) {
			text.textContent = MANAGER.round(score);
		}
		else {
			text.textContent = '-';
		}
		inner_circle.appendChild(circle);
		if(show_score_label || config.graphics.spider_label_show) {
		  inner_circle.appendChild(score_label);
		  text.setAttribute('y', 105);
		}
		inner_circle.appendChild(text);
		inner_circle.appendChild(great_shots);
		return inner_circle;
	}

	/**
	 * Returns the octants SVG object.
	 * @function draw_spider_octants
	 * @memberof GRAPHICS
	 * @inner
	 * @param {string} svg_id
	 * @param {object[]} session
	 * @param {object[]} options
	 * @returns {object} octants (SVG object)
	 */
	function draw_spider_octants(svg_id, shots, right_handed, options) {
		let sectors = sectors_from_shots(shots, right_handed);
		let octants = my.getNode('g', { class: 'spider-octants' });

		// Scale to contain all shots
		let max_value = config.cutoffs.spider_max_score;
		sectors.forEach(function(sector) {
			let sector_sum = sector.shots.reduce(function(sum, shot, i) {
				if(parseFloat(shot.score) >= config.cutoffs.great_shot_score) {
					return sum;
				} else {
					let size = 100 - shot.score;
					return sum + size;
				}
			}, 0);
			max_value = Math.max(max_value, sector_sum);
		});
		// Draw sectors
		sectors.forEach(function(sector) {
			var fill_pct = 0;
			sector.shots.forEach(function(shot) {
				if(parseFloat(shot.score) < config.cutoffs.great_shot_score) {
					let increment_pct = (100-parseFloat(shot.score))/max_value;
					options.spider_id = svg_id;
					let octant = get_octant(sector.octant, sector.start_angle, sector.end_angle, fill_pct, increment_pct, shot, options);
					octants.appendChild(octant);
					fill_pct += increment_pct;
				}
			})
		});
		return octants;
	}

	function sectors_from_shots(shots, right_handed) {
		let sectors = [];
		let angles;
		if(right_handed) {
			angles = [22.5, 67.5, 112.5, 157.5, 202.5, 225, 247.5, 292.5, 337.5, 382.5]
		} else {
			angles = [22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 315, 337.5, 382.5]
		}
		for(let i = 0; i < angles.length-1; i++) {
			sectors[i] = {
				"octant": i,
				"start_angle": angles[i],
				"end_angle": angles[i+1],
				//"problem": problem_string_from_octant(i),
				"shots": []
			};
		}
		shots.forEach(function(shot) {
			let octant = which_sector(parseFloat(shot.angle), angles);
			sectors[octant]['shots'].push(shot);
		});
		return sectors;
	}

	/**
	 * Maps an angle in degrees to an octant [0, 1, ..., 7, 8]. Counterclockwise from east.
	 * function which_sector
	 * memberof GRAPHICS
	 * @inner
	 * @param {number} angle
	 * @returns {number} octant
	 */
	function which_sector(angle, angles) {
		if(angle <= angles[0]) {
			return 0;
		}
		for(let i = 0; i < angles.length-1; i++) {
			if(angles[i] <= angle && angle < angles[i+1]) {
				return i;
			}
		}
		console.log('Error: Invalid Angle {0}'.f(angle));
	}

	function problem_string_from_octant(octant) {
		switch(octant) {
			case 0:
				return "Too Much Trigger Finger";
			case 1:
				return "Anticipating Recoil";
			case 2:
				return "Breaking Wrist Up";
			case 3:
				return "Pushing";
			case 4:
				return "Too Little Trigger Finger";
			case 5:
				return "Slapping Trigger";
			case 6:
				return "Breaking Wrist Down";
			case 7:
				return "Tightening Grip";
			default:
				return "Great Shot";
		}
	}

	/**
	 * Returns an octant SVG object.
	 * @function get_octant
	 * @memberof GRAPHICS
	 * @inner
	 * @param {number} octantnumber - (0,1,2,3,4,5,6,7) wrapping from 0 radians to 2pi radians.
	 * @param {number} beginpct - between 0 and 1.
	 * @param {number} incpct - between 0 and 1.
	 * @param {object} shot
	 * @param {object} options
	 * @returns {object} path (SVG object)
	 */
	function get_octant(octantnumber, start_angle, end_angle, beginpct, incpct, shot, options) {
		function point_to_string(point) {
			return point['x'] + " " + point['y'] + " ";
		}

		const radians = octantnumber * Math.PI/4 - Math.PI/8;
		const start_radians = start_angle * (2*Math.PI/360);
		const end_radians = end_angle * (2*Math.PI/360);
		const cx = 100; // Origin
		const cy = 100;
		const rs = 40 + 1 + 1; // Radius of inner circle plus border plus border of sector
		const rl = 80; //Radius of outer circle
		const rb = rs + (rl-rs)*beginpct; // Beginning radius of arc to paint
		const re = rb + (rl-rs)*incpct; //Ending radius of arc to paint
		const p1 = {'x': cx + re*Math.cos(start_radians), 'y': cy - re*Math.sin(start_radians)};
		const p2 = {'x': cx + rb*Math.cos(start_radians), 'y': cy - rb*Math.sin(start_radians)};
		const p3 = {'x': cx + rb*Math.cos(end_radians), 'y': cy - rb*Math.sin(end_radians)};
		const p4 = {'x': cx + re*Math.cos(end_radians), 'y': cy - re*Math.sin(end_radians)};
		const d = "M " + point_to_string(p1) + "L " + point_to_string(p2) + "A " + rb + " " + rb + " 0 0 0 " + point_to_string(p3) + "L " + point_to_string(p4) + "A " + re + " " + re + " 0 0 1 " + point_to_string(p1) + "Z";

		const path = my.getNode('path', {
			'id': 'shot'+shot.pk,
			'd': d,
			'stroke': config.graphics.spider_sector_border_color,
			'stroke-width': config.graphics.spider_sector_border_width,
		});
		path.style.fill = config.graphics.spider_sector_color,
		path.classList.add("sector"+octantnumber);
		// Immediately Invoked Function Expression
		// because closures (functions inside a function) use variable reference, not variable value

		const id = options.spider_id;
		const pk = shot.pk;

		path.addEventListener("mouseover", (function(id, pk) {
			return function() {
				return highlight_octant(id, pk);
			}
		}(options.spider_id, shot.pk)));

		path.addEventListener("mouseout", (function(id, pk) {
			return function() {
				unhighlight_octant(id, pk);
			}
		}(options.spider_id, shot.pk)));

		path.addEventListener("click", function(options, shot) {
			return function() {
				getShotCorrection(profiled_user.username, user_pk, user_sk, options, shot["session_pk"], shot["angle"]);
				$("#shot-desc-id").css({"display": "block"});
			};
		}(options, shot));

		$(".close").click(function(e) {
			$(".modal-content").find("img").remove();
			$(".modal-content").find("video").remove();

			$("#shot-desc-id").css({"display": "none"});
		});

		$(".modal").click(function(e) {
			$(".modal-content").find("img").remove();
			$(".modal-content").find("video").remove();

			$("#shot-desc-id").css({"display": "none"});
		});

		jQuery(document).on('keyup',function(evt) {
			if (evt.keyCode == 27 && $('#shot-desc-id').css('display') == 'block' ) {
				$(".modal-content").find("img").remove();
				$(".modal-content").find("video").remove();

				$("#shot-desc-id").css({"display": "none"});
			}
		});

		return path;
	}


	getShotCorrection = function(username, user_pk, user_secret_key, options, sessionId, shotAngle) {
		var request_data = {
			'user_pk': user_pk,
			'user_secret_key': user_secret_key,
			'session_pk': $(this).data('session_pk'),
			'username': username,
			'session_id': sessionId,
			'shot_angle': shotAngle
		}

		$(".modal-content div").css({"display": "none"});
		$(".modal-content p").css({"display": "none"});
		$(".modal-content h2").css({"display": "none"});

		$(".modal-content i").css({"display": "block"});

		$.post({
			url: config.URLs.shot_correction,
			data: JSON.stringify(request_data),
			dataType: 'json',
			contentType: 'application/json',
			headers: { 'X-CSRFToken': MANAGER.getCookie('csrftoken') }
		}).done(function(data) {
			if (data["success"] == false) {
				$(".modal-content").find("img").remove();
				$(".modal-content").find("video").remove();
				$("#shot-desc-id").css({"display": "none"});

				EFFECTS.snackBar("Oh no! We messed up. Please reach out to us to report the issue.", "#B00020");
			}

			if ('files' in data["shot_correction"]) {

				var file_name = data["shot_correction"]['files'][0];
				$('.vertical').removeClass("vertical");
				$('.horizontal').removeClass("horizontal");

				$(".vertical").find("img").remove();
				$(".vertical").find("video").remove();

				$(".horizontal").find("img").remove();
				$(".horizontal").find("video").remove();

				$('.fancy-border-vertical').remove();
				$('.fancy-border-horizontal').remove();

				$('.problem').addClass(data["shot_correction"]['alignment']);

				if (file_name.includes("jpg") || file_name.includes("png")) {
					var file_url = "<img src=\"{0}\" width=\"{1}\" height=\"{2}\" class=\"fancy-border-{3}\">".f(file_name,
							data["shot_correction"]['aspect_ratio'][0], data["shot_correction"]['aspect_ratio'][1],
							data["shot_correction"]['alignment']);
				} else if (file_name.includes("mp4")) {
					var file_url = `
					<video width=\"{0}\" height=\"{1}\" autoplay loop class=\"fancy-border-{2} vid-dim\">
						<source src="{3}" type="video/mp4">
					</video>`.f(data["shot_correction"]['aspect_ratio'][0],
								data["shot_correction"]['aspect_ratio'][1],
								data["shot_correction"]['alignment'],
								file_name);
				}

				$('.problem').prepend(file_url);

				if (!data["shot_correction"]['split_image']) {
					$('div.check').remove();
					$('div.error').remove();
					$('div.divider').remove();

					$('.fancy-border-vertical').removeClass("fancy-border-vertical");
					$('.fancy-border-horizontal').removeClass("fancy-border-horizontal");
					$('.check').removeClass("check");
					$('.error').removeClass("error");
					$('.divider').removeClass("divider");
				} else {

					var divider_div = `
								<div class="check">&#10004;</div>
								<div class="error">&#10008;</div>
								<div class="divider"></div>
								`

					$('.problem').prepend(divider_div);
				}

			}

			$(".modal-content div").css({"display": "block"});
			$(".modal-content p").css({"display": "block"});
			$(".modal-content h2").css({"display": "block"});
			$(".modal-content i").css({"display": "none"});

			// console.log(data["shot_correction"]["files"]);

			$("#shot-error").text(data["shot_correction"]["title"]);
			$("#shot-error-desc").text("");
			$("#shot-error-desc").append(data["shot_correction"]["problem_desc"]);
		});
	};

	// /**
	//  * Highlights all the octants in a given sector, replacing their white outlines with black.
	//  * @function highlight_sector
	//  * @memberof GRAPHICS
	//  * @inner
	//  * @param {string} spider_id
	//  * @param {number} sector_number
	//  */
	// function highlight_sector(spider_id, sector_number) {
	//     var chart = document.getElementById(spider_id);
	//     var shots = [].slice.call(chart.getElementsByClassName('sector'+sector_number));
	//     for(var i = 0; i < shots.length; i++) {
	//         console.log('shot id', shots[i].id);
	//         highlight_octant(chart_id, shots[i].id.substring(4));
	//     }
	// }

	// /**
	//  * Unhighlights all the octants in a given sector, replacing their black outlines with white.
	//  * @function unhighlight_sector
	//  * @memberof GRAPHICS
	//  * @inner
	//  * @param {string} spider_id
	//  * @param {number} sector_number
	//  */
	// function unhighlight_sector(spider_id, sector_number) {
	//     var chart = document.getElementById(spider_id);
	//     var shots = [].slice.call(chart.getElementsByClassName('sector'+sector_number));
	//     for(var i = 0; i < shots.length; i++) {
	//         console.log(shots[i].id);
	//         unhighlight_octant(chart_id, shots[i].id.substring(4));
	//     }
	// }

	/**
	 * Highlights a particular octant, replacing its white outline with black.
	 * @function highlight_octant
	 * @memberof GRAPHICS
	 * @inner
	 * @param {string} spider_id
	 * @param {number} shot_pk
	 */
	function highlight_octant(spider_id, shot_pk) {
		var chart = document.getElementById(spider_id);
		var arc = chart.getElementById('shot'+shot_pk);
		arc.style.stroke = config.graphics.spider_sector_border_hover_color;
		arc.parentElement.appendChild(arc);
	}
	/**
	 * Removes highlight from a particular octant, replacing its black outline with white.
	 * @function unhighlight_octant
	 * @memberof GRAPHICS
	 * @inner
	 * @param {string} spider_id
	 * @param {number} shot_pk
	 */
	function unhighlight_octant(spider_id, shot_pk) {
		var chart = document.getElementById(spider_id);
		var arc = chart.getElementById('shot'+shot_pk);
		arc.style.stroke = config.graphics.spider_sector_border_color;
		arc.parentElement.appendChild(arc);
	}

	/**
	 * Draws a gray arc about 300 degrees, then covers it up with a larger red arc based on the percentage. ViewBox 100x100
	 * @function draw_solid_progress_circle
	 * @memberof GRAPHICS
	 * @param {object} options
	 * @param {string} options.circle_id
	 * @param {number} options.pct
	 */
	my.draw_solid_progress_circle = function(options) {
		var circle = my.getNode('g', { class: 'progress-circle'});
		var bkg = my.getNode('rect', { x: 0, y: 0, width: 100, height: 100, fill: 'transparent' });
		var beginAngle = -145; // Calculated from north
		var endAngle = beginAngle + (-2 * beginAngle * options.pct );
		var grayArc = my.getNode('path', { 'd': describeArc(50, 50, 48, beginAngle, -1*beginAngle), 'stroke': config.graphics.LIGHTGRAY, 'stroke-width': 1, 'fill': 'none' });
		var arc = my.getNode('path', { 'd': describeArc(50, 50, 48, beginAngle, endAngle), 'stroke': config.graphics.DARKRED, 'stroke-width': 3, 'fill': 'none' });

		circle.appendChild(bkg);
		circle.appendChild(grayArc);
		circle.appendChild(arc);

		document.getElementById(options.circle_id).appendChild(circle);
	}

	/**
	 * Returns an SVG path corresponding to a portion of a circle arc.
	 * @function describeArc
	 * @memberof GRAPHICS
	 * @inner
	 * @param {number} x - x-coordinate of circle center
	 * @param {number} y - y-coordinate of circle center
	 * @param {number} radius - radius of arc
	 * @param {number} startAngle - [0, 360]
	 * @param {number} endAngle - [0, 360]
	 * @returns {object} arc (SVG object)
	 */
	function describeArc(x, y, radius, startAngle, endAngle) {
		var start = polarToCartesian(x, y, radius, endAngle);
		var end = polarToCartesian(x, y, radius, startAngle);
		var arcSweep = endAngle - startAngle <= 180 ? "0" : "1";

		var d = [
			"M", start.x, start.y,
			"A", radius, radius, 0, arcSweep, 0, end.x, end.y
		].join(" ");

		return d;
	}

	/**
	 * Converts a point in polar coordinates (r, theta) into a point in Cartesian coordinates (x, y).
	 * @function polarToCartesian
	 * @memberof GRAPHICS
	 * @inner
	 * @param {number} centerX - x-coordinate of circle center
	 * @param {number} centerY - y-coordinate of circle center
	 * @param {number} radius - radius of arc
	 * @param {number} angleInDegrees - theta of arc, from y-axis spanning counter-clockwise
	 * @returns {object} coords - fx {x: 2, y: 3}
	 */
	function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
	  var angleInRadians = (angleInDegrees-90) * Math.PI / 180.0;

	  return {
		x: centerX + (radius * Math.cos(angleInRadians)),
		y: centerY + (radius * Math.sin(angleInRadians))
	  };
	}

	/**
	 * Draws dashed circle in the given div. ViewBox 100x100
	 * @function drawDashedCircle
	 * @memberof GRAPHICS
	 * @param {string} div_id
	 * @param {object} options
	 * @param {number} options.pct - How much of the arc to fill with dashes, [0,1]. Default .7
	 * @param {number} options.dashCount - How many dashes in a full arc. Default 60
	 */

	my.drawDashedCircle = function(div_id, options) {
		if (typeof options.pct === 'undefined') { options.pct = .7; }
		if (typeof options.dashCount === 'undefined') { options.dashCount = 60; }
		options.pct = Math.min(options.pct, 1);
		var cx = 50;
		var cy = 50;
		var radius = 47;
		var svg = document.getElementById(div_id);
		var bkg = my.getNode('rect', { x: 0, y: 0, width: 100, height: 100, fill: 'transparent' });

		// Calculated in radians from east
		var degreeBreak = 50;
		var beginAngle = (270-degreeBreak/2)*(2*Math.PI/360);
		var endAngle = (-90+degreeBreak/2)*(2*Math.PI/360);
		var intermediateAngle = beginAngle + options.pct*(endAngle-beginAngle);
		for(var theta = intermediateAngle; theta < beginAngle; theta += Math.PI/options.dashCount) {
			var x = cx + radius*Math.cos(theta);
			var y = cy - radius*Math.sin(theta);
			var dash = getDash(x, y, 5, theta);
			svg.appendChild(dash);
		}

		// Convert intermediateAngle and endAngle into degrees from north
		var intermediateAngleDegrees = 90 - (360/(2*Math.PI))*intermediateAngle;
		var endAngleDegrees = 90 - (360/(2*Math.PI))*endAngle;
		var grayArc = my.getNode('path', { 'd': describeArc(cx, cy, radius, intermediateAngleDegrees, endAngleDegrees), 'stroke': config.graphics.LIGHTGRAY, 'stroke-width': 1, 'fill': 'none' });
		svg.appendChild(grayArc);
	}

	/**
	 * Draws dash centered at (cx, cy) with given length and in the direction of theta [0, 2pi) in dark red.
	 * @function getDash
	 * @memberof GRAPHICS
	 * @inner
	 * @param {number} cx
	 * @param {number} cy
	 * @param {number} length
	 * @param {number} theta
	 * @returns {object} SVG objec
	 */
	function getDash(cx, cy, length, theta) {
		var dx = (length/2) * Math.cos(theta);
		var dy = (length/2) * Math.sin(theta);
		return my.getNode('line', { x1: cx-dx, y1: cy+dy, x2: cx+dx, y2: cy-dy, 'stroke': config.graphics.DARKRED, 'stroke-width': .7 });
	}

	/**
	 * Draw the three pie charts in the session module. Requires that the SVGs are named 'pie-chart-1', 'pie-chart-2', and 'pie-chart-3'.
	 * @function populateAllSessionsModule
	 * @memberof GRAPHICS
	 * @inner
	 * @param {number} session_count
	 * @param {number} shot_count
	 * @param {number} average_score
	 */
	my.populateAllSessionsModule = function(session_count, shot_count, average_score) {
		var pie1Options = {
			'pct': (session_count/20)
		};
		my.drawDashedCircle('pie-chart-1', pie1Options);
		$('#pie-chart-1-center').text(session_count);

		var pie2Options = {
			'pct': (shot_count/100)
		};
		my.drawDashedCircle('pie-chart-2', pie2Options);
		$('#pie-chart-2-center').text(shot_count);

		var pie3Options = {
			'circle_id': 'pie-chart-3',
			'pct': (average_score/100)
		};
		my.draw_solid_progress_circle(pie3Options);
		$('#pie-chart-3-center').text(average_score.toFixed(1));
	};


	my.getTransformation = function(transform) {
		// Create a dummy g for calculation purposes only. This will never
		// be appended to the DOM and will be discarded once this function
		// returns.
		var g = document.createElementNS("http://www.w3.org/2000/svg", "g");

		// Set the transform attribute to the provided string value.
		g.setAttributeNS(null, "transform", transform);

		// consolidate the SVGTransformList containing all transformations
		// to a single SVGTransform of type SVG_TRANSFORM_MATRIX and get
		// its SVGMatrix.
		var matrix = g.transform.baseVal.consolidate().matrix;

		// Below calculations are taken and adapted from the private function
		// transform/decompose.js of D3's module d3-interpolate.
		var {a, b, c, d, e, f} = matrix;   // ES6, if this doesn't work, use below assignment
		// var a=matrix.a, b=matrix.b, c=matrix.c, d=matrix.d, e=matrix.e, f=matrix.f; // ES5
		var scaleX, scaleY, skewX;
		if (scaleX = Math.sqrt(a * a + b * b)) a /= scaleX, b /= scaleX;
		if (skewX = a * c + b * d) c -= a * skewX, d -= b * skewX;
		if (scaleY = Math.sqrt(c * c + d * d)) c /= scaleY, d /= scaleY, skewX /= scaleY;
		if (a * d < b * c) a = -a, b = -b, skewX = -skewX, scaleX = -scaleX;
		return {
		  translateX: e,
		  translateY: f,
		  rotate: Math.atan2(b, a) * 180 / Math.PI,
		  skewX: Math.atan(skewX) * 180 / Math.PI,
		  scaleX: scaleX,
		  scaleY: scaleY
		};
	}


	/**
	 * Button that helps animate the curve.
	 * @function addAnimateButton
	 * @memberof GRAPHICS
	 * @inner
	 * @param {object} group
	 */
	my.addAnimateButton = function() {
		var button = my.getNode('svg', {
			'width': 10,
			'class': 'animation-button',
			'id': 'animation-button',
			'viewBox': '0 0 200 200',
			'alt': 'Animation Button',
			'x': 5,
			'y': 40
		});


		var circle = my.getNode('circle', {
			"cx": 100,
			"cy": 100,
			"r": 90,
			"fill": "#FFF"
		});


		var polygon = my.getNode('polygon', {
			'points': '70, 55 70, 145 145, 100',
			'fill': "#000"
		});


		button.appendChild(circle);
		button.appendChild(polygon);
		return button;
	}


	my.get_shot_marker = function(point, options, label) {

		let marker_color = "";

		if ("marker_color" in options) {
			marker_color = options["marker_color"];
		} else {
			marker_color = config.graphics.trace_marker_color;
		}

		function get_line(x1, x2, y1, y2, line) {
			return my.getNode('line', {
				'class': 'traceview__{0}-marker'.format(label) + line,
				'x1': x1,
				'x2': x2,
				'y1': y1,
				'y2': y2,
				'stroke': marker_color,
				'stroke-width': 4,
				'opacity': options.opacity,
				'vector-effect': 'non-scaling-stroke',
				'stroke-linecap': 'round',
			});
		}

		const marker = my.getNode('g', {});
		const length = 4;
		const shot_x_down = get_line(point.x-length/2, point.x+length/2, point.y-length/2, point.y+length/2, 1);
		const shot_x_up = get_line(point.x-length/2, point.x+length/2, point.y+length/2, point.y-length/2, 2);
		marker.appendChild(shot_x_down);
		marker.appendChild(shot_x_up);
		return marker;
	}

	/**
	 * Returns a list of points connecting p1 and p2.
	 * p0 is the point before p1; p3 is the point after p2.
	 */
	my.bezier_curve = function(p0, p1, p2, p3, scale) {
		// var i2 = { x: p1.x + scale*(p1.x-p0.x), y: p1.y + scale*(p1.y-p0.y) };
		// var i3 = { x: p2.x + scale*(p2.x-p3.x), y: p2.y + scale*(p2.y-p3.y) };

		// var d = 'M'+p1.x+','+p1.y+' '+'C'+i2.x+','+i2.y+" "+i3.x+','+i3.y+" "+p2.x+","+p2.y;

		let d = 'M ';

		// Chase's algorithm via StackOverflow
		const a1 = p2.x-p0.x;
		const a2 = (2*p0.x-5*p1.x+4*p2.x-p3.x);
		const a3 = (3*p1.x-p0.x-3*p2.x+p3.x);
		const b1 = (p2.y-p0.y);
		const b2 = (2*p0.y-5*p1.y+4*p2.y-p3.y);
		const b3 = (3*p1.y-p0.y-3*p2.y+p3.y);
		const g = 16;
		const one_over_g = 1/g;
		for (let i = 0; i < g; i++){
			const t  = i * one_over_g;
			const tt = t*t;
			const ttt = tt * t;

			const x = 0.5 * (2*p1.x+ a1*t + a2*tt + a3*ttt);
			const y = 0.5 * (2*p1.y+ b1*t + b2*tt + b3*ttt);
			d += x+' '+y+' ';
		}
		d += p2.x+' '+p2.y+' ';

		return d;
	}

	/**
	 * Maps dx, dy (-.5, .5) to x, y (0, 100)
	 */
	my.mapPitchAndYawToPoint = function(shot, center, i) {
		var dx = shot.yaw[i] - center.x;
		var dy = shot.pitch[i] - center.y;
		var x = 50 + 100*center.scale*dx;
		var y = 50 - 100*center.scale*dy;
		return {
			x: x,
			y: y
		};
	}


	my.setShotMarker = function(length, point, label) {
		d3.selectAll('.traceview__{0}-marker1'.format(label))
			.attr("x1", point.x-length/2)
			.attr("x2", point.x+length/2)
			.attr("y1", point.y-length/2)
			.attr("y2", point.y+length/2)

		d3.selectAll('.traceview__{0}-marker2'.format(label))
			.attr("x1", point.x-length/2)
			.attr("x2", point.x+length/2)
			.attr("y1", point.y+length/2)
			.attr("y2", point.y-length/2)
	}

	/**
	 * Remove existing Trace Views
	 * @function removeTraceView
	 * @memberof GRAPHICS
	 */
	my.removeTraceView = function() {
		$(".hold").remove();
		$(".pull").remove();
		$(".recoil").remove();
		$(".shot-label").remove();
		$(".traceview__shot-marker1").remove();
		$(".traceview__shot-marker2").remove();
		$("#shot-problem").text(" ");
		$("#trace-score").text(" ");
	}


	/**
	 * Updates the points and markers on the Trace View while zooming
	 * @function getTrace
	 * @memberof GRAPHICS
	 * @inner
	 * @param {object} div_id
	 */
	my.addZooming = function(div_id, shot, center, zoom=.1) {
		const zoomListener = d3.zoom()
		.scaleExtent([zoom, 40]).on("zoom", function(d, i, nodes) {
			d3.select('#'+div_id+'_g')
				.attr("transform", "translate({0},{1}) scale({2})".f(d3.event.transform.x, d3.event.transform.y, d3.event.transform.k));
			const point_radius = config.graphics.trace_point_radius/d3.event.transform.k;

			// Scaling the points
			d3.selectAll('.traceview__pointhold')
				.attr("r", point_radius);
			d3.selectAll('.traceview__pointpull')
				.attr("r", point_radius);
			d3.selectAll('.traceview__pointrecoil')
				.attr("r", point_radius);

			// Scaling the shot marker
			const length = 4/d3.event.transform.k;

			point = GRAPHICS.mapPitchAndYawToPoint(shot, center, shot.shot_index);
			my.setShotMarker(length, point, "shot");

			// zoom release marker
			if ("extras" in shot && "archery_draw_index" in shot["extras"]) {
				point = GRAPHICS.mapPitchAndYawToPoint(shot, center, shot["extras"]["archery_release_index"]);
				my.setShotMarker(length, point, "release");
			}

		});

		d3.select('#'+div_id).call(zoomListener).on('click', function() {
			// d3.event.transform.scaleBy(2);
		});
	}

	my.resetZoom = function(div_id, k) {
		const div = d3.select('#'+div_id).node();
		const t = d3.zoomTransform(div);
		t.k = k;
		t.x = 0;
		t.y = 0;
	}

	my.addPanning = function(parent_selector, child_selector, x_min, x_max) {
		if(!x_min) {
			x_min = -Infinity;
		}
		if(!x_max) {
			x_max = Infinity;
		}
		d3.select(parent_selector).call(
			d3.zoom()
				.translateExtent([[x_min,0],[x_max,0]])
				.on('zoom', function() {
					d3.select(child_selector).attr("transform", "translate(" + d3.event.transform.x+")");
				})
				.on('end', function() {
					var oElem = event.srcElement;
					d3.select(oElem).dispatch('click');
					TEST.eventFire(oElem, 'click');
				})
		)
		.on('wheel.zoom', null)
		.on('dblclick.zoom', null);

		// d3.select(child_selector).call(
		//     d3.zoom()
		//         .transform("translate(100)")
		// );
	}

	my.svgToPNG = function(div_id) {
		// Select the first svg element
		var svg = document.getElementById(div_id),
			img = new Image(),
			serializer = new XMLSerializer(),
			svgStr = serializer.serializeToString(svg);
		var w = svg.getBoundingClientRect().width, h = svg.getBoundingClientRect().height;

		img.src = 'data:image/svg+xml;base64,'+window.btoa(svgStr);

		// You could also use the actual string without base64 encoding it:
		//img.src = "data:image/svg+xml;utf8," + svgStr;

		var canvas = document.createElement("canvas");
		document.body.appendChild(canvas);
		canvas.width = w;
		canvas.height = h;
		var context = canvas.getContext("2d");
		context.drawImage(img,0,0,w,h);
		// Now save as png or whatever
		var d = canvas.toDataURL("image/png");
		canvas.parentNode.removeChild(canvas);
		return d;
	}

	return my;
}());

const CALC = (function() {
	let my = {};

	my.averageAngle = function(angles_in_radians) {
		let sumX = 0;
		let sumY = 0;
		angles_in_radians.forEach(function(angle) {
			sumX += Math.cos(angle);
			sumY += Math.sin(angle);
		});
		let avgAngle = Math.atan2(sumY, sumX);
		return avgAngle;
	};

	my.getSessionAverageAngle = function(session) {
		angles = session.shots.map(function(shot) { return shot.angle*(2*Math.PI/360); });
		return my.averageAngle(angles);
	};

	return my;
})();

// Manipulating data between formats
const MANAGER = (function() {
	var my = {};

	//Helper method which reads cookies. Used in getting Django's csrf_token.
	my.getCookie = function(name) {
		var value = "; " + document.cookie;
		var parts = value.split("; " + name + "=");
		if (parts.length == 2) return parts.pop().split(";").shift();
	};

	my.toTitleCase = function(str) {
		return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
	};

	my.getParameterByName = function(name, url) {
	    if (!url) url = window.location.href;
	    name = name.replace(/[\[\]]/g, "\\$&");
	    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
	        results = regex.exec(url);
	    if (!results) return null;
	    if (!results[2]) return '';
	    return decodeURIComponent(results[2].replace(/\+/g, " "));
	}


    // Takes a DataTable() argument and an arbitrary number of array[30], which it pushes onto the datatable
    my.populateGoogleDataTable = function(data) {
        const monthly_stats = arguments[1];
        const list_of_stats_lists = Array.from(arguments).slice(1);
        data_to_add = [];
        for(let i = 0; i < monthly_stats.length; i++) {
            date_stats = list_of_stats_lists.map(function(stats_list) { return stats_list[i]; });
            date_stats = [i].concat(date_stats);
            data_to_add.push(date_stats);
        }
        data.addRows(data_to_add);
    }

	my.filter = function(sessions, filter_function) {
		var filtered_sessions = [];
		sessions.forEach(function(session) {
			if(filter_function(session)) {
				filtered_sessions.push(session);
			}
		})
		return filtered_sessions;
	};

	my.prettyDate = function(session_date) {
        let date = new Date(session_date).toLocaleString('en-US', {
            // weekday: 'short',
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',

        });
        return date;
	};

	my.getSessionLink = function(session_pk) {
		return document.location.origin + '/session/' + session_pk;
	};

	my.round = function(num) {
		const precision = 10; // one decimal place
		const rounded = Math.round(num * precision) / precision;
		return rounded.toFixed(1); // for pesky 99.0 shots
	};

	return my;
}());

// jQuery hiding, showing
const EFFECTS = (function() {
	let my = {};

	my.initGroupSelector = function(groups, following) {
		$('.group-selector').click(function(e) {
			const group_pk = $(e.target).data('group_pk');
			let group;
			if(group_pk === 'following') {
				group = following;
				$('#group-members-header').text('Following');
			} else {
				group = groups.find(function(group) {
					return group.pk === group_pk;
				});
				$('#group-members-header').text('Group Members');
			}
			console.log(group);
			my.selectGroupSelector(group_pk);
			my.showGroup(group);
		});
		$('.group-selector').first().trigger('click');
		$('#latest-button').trigger('click');
	}

	my.selectGroupSelector = function(group_pk) {
		$('.group-selector').show();
		$('.group-selector-active').addClass('hide');
		$('.group-selector-active[data-group_pk={0}]'.f(group_pk)).removeClass('hide');
		$('.group-selector[data-group_pk={0}]'.f(group_pk)).hide();
	}

	my.showGroup = function(group) {
		console.log(group);
		$('.feed__session').not('#feed-item-prototype').remove();
        my.setSearchClickCallback('search-results', function(context) {
            let friend_pk = $(context).data('pk');
            let group_pk = group.pk;
            API.addUserToGroup(user.pk, user_sk, group_pk, false, friend_pk);
        });
        my.populateLeaderboard(group.best_sessions);
        my.activateFeedFilterButtons();

        my.populateSessions(group.latest_sessions, '#latest-sessions', 'spider-target-session-');

        my.activateFriendsListFilterButtons(group.members);
        my.populateFriendsList(group.members, 'weekly');
	}

	my.updateFollowingGroup = function(following) {
		$('.group-selector[data-group_pk="following"]').off('click').click(function(e) {
			my.selectGroupSelector("following");
			my.showGroup(following);
		}).trigger('click');
	}

	my.populateSessions = function(sessions, container_selector, session_id_prefix) {
		let options = {
	        spider_id: 'spider-target',
	        backgroundColor: 'transparent',
	        innerCircleColor: 'white'
		}
		$container = $(container_selector);
		$container.find('.no-sessions-message').remove();
		sessions.forEach(function(session) {
			$item = my.createSessionFeedItem(session, session_id_prefix);
			$container.append($item);
            options.spider_id = session_id_prefix+session.pk;
            GRAPHICS.drawSpiderTarget(session, options);
		});

	}

	my.createSessionFeedItem = function(session, session_id_prefix) {
		const $item = $('#feed-item-prototype').clone().removeAttr('id').removeClass('hide');
		// Replace text
		if(!('profile_pic_url' in session)) {
			session.profile_pic_url = config.URLs.default_pic;
		}
		$item.find('.avatar img').attr('src', session.profile_pic_url);
		$item.find('.user-link').text(session.username).attr('href', config.URLs.user+"/"+session.username);
		$item.find('.drill-name').text(session.drill_name);
		$item.find('.shot-count').text(session.shots.length);
		$item.find('.fire-type').text(session.fire_type_display);
		$item.find('.average-score').text(MANAGER.round(session.average_score));
		$item.find('.session-date').text(MANAGER.prettyDate(session.date));
		$item.find('.session-link').attr('href', config.URLs.user+"/"+session.username+"?session="+session.pk);
		$item.find('svg').attr('id', session_id_prefix+session.pk);
		$item.find('g').attr('id', session_id_prefix+session.pk+'_g');

		return $item;
	}

	my.initGroupsPage = function(user_pk, user_secret_key) {
		function clearNav() {
			$('#nav-groups, #nav-discover, #nav-create').removeClass('focus');
			$('#groups-col, #discover-col, #create-col').hide();
		}
		$('#nav-groups').click(function() {
			clearNav();
			$(this).addClass('focus');
			$('#groups-col').fadeIn();
		});
		$('#nav-discover').click(function() {
			clearNav();
			$(this).addClass('focus');
			$('#discover-col').fadeIn();
		});
		$('#nav-create').click(function() {
			clearNav();
			$(this).addClass('focus');
			$('#create-col').fadeIn();
		});
		$('#nav-groups').trigger('click');

		$('.join-group-button').click(function() {
			let group_pk = $(this).data('group_pk');
			API.joinGroup(user_pk, user_secret_key, group_pk);
		});
	}

	my.initProfileSettings = function(user_pk, user_secret_key) {
		$('#save-btn').click(function(e) {
			const $form = $('#settings-form');
			const email = $form.find('#id_email').val();
			const username = $form.find('#id_username').val();
			const password = $form.find('#id_password').val();
			const privacy = $form.find('#id_privacy').find(':selected').val();
			const profile_pic = $form.find('#id_profile_pic');
			let file;
			if(profile_pic[0].files.length) {
				file = profile_pic[0].files[0];
			}
			// And the profile picture here
			console.log(email, username, password, privacy, file);

			// Validate here
			API.updateProfileSettings(user_pk, user_secret_key, email, username, password, privacy, file);
		});

		$('#laser_academy_btn').click(function(e) {
			console.log("Submitting registration token");
			// get text in input
			var code = $('#id_laser_academy').val();

			$.post({
				url: config.URLs.laser_academy_registration,
				data: JSON.stringify({
					'user_pk': user_pk,
					'user_secret_key': user_secret_key,
					'session_pk': $(this).data('session_pk'),
					'activation_code': code
				}),
				dataType: 'json',
				contentType: 'application/json',
				headers: { 'X-CSRFToken': MANAGER.getCookie('csrftoken') }
			}).done(function(data) {
				if(data['success'] == true) {
					EFFECTS.snackBar("Laser Academy - Full Access Activated!", "green");
				}
				if(data['success'] == false) {
					EFFECTS.snackBar(data['message'])
				}
			});

		});

		$('#raven_access_btn').click(function(e) {
			console.log("Submitting Raven access token");
			// get text in input
			var code = $('#id_raven_access').val();

			$.post({
				url: config.URLs.raven_registration,
				data: JSON.stringify({
					'user_pk': user_pk,
					'user_secret_key': user_secret_key,
					'session_pk': $(this).data('session_pk'),
					'activation_code': code
				}),
				dataType: 'json',
				contentType: 'application/json',
				headers: { 'X-CSRFToken': MANAGER.getCookie('csrftoken') }
			}).done(function(data) {
				if(data['success'] == true) {
					EFFECTS.snackBar("Raven Access - Full Access Activated!", "green");
				}
				if(data['success'] == false) {
					EFFECTS.snackBar(data['message'])
				}
			});
		});

		// Set clicklistener on SAVE button
		// Do form validation
		// AJAX request to /update-profile-settings
		// Update form fields
	}

	my.initFollowSettings = function(user_pk, user_secret_key) {
		$.each($('.remove_button'), function(i, button) {
            $(button).click(function() { return API.rejectFollowRequest(user_pk, user_sk, $(button).data('user_pk')); });
        });
        $.each($('.accept_button'), function(i, button) {
        	$(button).click(function() { return API.acceptFollowRequest(user_pk, user_sk, $(button).data('user_pk')); });
        });
        $.each($('.unfollow_button'), function(i, button) {
        	$(button).click(function() { return API.unfollow(user_pk, user_sk, $(button).data('user_pk')); });
        });
	}

	my.initModalButton = function(menu_selector, btn_selector, cnt_selector) {
		const $btn = $(btn_selector);
		const $cnt = $(cnt_selector);
		$cnt.hide();
		$btn.click(function(e) {
			$cnt.show();
			my.callFunctionOnOutsideClick(menu_selector, function() {
				$(cnt_selector).hide();
			});
		});
	};

	my.initHistory = function(user_pk, user_sk, sessions, options) {
		/*
		history__session is from the left panel highlights and history
		this function helps set up on-click triggers for generating
		Spider graph and trace-views for rendered highlights
		and history on the left side.
		when using AJAX for history and highlights, we should
		load this every time after the data is rendered
		*/

		$('.history__session').each(function(index, elem) {
			const session_id = $(elem).data('session_pk');
            GRAPHICS.addUpdateSpiderOnClickHandler(elem, sessions[session_id], user_pk, user_sk, session_id, options);
            $(elem).click(function(e) {
                $('.history__session').removeClass('focus');
                $(this).addClass('focus');
            });
        });
	}

	my.initGroupSettings = function(container_selector, user_pk, user_sk, group_pk) {
		let $cnt = $(container_selector);

        let $pending_member_buttons = $cnt.find('.pending_member_accept_button');
        $.each($pending_member_buttons, function(i, button) {
            $(button).click(function() {
                API.addUserToGroup(user_pk, user_sk, group_pk, false, $(button).data('user_pk'));
            });
        });
        $.each($cnt.find('.pending_member_reject_button'), function(i, button) {
            $(button).click(function() { return API.deleteUserFromGroup(user_pk, user_sk, group_pk, $(button).data('user_pk')); });
        });
        $.each($cnt.find('.admin_button'), function(i, button) {
            $(button).click(function() { return API.addUserToGroup(user_pk, user_sk, group_pk, true, $(button).data('user_pk')); });
        });
        $.each($cnt.find('.demote_button'), function(i, button) {
            $(button).click(function() { return API.addUserToGroup(user_pk, user_sk, group_pk, false, $(button).data('user_pk')); });
        });
        $.each($cnt.find('.remove_button'), function(i, button) {
            $(button).click(function() { return API.deleteUserFromGroup(user_pk, user_sk, group_pk, $(button).data('user_pk')); });
        });
        $.each($cnt.find('.delete_button'), function(i, button) {
            $(button).click(function() { return API.deleteGroup(user_pk, user_sk, group_pk); });
        });
        $cnt.find('#privacy_select').on("change", function(e) {
            let $select = $(e.target);
            API.setGroupSettings(user_pk, user_sk, group_pk, $select.val(), undefined, undefined);
        });
        $cnt.find('#group_visibility_select').on("change", function(e) {
        	let $select = $(e.target);
        	API.setGroupSettings(user_pk, user_sk, group_pk, undefined, $select.val(), undefined);
        });
        $cnt.find('.group_name_input').on("change", function(e) {
            API.setGroupSettings(user_pk, user_sk, group_pk, undefined, undefined, $(input).val())
        });


        my.activateSearchBox('#user-search-box', '.search-results', user_pk, user_sk, group_pk);
        // my.activateSearchBox('user-search-box', 'users', function(e) {
        // 	// Attempt to add the user to the group
        // 	console.log('clicked on a search result');
        // 	debugger;
        // 	API.addUserToGroup(user_pk, user_sk, group_pk, false, $(this).data('user_pk'));
        // });
	}

	my.initHeader = function(user_pk, user_sk) {
		$('.my-profile').click(function(e) {
			my.showProfileDropdown();
		});
		$('.notify-menu').click(function(e) {
			my.showNotifications(user_pk, user_sk);
		});
		$('.feedback-button').click(function(e) {
			my.showFeedback(user_pk, user_sk);
		});
		$('#submit-feedback').click(function(e) {
			const feedback = $('#feedback-input').val();
			my.showFeedback(user_pk, user_sk);
			API.submitFeedback(user_pk, user_sk, feedback);
		});
		$('.nav-opener').click(function(e) {
			my.showNavigation();
		});
	};


	my.updateLinks = function(user_pk, profiled_user) {
		if (user_pk != profiled_user.pk) {
			$("#pistol a").attr("href", "/user/" + profiled_user.username);
			$("#shotgun a").attr("href", "/shotgun/" + profiled_user.username);
			$("#archery a").attr("href", "/archery/" + profiled_user.username);
			$("#laser-academy a").attr("href", "/laser-academy/" + profiled_user.username);
		} else {
			$("#pistol a").attr("href", "/");
			$("#shotgun a").attr("href", "/shotgun/");
			$("#archery a").attr("href", "/archery/");
			$("#laser-academy a").attr("href", "/laser-academy/");
		}
	};


	my.callFunctionOnOutsideClick = function(selector, func) {
		$('body').click(function(e) {
			if(!$(e.target).closest(selector).length) {
				func();
			}
		});
	}

	my.closeModalOnOutsideClick = function(selector, class_to_remove) {
		my.callFunctionOnOutsideClick(selector, function() {
			$('#header').removeClass(class_to_remove);
		});
		// $('body').click(function(e) {
		// 	if(!$(e.target).closest(selector).length) {
		// 		$('#header').removeClass(class_to_remove);
		// 	}
		// })
	}

	my.showFeedback = function(user_pk, user_secret_key) {
		const $header = $('#header');
		$header.removeClass('notify-active').removeClass('profile-active');
		$header.toggleClass('feedback-active');
		my.closeModalOnOutsideClick('#feedback', 'feedback-active');
	}

	my.showProfileDropdown = function() {
		const $header = $('#header');
		$header.removeClass('notify-active').removeClass('feedback-active');
		$header.toggleClass('profile-active');
		my.closeModalOnOutsideClick('.my-profile', 'profile-active');
	}


	my.showNotifications = function(user_pk, user_secret_key) {
		const $header = $('#header');
		$header.removeClass('nav-active').removeClass('profile-active');
		if($header.hasClass('notify-active')) {
			$header.removeClass('notify-active');
		} else {
			$header.addClass('notify-active');
			const $menu = $header.find('.notify-menu');
			const $icon = $menu.find('i');
			if($icon.hasClass('red')) {
				API.markNotificationsRead(user_pk, user_secret_key);
				$icon.removeClass('red');
			}
		}
		my.closeModalOnOutsideClick('#notifications', 'notify-active');
	};

	my.showNavigation = function() {
		$('#header').removeClass('notify-active').toggleClass('nav-active');
	}

	my.attachPostCommentHandler = function(username, user_pk, user_secret_key) {
		$('.comments__form').submit(function(event) {
			const $form = $(this);
			const $comment = $form.find('.comments__input');
			const comment = $comment.val();
			API.postComment(user_pk, user_secret_key, $form.data('session_pk'), username, comment);
			event.preventDefault();
		});
	};


	function openTab(evt, name) {
		// Declare all variables
		var i, tabcontent;

		// Get all elements with class="tabcontent" and hide them
		tabcontent = document.getElementsByClassName("tabcontent");
		for (i = 0; i < tabcontent.length; i++) {
			$('#' + tabcontent[i].id).hide();
		}

		$('#' + name).show();
	}

	// Adds click functionality to each button with the right class.
	// Each button should hve a data attribute [user_pk] representing the requesting user.
	my.activatePendingRequestButtons = function(user_pk, user_sk) {
		$.each($('.pending_friend_accept_button'), function(i, button) {
			$(button).click(function() { return API.respondToFollowRequest(user_pk, user_sk, $(button).data('user_pk'), true); });
		});
		$.each($('.pending_friend_reject_button'), function(i, button) {
			$(button).click(function() { return API.respondToFollowRequest(user_pk, user_sk, $(button).data('user_pk'), false); });
		});
	}

	my.messageAfterResponseToFollowRequest = function(friend_pk, accepted) {
		const $accept_button = $('.pending_friend_accept_button[data-user_pk={0}]'.f(friend_pk));
		const $reject_button = $('.pending_friend_reject_button[data-user_pk={0}]'.f(friend_pk));
		if(accepted) {
			$accept_button.text('done!');
			$reject_button.remove();
		} else {
			$accept_button.remove();
			$reject_button.text('declined');
		}
	}

	my.appendComment = function(username, comment) {
		const $comments = $('#comments');
		$comments.find('.comments__input').val('');
		const $comment = $comments.find('#comment-prototype').clone();
		$comment.find('a').attr('href', config.URLs.user+"/"+username)
							.text(username);
		$comment.find('.comments__item--comment').text(comment);
		$comment.removeAttr('id').insertAfter('#comments .comments__item:last').hide().removeClass('hide').fadeIn();
	}

	my.populateLeaderboard = function(sessions) {
		$('.leaderboard__row').not('#lr-prototype').remove();
		sessions.forEach(my.placeSessionOnLeaderboard);
	}

	my.placeSessionOnLeaderboard = function(session, i) {
		const $lr = $('#lr-prototype').clone();
		const date = new Date(session.date);
		const dateOptions = {
			weekday: 'short',
			year: undefined,
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: 'numeric',
		};

		$lr.find('a').attr('href', config.URLs.session+"/"+session.pk);
		if(session.profile_pic_url) {
			$lr.find('.profile_thumbnail:first').attr('src', session.profile_pic_url);
		}
		$lr.find('.name').text(session.username);
		$lr.find('.name').click(function() {
			location.href = config.URLs.user+"/"+session.username;
		});
		$lr.find('.session-li__text-date').text(date.toLocaleString('en-US', dateOptions));
		$lr.find('.session-li__text-row').text("{0} shots, {1}".f(session.shots.length, session.fire_type_display));

		$lr.find('svg').attr('id', 'spider-target-leaderboard-session-{0}'.f(session.pk));
		$lr.find('svg g').attr('id', 'spider-target-session-{0}_g'.f(session.pk));
		$lr.removeAttr('id').insertAfter('.leaderboard__row:last').hide().removeClass('hide').fadeIn();
	};

	my.activateFriendsListFilterButtons = function(friends) {
		$('.friends-filter').click(function(event) {
			const $button = $(this);
			let filter = $button.text();
			if (filter == "This Week") {
				filter = 'weekly';
			} else if(filter == "All Time") {
				filter = 'alltime';
			}
			$('.friends-filter').removeClass('btn--focus');
			$button.addClass('btn--focus');
			my.populateFriendsList(friends, filter);
		});
	}

	// Clears the existing friends list and places new values in the div.
	// Passing 'weekly' yields the stats since Monday, 'alltime' yields total stats.
	my.populateFriendsList = function(friends, filter) {

		if(filter == 'weekly') {
			friends.sort(function(a, b) {
				return b.weekly_average_score - a.weekly_average_score;
			});
		} else if(filter == 'alltime') {
			friends.sort(function(a, b) {
				return b.average_score - a.average_score;
			});
		}

		friends.forEach(function(friend, i) {
			addFriendSummaryToList(friend, filter);
		});
		$('.friend__hovercard').hide();

	}

	// Get the friend-item prototype
	// Clone the friend-item prototype
	// Populate the clone with values
	// Insert and show the clone
	function addFriendSummaryToList(friend, filter) {
		const $prototype = $('#fr-prototype');
		const $fr = $prototype.clone();
		$fr.attr('data-friend_pk', friend.pk);
		$fr.find('.friend__hovercard').attr('data-friend_pk', friend.pk);
		$fr.find('a').attr('href', config.URLs.user+"/"+friend.username)
		if(friend.profile_pic_url) {
			$fr.find('.profile_thumbnail').attr('src', friend.profile_pic_url);
		}
		$fr.find('.name').text(friend.username);
		if(filter == 'alltime') {
			$fr.find('.session_count').text(friend.session_count);
			$fr.find('.shot_count').text(friend.shot_count);
			$fr.find('.average_score').text(MANAGER.round(friend.average_score));
			$fr.find('.progress-cup').css('visibility', 'hidden');
		} else if(filter == 'weekly') {
			$fr.find('.session_count').text(friend.weekly_session_count);
			$fr.find('.shot_count').text(friend.weekly_shot_count);
			$fr.find('.average_score').text(MANAGER.round(friend.weekly_average_score));
		}
		$fr.removeAttr('id').insertAfter('.friend__row:last').hide().removeClass('hide').fadeIn();
		$fr.find('.progress-cup').attr('id', 'progress-cup-'+friend.pk);
		my.fillProgressCup('progress-cup-'+friend.pk, friend.weekly_shot_count);
	};

	my.addPatchTooltipHover = function() {
	  $('.patch__item').hover(function(event) {
		  const $item = $(this);
		  $item.find('.patch__tooltip').toggle();
		});
	};

	function getProgressPct(num_shots) {
		return 100*num_shots/200;
	}

	function getGoalPct() {
		const days_since_monday = (new Date().getDay()+6)%7; // Monday->0, Tues->1, ... (getDay() returns 0 for Sunday)
		const goal = (days_since_monday+1)*(100/7);
		return goal;
	}

	my.fillProgressCup = function(id, num_shots) {
		const $cup = $('#'+id);
		const progress_pct = getProgressPct(num_shots);
		const goal = getGoalPct();
		$cup.attr('title', '{0} shots'.f(num_shots));
		const color = (progress_pct >= goal ? config.graphics.GREEN : config.graphics.RED);
		$cup.css('background-image', 'linear-gradient(to top, {0} {1}%, {2} {1}%)'.f(color, progress_pct, config.graphics.LIGHTGRAY));
	}

	my.fillProgressBar = function(num_shots) {
		const $background = $('.shot-progress');
		$background.attr('title', "{0} shots".f(num_shots));

		const $bar = $('.shot-progress__complete');
		const progress_pct = getProgressPct(num_shots);
		const width = "{0}%".f(progress_pct);
		$bar.css('width', width);
		if(progress_pct > 98) {
			$bar.css('border-radius', '8px');
		}
		if(progress_pct > 25) {
			$bar.text("{0} shots".f(num_shots));
		} else if(progress_pct > 10) {
			$bar.text(num_shots);
		}

		const $goal = $('.shot-progress__goal');
		const goal = getGoalPct();
		$goal.css('left', "{0}%".f(goal));
		if(progress_pct >= goal) {
			$bar.css('background-color', 'green');
			$goal.hide();
		}

		$('#progress-holder').show();
	};

	my.hideProgressBar = function() {
		$('#progress-holder').hide();
	}

	my.snackBar = function(text, backgroundColor = "#333") {
		let x = document.createElement("div");
		x.id = "snackbar";
		x.innerHTML = text;
		document.body.appendChild(x);
		x.className = "show";

		$("#snackbar").css("background-color", backgroundColor);
		setTimeout(function() {
			x.className = x.className.replace("show", "");
			x.remove();
		}, 3000);
	}

	my.snackBarStart = function(text) {
		let x = document.createElement("div");
		x.id = "snackbar";
		x.innerHTML = text;
		document.body.appendChild(x);
		x.className = "show";
	}

	my.snackBarStop = function() {
		let x = document.getElementById("snackbar");
		x.remove();
	}

	my.redirect = function(data, url) {
		console.log(data);
		if('success' in data) {
			if(url) {
				window.location.href = url;
			} else {
				window.location.reload();
			}
		} else {
			my.snackBar(data['error']);
		}
	}

	my.message = function(data, success_message) {
		console.log(data);
		if('success' in data) {
			my.snackBar(success_message);
		} else {
			my.snackBar(data['error']);
		}
	}


	my.setOneTraceView = function(container, shot, options) {
		/*
			Display the first shot
			Append rest to the container
			Link the rest using shot count
		*/

		let score;

		if (shot.extras && shot.extras.delay_score !== undefined) {
			const delayScore = shot.extras.delay_score;
		
			if (shot.extras.transition_score !== undefined) {
				const transitionScore = shot.extras.transition_score;
				
				// Check if over_travel_score exists
				if (shot.extras.over_travel_score !== undefined) {
					const overTravelScore = shot.extras.over_travel_score;
					score = parseFloat(((transitionScore + overTravelScore + delayScore) / 3).toFixed(2));
				} else {
					score = parseFloat(((transitionScore + delayScore) / 2).toFixed(2));
				}
			} else {
				score = parseFloat(delayScore.toFixed(2));
			}
		} else {
			score = shot.score;
		}

		$('#shot-problem').text(shot["problem"]);
		$('#trace-score').text(score);
		currentShot = shot.pk;

		// show error pop up when you hover over the error
		$('#shot-problem').click(function(e) {
			document.getElementById("shot" + currentShot).dispatchEvent(new Event('click'));
		});

		const trace_id = 'traceview-'+shot.pk;
		const svg = GRAPHICS.getNode('svg', {
			'class': 'traceview-small',
			'id': trace_id,
			'viewBox': '0 0 100 100',
		});

		if(container) {
			container.appendChild(svg);

			if (options["mode"] == 'pistol') {
				PISTOL_UTILITIES.drawTraceview(trace_id, shot, {
					trace_disable_zoom: false
				});
			} else if (options["mode"] == 'archery') {
				ARCHERY_UTILITIES.drawTraceview(trace_id, shot, {
					trace_disable_zoom: false
				});

			} else if (options["mode"] == 'shotgun') {
				SHOTGUN_UTILITIES.drawTraceview(trace_id, shot, {
					trace_disable_zoom: false
				});
			}

			var existing_shots = $("svg").filter('[id^="traceview-"]');
			$(existing_shots).css("display", "none");
			$("#" + trace_id).css("display", "block");
		}

		$(".animation-button").click(function() {
			// set a global flag variable
			animateTrigger = true;
			container.appendChild(svg);

			if (options["mode"] == 'pistol') {
				PISTOL_UTILITIES.drawTraceview(trace_id, shot, {
					trace_disable_zoom: false,
					animate: true
				});
			} else if (options["mode"] == 'archery') {
				ARCHERY_UTILITIES.drawTraceview(trace_id, shot, {
					trace_disable_zoom: false,
					animate: true
				});
			} else if (options["mode"] == 'shotgun') {
				SHOTGUN_UTILITIES.drawTraceview(trace_id, shot, {
					trace_disable_zoom: false,
					animate: true
				});
			}

			var existing_shots = $("svg").filter('[id^="traceview-"]');
			$(existing_shots).css("display", "none");
			$("#" + trace_id).css("display", "block");
		});

	}


	// Delete existing traceviews, create new SVGs, and draw traceviews in them.
	my.populateTraceviewSmallMultiples = function(session, options) {
		GRAPHICS.setFullTraceSettings();
		const $traceviews = $('.traceview-small');
		$traceviews.remove();

		const container = document.getElementById('traceview-small-multiples');
		const shot_selection = document.getElementById('shot-selection');

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
					my.setOneTraceView(container, session.shots[i], options)
				}
			});

			$(btnId).click(function(event) {
				if ($(btnId).hasClass("active-tab") && !animateTrigger) {
					$(".shot-label").removeClass("active-tab");
				} else if (!animateTrigger) {
					$(".shot-label").removeClass("active-tab");
					$("#" + trace_id + "_btn").addClass("active-tab")
					my.setOneTraceView(container, session.shots[i], options)
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
						my.setOneTraceView(container, session.shots[i - 1], options);
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
						my.setOneTraceView(container, session.shots[i + 1], options);
						break;
					}
				}
				return false;
			}
		});

		my.setOneTraceView(container, session.shots[0], options)

		let $hold_recoil = $('.hold, .recoil');
		// $hold_recoil.hide();
		// my.showHoldAndRecoilOnHover('.traceview-small');
		// GRAPHICS.setFullTraceSettings();
	}


	my.showHoldAndRecoilOnHover = function(traceview_selector) {
		$(traceview_selector).hover(function() {
			$(this).find('.hold, .recoil').show();
		}, function() {
			$(this).find('.hold, .recoil').hide();
		});
	}

	my.populateSessionComments = function(session) {
		let $container = $('#comments');
		console.assert($container.length != 0);
		$container.find('.comments__item').not('#comment-prototype').remove();
		$container.find('#comments__form').data('session_pk', session.pk);
		session.comments.forEach(function(comment) {
			EFFECTS.appendComment(comment.username, comment.text);
		});
	}

	my.populateSessionWithNotes = function(note) {
		if (note != "") {
			note = note.replace(/</g, "&lt;").replace(/>/g, "&gt;");
			$("#notes").removeClass("hide-content");
			$('#session-note').empty();
			$('#session-note').append('<span>' + note + '</span>');
		} else {
			$("#notes").addClass("hide-content");
		}
	}

	my.populateSessionImage = function(imageUrl) {
		if (imageUrl != null) {
		    $("#session-image-container").removeClass("hide-content");
		    $('#session-image img').attr('src', imageUrl);
		    $('#session-zoom-overlay img').attr('src', imageUrl);

		    const overlayImg = document.querySelector("#session-zoom-overlay img");
		    let scale = 1;
		    // Scroll up → zoom in, scroll down → zoom out
		    overlayImg.addEventListener("wheel", function (e) {
		        e.preventDefault();
                if (e.deltaY < 0) {
                    scale += 0.1;
                } else {
                    scale = Math.max(1, scale - 0.3); // don’t zoom out below 1
                }
                overlayImg.style.transform = `scale(${scale})`;
            });
		} else {
			$("#session-image-container").addClass("hide-content");
		}
	}

	my.populateCalendarHistoryHighlights = function(user_pk, user_sk, highlighted_sessions, options) {
		/* Create and display the latest 5 sessions in a menu on the left-side. */

		let $history = $('.history').first();
		for(let i = 0; i < highlighted_sessions.length; i++) {
			let session = highlighted_sessions[i];
			loaded_session_pks.push(session.pk);
			let div_html = '<div class="history__session" data-session_pk="{0}">' +
								'<div class="flex-row">' +
									'<div class="flex-column">' +
										'<div class="session-description">{1} - {2} Shots</div>' +
										'<div class="session-date">{3}</div>' +
									'</div>' +
									'<div class="session-score">{4}</div>' +
								'</div>' +
							'<div class="session-score-bar" style="width: {5}"></div>' +
							'</div>';
			let score = MANAGER.round(session.average_score);
			let date = MANAGER.prettyDate(session.date);
			if (session.drill_name == "Holster Draw Analysis") {
				score = "";
			}
			div_html = div_html.f(session.pk, session.drill_name, session.shot_count, date, score, score);
			$session = $(div_html)
			$history.append($session);
		}
		EFFECTS.initHistory(user_pk, user_sk, highlighted_sessions, options);

		const session_pk = MANAGER.getParameterByName('session');

		// This is where the Spider graph for the first session gets triggered
		if(session_pk) {
			$('.history__session[data-session_pk={0}]'.f(session_pk)).first().trigger('click');
		} else {
			$('.history__session').first().trigger('click');
		}
	}

	my.populateCalendarHistory = function(dates, type) {
		// Function to populate the history of the sessions only on click

		dates = dates.map(function(date) {return new Date(date); });
		let months = [];
		let now = new Date(Date.now());
		let thisWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate()-7);
		let lastWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate()-14);
        for(let i = 0; i < dates.length; i++) {
        	let month = "";
        	if(dates[i] > thisWeek) {
        		month = "This Week";
        	} else if(dates[i] > lastWeek) {
        		month = "Last Week";
        	} else {
            	month = dates[i].toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        	}
            if(!months.includes(month)) {
				months.push(month);
            }
        }

		let $cal = $('.calendar').first();
        for(let i in months) {
			$row = $('<div class="stretch"></div>');
            $date = $('<div class="calendar__date">{0}  <i></i></div>'.f(months[i]));
			$row.append($date);
            $cal.prepend($row);
		}

        // $cal.find('.history').hide();

		function getMonthFromString(mon, year){
			date_string = mon +" 1, " + year;
			return new Date(Date.parse(date_string));
		}

        $('.calendar__date').click(function(event) {
			var parent = $(this).parent();
			// If history is just loaded, toggle the data
			if(parent.find('.history').length > 0){
				parent.find('.history').toggle();
			}
			else {
				var current_date = $.trim($(this).text());
				// set loader
				$(this).find("i").attr("class", "fa fa-circle-o-notch fa-spin");
				if (current_date == 'This Week') {
					var now = new Date(Date.now());
					var start_date = new Date(now.getFullYear(), now.getMonth(), now.getDate()-7);
					var end_date = now;
				}
				else if (current_date == 'Last Week') {
					var now = new Date(Date.now());
					var start_date = new Date(now.getFullYear(), now.getMonth(), now.getDate()-14);
					var end_date = new Date(now.getFullYear(), now.getMonth(), now.getDate()-7);
				}
				else {
					var month = current_date.split(" ")[0];
					var year = current_date.split(" ")[1];
					var start_date = getMonthFromString(month, year);
					var end_date = new Date(start_date.getFullYear(), start_date.getMonth()+1, 1);
				}

				var is_own_profile = false;
				if (user_pk == profiled_user.pk) {
					is_own_profile = true;
				}

				// pass is_own_profile to show_delete_button
				const options = {
					column_id: 'sessions-svg',
					column_width: 350,
					spider_id: 'spider-target',
					spider_width: 150,
					line_id: 'line-graph',
					line_width: 300,
					trace_id: 'trace',
					// trace_width: 80,
					trace_disable_zoom: false,
					show_delete_button: is_own_profile,
					mode: type
				};

				const filters = {
					highlights: false,
					type: type,
					start_date: start_date,
					end_date: end_date,
					date_div: parent
				}

				EFFECTS.populateUserSessions(profiled_user.pk, user_pk, user_sk,
											 options, filters);
			}
		});
	};


	my.populateUserSessions = function(profiled_user_pk, user_pk, user_secret_key, options, filters) {
		var request_data = {
			'user_pk': user_pk,
			'user_secret_key': user_secret_key,
			'session_pk': $(this).data('session_pk'),
			'profiled_user_pk': profiled_user_pk,
			'highlights': filters["highlights"],
			'type': filters["type"]
		}

		if (filters["start_date"] || filters["end_date"]){
			request_data['start_date'] = filters["start_date"];
			request_data['end_date'] = filters["end_date"];
		}

		$.post({
			url: config.URLs.session_history,
			data: JSON.stringify(request_data),
			dataType: 'json',
			contentType: 'application/json',
			headers: { 'X-CSRFToken': MANAGER.getCookie('csrftoken') }
		}).done(function(data) {
			console.log("inside session history");
			if (!filters["start_date"] || !filters["end_date"]){

				if (data["sessions"].length == 0) {
					if (filters["type"] == "pistol") {
						$("#empty-pistol-banner").removeClass("hide-content");
						$('#pistol-empty-button').click( function () {
							window.open("https://mantisx.com/products/mantis-x10-elite", '_blank');
						})
					} else if (filters["type"] == "archery") {
						$("#empty-archery-banner").removeClass("hide-content");
						$('#archery-empty-button').click( function () {
							window.open("https://mantisarchery.com/products/mantis-x8", '_blank');
						})
					} else if (filters["type"] == "shotgun") {
						$("#empty-shotgun-banner").removeClass("hide-content");
						$('#shotgun-empty-button').click( function () {
							window.open("https://mantisx.com/products/mantis-x7", '_blank');
						})
					}
				} else {
					if (filters["type"] == "pistol") {
						$("#pistol-div").removeClass("hide-content");
						$("#pistol-div-1").removeClass("hide-content");
						$("#pistol-div-2").removeClass("hide-content");
					} else if (filters["type"] == "archery") {
						$("#archery-div").removeClass("hide-content");
						$("#archery-div-1").removeClass("hide-content");
						$("#archery-div-2").removeClass("hide-content");
					} else if (filters["type"] == "shotgun") {
						$("#shotgun-div").removeClass("hide-content");
					}
				}

				EFFECTS.populateCalendarHistoryHighlights(user_pk, user_secret_key, data["sessions"], options);
			}
			else {
				// if session already exists, just toggle
				$row = filters["date_div"];

				$sessions = $('<div class="history"></div>');
				data["sessions"].forEach(function(session) {
					if (loaded_session_pks.includes(session.pk)) {
						loaded_session_pks.push(session.pk);
						return
					};
					loaded_session_pks.push(session.pk);
					let date = MANAGER.prettyDate(session.date);
				    let score = MANAGER.round(session.average_score);
				    let url = config.URLs.session+'/'+session.pk;
				    let div_html = '<div class="history__session" data-session_pk="{0}">' +
    								'<div class="flex-row-space-between">' +
									'{1}, {2} shots <br>{3}' +
									'<div class="session-score">{4}</div>' +
									'</div>' +
									'<div class="session-score-bar" style="width: {4}%;"></div>' +
									'</div>';
					if (session.drill_name == "Holster Draw Analysis") {
						score = "";
					}
					div_html = div_html.f(session.pk, session.drill_name, session.shot_count, date, score);
					$session = $(div_html);
				    $sessions.prepend($session);
				});
				$row.append($sessions);

				$row.find("i").removeAttr("class", "fa fa-circle-o-notch fa-spin");
				EFFECTS.initHistory(user_pk, user_sk, data["sessions"], options);
			}
		});
	};


	function populateSearchTerms(container_selector, data, item_callback) {
		const matches = data['matches'];
		const term = data['search_term'];
		console.log("Matches", matches);
		if(term.length > 0) {
			matches.forEach(item_callback);
		}
	}
	my.populateUserSearchTerms = function(container_selector, data) {
		const prototype_selector = '#search-results-item-prototype';
		$('.search-results-item').not(prototype_selector).remove();
		populateSearchTerms(container_selector, data, function(match, i) {
			const $results = $(container_selector);
			const $item = $(prototype_selector).clone().removeAttr('id').removeClass('hide');
			$item.data('user_pk', match.pk);
			$item.find('.username').text(match.username);
			$results.append($item);

		});
	};
	my.populateGroupSearchTerms = function(container_id, data) {
		populateSearchTerms(container_id, data, function(match, i) {
			let group_row = $(container_selector+' li:eq('+i+')');
			group_row.show();
			group_row.find('.name').text(match.name);

			group_row.data('pk', match.pk).data('privacy', match.privacy);
			group_row.find('.tooltip').data('pk', match.pk).data('privacy', match.privacy);
			group_row.find('i').data('pk', match.pk).data('privacy', match.privacy);
		});
	}
	my.activateCommentDropdowns = function() {
        $('.session-li__text-comment').click(function(event) {
            let $comment = $(this);
            let $comments = $('#comments-'+$comment.data('session_pk'));
            $comments.toggle();
            event.preventDefault();
        });
	};

    my.drawSessions = function(session_id_prefix) {
	    let options = {
	        spider_id: 'spider-target',
	        backgroundColor: 'transparent',
	        innerCircleColor: 'white'
	    };
        return function(session) {
            options.spider_id = session_id_prefix+session.pk;
            GRAPHICS.drawSpiderTarget(session, options);
        };
    };
	my.activateLeaderboardFilterButtons = function(weekly_leaders_live, weekly_leaders_co2, weekly_leaders_dry, weekly_leaders) {
		$('.leaderboard-filter').click(function(event) {
            let $button = $(this);
            let filter = $button.text();
            $('.leaderboard-filter').removeClass('btn--focus');
            $button.addClass('btn--focus');
            let sessions;
            if(filter == 'Live') {
                sessions = weekly_leaders_live;
            } else if(filter == 'CO2') {
                sessions = weekly_leaders_co2;
            } else if(filter == 'Dry') {
                sessions = weekly_leaders_dry;
            } else if(filter == 'All') {
                sessions = weekly_leaders;
            } else {
                throw new Error('Invalid session type');
            }
            EFFECTS.populateLeaderboard(sessions);
            sessions.forEach(my.drawSessions('spider-target-leaderboard-session-'));
        });
	}
	my.activateFeedFilterButtons = function() {
		$('.leaderboard-filter').click(function(e) {
			let $button = $(this);
			let filter = $button.text();
			$('.leaderboard-filter').removeClass('btn--focus');
			$button.addClass('btn--focus');
			if(filter == 'Latest Sessions') {
				$('#latest-sessions').show();
			}else {
				throw new Error('Wrong button text');
			}
			// EFFECTS.populateLeaderboard(sessions);
		});
	}
	my.activateSearchBox = function(search_box_selector, search_results_selector, user_pk, user_secret_key, group_pk) {
		$(search_box_selector).keyup(function() {
			let term = $(this).val();
			console.log("searching", term);
			API.searchUsers(user_pk, user_secret_key, search_results_selector, onFinishCallback);

			function onFinishCallback() {
				$(search_results_selector).find('.search-results-item').click(function() {
					API.addUserToGroup(user_pk, user_secret_key, group_pk, false, $(this).data('user_pk'));
				});
			}

		})
	}

	my.initFollowSearchBox = function(search_box_selector, search_results_selector, user_pk, user_secret_key) {
		$(search_box_selector).keyup(function() {
			const term = $(this).val();
			console.log("searching", term);
			API.searchUsers(user_pk, user_secret_key, search_results_selector, function() {
				$(search_results_selector).find('.search-results-item').click(function() {
					API.follow(user_pk, user_secret_key, $(this).data('user_pk'));
				});
			});
		})
	}

	my.setSearchClickCallback = function(search_results_id, callback) {
		$('#'+search_results_id+' i').click(function(event) {
			callback(this);
			event.preventDefault();
		});
	}

	my.setHeaderActiveLink = function(page_name) {
		switch(page_name) {
			case "home":
				$('#nav__home').addClass('active');
				break;
			case "groups":
				$('#nav__groups').addClass('active');
				break;
		}
	};

	// ID: session + PK + index, fx session32index
	my.setSessionIndices = function(sessions) {
		var count = sessions.length;
		// Iterate backwards to remove <li> inorder
		for(var i = 4; i >= 0; i--) {
			var sessionIndex = (count - 4) + i;
			if(sessionIndex > 0) {
				$('#sessions-svg-xaxis li:eq('+i+') .session-index').attr('id', 'session{0}index'.f(sessions[sessionIndex-1].pk)).text(sessionIndex);
			}
			else {
				$('#sessions-svg-xaxis li:eq('+i+')').remove();
			}
		}
	};

	my.hideSessionTooltips = function() {
		$('.bar-chart-holder .session-tooltip').hide();
	}

	my.fetchWeeklyShotCount = function(profiled_user_pk, user_pk, user_secret_key) {
		$.post({
			url: config.URLs.weekly_shot_count,
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
			my.fillProgressBar(data["weekly_shot_count"]);
		});
	};

	function drawSparklineChart(type, index, sparkline_stats, div_id, color) {
		// Generate sparklines (dry, live, co2)
		var data = []
		for (i in sparkline_stats.zip){
			data.push([sparkline_stats.zip[i][index]["average_score"]]);
		}

		let data_array = [[type]].concat(data)

		GRAPHICS.drawSparkline(div_id, data_array, color);
	}

	my.fetchSparklineStats = function(profiled_user_pk, user_pk, user_secret_key, filters) {
		$.post({
			url: config.URLs.sparkline_stats,
			data: JSON.stringify({
				'user_pk': user_pk,
				'user_secret_key': user_secret_key,
				'session_pk': $(this).data('session_pk'),
				'profiled_user_pk': profiled_user_pk,
				'type': filters['type']
			}),
			dataType: 'json',
			contentType: 'application/json',
			headers: { 'X-CSRFToken': MANAGER.getCookie('csrftoken') }
		}).done(function(data) {
			if(data["firetype_stats"][0]["total_sessions"]){
				$("#live-sparkline-div").show();
				$("#live-sparkline-score").text(data["firetype_stats"][0]["score"].toFixed(3));
				drawSparklineChart("Live", 0, data["sparkline_stats"],
								   'live-sparkline', "#0000aa");
			}

            if(data["firetype_stats"][1]["total_sessions"]){
				$("#dry-sparkline-div").show();
				$("#dry-sparkline-score").text(data["firetype_stats"][1]["score"].toFixed(3));
				drawSparklineChart("Dry", 1, data["sparkline_stats"],
								   'dry-sparkline', "#00aa00");
			}

			if(data["firetype_stats"][2]["total_sessions"]){
				$("#co2-sparkline-div").show();
				$("#co2-sparkline-score").text(data["firetype_stats"][2]["score"].toFixed(3));
				drawSparklineChart("CO2", 2, data["sparkline_stats"],
								   'co2-sparkline', "#aa0f00");
			}
		});
	};


	my.sessionHistory = function(profiled_user_pk, user_pk, user_secret_key, filters) {
		var request_data = {
			'user_pk': user_pk,
			'user_secret_key': user_secret_key,
			'session_pk': $(this).data('session_pk'),
			'profiled_user_pk': profiled_user_pk,
			'type': filters['type']
		}

		$.post({
			url: config.URLs.session_unique_dates,
			data: JSON.stringify(request_data),
			dataType: 'json',
			contentType: 'application/json',
			headers: { 'X-CSRFToken': MANAGER.getCookie('csrftoken') }
		}).done(function(data) {
			EFFECTS.populateCalendarHistory(data["sess_dates"], filters["type"]);
		});
	};


	my.sessionWithAngles = function(profiled_user_pk, user_pk, user_secret_key, options, filters) {
		/*
		API call for populating the Constellation visualization
		*/
		var request_data = {
			'user_pk': user_pk,
			'user_secret_key': user_secret_key,
			'session_pk': $(this).data('session_pk'),
			'profiled_user_pk': profiled_user_pk,
			'type': filters['type']
		}

		$.post({
			url: config.URLs.sessions_with_angles,
			data: JSON.stringify(request_data),
			dataType: 'json',
			contentType: 'application/json',
			headers: { 'X-CSRFToken': MANAGER.getCookie('csrftoken') }
		}).done(function(data) {
			GRAPHICS.drawUniverse(data["sessions_with_angles"], user_pk, user_secret_key, options);
		});
	};


	function drawGunBubbleChart(firearm_stats, filters) {
		/*
		Draw gun bubble chart
		*/
		let data = new google.visualization.DataTable();
		data.addColumn('string', 'Gun');
		data.addColumn('number', 'Session Count');
		data.addColumn('number', 'Average Score');
		data.addColumn('string', 'Gun')
		data.addColumn('number', 'Session Count')

		firearm_data = [];
		for (var i = 0; i < firearm_stats.length; i++) {
			var temp = ["", firearm_stats[i]["total_sessions"], firearm_stats[i]["score"],
						firearm_stats[i]["firearm"], firearm_stats[i]["total_sessions"]]
			firearm_data.push(temp);
		}

		data.addRows(firearm_data);

		let options = {
			title: filters["name"] + ' Comparison',
			hAxis: {
				title: 'Session Count',
				gridlines: {
					count: 5,
				},
			},
			vAxis: {
				title: 'Average Score',
				gridlines: {
					count: 5,
				},
			},
			bubble: {textStyle: {fontSize: 11}},
			colorAxis: {legend: {position: 'none'}},
		};

		let chart = new google.visualization.BubbleChart(document.getElementById('gun-comparison-bubble'));
		chart.draw(data, options);
	}


	function drawGunTable(firearm_stats, filters) {
		/* Draw gun table */
		var data = new google.visualization.DataTable();
		data.addColumn('string', filters["name"]);
		data.addColumn('number', 'Average Score');
		data.addColumn('number', 'Sessions');

		firearm_data = [];
		for (var i = 0; i < firearm_stats.length; i++) {
			var temp = [firearm_stats[i]["firearm"], firearm_stats[i]["score"],
						firearm_stats[i]["total_sessions"]]
			firearm_data.push(temp);
		}

		data.addRows(firearm_data);

		var table = new google.visualization.Table(document.getElementById('gun-comparison'));

		table.draw(data, {showRowNumber: false, width: '100%', height: '100%'});
	}


	my.firetypeStats = function(profiled_user_pk, user_pk, user_secret_key, filters) {
		var request_data = {
			'user_pk': user_pk,
			'user_secret_key': user_secret_key,
			'session_pk': $(this).data('session_pk'),
			'profiled_user_pk': profiled_user_pk,
			'type': filters['type']
		}

		$.post({
			url: config.URLs.firearm_stats,
			data: JSON.stringify(request_data),
			dataType: 'json',
			contentType: 'application/json',
			headers: { 'X-CSRFToken': MANAGER.getCookie('csrftoken') }
		}).done(function(data) {
			drawGunBubbleChart(data["firearm_stats"], filters);
			drawGunTable(data["firearm_stats"], filters);
		});
	};

	return my;
}());

const UTILS = (function() {
	var my = {};

	my.getParms = function(form){
		var array = $(form).serializeArray();
		var obj = {};

		for(var i = 0; i < array.length; i++){
			obj[array[i].name] = array[i].value
		}

		return obj;
	}

	return my;
}());

// Async requests to the server
const API = (function() {
	const my = {};

	my.login = function(username, password, next) {
		$.post({
			url: config.URLs.verify,
			data: JSON.stringify({
				'username': username,
				'password': password
			}),
			dataType: 'json',
			contentType: 'application/json',
			headers: { 'X-CSRFToken': MANAGER.getCookie('csrftoken')}
		}).done(function(data) {
			if('error' in data) {
				EFFECTS.snackBar(data['error'])
			}
			if('success' in data) {
				window.location.href = next || config.URLs.home;
			}
		});
	}

	my.updateProfileSettings = function(user_pk, user_secret_key, email, username, password, privacy, file) {
		EFFECTS.snackBar('Saving settings...');
		if(file) {
			let formData = new FormData();
			formData.append("profile_pic", file);
			formData.append("user_pk", user_pk);
			formData.append("user_secret_key", user_secret_key);
			$.ajax({
				url: config.URLs.update_profile_pic,
				type: 'POST',
				processData: false,
				contentType: false,
				dataType: 'json',
				headers: { 'X-CSRFToken': MANAGER.getCookie('csrftoken') },
				data: formData
			}).done(function(data) {
				console.log(data);
				if('error' in data) {
					EFFECTS.snackBar(data['error'])
				} else {
					EFFECTS.snackBar('uploaded profile pic');
				}
			})
		}

		$.post({
			url: config.URLs.update_profile_settings,
			data: JSON.stringify({
				'user_pk': user_pk,
				'user_secret_key': user_secret_key,
				'email': email,
				'username': username,
				'password': password,
				'privacy': privacy
			}),
			dataType: 'json',
			contentType: 'application/json',
			headers: { 'X-CSRFToken': MANAGER.getCookie('csrftoken')}
		}).done(function(data) {
			console.log(data);
			if('error' in data) {
				EFFECTS.snackBar(data['error'])
			} else if(data['success'] != "updated ") {
				EFFECTS.snackBar(data['success'])
			}
		});
	}

	my.submitFeedback = function(user_pk, user_secret_key, feedback_text) {
		EFFECTS.snackBar('Sending feedback...');

		$.post({
			url: config.URLs.submit_feedback,
			data: JSON.stringify({
				'user_pk': user_pk,
				'user_secret_key': user_secret_key,
				'feedback': feedback_text
			}),
			dataType: 'json',
			contentType: 'application/json',
			headers: { 'X-CSRFToken': MANAGER.getCookie('csrftoken')}
		}).done(function(data) {
			console.log(data);
			if('error' in data) {
				EFFECTS.snackBar(data['error'])
			}
			if('success' in data) {
				EFFECTS.snackBar('Feedback sent. Thank you!');
			}
		})
	}

	my.createUser = function(email, username, password, next, source) {
		$.post({
			url: config.URLs.create_user,
			data: JSON.stringify({
				'email': email,
				'username': username,
				'password': password,
				'source': source,
			}),
			dataType: 'json',
			contentType: 'application/json',
			headers: { 'X-CSRFToken': MANAGER.getCookie('csrftoken')}
		}).done(function(data) {
			console.log(data);
			if('error' in data) {
				EFFECTS.snackBar(data['error'])
			}
			if('success' in data) {
				if(data.message) {
					window.location.href = '/check-email/';
				} else {
					window.location.href = next || config.URLs.home;
				}
			}
		});
	}

	my.sendRecoveryEmail = function(email) {
		$.post({
			url: config.URLs.send_recovery_email,
			data: JSON.stringify({
				'email': email,
			}),
			dataType: 'json',
			contentType: 'application/json',
			headers: { 'X-CSRFToken': MANAGER.getCookie('csrftoken') }
		}).done(function(data) {
			console.log(data);
			if('success' in data) {
				EFFECTS.snackBar("Email verification sent");
			}
			if('error' in data) {
				EFFECTS.snackBar(data['error'])
			}
		});
	}

	my.markNotificationsRead = function(user_pk, user_secret_key) {
		$.post({
			url: config.URLs.mark_notifications_read,
			data: JSON.stringify({
				'user_pk': user_pk,
				'user_secret_key': user_secret_key
			}),
			dataType: 'json',
			contentType: 'application/json',
			headers: { 'X-CSRFToken': MANAGER.getCookie('csrftoken') }
		}).done(function(data) {
			console.log(data);
		})
		//EFFECTS.snackBar('TODO: mark notifications as read');
	};

	const search = function(user_pk, user_secret_key, search_results_selector, search_box_id, url, populateCallback, onFinishCallback) {
		assert(search_results_selector !== undefined && search_box_id !== undefined, "Undefined search div");
		const term = $('#'+search_box_id).val();
		$.post({
			url: url,
			data: JSON.stringify({
				'user_pk': user_pk,
				'user_secret_key': user_secret_key,
				'search_term': term
			}),
			dataType: 'json',
			contentType: 'application/json',
			headers: { 'X-CSRFToken': MANAGER.getCookie('csrftoken')}
		}).done(function(data) {
			console.log(data);
			const currentTerm = $('#'+search_box_id).val();
			if(term === currentTerm) {
				console.log("Populating search results for", term);
				populateCallback(search_results_selector, data);
			}
			onFinishCallback();
		});
	};

	my.searchUsers = function(user_pk, user_secret_key, container_selector, onFinishCallback) {
		search(user_pk, user_secret_key, container_selector, config.IDs.user_search_box, config.URLs.search_people, EFFECTS.populateUserSearchTerms, onFinishCallback);
	};

	my.searchGroups = function(user_pk, user_secret_key, container_selector, term) {
		search(user_pk, user_secret_key, container_selector, config.IDs.group_search_box, config.URLs.search_groups, EFFECTS.populateGroupSearchTerms);
	};

	my.postComment = function(user_pk, user_secret_key, session_pk, username, comment) {
		$.post({
			url: config.URLs.post_comment,
			data: JSON.stringify({
				'user_pk': user_pk,
				'user_secret_key': user_secret_key,
				'session_pk': session_pk,
				'comment': comment
			}),
			dataType: 'json',
			contentType: 'application/json',
			headers: { 'X-CSRFToken': MANAGER.getCookie('csrftoken') }
		}).done(function(data) {
			EFFECTS.snackBar('comment posted');
			EFFECTS.appendComment(username, comment);
		});
	};

	my.downloadFile = function(csv_url) {
		$.get({
			url: csv_url,
			cache: true,
			headers: { 'X-CSRFToken': MANAGER.getCookie('csrftoken') }
		}).done(function(data, textStatus, xhr) {
			var blob = new Blob([data]);
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			var disposition = xhr.getResponseHeader('Content-Disposition');
			var filename = disposition.split("filename=")[1].replace(/(^"|"$)/g, '');
			console.log(filename);
			a.style.display = 'none';
			a.href = url;
			// the filename you want
			a.download = filename;
			document.body.appendChild(a);
			a.click();
			console.log(a);
			window.URL.revokeObjectURL(url);
			EFFECTS.snackBarStop()
		});
	};

	my.loadSession = function(options, session_pk, user_pk, user_secret_key, callback) {
		$.post({
			url: config.URLs.get_session,
			data: JSON.stringify({
				'user_pk': user_pk,
				'user_secret_key': user_secret_key,
				'session_pk': session_pk
			}),
			dataType: 'json',
			contentType: 'application/json',
			headers: {'X-CSRFToken': MANAGER.getCookie('csrftoken')}
		}).done(function(data) {
			callback(data.session);
		});
	};

	my.deleteSession = function(user_pk, user_secret_key, session_pk) {
		$.post({
			url: config.URLs.delete_sessions,
			data: JSON.stringify({
				'user_pk': user_pk,
				'user_secret_key': user_secret_key,
				'session_pks': [session_pk]
			}),
			dataType: 'json',
			contentType: 'application/json',
			headers: {'X-CSRFToken': MANAGER.getCookie('csrftoken')}
		}).done(function(data) {
			console.log(data);
			if(data['success']) {
				EFFECTS.snackBar("session deleted")
			} else {
				EFFECTS.snackBar(data['error'])
			}
		})
	}


	/**
	 * Call with admin=False to add a user or demote an admin.
	 * Call with admin=True to make an existing user an admin.
	 */
	my.addUserToGroup = function(user_pk, user_secret_key, group_pk, admin, user_to_add_pk) {
		$.post({
			url: config.URLs.add_to_group,
			data: JSON.stringify({ 'user_pk': user_pk, 'user_secret_key': user_secret_key, 'group_pk': group_pk, 'admin': admin, 'user_to_add_pk': user_to_add_pk }),
			headers: { 'X-CSRFToken': MANAGER.getCookie('csrftoken') }
		}).done(function(data) {
			EFFECTS.message(data, "user added to group");

		});
	};
	my.deleteUserFromGroup = function(user_pk, user_secret_key, group_pk, user_to_delete_pk) {
		$.post({
			url: config.URLs.delete_from_group,
			data: JSON.stringify({ 'user_pk': user_pk, 'user_secret_key': user_secret_key, 'group_pk': group_pk, 'user_to_delete_pk': user_to_delete_pk }),
			headers: { 'X-CSRFToken': MANAGER.getCookie('csrftoken')}
		}).done(function(data) {
			if(user_pk == user_to_delete_pk) {
				EFFECTS.redirect(data, config.URLs.groups);
			}
			else {
				EFFECTS.redirect(data);
			}
		});
	};
	my.joinGroup = function(user_pk, user_secret_key, group_pk) {
		$.post({
			url: config.URLs.join_group,
			data: JSON.stringify({ 'user_pk': user_pk, 'user_secret_key': user_secret_key, 'group_pk': group_pk }),
			headers: { 'X-CSRFToken': MANAGER.getCookie('csrftoken') }
		}).done(function(data) {
			if('success' in data) {
				if(data['success'] == 'pending') {
					EFFECTS.snackBar("Request for closed group is pending...");
				}
			}
			console.log(data);
			window.location.reload();
		});
	};
	my.leaveGroup = function(user_pk, user_secret_key, group_pk) {
		$.post({
			url: config.URLs.leave_group,
			data: JSON.stringify({ 'user_pk': user_pk, 'user_secret_key': user_secret_key, 'group_pk': group_pk }),
			headers: { 'X-CSRFToken': MANAGER.getCookie('csrftoken') }
		}).done(function(data) {
			EFFECTS.redirect(data);
		});
	};
	my.createGroup = function(user_pk, user_secret_key, group_name, privacy) {
		$.post({
			url: config.URLs.create_group,
			data: JSON.stringify({ 'user_pk': user_pk, 'user_secret_key': user_secret_key, 'name': group_name, 'privacy': privacy }),
			headers: { 'X-CSRFToken': MANAGER.getCookie('csrftoken')}
		}).done(function(data) {
			EFFECTS.redirect(data);
		});
	};
	my.setGroupSettings = function(user_pk, user_secret_key, group_pk, privacy, visibility, name) {
		$.post({
			url: config.URLs.edit_group,
			data: JSON.stringify({
				'user_pk': user_pk,
				'user_secret_key': user_secret_key,
				'group_pk': group_pk,
				'privacy': privacy,
				'visibility': visibility,
				'name': name
			}),
			headers: { 'X-CSRFToken': MANAGER.getCookie('csrftoken') }
		}).done(function(data) {
			console.log(data);
			if('error' in data) {
				EFFECTS.snackBar(data['error'])
			}
			if('success' in data) {
				EFFECTS.snackBar('saved group settings');
			}
		});
	};
	my.deleteGroup = function(user_pk, user_secret_key, group_pk) {
		$.post({
			url: config.URLs.delete_group,
			data: JSON.stringify({ 'user_pk': user_pk, 'user_secret_key': user_secret_key, 'group_pk': group_pk }),
			headers: { 'X-CSRFToken': MANAGER.getCookie('csrftoken') }
		}).done(function(data) {
			EFFECTS.redirect(data, config.URLs.groups);
		});
	}

	my.follow = function(user_pk, user_secret_key, followee_pk) {
		my.sendFollowRequest(user_pk, user_secret_key, followee_pk, true);
	}

	my.unfollow = function(user_pk, user_secret_key, followee_pk) {
		my.sendFollowRequest(user_pk, user_secret_key, followee_pk, false);
	}

	my.sendFollowRequest = function(user_pk, user_secret_key, followee_pk, accepted) {
		let url = accepted ? config.URLs.follow : config.URLs.unfollow;
		$.post({
			url: url,
			data: JSON.stringify({'user_pk': user_pk, 'user_secret_key': user_secret_key, 'followee_pk': followee_pk }),
			headers: { 'X-CSRFToken': MANAGER.getCookie('csrftoken')}
		}).done(function(data) {
			console.log(data);
			if('success' in data) {
				EFFECTS.snackBar(data['success']);
				my.getFollowing(user_pk, user_secret_key);
			} else {
				EFFECTS.snackBar(data['error']);
			}
		});
	};

	my.getFollowing = function(user_pk, user_secret_key) {
		$.post({
			url: config.URLs.get_following,
			data: JSON.stringify({ 'user_pk': user_pk, 'user_secret_key': user_secret_key }),
			headers: { 'X-CSRFToken': MANAGER.getCookie('csrftoken') }
		}).done(function(data) {
			console.log(data);
			if('error' in data) {
				EFFECTS.snackBar(data['error'])
			} else {
				EFFECTS.updateFollowingGroup(data['following'])
			}
		})
	}

	my.acceptFollowRequest = function(user_pk, user_secret_key, follower_pk) {
		my.respondToFollowRequest(user_pk, user_secret_key, follower_pk, true);
	}

	my.rejectFollowRequest = function(user_pk, user_secret_key, follower_pk) {
		my.respondToFollowRequest(user_pk, user_secret_key, follower_pk, false);
	}

	my.respondToFollowRequest = function(user_pk, user_secret_key, follower_pk, accepted) {
		url = accepted ? config.URLs.accept_follower : config.URLs.remove_follower;
		$.post({
			url: url,
			data: JSON.stringify({'user_pk': user_pk, 'user_secret_key': user_secret_key, 'follower_pk': follower_pk }),
			headers: { 'X-CSRFToken': MANAGER.getCookie('csrftoken') }
		}).done(function(data) {
			// EFFECTS.redirect(data);
			EFFECTS.messageAfterResponseToFollowRequest(follower_pk, accepted);
			console.log(data);
			if('success' in data) {
				EFFECTS.snackBar('success');
			} else {
				EFFECTS.snackBar(data['error']);
			}
		});
	}

	//Called by statusChangeCallback() after FB Login button pressed. Verifies that account exists, then redirects to Graphs page.
	my.login_with_facebook = function(accessToken) {
		FB.api('/me?fields=id,email', function(response) {
		  $.post({
			url: config.URLs.login_with_facebook,
			data: JSON.stringify({
				'user_access_token': accessToken
			}),
			headers: { 'X-CSRFToken': MANAGER.getCookie('csrftoken')}
		  }).done(function(data) {
			console.log(data);
			if(data.user_pk) {
				window.location.href = config.URLs.home;
			}
		  });
		});
		my.get_profile_picture();
	};

	// Currently not used
	my.logout_fb_user = function() {
		FB.getLoginStatus(function(response) {
			if(response.status === 'connected') {
				FB.logout(function(response) {
					console.log('logged out of facebook');
				});
			}
			else {
				console.log('not logged into facebook');
			}
		});
	};

	// Gets the logged-in Facebook user's profile picture
	my.get_profile_picture = function() {
		FB.api('/me/picture', function(response) { console.log(response.data.url); });
	};

	my.deleteAccount = function (user_pk, user_secret_key ) {
		$.post({
			url: config.URLs.delete_account,
			data: JSON.stringify({
				'user_pk': user_pk,
				'user_secret_key': user_secret_key
			}),
			dataType: 'json',
			contentType: 'application/json',
		}).done(function(data) {
			if('error' in data) {
				EFFECTS.snackBar(data['error'])
			}
			if('success' in data) {
				window.location.href = config.URLs.home;
				EFFECTS.snackBar("Account has been deleted")
			}
		});
	}
	return my;
}());

// Facebook login
const SOCIAL_AUTH = (function() {
	var my = {};

	my.loadFacebook = function() {
		window.fbAsyncInit = function() {
			FB.init({
				// Use MantisX Test App if localhost
				appId: (window.location.href.includes('localhost') ? '1753474508210652' : '1745068419051261'),
				xfbml: true,
				version: 'v2.6'
			});
		};
		(function(d, s, id) {
			var js, fjs = d.getElementsByTagName(s)[0];
			if (d.getElementById(id)) {
				return;
			}
			js = d.createElement(s);
			js.id = id;
			js.src = "//connect.facebook.net/en_US/sdk.js";
			fjs.parentNode.insertBefore(js, fjs);
		}(document, 'script', 'facebook-jssdk'));
	};

	my.checkLoginState = function() {
		FB.getLoginStatus(function(response) {
			my.statusChangeCallback(response);
		});
	};

	my.statusChangeCallback = function(response) {
		console.log('statusChangeCallback');
		console.log(response);
		if (response.status === 'connected') {
			var accessToken = response.authResponse.accessToken;
			console.log("Access Token: " + accessToken);
			API.login_with_facebook(accessToken);
		} else if (response.status === 'not_authorized') {
			console.log('Please log into this app.');
		} else {
			console.log('Please log into Facebook.');
		}
	};

	return my;
}());
