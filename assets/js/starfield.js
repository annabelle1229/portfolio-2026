(function () {
	var canvas = document.getElementById("starfield");
	var prefersReduced = window.matchMedia(
		"(prefers-reduced-motion: reduce)",
	).matches;

	var gl = canvas.getContext("webgl", { alpha: false, antialias: false });
	if (!gl) return;

	var vertSrc = [
		"attribute vec2 a_pos;",
		"void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }",
	].join("\n");

  	var fragSrc = `
		precision highp float;
		uniform float u_time;
		uniform vec2 u_res;

		const float PI = 3.14159265359;
		const float TAU = 6.28318530718;

		float hash(vec2 p) {
			vec3 p3 = fract(vec3(p.xyx) * 0.1031);
			p3 += dot(p3, p3.yzx + 33.33);
			return fract((p3.x + p3.y) * p3.z);
		}

		float gNoise(vec2 p) {
			vec2 i = floor(p), f = fract(p);
			vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
			return mix(
				mix(hash(i), hash(i + vec2(1, 0)), u.x),
				mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x),
				u.y
			);
		}

		float fbmLite(vec2 p) {
			float v = 0.5 * gNoise(p);
			p = mat2(0.866, 0.5, -0.5, 0.866) * p * 2.03 + vec2(47.0, 13.0);
			v += 0.25 * gNoise(p);
			return v;
		}

		vec3 starField(vec3 rd) {
			float u = atan(rd.z, rd.x) / TAU + 0.5;
			float v = asin(clamp(rd.y, -0.999, 0.999)) / PI + 0.5;
			vec3 col = vec3(0.0);

			// Bright sparse stars
			// pow 數字越大 → 星星越少（建議範圍 10~30）
			// b * 4.0 → 亮度倍率，想暗一點改小
			{
				vec2 cell = floor(vec2(u, v) * 55.0);
				vec2 f = fract(vec2(u, v) * 55.0);
				vec2 r = vec2(hash(cell), hash(cell + 127.1));
				float d = length(f - r);
				float b = pow(r.x, 50.0) * exp(-d * d * 800.0);
				col += mix(vec3(1.0, 0.65, 0.35), vec3(0.55, 0.75, 1.0), r.y) * b * 4.0;
			}

			// Medium density stars
			// pow 數字越大 → 星星越少
			// b * 2.0 → 亮度倍率
			{
				vec2 cell = floor(vec2(u, v) * 170.0);
				vec2 f = fract(vec2(u, v) * 170.0);
				vec2 r = vec2(hash(cell + 43.0), hash(cell + 91.0));
				float d = length(f - r);
				float b = pow(r.x, 30.0) * exp(-d * d * 1000.0);
				col += vec3(0.85, 0.88, 1.0) * b * 2.0;
			}

			// Fine star dust
			// pow 數字越大 → 星塵越少
			// b * 1.2 → 亮度倍率
			{
				vec2 cell = floor(vec2(u, v) * 380.0);
				vec2 f = fract(vec2(u, v) * 380.0);
				vec2 r = vec2(hash(cell + 7.3), hash(cell + 53.7));
				float d = length(f - r);
				float b = pow(r.x, 30.0) * exp(-d * d * 2000.0);
				col += vec3(0.7, 0.75, 0.9) * b * 1.2;
			}

			// Nebula 星雲霧氣
			// vec3(R, G, B) → 霧氣顏色
			// pow(n, X) → 數字越大霧氣越淡，越小越濃（建議範圍 2~5）
			float n = fbmLite(vec2(u, v) * 3.0) * fbmLite(vec2(u, v) * 5.5 + 10.0);
			col += vec3(0.02, 0.04, 0.08) * pow(n, 3.0);

			return col;
		}

		void main() {
			vec2 uv = (gl_FragCoord.xy - u_res * 0.5) / u_res.x;

			// 飄移速度 — 調成 0.0 就完全靜止
			float driftX = u_time * 0.008;  // 左右漂移
			float driftY = u_time * 0.002;  // 上下漂移

			// 視角寬窄 — 數字越小視角越廣（星星越密），越大越窄（建議範圍 0.5~1.2）
			float fov = 1.0;
			vec3 rd = normalize(vec3(uv * fov, 1.0));

			// Apply drift as a small rotation around Y and X axes
			float cy = cos(driftX), sy = sin(driftX);
			rd = vec3(rd.x * cy + rd.z * sy, rd.y, -rd.x * sy + rd.z * cy);
			float cx = cos(driftY), sx = sin(driftY);
			rd = vec3(rd.x, rd.y * cx - rd.z * sx, rd.y * sx + rd.z * cx);

			vec3 col = starField(rd);

			// Gentle gamma
			col = pow(max(col, 0.0), vec3(0.45));

			gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
		}
	`;

	function compile(type, src) {
		var s = gl.createShader(type);
		gl.shaderSource(s, src);
		gl.compileShader(s);
		if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
			console.error("Shader compile error:", gl.getShaderInfoLog(s));
		}
		return s;
	}

	var prog = gl.createProgram();
	gl.attachShader(prog, compile(gl.VERTEX_SHADER, vertSrc));
	gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fragSrc));
	gl.linkProgram(prog);
	gl.useProgram(prog);

	var buf = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, buf);
	gl.bufferData(
		gl.ARRAY_BUFFER,
		new Float32Array([-1, -1, 3, -1, -1, 3]),
		gl.STATIC_DRAW,
	);
	var aPos = gl.getAttribLocation(prog, "a_pos");
	gl.enableVertexAttribArray(aPos);
	gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

	var uTime = gl.getUniformLocation(prog, "u_time");
	var uRes = gl.getUniformLocation(prog, "u_res");

	var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
	var needsResize = true;
	var running = true;

	function resize() {
		needsResize = false;
		var w = Math.round(canvas.clientWidth * dpr);
		var h = Math.round(canvas.clientHeight * dpr);
		if (canvas.width !== w || canvas.height !== h) {
			canvas.width = w;
			canvas.height = h;
			gl.viewport(0, 0, w, h);
			gl.uniform2f(uRes, canvas.width, canvas.height);
		}
	}

	function render(now) {
		if (!running) return;
		if (needsResize) resize();
		var t = prefersReduced ? 0.0 : now * 0.001;
		gl.uniform1f(uTime, t);
		gl.drawArrays(gl.TRIANGLES, 0, 3);
		requestAnimationFrame(render);
	}

	window.addEventListener("resize", function () {
		needsResize = true;
	});
	resize();
	requestAnimationFrame(render);

	document.addEventListener("visibilitychange", function () {
		if (document.hidden) {
			running = false;
		} else {
			running = true;
			requestAnimationFrame(render);
		}
	});
})();