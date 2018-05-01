"use strict";

class Vec2 {
	constructor(x = 0, y = 0) {
		this.x = x;
		this.y = y;
	}
}
class Rect extends Vec2 {
	constructor(x, y, w, h) {
		super(x, y);
		this.w = w;
		this.h = h;
	}
	overlaps(rect) {
		return (
			this.x + this.w > rect.x &&
			this.x < rect.x + rect.w &&
			this.y + this.h > rect.y &&
			this.y < rect.y + rect.h
		);
	}
}
class MovingTexture extends Rect {
	constructor(x, y, w, h, texture) {
		super(x, y, w, h);
		this.texture = texture;
	}
	draw(ctx) {
		ctx.drawImage(this.texture, this.x, this.y, this.w, this.h);
	}
}
class Particle extends Vec2 {
	constructor(x, y, s, born, v = new Vec2(rand(-1, 1), rand(-1, 1))) {
		super(x, y);
		this.born = born;
		this.s = s;
		this.v = v;
		this.r = rand(0, Math.PI * 2);
		this.alpha = 1;
	}
	move(delta) {
		this.v.y += 0.02 * delta;
		this.x += this.v.x * delta;
		this.y += this.v.y * delta;
	}
	draw(ctx, now) {
		ctx.fillStyle = "#fff";
		ctx.translate(this.x, this.y);
		ctx.rotate(this.r);
		ctx.globalAlpha = this.alpha;
		ctx.fillRect(-this.s, -this.s, this.s * 2, this.s * 2);
		ctx.globalAlpha = 1;
		ctx.rotate(-this.r);
		ctx.translate(-this.x, -this.y);
	}
}

const width = 800; // pixels
const height = 480; // pixels
const playerHeight = 5 * 8;
const playerSpeed = 250 / 60; // pixels
const enemySpeed = 5; // pixels
const bulletSize = 5; // pixels
const fireCooldown = 500; // milliseconds
const enemySpawnRate = 1667; // milliseconds
const particleTime = 1660; // milliseconds
const particleAmount = [7, 9];
const particleRadius = 4; // pixels
const fontName = "Fipps-Regular";
const fontUrl = "./Fipps-Regular.woff";

let bullets = [];
let enemies = [];
let particles = [];
let lives = 3;
let score = 0;
let lastFired = 0;
let lastSpawn = 0;
let keysDown = new Set();
let highScore = parseInt(localStorage.getItem("highScore")) || 0;
let canvas;
let ctx;
let player;
let prevTime;
let playerTexture;
let enemyTexture;
let bulletTexture;

const rand = (min, max) => Math.random() * (max - min) + min;
const randInt = (min, max) => Math.random() * (max - min + 1) + min | 0;
const loadImage = src => new Promise((resolve, reject) => {
	let img = new Image();
	img.onload = () => resolve(img);
	img.onerror = reject;
	img.src = src;
});
const loadFont = (name, src) => {
	const font = new FontFace(name, `url(${src})`);
	document.fonts.add(font);
	return font.load();
};
const loadAssets = () => {
	ctx.fillStyle = "#fff";
	ctx.font = "20px Consolas";
	ctx.textBaseline = "hanging";
	ctx.fillText("loading assets...", 10, 10);
	return Promise.all([
		loadImage("./player.png"),
		loadImage("./enemy.png"),
		loadFont(fontName, fontUrl)
	]);
};
const loop = now => {
	const delta = (now - prevTime) / (1000 / 60);
	update(now, delta);
	draw();
	prevTime = now;
	if (lives > 0) requestAnimationFrame(loop);
};
const update = (now, delta) => {
	for (let i = 0; i < enemies.length; ++i) {
		const enemy = enemies[i];
		enemy.x -= enemySpeed * delta;
		if (enemy.x < -enemy.w) {
			--lives;
			enemies.splice(i--, 1);
		}
	}
	for (let i = 0; i < bullets.length; ++i) {
		const bullet = bullets[i];
		bullet.x += playerSpeed * delta;
		if (bullet.x > width) {
			bullets.splice(i--, 1);
		}
	}
	for (let i = 0; i < particles.length; ++i) {
		const particle = particles[i];
		particle.alpha = (particleTime - (now - particle.born)) / particleTime;
		if (particle.alpha <= 0) {
			particles.splice(i--, 1);
			continue;
		}
		particle.move(delta);
	}
	if (keysDown.has("s") || keysDown.has("ArrowDown"))
		player.y += playerSpeed * delta;
	if (keysDown.has("w") || keysDown.has("ArrowUp"))
		player.y -= playerSpeed * delta;
	player.y = Math.max(Math.min(player.y, height - player.h), 80);

	if (keysDown.has(" ") && now - lastFired >= fireCooldown) {
		lastFired = now;
		const s = bulletSize;
		const x = player.x + player.w - s;
		const y =  player.y + player.h / 2 - s / 2;
		const b = new MovingTexture(x, y, s, s, bulletTexture);
		bullets.push(b);
	}

	if (now - lastSpawn >= enemySpawnRate) {
		lastSpawn += enemySpawnRate;
		const x = width;
		const y = rand(80, height - 5 * 8);
		const enemy = new MovingTexture(x, y, 5 * 8, 5 * 8, enemyTexture);
		enemies.push(enemy);
	}

	outerBulletLoop:
	for (let i = 0; i < bullets.length; ++i) {
		const bullet = bullets[i];
		for (let j = 0; j < enemies.length; ++j) {
			const enemy = enemies[j];
			if (bullet.overlaps(enemy)) {
				score += 100;
				highScore = Math.max(score, highScore);
				bullets.splice(i--, 1);
				enemies.splice(j, 1);
				const x = enemy.x + enemy.w / 2;
				const y = enemy.y + enemy.h / 2;
				for (let n = randInt(...particleAmount); n--;)
					particles.push(new Particle(x, y, particleRadius, now));
				continue outerBulletLoop;
			}
		}
	}
};
const draw = () => {
	ctx.fillStyle = "#000";
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	player.draw(ctx);
	for (const bullet of bullets) bullet.draw(ctx);
	for (const particle of particles) particle.draw(ctx);
	for (const enemy of enemies) enemy.draw(ctx);

	ctx.font = "16px " + fontName;
	ctx.textAlign = "left";
	ctx.textBaseline = "hanging";
	ctx.fillStyle = "#f00";
	ctx.fillText("Lives: " + lives, 10, 5);
	ctx.fillStyle = "#fff";
	ctx.fillText("Score: " + score, 10, 35);
	ctx.font = "32px " + fontName;
	ctx.textAlign = "center";
	ctx.fillText(highScore.toString(), width / 2, 10);
	if (lives <= 0) {
		ctx.textBaseline = "middle";
		ctx.fillStyle = "#f00";
		ctx.fillText("Game Over", width / 2, height / 2 - 16);
	}
};
const keydown = ({key}) => keysDown.add(key);
const keyup = ({key}) => keysDown.delete(key);
const beforeunload = () => localStorage.setItem("highScore", highScore);
const init = async () => {
	canvas = document.getElementById("canvas");
	canvas.width = width;
	canvas.height = height;
	ctx = canvas.getContext("2d");
	ctx.imageSmoothingEnabled = false;
	addEventListener("keydown", keydown);
	addEventListener("keyup", keyup);
	addEventListener("beforeunload", beforeunload);

	[bulletTexture, enemyTexture] = await loadAssets();
	playerTexture = document.createElement("canvas");
	playerTexture.width = bulletTexture.width;
	playerTexture.height = bulletTexture.height;
	let temp = playerTexture.getContext("2d");
	temp.drawImage(bulletTexture, 0, 0);
	temp.globalCompositeOperation = "source-in";
	temp.fillStyle = "mediumaquamarine";
	temp.fillRect(0, 0, playerTexture.width, playerTexture.height);
	const y = height / 2 - playerHeight / 2;
	player = new MovingTexture(134, y, 4 * 8, playerHeight, playerTexture);

	prevTime = performance.now();
	requestAnimationFrame(loop);
};
document.addEventListener("DOMContentLoaded", init);
