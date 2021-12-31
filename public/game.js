const SPEED_PLAYER_MAX = 0.1;

function Game(mainPlayerImageIndex) {

  this.camera = { x: 0.0, y: 0.0, angle: 0.0 };

  this.world = new World();

  this.playerId = getPlayerId();

  this.players = new Map();
  this.mainPlayer = null;

  this.particles = new ParticleManager();

  const PLAYER_SPEED_MIN = 1e-7;

  const HINT_TIMEOUT = 30 * 12; // ~12s
  this.hintTimeout = HINT_TIMEOUT / 2;

  // === UPDATES =====================================================================

  let q = 0;

  const snowEmitter = {
    counter: 0,
    delay: 7,
    size: { x: 11, y: 6 },
    offset: { x: 0, y: -4.5 }
  };

  this.update = function () {
    // fancy stuff
    this.particles.update();

    // the worlds around us
    this.world.update();

    // spwan snowflakes
    if (snowEmitter.counter++ % snowEmitter.delay === 0)
      this.particles.spawn(
        particleSnowflake,
        this.camera.x + (Math.random() - 0.5) * snowEmitter.size.x,
        this.camera.y + (Math.random() - 0.9) * snowEmitter.size.y,
        (Math.random() - 0.5) * 0.02,
        (Math.random() + 0.0) * 0.02 + 0.02,
        65);

    // update everyone
    for (let aPlayer of this.players.values())
      aPlayer.update();

    // primary player manual control
    if (this.mainPlayer !== null) {
      let steeringWeight = 1;
      let maxSpeed = SPEED_PLAYER_MAX;

      if (this.mainPlayer.standingOnTile === tileIce.id) {
        steeringWeight = 0.03;
        maxSpeed *= 4;
      }

      // automatic "AI" for phone users
      if (this.mainPlayer.isMobile)
        this.doSelfDriving(this.mainPlayer, maxSpeed, steeringWeight);

      // keyboard inputs
      if (input.left) this.mainPlayer.speed.x = lerp(-maxSpeed, this.mainPlayer.speed.x, steeringWeight);
      if (input.right) this.mainPlayer.speed.x = lerp(+maxSpeed, this.mainPlayer.speed.x, steeringWeight);
      if (input.down) this.mainPlayer.speed.y = lerp(+maxSpeed, this.mainPlayer.speed.y, steeringWeight);
      if (input.up) this.mainPlayer.speed.y = lerp(-maxSpeed, this.mainPlayer.speed.y, steeringWeight);

      if (this.hintTimeout > 0) {
        --this.hintTimeout;
      } else {
        if (input.quit) {
          this.hintTimeout = HINT_TIMEOUT;

          this.showHint();
        }
      }

      // physics constraints
      this.applyPhysics(this.mainPlayer);

      // float point noize management
      if (Math.abs(this.mainPlayer.speed.x) < PLAYER_SPEED_MIN) this.mainPlayer.speed.x = 0;
      if (Math.abs(this.mainPlayer.speed.y) < PLAYER_SPEED_MIN) this.mainPlayer.speed.y = 0;
    }

    // update the camera
    if (this.mainPlayer !== null) {
      this.camera.x = this.mainPlayer.pos.x;
      this.camera.y = this.mainPlayer.pos.y - 0.25;
    }
    this.camera.angle = Math.sin(q += 0.007) * 0.02;
  }

  this.showHint = function () {
    // spawn hinting trail
    let px = 0, py = 0, minDist = 999999, found = false;

    const potentialTargets = new Set([
      presentA.id,
      presentB.id,
      presentC.id,
      presentD.id,
    ]);

    for (let y = 0; y < WORLD_WIDTH; y++)
      for (let x = 0; x < WORLD_WIDTH; x++) {
        const objId = this.world.getTileObject(x, y);
        if (potentialTargets.has(objId)) {
          const dist2 = sqr(this.camera.x - x) + sqr(this.camera.y - y);
          if (dist2 < minDist) {
            minDist = dist2;
            px = x;
            py = y;
            found = true;
          }
        }
      }

    if (found) {
      // shoot towards it
      let dx = px - this.camera.x;
      let dy = py - this.camera.y;
      const SPEED = 0.005;
      const normalizer = SPEED / Math.sqrt(minDist);
      dx *= normalizer;
      dy *= normalizer;

      for (let i = 0; i < 10; i++)
        this.particles.spawn(
          particleHint,
          this.camera.x + 2.5 * (Math.random() - 0.5),
          this.camera.y + 2.5 * (Math.random() - 0.5),
          dx / (i + 1),
          dy / (i + 1),
          45);
    } else {
      // burst greens
      for (let i = 0; i < 10; i++)
        this.particles.spawn(
          particleBoost,
          this.camera.x + 2.5 * (Math.random() - 0.5),
          this.camera.y + 2.5 * (Math.random() - 0.5),
          0.1 * (Math.random() - 0.5),
          0.1 * (Math.random() - 0.5),
          25);
    }
  }

  function lerp(a, b, t) {
    return a * t + b * (1 - t);
  }

  this.applyPhysics = function (player) {
    player.aabb.set(player.pos.x, player.pos.y, player.size.x, player.size.y);

    let dx = player.speed.x;
    let dy = player.speed.y;

    let lastSpeedX = dx;
    let lastSpeedY = dy;

    player.aabb.expand(player.speed.x, player.speed.y);
    const worldBoxes = this.world.getAABBsIn(player.aabb);

    // restore player original BB
    player.aabb.set(player.pos.x, player.pos.y, player.size.x, player.size.y);

    for (let box of worldBoxes)
      dy = box.calculateYOffset(player.aabb, dy);
    player.aabb.move(0, dy);

    for (let box of worldBoxes)
      dx = box.calculateXOffset(player.aabb, dx);
    player.aabb.move(dx, 0);

    aabbCache.releaseAll(worldBoxes);

    player.pos.x = (player.aabb.x1 + player.aabb.x2) / 2;
    player.pos.y = (player.aabb.y1 + player.aabb.y2) / 2;

    let collidingHorizontally = (lastSpeedX !== dx);
    let collidingVertically = (lastSpeedY !== dy);
    const onIce = (player.standingOnTile === tileIce.id);

    if (collidingHorizontally) {
      if (onIce)
        player.speed.x = -0.5 * player.speed.x;
      else
        player.speed.x = 0;
    }

    if (collidingVertically) {
      if (onIce)
        player.speed.y = -0.5 * player.speed.y;
      else
        player.speed.y = 0;
    }
  }

  const MIN_SELFDRIVING_DISTANCE_SQR = sqr(0.91);
  const MAX_SELFDRIVING_DISTANCE_SQR = sqr(15.0);

  this.doSelfDriving = function (player, maxSpeed, multiplier) {
    // find closest non-mobile player
    let target = null;
    let targetDistance = 999999;

    for (let aPlayer of this.players.values()) {
      // skip unrelated ones
      if (aPlayer === player || aPlayer.isMobile)
        continue;

      // calculate distance
      const dist2 = sqr(player.pos.x - aPlayer.pos.x) + sqr(player.pos.y - aPlayer.pos.y);
      if (dist2 < targetDistance) {
        targetDistance = dist2;
        target = aPlayer;
      }
    }

    if (target && targetDistance > MIN_SELFDRIVING_DISTANCE_SQR && targetDistance < MAX_SELFDRIVING_DISTANCE_SQR) {
      // move towards it
      let dx = target.pos.x - player.pos.x;
      let dy = target.pos.y - player.pos.y;

      const normalizer = maxSpeed / Math.sqrt(targetDistance + 0.01);
      dx *= normalizer;
      dy *= normalizer;

      // acceleration
      player.speed.x = lerp(dx, player.speed.x, multiplier);
      player.speed.y = lerp(dy, player.speed.y, multiplier);
    }
  };

  this.clickAt = function (px, py) {
    this.particles.spawn(
      particleBoost,
      this.camera.x + px,
      this.camera.y + py,
      0.0,
      0.0,
      65);
  }

  // === RENDERING =====================================================================

  this.renderList = [];

  let N = 0;
  const overlay = {
    size: { x: 20, y: 14 },
    style: 'rgba(0, 0, 0, 0.1)',
  }

  this.render = function (ctx) {
    const viewPoint = this.mainPlayer ? this.mainPlayer.pos : this.camera;
    // the world around us
    this.world.renderTiles(ctx, viewPoint);

    // darkening overlay
    /*ctx.fillStyle = overlay.style;
    ctx.fillRect(
      viewPoint.x - overlay.size.x / 2,
      viewPoint.y - overlay.size.y / 2,
      overlay.size.x, overlay.size.y);*/

    // sometimes we need to reorder things around...
    if (N++ % 2 === 0) {
      // Y-level sorting for pseudo-depth
      this.renderList = [];
      // request all visible objects
      this.world.queueDynamicObjects(this.renderList, viewPoint);
      // append players
      for (let aPlayer of this.players.values())
        this.renderList.push(aPlayer);
      // order
      this.renderList.sort((a, b) => a.pos.y - b.pos.y);
    }

    // everyone and everything sorted
    for (let obj of this.renderList)
      obj.render(ctx);

    // fancy stuff
    this.particles.render(ctx);

    // debug boxes
    /*if (this.mainPlayer !== null) {
      // player AABB
      /*ctx.strokeRect(
        this.mainPlayer.aabb.x1, this.mainPlayer.aabb.y1,
        this.mainPlayer.aabb.x2 - this.mainPlayer.aabb.x1,
        this.mainPlayer.aabb.y2 - this.mainPlayer.aabb.y1);

      ctx.strokeRect(
        this.mainPlayer.pos.x - 0.05,
        this.mainPlayer.pos.y - 0.05,
        0.1,
        0.1);
    }*/

    /*ctx.strokeRect(
      this.camera.x - 0.5 * snowEmitter.size.x,
      this.camera.y - 0.9 * snowEmitter.size.y,
      snowEmitter.size.x, snowEmitter.size.y);*/

    // tile fetching dot
    /*ctx.strokeRect(
      this.camera.x - 0.05,
      this.camera.y - 0.05,
      0.1,
      0.1);*/
  }

  // === NETWORKING =====================================================================

  const socket = io();
  socket.emit('player-join', this.playerId);

  const NETWORKING_UPDATE_RATE = 14;
  let positionTimer = null;



  // new player spawned (or just we ourselves)
  socket.on('spawn-player', newPlayerInfo => {
    console.log("New player: ", newPlayerInfo);
    const newPlayer = new Player(newPlayerInfo, mainPlayerImageIndex, this.world);

    this.players.set(newPlayerInfo.id, newPlayer);

    // is this we ourselves?
    if (newPlayerInfo.id === this.playerId) {
      // hook-up
      this.mainPlayer = newPlayer;

      // update cached packet
      movementPacket.pos = this.mainPlayer.pos;
      movementPacket.speed = this.mainPlayer.speed;

      // configure network update timer
      positionTimer = setInterval(() => this.notifyMainPlayerUpdates(), 1000 / NETWORKING_UPDATE_RATE);
    }
  });



  // someone left the server
  socket.on('despawn-player', pId => {
    this.players.delete(pId);

    if (pId == this.playerId)
      this.mainPlayer = null;
  });



  // someone moved to somewhere
  socket.on('move-player', info => {
    // apply updates
    const aPlayer = this.players.get(info.id);
    if (aPlayer) {
      aPlayer.targetPos = info.pos;
      aPlayer.speed.x = info.speed.x;
      aPlayer.speed.y = info.speed.y;

      if (info.id === this.playerId) {
        aPlayer.targetPos = null;
        aPlayer.pos.x = info.pos.x;
        aPlayer.pos.y = info.pos.y;
      }
    }
  });



  socket.on('world-invalidate', () => {
    const chunksToLoad = new Array(this.world.chunks.length);
    for (let i = 0; i < this.world.chunks.length; i++)
      chunksToLoad[i] = {
        cx: i % WORLD_WIDTH_CHUNKS,
        cy: Math.floor(i / WORLD_WIDTH_CHUNKS)
      };

    const cameraCX = this.mainPlayer.pos.x / CHUNK_SIZE;
    const cameraCY = this.mainPlayer.pos.y / CHUNK_SIZE;
    // order by distance to the camera
    chunksToLoad.sort((a, b) => {
      const dA = sqr(a.cx - cameraCX) + sqr(a.cy - cameraCY);
      const dB = sqr(b.cx - cameraCX) + sqr(b.cy - cameraCY);
      return dB - dA;
    });

    // setup world-loading timer
    let wlTimer = setInterval(() => {
      // request a chunk from the server
      socket.emit('world-chunk-get', chunksToLoad.pop());

      // disarm the timer at the end of the request chain
      if (chunksToLoad.length === 0)
        clearInterval(wlTimer);
    }, 25);
  });



  // chunk data arrived
  socket.on('world-chunk', chunkResponce => {
    const index = chunkResponce.chunk.cx + chunkResponce.chunk.cy * WORLD_WIDTH_CHUNKS;
    const chunk = this.world.chunks[index];
    chunk.loadFromResponce(chunkResponce);
  });



  // a tile changed somewhere
  socket.on('world-set-tile', change => {
    this.world.setTile(change.x, change.y, change.tileId);
  });



  // an object changed somewhere
  socket.on('world-set-object', change => {
    this.world.setTileObject(change.x, change.y, change.objectId);
  });



  const movementPacket = {
    id: this.playerId,
    pos: null,
    speed: null
  };

  this.notifyMainPlayerUpdates = function () {
    // disarm the timer if needed
    if (!this.mainPlayer) {
      clearInterval(positionTimer);
      return;
    }

    // send updates to the server
    socket.emit('player-position', movementPacket);
  }
}

function getPlayerId() {
  const GAME_PLAYER_KEY = 'Xmas-player-key';

  let key = localStorage.getItem(GAME_PLAYER_KEY);
  if (!key) {
    const hash = `${Math.random()}#::#${GAME_PLAYER_KEY}`.hashCode();
    key = '' + hash;
    localStorage.setItem(GAME_PLAYER_KEY, key);
  }

  return key;
}

// === INPUT =====================================================================

const KEY = {
  D: 68,
  W: 87,
  A: 65,
  S: 83,
  RIGHT: 39,
  UP: 38,
  LEFT: 37,
  DOWN: 40,
  Q: 81,
};

const input = {
  right: false,
  up: false,
  left: false,
  down: false,
  quit: false
};

function press(evt) {
  let code = evt.keyCode;
  switch (code) {
    case KEY.RIGHT:
    case KEY.D: input.right = true; break;

    case KEY.UP:
    case KEY.W: input.up = true; break;

    case KEY.LEFT:
    case KEY.A: input.left = true; break;

    case KEY.DOWN:
    case KEY.S: input.down = true; break;

    case KEY.Q: input.quit = true; break;
  }
}

function release(evt) {
  let code = evt.keyCode;
  switch (code) {
    case KEY.RIGHT:
    case KEY.D: input.right = false; break;

    case KEY.UP:
    case KEY.W: input.up = false; break;

    case KEY.LEFT:
    case KEY.A: input.left = false; break;

    case KEY.DOWN:
    case KEY.S: input.down = false; break;

    case KEY.Q: input.quit = false; break;

    default: console.error('unrecognized key code: ' + code); break;
  }
}

// === UTILS =================

String.prototype.hashCode = function () {
  var hash = 0, i, chr;
  if (this.length === 0) return hash;
  for (i = 0; i < this.length; i++) {
    chr = this.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
};