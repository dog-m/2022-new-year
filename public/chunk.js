const CHUNK_SIZE_2 = 3;
const CHUNK_SIZE = 1 << CHUNK_SIZE_2;

function Chunk(posX, posY) {
  this.pos = {
    x: Math.floor(posX),
    y: Math.floor(posY)
  };

  this.tiles = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE).fill(tileSnow.id);
  this.tileObjects = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE).fill(0);

  this.dynamicObjects = [];

  function DynamicObject(tileObjectSrc, x, y) {
    this.pos = {
      x: x,
      y: y
    };

    this.render = function (ctx) {
      tileObjectSrc.render(ctx, this.pos.x, this.pos.y);
    }
  }

  this.textureData = null;
  this.textureBitmap = null;
  this.texture = null;
  this.isDirty = true;

  this.getTile = function (x, y) {
    return this.tiles[x + (y << CHUNK_SIZE_2)];
  }

  this.setTile = function (x, y, tileId) {
    // set the data
    this.tiles[x + (y << CHUNK_SIZE_2)] = tileId;

    // mark this chunk as "dirty"
    this.isDirty = true;
  }

  this.getObject = function (x, y) {
    return this.tileObjects[x + (y << CHUNK_SIZE_2)];
  }

  this.setObject = function (x, y, objId) {
    // set the data
    this.tileObjects[x + (y << CHUNK_SIZE_2)] = objId;

    // reset and instantiate dynamic objects
    this.rebuildDynamicObjects();

    // mark this chunk as "dirty"
    //this.isDirty = true;
  }

  this.loadFromResponce = function (responce) {
    // move data
    this.tiles = new Uint8Array(responce.tiles);
    this.tileObjects = new Uint8Array(responce.objects);

    // reset and instantiate dynamic objects
    this.rebuildDynamicObjects();

    // mark this chunk as "dirty"
    this.isDirty = true;
  }

  this.rebuildDynamicObjects = function () {
    this.dynamicObjects.length = 0;
    const cx = (this.pos.x << CHUNK_SIZE_2);
    const cy = (this.pos.y << CHUNK_SIZE_2);
    for (let y = 0, i = 0; y < CHUNK_SIZE; y++)
      for (let x = 0; x < CHUNK_SIZE; x++, i++) {
        const objId = this.tileObjects[i];

        if (objId)
          this.dynamicObjects.push(new DynamicObject(
            TILE_OBJECTS.get(objId),
            cx + x,
            cy + y
          ));
      }
  }

  // === UPDATES =====================================================================

  this.queueDynamicObjects = function (list) {
    for (let obj of this.dynamicObjects)
      list.push(obj);
  }

  // === RENDERING =====================================================================

  this.renderTiles = function (ctx) {
    const cx = (this.pos.x << CHUNK_SIZE_2) - 0.5;
    const cy = (this.pos.y << CHUNK_SIZE_2) - 0.5;

    // construct single texture if needed
    if (this.isDirty || !this.textureData) {
      this.isDirty = false;
      this.rebuildTexture(ctx);
    }

    if (this.texture)
      ctx.drawImage(this.texture, cx, cy, CHUNK_SIZE, CHUNK_SIZE);

    // debug box
    //ctx.strokeRect(cx, cy, CHUNK_SIZE, CHUNK_SIZE);
    //ctx.fillStyle = '#000';
    //ctx.fillText(`[${this.pos.x}; ${this.pos.y}]`, cx + 3, cy + 4);
  }

  this.rebuildTexture = function (ctx) {
    // create blank new image if needed
    if (!this.textureData)
      this.textureData = ctx.createImageData(CHUNK_SIZE * TILE_SIZE, CHUNK_SIZE * TILE_SIZE);

    // copy parts from texture atlas on every tile
    const max = CHUNK_SIZE * TILE_SIZE;
    for (let y = 0, i = 0; y < max; y += TILE_SIZE)
      for (let x = 0; x < max; x += TILE_SIZE, i++)
        this.drawTile(this.tiles[i], x, y);

    // transform into a bitmap (will be done sometime later)
    createImageBitmap(this.textureData).then((bmp) => { this.texture = bmp; });
  }

  this.drawTile = function (tileId, dx, dy) {
    const pixels = this.textureData.data;
    const atlas = TILES_ATLAS.data;

    const sx = tileId * 16;
    const sy = 0;

    let srcOffset, dstOffset;

    for (let y = 0, x = 0; y < TILE_SIZE; y++, x = 0) {
      srcOffset = ((sx + x) + (sy + y) * TILES_ATLAS_WIDTH) << 2;
      dstOffset = ((dx + x) + (dy + y) * (CHUNK_SIZE * TILE_SIZE)) << 2;

      for (x = 0; x < TILE_SIZE; x++, srcOffset += 4, dstOffset += 4) {
        pixels[dstOffset + 0] = atlas[srcOffset + 0];
        pixels[dstOffset + 1] = atlas[srcOffset + 1];
        pixels[dstOffset + 2] = atlas[srcOffset + 2];
        pixels[dstOffset + 3] = 255;
      }
    }
  }
}