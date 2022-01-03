let TILE_OBJECTS_IMAGE = null;

const TILE_OBJECTS = new Map();

function TileObject(objectId, config) {
  this.id = objectId;
  // self register
  TILE_OBJECTS.set(objectId, this);

  this.frame = {
    x: config.x ?? 0,
    y: config.y ?? 0,
    w: config.w ?? 16,
    h: config.h ?? 16,
    offsetY: config.offsetY ?? 1e-5
  };

  this.render = function (ctx, x, y) {
    const sizeX = this.frame.w / 24;
    const sizeY = this.frame.h / 24;

    ctx.drawImage(
      TILE_OBJECTS_IMAGE,
      // source
      this.frame.x,
      this.frame.y,
      this.frame.w,
      this.frame.h,
      // destination
      x - sizeX / 2, y - sizeY + this.frame.offsetY, sizeX, sizeY);
  };
}

// vegetation
const xmasTree = new TileObject(10, { x: 1, y: 1, w: 31, h: 67, offsetY: 0.25 });
const pineTree = new TileObject(11, { x: 1, y: 69, w: 31, h: 56, offsetY: 0.25 });

// parcels
const presentA = new TileObject(20, { x: 39, y: 1, w: 15, h: 16, offsetY: 0.15 });
const presentB = new TileObject(21, { x: 56, y: 1, w: 15, h: 16, offsetY: 0.15 });
const presentC = new TileObject(22, { x: 73, y: 1, w: 15, h: 16, offsetY: 0.15 });
const presentD = new TileObject(23, { x: 90, y: 1, w: 15, h: 16, offsetY: 0.15 });

// quest-like items
const xmasWreath = new TileObject(30, { x: 39, y: 19, w: 16, h: 17, offsetY: 0.15 });
const mainLadder = new TileObject(31, { x: 57, y: 19, w: 23, h: 28, offsetY: 0.17 });
