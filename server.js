const express = require('express');
const path = require('path');
const http = require('http');
const PORT = process.env.PORT || 2022;
const socketio = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = socketio(server);
//const WebSocket = require('ws');
const png = require('png-js');

// setup server
app.use(express.static(path.join(__dirname, "public")));
server.listen(PORT, () => console.log(`Server running on 127.0.0.1:${PORT}`));


io.on('connection', socket => {
  // setup disconnect timer (1 minute)
  let killTimer = setTimeout(() => socket.disconnect(), 60 * 1000);

  function isMobile(connection) {
    const agent = connection.handshake.headers['user-agent'];
    return agent.toLowerCase().indexOf('mobile') > 0;
  }



  // a new player joined
  socket.on('player-join', playerId => {
    // disarm disconnect timer
    clearTimeout(killTimer);

    // configure new player object
    const player = {
      connection: socket,
      info: {
        id: playerId,
        pos: {
          x: spawnPoint.x + spawnPoint.radius * (Math.random() * 2.0 - 1.0),
          y: spawnPoint.y + spawnPoint.radius * (Math.random() * 2.0 - 1.0)
        },
        speed: { x: 0, y: 0 },
        mobile: isMobile(socket),
      }
    };

    // register
    connections.set(socket, playerId);
    players.set(player.info.id, player);
    console.log('New player joined: ', player.info.id);

    // notify everyone about a new player
    socket.broadcast.emit('spawn-player', player.info);

    // send back a bunch of already existing players (including a new one)
    for (let aPlayer of players.values())
      player.connection.emit('spawn-player', aPlayer.info);

    // invalidate world data on client side
    socket.emit('world-invalidate');
  });



  // someone disconnected
  socket.on('disconnect', () => {
    const playerId = connections.get(socket);

    // de-register connection
    connections.delete(socket);

    // handle player interactions
    if (playerId) {
      // de-register a player
      players.delete(playerId);

      // notify others
      socket.broadcast.emit('despawn-player', playerId);

      console.log(`Player ${playerId} left`);
    }
  });



  // player moved to a new place
  socket.on('player-position', playerInfo => {
    // check the player
    const player = players.get(playerInfo.id);
    if (!player /*|| connections.get(socket) != playerInfo.id*/) {
      socket.disconnect();
      return;
    }

    // update position
    player.info.pos = playerInfo.pos;
    player.info.speed = playerInfo.speed;

    // notify everyone else
    socket.broadcast.emit('move-player', playerInfo);

    // trigger game-related events
    game.applyPlayerChecks(player);
  });



  // player requested a data for a particular chunk
  socket.on('world-chunk-get', chunkRequest => {
    // send back debug info
    socket.emit('world-chunk', buildChunkResponce(chunkRequest));
  });
});

function buildChunkResponce(chunkRequest) {
  // copy parts of data
  const dataTiles = new Array(CHUNK_SIZE_SQR);
  const dataObjects = new Array(CHUNK_SIZE_SQR);
  const zeroTileIndex =
    (chunkRequest.cx + chunkRequest.cy * WORLD_WIDTH) * CHUNK_SIZE;

  // tiles
  for (let y = 0, wIdx, i = 0; y < CHUNK_SIZE; y++) {
    wIdx = zeroTileIndex + y * WORLD_WIDTH;

    for (let x = 0; x < CHUNK_SIZE; x++, wIdx++, i++)
      dataTiles[i] = worldData.tiles[wIdx];
  }

  // stationary objects
  for (let y = 0, wIdx, i = 0; y < CHUNK_SIZE; y++) {
    wIdx = zeroTileIndex + y * WORLD_WIDTH;

    for (let x = 0; x < CHUNK_SIZE; x++, wIdx++, i++)
      dataObjects[i] = worldData.objects[wIdx];
  }

  // send back debug info
  return {
    chunk: chunkRequest,
    tiles: dataTiles,
    objects: dataObjects
  };
}

const connections = new Map(); // socket -> pId
const players = new Map(); // pId -> player (+ socket)



const tiles = {
  ground: 0,
  concrete: 1,
  snow: 2,
  ice: 3,

  concreteWall: 4,
  concreteWallTop: 5,
  iceWall: 6,
  iceWallTop: 7,
  snowWall: 8,
  snowWallTop: 9,
};

const objects = {
  nothing: 0,
  spawn: -1,

  // vegetation
  xmasTree: 10,
  pineTree: 11,

  // parcels
  presentA: 20,
  presentB: 21,
  presentC: 22,
  presentD: 23,

  // quest-like items and triggers
  xmasWreath: 30,
  mainLadder: 31,
};

const pickups = new Map([
  [objects.presentA, (x, y, player) => { game.stats.pickups++; return true; }],
  [objects.presentB, (x, y, player) => { game.stats.pickups++; return true; }],
  [objects.presentC, (x, y, player) => { game.stats.pickups++; return true; }],
  [objects.presentD, (x, y, player) => { game.stats.pickups++; return true; }],

  [objects.xmasWreath, (x, y, player) => { return game.stats.wreathFound = true; }],

  [objects.mainLadder, (x, y, player) => {
    if (game.stats.wreathFound && game.stats.pickups >= totalRandomPickups)
      return game.stats.ladderFound = true;

    return false;
  }],
]);

const randomPickups = [
  objects.presentA,
  objects.presentB,
  objects.presentC,
  objects.presentD,
];

const CHUNK_SIZE = 8;
const CHUNK_SIZE_SQR = CHUNK_SIZE * CHUNK_SIZE;

const WORLD_WIDTH = 128;
const WORLD_HEIGHT = 128;
let worldData = {
  tiles: new Array(WORLD_WIDTH * WORLD_HEIGHT).fill(tiles.ground),
  objects: new Array(WORLD_WIDTH * WORLD_HEIGHT).fill(objects.nothing),
};
let worldDataBackup = null;

const spawnPoint = {
  x: 64,
  y: 63,
  radius: 0.5
};
// goal
let totalRandomPickups = 0;




function ServerGame() {
  this.stats = {
    pickups: 0,
    wreathFound: false,
    ladderFound: false,
  };

  this.ticksToReset = 30;
  this.finished = false;

  this.update = function () {
    if (!worldDataBackup)
      return;

    if (this.finished) {
      // game is finished
      if (--this.ticksToReset <= 0) {
        for (let player of players.values()) {
          player.info.pos.x = spawnPoint.x;
          player.info.pos.y = spawnPoint.y;
          player.info.speed.x = 0;
          player.info.speed.y = 0;

          player.connection.emit('move-player', player.info);
          player.connection.emit('world-invalidate');
        }

        game = new ServerGame();

        // reset world
        worldData = JSON.parse(JSON.stringify(worldDataBackup));
      }
    } else {
      if (this.endCondition()) {
        // register
        this.finished = true;

        // play animation
        for (let i = 0; i < worldData.objects.length; i++)
          if (worldData.objects[i] === objects.pineTree)
            worldData.objects[i] = objects.xmasTree;

        // notify everyone
        this.sendEveryone('world-invalidate', null);
      }
    }
  }

  this.applyPlayerChecks = function (player) {
    const px = Math.round(player.info.pos.x);
    const py = Math.round(player.info.pos.y);

    if (px < 0 || px >= WORLD_WIDTH ||
      py < 0 || py >= WORLD_HEIGHT)
      return;

    const obj = worldData.objects[px + py * WORLD_WIDTH];

    // is it a thing that can be picked-up?
    const pickupHandler = pickups.get(obj);
    if (pickupHandler) {
      // try to register
      if (pickupHandler(px, py, player)) {
        console.log(this.stats);

        // remove the thing
        worldData.objects[px + py * WORLD_WIDTH] = objects.nothing;

        // notify everyone
        this.sendEveryone('world-set-object', { x: px, y: py, objectId: objects.nothing });
      }
    }
  }

  this.sendEveryone = function (cmd, payload) {
    for (let player of players.values())
      player.connection.emit(cmd, payload);
  }

  this.updateChunkForEveryone = function (cx, cy) {
    const updateResponce = buildChunkResponce({ cx: cx, cy: cy });
    this.sendEveryone('world-chunk', updateResponce);
  }

  this.endCondition = function () {
    return this.stats.pickups >= totalRandomPickups &&
      this.stats.wreathFound &&
      this.stats.ladderFound;
  }
}

let game = new ServerGame();

// server-side game update timer
setInterval(() => {
  game.update();
}, 850);

setTimeout(() => {
  worldDataBackup = JSON.parse(JSON.stringify(worldData));

  console.log('World is backed-up');
}, 750);






loadArrayFromPNG('map_tiles.png', worldData.tiles, tiles.concreteWall,
  new Map([
    [0x7F6A00, (x, y) => tiles.ground],

    [0x404040, (x, y) => tiles.concrete],
    [0x808080, (x, y) => tiles.concreteWall],
    [0xC0C0C0, (x, y) => tiles.concreteWallTop],

    [0xFFFFFF, (x, y) => tiles.snow],
    [0xFF6A00, (x, y) => tiles.snowWall],
    [0xFFD800, (x, y) => tiles.snowWallTop],

    [0x0026FF, (x, y) => tiles.ice],
    [0x0094FF, (x, y) => tiles.iceWall],
    [0x00FFFF, (x, y) => tiles.iceWallTop],
  ])
);



loadArrayFromPNG('map_objects.png', worldData.objects, objects.nothing,
  new Map([
    // empty space
    [0x000000, (x, y) => objects.nothing],
    // spawn point
    [0xFF0000, (x, y) => { spawnPoint.x = x; spawnPoint.y = y; return objects.nothing; }],
    // a pine tree without lights
    [0x007F0E, (x, y) => objects.pineTree],
    // a random pickup
    [0xFF00DC, (x, y) => {
      totalRandomPickups++;
      return randomPickups[Math.floor(randomPickups.length * Math.random())];
    }],
    // X-mas wreath and "lights"
    [0x00FF21, (x, y) => objects.xmasWreath],
    // main ladder
    [0x7F0000, (x, y) => objects.mainLadder],
  ])
);



function loadArrayFromPNG(pngFilename, targetArray, failsafe, pixelMapping) {
  png.decode(pngFilename, function (pixels) {
    for (let y = 0, pIdx = 0, wIdx = 0; y < WORLD_HEIGHT; y++)
      for (let x = 0; x < WORLD_WIDTH; x++, pIdx += 4, wIdx++) {
        const r = pixels[pIdx + 0];
        const g = pixels[pIdx + 1];
        const b = pixels[pIdx + 2];
        const a = pixels[pIdx + 3];
        const color = (r << 16) + (g << 8) + (b << 0);

        const tileId = pixelMapping.get(color);
        if (tileId === undefined || tileId === null) {
          console.warn(`[${pngFilename}] Unknown tile: ${color.toString(16)}`);
          targetArray[wIdx] = failsafe;
        }
        else {
          targetArray[wIdx] = tileId(x, y);
        }
      }
  });
}
