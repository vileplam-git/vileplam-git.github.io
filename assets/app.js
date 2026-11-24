/* Vileplam Enterprises – hash router, nav, contact form and faceted background.
   No build step; works on GitHub Pages as-is. */
(function () {
	'use strict';

	/* ------------------------------------------------------------------ Config */

	// Contact form delivery. FormSubmit relays a static-site POST to this inbox as an email.
	// The very first submission triggers a one-time activation email to the address below;
	// after activation, FormSubmit shows a random alias you can paste here instead to keep
	// the address out of the page source.
	var CONTACT_EMAIL = 'office@vileplam.com.cy';
	var FORM_ENDPOINT = 'https://formsubmit.co/ajax/' + CONTACT_EMAIL;

	/* ------------------------------------------------------------------ Router */

	var views = Array.prototype.slice.call(document.querySelectorAll('.view'));
	var navLinks = Array.prototype.slice.call(document.querySelectorAll('[data-nav]'));
	var main = document.getElementById('main');
	var DEFAULT_ROUTE = 'home';
	var currentRoute = null;

	function viewFor(route) {
		for (var i = 0; i < views.length; i++) {
			if (views[i].getAttribute('data-route') === route) return views[i];
		}
		return null;
	}

	function show(route, opts) {
		var view = viewFor(route) || viewFor(DEFAULT_ROUTE);
		route = view.getAttribute('data-route');

		if (route !== currentRoute) {
			views.forEach(function (v) { v.classList.toggle('active', v === view); });
			navLinks.forEach(function (a) {
				if (a.getAttribute('data-nav') === route) a.setAttribute('aria-current', 'page');
				else a.removeAttribute('aria-current');
			});
			document.title = view.getAttribute('data-title') || document.title;
			currentRoute = route;
		}

		if (opts && opts.anchor) {
			opts.anchor.scrollIntoView({ block: 'start' });
		} else if (!opts || !opts.keepScroll) {
			window.scrollTo(0, 0);
			// move focus for screen-reader users without scrolling
			try { main.focus({ preventScroll: true }); } catch (e) { /* older browsers */ }
		}
	}

	function route() {
		var hash = decodeURIComponent(location.hash || '');

		// "#/company" style routes
		if (hash === '' || hash === '#' || hash.indexOf('#/') === 0) {
			var name = hash.replace(/^#\/?/, '').split(/[/?]/)[0];
			show(name || DEFAULT_ROUTE);
			// "#/contact?topic=venture" preselects the matching topic in the contact form
			var topic = (hash.split('?')[1] || '').match(/(?:^|&)topic=([^&]+)/);
			if (topic && name === 'contact') preselectTopic(topic[1]);
			return;
		}

		// Plain in-page anchors (e.g. "#velorum", "#main"): reveal the view that contains them.
		var target = document.getElementById(hash.slice(1));
		if (target) {
			var owner = target.closest ? target.closest('.view') : null;
			if (owner) {
				show(owner.getAttribute('data-route'), { anchor: target });
			} else {
				// e.g. skip link to <main>: stay on current view
				if (!currentRoute) show(DEFAULT_ROUTE, { keepScroll: true });
			}
			return;
		}

		show(DEFAULT_ROUTE);
	}

	function preselectTopic(key) {
		var select = document.querySelector('#contact-form select[name="topic"]');
		if (!select) return;
		for (var i = 0; i < select.options.length; i++) {
			if (select.options[i].text.toLowerCase().indexOf(key.toLowerCase()) !== -1) {
				select.selectedIndex = i;
				return;
			}
		}
	}

	window.addEventListener('hashchange', route);
	route();

	/* ------------------------------------------------------------------ Mobile nav */

	var toggle = document.querySelector('.nav-toggle');
	var nav = document.getElementById('site-nav');

	function setNav(open) {
		toggle.setAttribute('aria-expanded', String(open));
		nav.classList.toggle('open', open);
	}
	toggle.addEventListener('click', function () {
		setNav(toggle.getAttribute('aria-expanded') !== 'true');
	});
	nav.addEventListener('click', function (e) {
		if (e.target.closest('a')) setNav(false);
	});
	document.addEventListener('keydown', function (e) {
		if (e.key === 'Escape') setNav(false);
	});

	/* ------------------------------------------------------------------ Footer year */

	var year = document.getElementById('year');
	if (year) year.textContent = String(new Date().getFullYear());

	/* ------------------------------------------------------------------ Contact form */

	var form = document.getElementById('contact-form');
	var statusEl = form.querySelector('.form-status');
	var submitBtn = form.querySelector('button[type="submit"]');

	function setStatus(msg, kind) {
		statusEl.textContent = msg;
		statusEl.className = 'form-status' + (kind ? ' ' + kind : '');
	}

	function validate() {
		var ok = true;
		var firstBad = null;
		['name', 'email', 'message'].forEach(function (n) {
			var el = form.elements[n];
			var valid = el.value.trim() !== '' && el.checkValidity();
			el.closest('.field').classList.toggle('invalid', !valid);
			el.setAttribute('aria-invalid', String(!valid));
			if (!valid) { ok = false; firstBad = firstBad || el; }
		});
		var consent = form.elements.consent;
		consent.closest('.check').classList.toggle('invalid', !consent.checked);
		if (!consent.checked) { ok = false; firstBad = firstBad || consent; }
		if (firstBad) firstBad.focus();
		return ok;
	}

	function mailtoFallback(d) {
		var body = d.message + '\n\n— ' + d.name + (d.company ? ', ' + d.company : '') + '\n' + d.email;
		return 'mailto:' + CONTACT_EMAIL +
			'?subject=' + encodeURIComponent('[vileplam.com.cy] ' + d.topic) +
			'&body=' + encodeURIComponent(body);
	}

	form.addEventListener('input', function (e) {
		var f = e.target.closest('.field, .check');
		if (f && f.classList.contains('invalid')) {
			f.classList.remove('invalid');
			e.target.removeAttribute('aria-invalid');
		}
	});

	form.addEventListener('submit', function (e) {
		e.preventDefault();
		setStatus('');
		if (!validate()) {
			setStatus('Please fill in the highlighted fields.', 'err');
			return;
		}

		var d = {
			name: form.elements.name.value.trim(),
			email: form.elements.email.value.trim(),
			company: form.elements.company.value.trim(),
			topic: form.elements.topic.value,
			message: form.elements.message.value.trim()
		};

		// Bots fill the hidden honeypot; pretend success and drop it.
		if (form.elements._honey.value) {
			setStatus('Thank you, your message has been sent.', 'ok');
			form.reset();
			return;
		}

		submitBtn.disabled = true;
		setStatus('Sending…');

		fetch(FORM_ENDPOINT, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
			body: JSON.stringify({
				Name: d.name,
				Email: d.email,
				Company: d.company || '—',
				Topic: d.topic,
				Message: d.message,
				_replyto: d.email,
				_subject: '[vileplam.com.cy] ' + d.topic + ' – ' + d.name,
				_template: 'table',
				_captcha: 'false'
			})
		})
			.then(function (res) {
				return res.json().catch(function () { return {}; }).then(function (json) {
					if (!res.ok || String(json.success) !== 'true') throw new Error(json.message || res.status);
				});
			})
			.then(function () {
				form.reset();
				setStatus('Thank you, your message has been sent. We will reply by email.', 'ok');
			})
			.catch(function () {
				statusEl.className = 'form-status err';
				statusEl.textContent = 'Your message could not be sent. ';
				var a = document.createElement('a');
				a.href = mailtoFallback(d);
				a.textContent = 'Send it from your email app instead';
				statusEl.appendChild(a);
				statusEl.appendChild(document.createTextNode('.'));
			})
			.then(function () { submitBtn.disabled = false; });
	});

	/* ------------------------------------------------------------------ Faceted background
	   A low-poly field echoing the crystalline logo. Drawn once per resize; no animation loop. */

	var canvas = document.getElementById('facets');
	var ctx = canvas.getContext && canvas.getContext('2d');
	if (!ctx) return;

	var palette = [[63, 208, 238], [42, 125, 225], [29, 79, 184], [20, 54, 110], [120, 220, 245]];

	// small deterministic PRNG so the pattern stays the same between resizes
	function rng(seed) {
		return function () {
			seed |= 0; seed = seed + 0x6D2B79F5 | 0;
			var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
			t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
			return ((t ^ t >>> 14) >>> 0) / 4294967296;
		};
	}

	function draw() {
		var dpr = Math.min(window.devicePixelRatio || 1, 2);
		var w = window.innerWidth, h = window.innerHeight;
		canvas.width = Math.round(w * dpr);
		canvas.height = Math.round(h * dpr);
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx.clearRect(0, 0, w, h);

		var rand = rng(7);
		var cell = Math.max(90, Math.min(150, w / 10));
		var cols = Math.ceil(w / cell) + 2, rows = Math.ceil(h / cell) + 2;
		var pts = [];
		for (var y = 0; y < rows; y++) {
			pts[y] = [];
			for (var x = 0; x < cols; x++) {
				pts[y][x] = [
					(x - 0.5) * cell + (rand() - 0.5) * cell * 0.8,
					(y - 0.5) * cell + (rand() - 0.5) * cell * 0.8
				];
			}
		}

		function tri(a, b, c) {
			var cx = (a[0] + b[0] + c[0]) / 3, cy = (a[1] + b[1] + c[1]) / 3;
			// strongest toward the top-right, fading toward bottom-left
			var fx = cx / w, fy = cy / h;
			var weight = Math.max(0, Math.min(1, (fx * 0.9 + (1 - fy) * 0.8) - 0.55));
			var col = palette[Math.floor(rand() * palette.length)];
			var alpha = (0.015 + rand() * 0.06) * (0.25 + weight * 1.6);
			ctx.beginPath();
			ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.closePath();
			ctx.fillStyle = 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',' + alpha.toFixed(3) + ')';
			ctx.fill();
			ctx.strokeStyle = 'rgba(120,190,240,' + (0.02 + weight * 0.05).toFixed(3) + ')';
			ctx.lineWidth = 1;
			ctx.stroke();
		}

		for (var j = 0; j < rows - 1; j++) {
			for (var i = 0; i < cols - 1; i++) {
				var p00 = pts[j][i], p10 = pts[j][i + 1], p01 = pts[j + 1][i], p11 = pts[j + 1][i + 1];
				if ((i + j) % 2) { tri(p00, p10, p11); tri(p00, p11, p01); }
				else { tri(p00, p10, p01); tri(p10, p11, p01); }
			}
		}
	}

	var t;
	window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(draw, 150); });
	draw();
})();
