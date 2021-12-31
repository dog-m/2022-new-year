const WORLD_WIDTH_CHUNKS = 16;
const WORLD_HEIGHT_CHUNKS = 16;

const WORLD_WIDTH = WORLD_WIDTH_CHUNKS * CHUNK_SIZE;
const WORLD_HEIGHT = WORLD_HEIGHT_CHUNKS * CHUNK_SIZE;

function World() {
  this.chunks = new Array(WORLD_WIDTH_CHUNKS * WORLD_HEIGHT_CHUNKS);
  // populate with empty chunks
  for (let y = 0; y < WORLD_HEIGHT_CHUNKS; y++)
    for (let x = 0; x < WORLD_WIDTH_CHUNKS; x++)
      this.chunks[x + y * WORLD_WIDTH_CHUNKS] = new Chunk(x, y);

  this.getTile = function (x, y) {
    const px = Math.round(x);
    const py = Math.round(y);

    if (px < 0 || px >= WORLD_WIDTH ||
      py < 0 || py >= WORLD_HEIGHT)
      return tileConcrete.id;

    const cx = px >> CHUNK_SIZE_2;
    const cy = py >> CHUNK_SIZE_2;
    const chunk = this.chunks[cx + cy * WORLD_WIDTH_CHUNKS];

    return chunk.getTile(
      px - (cx << CHUNK_SIZE_2),
      py - (cy << CHUNK_SIZE_2)
    );
  }

  this.setTile = function (x, y, tileId) {
    const px = Math.round(x);
    const py = Math.round(y);

    if (px < 0 || px >= WORLD_WIDTH ||
      py < 0 || py >= WORLD_HEIGHT)
      return;

    const cx = px >> CHUNK_SIZE_2;
    const cy = py >> CHUNK_SIZE_2;
    const chunk = this.chunks[cx + cy * WORLD_WIDTH_CHUNKS];

    return chunk.setTile(
      px - (cx << CHUNK_SIZE_2),
      py - (cy << CHUNK_SIZE_2),
      tileId
    );
  }

  this.getTileObject = function (x, y) {
    const px = Math.round(x);
    const py = Math.round(y);

    if (px < 0 || px >= WORLD_WIDTH ||
      py < 0 || py >= WORLD_HEIGHT)
      return tileConcrete.id;

    const cx = px >> CHUNK_SIZE_2;
    const cy = py >> CHUNK_SIZE_2;
    const chunk = this.chunks[cx + cy * WORLD_WIDTH_CHUNKS];

    return chunk.getObject(
      px - (cx << CHUNK_SIZE_2),
      py - (cy << CHUNK_SIZE_2)
    );
  }

  this.setTileObject = function (x, y, objId) {
    const px = Math.round(x);
    const py = Math.round(y);

    if (px < 0 || px >= WORLD_WIDTH ||
      py < 0 || py >= WORLD_HEIGHT)
      return;

    const cx = px >> CHUNK_SIZE_2;
    const cy = py >> CHUNK_SIZE_2;
    const chunk = this.chunks[cx + cy * WORLD_WIDTH_CHUNKS];

    return chunk.setObject(
      px - (cx << CHUNK_SIZE_2),
      py - (cy << CHUNK_SIZE_2),
      objId
    );
  }

  this.getAABBsIn = function (aabb) {
    const result = [];

    let minX = Math.floor(aabb.x1 - 0.4);
    let minY = Math.floor(aabb.y1 - 0.4);
    let maxX = Math.floor(aabb.x2 + 0.8);
    let maxY = Math.floor(aabb.y2 + 0.8);

    if (minX < 0) minX = 0; if (maxX >= WORLD_WIDTH) maxX = WORLD_WIDTH - 1;
    if (minY < 0) minY = 0; if (maxY >= WORLD_HEIGHT) maxY = WORLD_HEIGHT - 1;

    for (let y = minY; y <= maxY; y++)
      for (let x = minX; x <= maxX; x++) {
        const tile = TILES.get(this.getTile(x, y));

        if (tile.solid) {
          let box = aabbCache.getAABB();
          box.set(x, y, 1.0, 1.0);
          result.push(box);
        }
      }

    return result;
  }

  // === UPDATES =====================================================================

  this.update = function () {
    ;
  }

  this.queueDynamicObjects = function (list, viewPoint) {
    const cx = Math.floor(viewPoint.x) >> CHUNK_SIZE_2;
    const cy = Math.floor(viewPoint.y) >> CHUNK_SIZE_2;

    const sx = Math.max(cx - 1, 0);
    const sy = Math.max(cy - 1, 0);
    const mx = Math.min(cx + 1, WORLD_WIDTH_CHUNKS - 1);
    const my = Math.min(cy + 1, WORLD_HEIGHT_CHUNKS - 1);

    // grab things from visible chunks
    for (let y = sy; y <= my; y++)
      for (let x = sx; x <= mx; x++)
        this.chunks[x + y * WORLD_WIDTH_CHUNKS].queueDynamicObjects(list);
  }

  // === RENDERING =====================================================================

  this.renderTiles = function (ctx, viewPoint) {
    const cx = Math.floor(viewPoint.x) >> CHUNK_SIZE_2;
    const cy = Math.floor(viewPoint.y) >> CHUNK_SIZE_2;

    const sx = Math.max(cx - 1, 0);
    const sy = Math.max(cy - 1, 0);
    const mx = Math.min(cx + 1, WORLD_WIDTH_CHUNKS - 1);
    const my = Math.min(cy + 1, WORLD_HEIGHT_CHUNKS - 1);

    // render tiles
    for (let y = sy; y <= my; y++)
      for (let x = sx; x <= mx; x++)
        this.chunks[x + y * WORLD_WIDTH_CHUNKS].renderTiles(ctx);
  }
}