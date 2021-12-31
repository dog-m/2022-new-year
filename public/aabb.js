function AABB() {
  this.x1 = -1000;
  this.y1 = -1000;
  this.x2 = -1000;
  this.y2 = -1000;

  this.set = function (x, y, w, h) {
    const w2 = w / 2;
    const h2 = h / 2;

    this.x1 = x - w2;
    this.y1 = y - h2;
    this.x2 = x + w2;
    this.y2 = y + h2;
  }

  this.expand = function (dx, dy) {
    if (dx < 0) this.x1 += dx;
    if (dx > 0) this.x2 += dx;
    if (dy < 0) this.y1 += dy;
    if (dy > 0) this.y2 += dy;
  }

  this.move = function (dx, dy) {
    this.x1 = this.x1 + dx;
    this.y1 = this.y1 + dy;
    this.x2 = this.x2 + dx;
    this.y2 = this.y2 + dy;
  }

  this.calculateXOffset = function (other, dx) {
    if (other.y2 > this.y1 && other.y1 < this.y2) {
      let newX;

      if (dx > 0 && other.x2 <= this.x1) {
        newX = this.x1 - other.x2;
        if (newX < dx) dx = newX;
      }

      if (dx < 0 && other.x1 >= this.x2) {
        newX = this.x2 - other.x1;
        if (newX > dx) dx = newX;
      }
    }
    return dx;
  }

  this.calculateYOffset = function (other, dy) {
    if (other.x2 > this.x1 && other.x1 < this.x2) {
      let newY;

      if (dy > 0 && other.y2 <= this.y1) {
        newY = this.y1 - other.y2;
        if (newY < dy) dy = newY;
      }

      if (dy < 0 && other.y1 >= this.y2) {
        newY = this.y2 - other.y1;
        if (newY > dy) dy = newY;
      }
    }
    return dy;
  }
}

function AABBCache() {
  this.inactiveBoxes = [];

  this.getAABB = function () {
    // allocate fresh new if needed
    if (this.inactiveBoxes.length === 0)
      this.inactiveBoxes.push(new AABB());

    // take any available
    return this.inactiveBoxes.pop();
  };

  this.releaseAll = function (waitingBoxes) {
    for (let box of waitingBoxes)
      this.inactiveBoxes.push(box);
  }
}

const aabbCache = new AABBCache();