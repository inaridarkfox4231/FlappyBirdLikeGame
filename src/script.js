/**
 * @preserve Credits
 *
 * "p5.js でゲーム制作" ( https://fal-works.github.io/make-games-with-p5js/ )
 * Copyright (c) 2020 FAL
 * Used under the MIT License
 * ( https://github.com/fal-works/make-games-with-p5js/blob/master/LICENSE )
 */

/*
  効果音：ぐぁどさんがピストンコラージュで作った音源を使用させていただいてます。
	(http://pxtone.haru.gs/instruments/GaDtone.zip)
	BGM(背景音楽)：きつねさん(@Fox_dot_Lab)の楽曲FluffyBallonsを採用させていただきました。ありがとうございます！
*/

// レベルに応じて背景色を変える。
// レベルが高いと難しいブロックが増える。
// 最後にセレクト画面に戻れるようにしたい。
// ハイスコアをレベルごとにしてセレクト画面で表示されるようにするとか？まあとりあえずリセットでいいよ。
// decisionの効果音付けた。
// 12780フレーム（3:33くらい）で曲を戻す処理を追加

const FINAL_VELOCITY = 8;
const PLAYER_COLOR = "#4169e1";
const BLOCK_COLOR = "#a0522d";
//const BACKGROUND_COLOR = "#deb887";
const CLOUD_COLOR = "#e6e6fa";
const PARTICLE_COLOR = "#00bfff";
const TITLE_NAME = "--FLAPPY FLAFFY--";
let pc;

let gravity = 0.15;
let jump_speed = 4.5;
// 冷静に考えたらスマホ前提ならtouch系だけでいいんだっけ。とりあえず無しにしよ。

// レベリング関連
let level; // "easy", "normal", "hard", "crazy".
let cloudGenerateInterval = {easy:250, normal:200, hard:150, crazy:100};
let backCloudProbability = {easy:0.75, normal:0.5, hard:0.25, crazy:0.05};
let validation1 = {easy:0.9, normal:0.7, hard:0.4, crazy:0.1};
let validation2 = {easy:1.0, normal:0.9, hard:0.7, crazy:0.5};
let validation3 = {easy:1.0, normal:1.0, hard:0.9, crazy:0.8};

// 背景
let bgSet;

// エンティティ関連の関数

// ゲーム全体に関わる部分

// グローバル変数
let score;
let hi_score;
let musicCount; // 曲ループ用
let demoPlayerCount; // タイトル画面のキャラ動かし用

/** プレイヤーエンティティ */
let player = {
  x: 200,
  y: 300,
  vx: 0,
  vy: 0
}

/** ブロックエンティティ */
let blockPairs;
let particles;
let clouds;
let gameState;

function updatePosition(entity){
  entity.x += entity.vx;
  entity.y += entity.vy;
}

function updateBlockPairPosition(blockPair){
	updatePosition(blockPair.u);
	updatePosition(blockPair.l);
	if(blockPair.type === 1 || blockPair.type === 2){
		if(blockPair.u.y > 100 || blockPair.u.y < -100){
			blockPair.u.vy *= -1;
			blockPair.l.vy *= -1;
		}
	}else if(blockPair.type === 3){
		if(blockPair.u.y > 40 || blockPair.u.y < -100){
			blockPair.u.vy *= -1;
		}
		blockPair.l.y = 600 - blockPair.u.y; // 強制的に600 - u.yにする
	}
}

function createPlayer(){
  return {
    x: 200,
    y: 300,
    vx: 0,
    vy: 0
  }
}

function createBlock(y, type){
	switch(type){
		case 0:
			return {x:900, y, vx:-2, vy:0};
		case 1:
			return {x:900, y, vx:-2, vy:1};
		case 2:
			return {x:900, y, vx:-2, vy:2};
		case 3:
			return {x:900, y, vx:-2, vy:2}; // 上側だけ意味がある。下側は強制的にy座標を決める。
	}
}

function createBlockPair(y, type){
	if(type < 3){
    return {
      u:createBlock(y, type),
      l:createBlock(y + 600, type),
		  type,
		  passed:false // 通過したかどうか（スコア計算の際のフラグに使う）
    }
	}else if(type === 3){
		return {
			u:createBlock(y, type),
			l:createBlock(600 - y, type),
			type,
			passed:false // 伸び縮みするやつ。上のやつが-100～0まで動く、下は足して600を満たすように変化する。
		}
	}
}

// この0.5のところをレベルに応じて変化させる。
// スピードはブロックより大きくあって欲しいので-2.2～-3.8にする
function createCloud(){
  let w = 80 + random(200);
	let type = (random() < backCloudProbability[level] ? "back" : "front");
  return {
    x: 1000,
    y: 100 + random(400),
    vx: -2.2 - random() * 1.6,
    vy:0,
    w: w,
    h: w * (0.4 + random(0.4)),
	  type
  }
}


function addBlockPair(type = 0){
	if(type < 3){
    let y = random(-100, 100);
    blockPairs.push(createBlockPair(y, type));
	}else if(type === 3){
		let y = random(-100, 40);
		blockPairs.push(createBlockPair(y, type));
	}
  //blocks.push(createBlock(y));
  //blocks.push(createBlock(y + 600));
}

function entitiesAreColliding(
  entityA, entityB, collisionXDistance, collisionYDistance
){
  let currentXDistance = abs(entityA.x - entityB.x);
  if (collisionXDistance <= currentXDistance) return false;
  let currentYDistance = abs(entityA.y - entityB.y);
  if (collisionYDistance <= currentYDistance) return false;
  return true;
}

function drawScore(){
	fill(0);
	textSize(32);
	textAlign(LEFT, TOP);
	text("SCORE:" + score, 5, 5);
	text("Hi-SCORE:" + hi_score, 5, 45);
}

function updateScore(type){
	switch(type){
		case 0:
			score += 1000; break;
		case 1:
			score += 3000; break;
		case 2:
			score += 6000; break;
		case 3:
			score += 10000; break; // 難しくなってしまった（（
	}
}

function drawGameoverScreen(){
  background(0, 100);
	fill(80);
	rect(width * 0.9, height * 0.1, width * 0.2, height * 0.2);
  fill(0);
  textSize(64);
  textAlign(CENTER, CENTER);
  text("GAME OVER", width / 2, height / 2 - 35);
	if(score > hi_score){
		text("Hi-SCORE UPDATED!!", width / 2, height / 2 + 35);
	}
	textSize(32);
	text("TO TITLE", width * 0.9, height * 0.1);
}

function resetGame(){
  //gameState = "play";
  player = createPlayer();
  blockPairs = [];
	particles = [];
  clouds = [];
	if(score > hi_score){ hi_score = score; } // ハイスコア更新
	score = 0;
}

function updateGame(){
  if(gameState === "gameover"){ return; }
	if(gameState === "title" || gameState === "select"){ updateDemo(); return; }
	// 曲はプレイの間だけ流し続ける、12780カウントで元に戻す（一旦停止したのち再開）。
	musicCount++;
	if(musicCount === 12780){
		bgm.stop();
		bgm.play();
	}
  // パーティクルの追加
  particles.push(createParticle(player.x, player.y)); // プレイヤーの位置で
	// ブロックの追加
  if(frameCount % 120 === 1){
		let pairType = getType(); // 0～1.
		addBlockPair(pairType);
	}
  // 雲の追加
	if(frameCount % cloudGenerateInterval[level] === 0) clouds.push(createCloud());

	// 死んだエンティティの排除
  blockPairs = blockPairs.filter(blockPairIsAlive);
	particles = particles.filter(particleIsAlive);

  clouds = clouds.filter(cloudIsAlive);
  // データ操作処理

	// 位置更新
  updatePosition(player);
  for(let blockPair of blockPairs){
    updateBlockPairPosition(blockPair);
  }
	for (let particle of particles) updatePosition(particle);
  for(let cloud of clouds) updatePosition(cloud);

  // 重力を適用
	applyGravity(player);
	// パーティクルのライフ減少
  for (let particle of particles) decreaseLife(particle);

  if(!playerIsAlive(player)) miss();
  // 衝突判定
  for(let blockPair of blockPairs) {
    if(entitiesAreColliding(player, blockPair.u, 20 + 40, 20 + 200) || entitiesAreColliding(player, blockPair.l, 20 + 40, 20 + 200)) {
      miss();
      break;
    }else if(!blockPair.passed && blockPair.u.x + 40 < player.x - 20){
			// ブロックを通過したらスコアを上げる
			soundSet.passed.play();
			updateScore(blockPair.type);
			blockPair.passed = true;
		}
  }
}

// ミスした時の処理（gameoverにする、音出す）
// どうして・・・・stopを先にしてみる？
function miss(){
	gameState = "gameover";
	bgm.stop();
	soundSet.miss.play();
}

function updateDemo(){
  // 雲の追加
	if(frameCount % 200 == 0){ clouds.push(createCloud()); }
  clouds = clouds.filter(cloudIsAlive);
  for(let cloud of clouds) updatePosition(cloud);
}

// レベリングこんな感じでどう？
// EASY: 0:90% 1:5% 2:5% 3:0%     背景色：緑系     雲比率：back:75, front:25  interval:250
// NORMAL: 0:60% 1:25% 2:10% 3:5%   背景色：青系   雲比率：back:50, front:50  interval:200
// HARD: 0:30% 1:35% 2:20% 3:15%    背景色：赤系   雲比率：back:25, front:75  interval:150
// CRAZY: 0:0% 1:40% 2:30% 3:30%   背景色：灰色系  雲比率：back:0,  front:100 interval:100

function getType(){
	// 0:60% 1:25% 2:10% 3:5% にする。(NORMAL)
	let r = random();
	if(r < validation1[level]){ return 0; }
	if(r < validation2[level]){ return 1; }
	if(r < validation3[level]){ return 2; }
	return 3;
}

function drawGame(){
	if(gameState === "title" || gameState === "select"){ drawTitle(); return; }
  //background(BACKGROUND_COLOR);
	//background(220);
	image(bgSet[level], 0, 0);
	// パーティクル→プレイヤー→ブロック→最後に雲
	for(let cloud of clouds){ if(cloud.type === "back"){ drawCloud(cloud); } }
	for(let particle of particles) drawParticle(particle);
  drawPlayer(player);
  for(let blockPair of blockPairs){
    drawBlock(blockPair.u, "upper", blockPair.type);
		drawBlock(blockPair.l, "lower", blockPair.type);
  }
  for(let cloud of clouds){ if(cloud.type === "front"){ drawCloud(cloud); } }
  if(gameState === "gameover") drawGameoverScreen();
	drawScore(); // スコアが見えづらいので最後に描画する。
}

function drawTitle(){
	//background(200, 200, 255);
	image(bgSet.title, 0, 0);
	// デモ画面の雲
	for(let cloud of clouds) drawCloud(cloud);
	// デモ画面のプレイヤー
	const properCount = demoPlayerCount % 66;
	const demoPlayerHeight = 84.15 * properCount * (66 - properCount) / 1089;
	image(playerImg, width / 2 - 20, height / 2 - 20 - demoPlayerHeight); // はねる。
	demoPlayerCount++;
	// テキスト
	fill(0);
	textAlign(CENTER, CENTER);
	textSize(80);
	push();
	translate(width * 0.5, height * 0.5);
	text(TITLE_NAME, 0, -height * 0.3);
	applyMatrix(1, 0, 0, -1, 0, 0);
	fill(0, 64);
	text(TITLE_NAME, 0, height * 0.18);
	pop();
	// いろいろ表示する高さ・・
	const y = height * 3 / 5;
	if(gameState === "title"){
		// タイトルの場合はクリック要求
	  fill(0, 120 * sin(frameCount * 0.08) + 135)
	  text("CLICK HERE!", width / 2, y);
		return;
	}else{
		// セレクトの場合は選択肢を表示
		const r = width * 0.15;
		fill(34, 177, 76);
		ellipse(width * 0.2, y, r, r);
		fill(237, 28, 36);
		ellipse(width * 0.4, y, r, r);
		fill(63, 72, 204);
		ellipse(width * 0.6, y, r, r);
		fill(255, 127, 39);
		ellipse(width * 0.8, y, r, r);
		fill(0);
		textSize(28);
		text("EASY", width * 0.2, y);
		text("NORMAL", width * 0.4, y);
		text("HARD", width * 0.6, y);
		text("CRAZY", width * 0.8, y);
		return;
	}
}

function onMousePress(){
	const x = mouseX;
	const y = mouseY;
  switch(gameState){
		case "title":
		  gameState = "select"
			soundSet.decision.play();
			break;
		case "select":
			if(!cursorIsInLevelSelectArea(x, y)){ return; }
			level = getLevel(x);
			gameState = "play";
			bgm.play(); // BGMスタート！
			musicCount = 0; // 繰り返し用
			demoPlayerCount = 0;
			soundSet.decision.play();
			clouds = []; // 雲をカットする
			break;
    case "play":
      applyJump(player);
      break;
    case "gameover":
			resetGame();
			if(cursorIsInTotitleArea(x, y)){
				gameState = "title";
				soundSet.decision.play();
				hi_score = 0;
			}else{
				gameState = "play";
				bgm.play(); // BGMスタートはplayに入るとき（2ヶ所）
				musicCount = 0;
				demoPlayerCount = 0;
			}
      break;
  }
}

function cursorIsInLevelSelectArea(x, y){
	const selectY = height * 3 / 5;
	const r = width * 0.075;
	if(dist(x, y, width * 0.2, selectY) < r){ return true; }
	if(dist(x, y, width * 0.4, selectY) < r){ return true; }
	if(dist(x, y, width * 0.6, selectY) < r){ return true; }
	if(dist(x, y, width * 0.8, selectY) < r){ return true; }
	return false;
}

function cursorIsInTotitleArea(x, y){
	return (x < width) && (x > width * 0.8) && (y > 0) && (y < height * 0.2);
}

// xの位置に応じてeasy, normal, hard, crazyを返す
function getLevel(x){
	if(x < width * 0.3){ return "easy"; }
	if(x < width * 0.5){ return "normal"; }
	if(x < width * 0.7){ return "hard"; }
	return "crazy";
}

function drawBlock(entity, posType, type){
  //fill(BLOCK_COLOR);
  //rect(entity.x, entity.y, 80, 400, 8);
	image(blockImgSet[posType][type], entity.x - 80, entity.y - 240, 160, 480, 0, 0, 160, 480);
}

function blockIsAlive(entity){
  return -100 < entity.x;
}

function blockPairIsAlive(pair){
  return blockIsAlive(pair.u) && blockIsAlive(pair.l);
}

function cloudIsAlive(entity){
  return -300 < entity.x;
}

function applyGravity(entity){
  if(entity.vy < FINAL_VELOCITY){ entity.vy += gravity; } // 終端速度を設定
}

function applyJump(entity){
  entity.vy = -jump_speed;
	soundSet.jump.play();
}

function drawPlayer(entity){
  //fill(PLAYER_COLOR);
  //rect(entity.x, entity.y, 40, 40, 8);
	image(playerImg, entity.x - 20, entity.y - 20);
}

function playerIsAlive(entity){
	const flag = (entity.y < 700) && (entity.y > -100);
	if(!flag){ bgm.stop(); }
  return flag; // 画面上部に逃げれば当たらずに済んでしまうのでその裏技を禁止にする
}

function drawCloud(entity){
  fill(CLOUD_COLOR);
  ellipse(entity.x, entity.y, entity.w, entity.h);
}

// パーティクルエンティティ用

function createParticle(x, y) {
  let direction = random(TWO_PI);
  let speed = 2;

  return {
    x,
    y,
    vx: -2 + speed * cos(direction),
    vy: speed * sin(direction),
    life: 1 // = 100%
  };
}

function decreaseLife(particle) {
  particle.life -= 0.02;
}

function particleIsAlive(particle) {
  return particle.life > 0;
}

function drawParticle(particle) {
  push();
  noStroke();
  fill(pc.r, pc.g, pc.b, particle.life * 255);
  square(particle.x, particle.y, particle.life * 10);
  pop();
}

// preload

let playerImg;
let blockImgSet;
let headAddress = "https://inaridarkfox4231.github.io/assets/FlappyBird/";
//let headAddress = "";
let soundSet = {};
let bgm;

function preload(){
	playerImg = loadImage(headAddress + "player.png");
	let blockUpperImgSet = [];
	let blockLowerImgSet = [];
	for(let i = 0; i < 4; i++){
		blockUpperImgSet.push(loadImage(headAddress + "block_upper_" + i + ".png"));
		blockLowerImgSet.push(loadImage(headAddress + "block_lower_" + i + ".png"));
	}
	blockImgSet = {upper:blockUpperImgSet, lower:blockLowerImgSet};
	soundSet.jump = loadSound(headAddress + "jump.wav");
	soundSet.miss = loadSound(headAddress + "miss.wav");
	soundSet.passed = loadSound(headAddress + "passed.wav");
	soundSet.decision = loadSound(headAddress + "decision.wav");
	bgm = loadSound(headAddress + "Fluffy.mp3");
}

function createBackground(hue){
	let bg = createGraphics(width, height);
	bg.colorMode(HSB, 100);
	bg.noStroke();
	// 2番目を0→100とした上で3番目を100→0にする
	for(let k = 0; k < 100; k++){
		bg.fill(hue, k, 100);
		bg.rect(0, height * k / 200, width, height / 200);
		bg.fill(hue, 100, 100 - k);
		bg.rect(0, height * (100 + k) / 200, width, height / 200);
	}
  return bg;
}

function setBackgrounds(){
	bgSet = {};
	bgSet.title = createBackground(53);
	bgSet.easy = createBackground(33);
	bgSet.normal = createBackground(0);
	bgSet.hard = createBackground(70);
	bgSet.crazy = createBackground(13);
}


// setup/draw

function setup() {
  createCanvas(800, 600);
  rectMode(CENTER); // 四角形の基準点を中心に変える
  noStroke();
	hi_score = 0;
	gameState = "title";
  resetGame();
	pc = {r:red(color(PARTICLE_COLOR)), g:green(color(PARTICLE_COLOR)), b:blue(color(PARTICLE_COLOR))};
	setBackgrounds();
	demoPlayerCount = 0;
}

function draw() {
  updateGame();
  drawGame();
	//image(playerImg, 20, 20);
	//image(blockUpperImg, 20, 20, 160, 480, 0, 0, 160, 480);
}

function mousePressed(){
  // マウスが押された場合の処理
  onMousePress();
}
