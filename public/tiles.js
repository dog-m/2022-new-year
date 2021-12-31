const TILES = new Map();
const TILE_SIZE = 16;
let TILES_ATLAS = null;
let TILES_ATLAS_WIDTH = 16;

function Tile(tileId, config) {
  // properties
  this.id = tileId;
  this.solid = config.solid ?? true;
  this.friction = config.friction ?? 0.78;

  // self register
  TILES.set(tileId, this);
}

const tileGround = new Tile(0, { solid: false, friction: 0.68 });
const tileConcrete = new Tile(1, { solid: false });
const tileSnow = new Tile(2, { solid: false, friction: 0.25 });
const tileIce = new Tile(3, { solid: false, friction: 0.995 });

const tileConcreteWall = new Tile(4, {});
const tileConcreteWallTop = new Tile(5, {});
const tileIceWall = new Tile(6, {});
const tileIceWallTop = new Tile(7, {});
const tileSnowWall = new Tile(8, {});
const tileSnowWallTop = new Tile(9, {});
