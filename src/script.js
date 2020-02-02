/**
 * @preserve Credits
 *
 * "p5.js でゲーム制作" ( https://fal-works.github.io/make-games-with-p5js/ )
 * Copyright (c) 2020 FAL
 * Used under the MIT License
 * ( https://github.com/fal-works/make-games-with-p5js/blob/master/LICENSE )
 */

const FINAL_VELOCITY = 8;
const PLAYER_COLOR = "#4169e1";
const BLOCK_COLOR = "#a0522d";
const BACKGROUND_COLOR = "#deb887";
const CLOUD_COLOR = "#e6e6fa";
const PARTICLE_COLOR = "#00bfff";
let pc;

// エンティティ関連の関数

// ゲーム全体に関わる部分

let score = 0;

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
		if(blockPair.u.y > 50 || blockPair.u.y < -100){
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

function createCloud(){
  let w = 80 + random(200);
  return {
    x: 1000,
    y: 100 + random(400),
    vx: -2-random(2),
    vy:0,
    w: w,
    h: w * (0.4 + random(0.4)),
	  type: (random() < 0.5 ? "front" : "back")
  }
}


function addBlockPair(type = 0){
	if(type < 3){
    let y = random(-100, 100);
    blockPairs.push(createBlockPair(y, type));
	}else if(type === 3){
		let y = random(-100, 50);
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
}

function updateScore(type){
	switch(type){
		case 0:
			score += 1000; break;
		case 1:
			score += 5000; break;
		case 2:
			score += 10000; break;
		case 3:
			score += 7000; break; // 難しくなってしまった（（
	}
}

function drawGameoverScreen(){
  background(red(color(BACKGROUND_COLOR)), blue(color(BACKGROUND_COLOR)), green(color(BACKGROUND_COLOR)), 192);
  fill(0);
  textSize(64);
  textAlign(CENTER, CENTER);
  text("GAME OVER", width / 2, height / 2);
}

function resetGame(){
  gameState = "play";
  player = createPlayer();
  blockPairs = [];
	particles = [];
  clouds = [];
	score = 0;
}

function updateGame(){
  if(gameState === "gameover"){ return; }
  // パーティクルの追加
  particles.push(createParticle(player.x, player.y)); // プレイヤーの位置で
	// ブロックの追加
  if(frameCount % 120 === 1){
		let pairType = getType(); // 0～1.
		addBlockPair(pairType);
	}
  // 雲の追加
	if(frameCount % 200 == 0){ clouds.push(createCloud()); }

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

  if(!playerIsAlive(player)) gameState = "gameover";
  // 衝突判定
  for(let blockPair of blockPairs) {
    if(entitiesAreColliding(player, blockPair.u, 20 + 40, 20 + 200) || entitiesAreColliding(player, blockPair.l, 20 + 40, 20 + 200)) {
      gameState = "gameover";
      break;
    }else if(!blockPair.passed && blockPair.u.x + 40 < player.x - 20){
			// ブロックを通過したらスコアを上げる
			updateScore(blockPair.type);
			blockPair.passed = true;
		}
  }
}

function getType(){
	// 0:60% 1:25% 2:5% 3:10% にする。
	let r = random();
	if(r < 0.6){ return 0; }
	if(r < 0.85){ return 1; }
	if(r < 0.9){ return 2; }
	return 3;
}

function drawGame(){
  background(BACKGROUND_COLOR);
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

function onMousePress(){
  switch(gameState){
    case "play":
      applyJump(player);
      break;
    case "gameover":
      resetGame();
      break;
  }
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
  if(entity.vy < FINAL_VELOCITY){ entity.vy += 0.15; } // 終端速度を設定
}

function applyJump(entity){
  entity.vy = -5;
}

function drawPlayer(entity){
  //fill(PLAYER_COLOR);
  //rect(entity.x, entity.y, 40, 40, 8);
	image(playerImg, entity.x - 20, entity.y - 20);
}

function playerIsAlive(entity){
  return entity.y < 600;
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

function preload(){
	playerImg = loadImage(headAddress + "player.png");
	let blockUpperImgSet = [];
	let blockLowerImgSet = [];
	for(let i = 0; i < 4; i++){
		blockUpperImgSet.push(loadImage(headAddress + "block_upper_" + i + ".png"));
		blockLowerImgSet.push(loadImage(headAddress + "block_lower_" + i + ".png"));
	}
	blockImgSet = {upper:blockUpperImgSet, lower:blockLowerImgSet};
}

// setup/draw

function setup() {
  createCanvas(800, 600);
  rectMode(CENTER); // 四角形の基準点を中心に変える
  noStroke();
  resetGame();
	pc = {r:red(color(PARTICLE_COLOR)), g:green(color(PARTICLE_COLOR)), b:blue(color(PARTICLE_COLOR))};
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
