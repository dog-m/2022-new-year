function Player(config, imageIndex, world) {
  this.id = config.id;

  this.texture = {
    image: document.getElementById('img-player-' + imageIndex),
    frame: {
      sx: 0,
      sy: 0,
      sWidth: 24,
      sHeight: 24
    }
  };

  this.animation = {
    frame: 0,
    frameSkipCounter: 0,
    config: ANI_STANDING_RIGHT
  };

  this.lookingRight = true;
  this.pos = { x: config.pos.x, y: config.pos.y };
  this.speed = { x: 0.0, y: 0.0 };
  this.aabb = aabbCache.getAABB();
  this.size = { x: 0.5, y: 0.2 };
  this.standingOnTile = tileGround.id;
  this.isMobile = config.mobile;

  this.targetPos = null;
  const MIN_DISTANCE_SQR = sqr(1 / 24);

  // === UPDATES =====================================================================

  this.update = function () {
    // change the texture
    this.updateAnimationState();

    // feet update
    this.standingOnTile = world.getTile(this.pos.x, this.pos.y);

    // velocity reduction is different for local and remote players
    if (this.targetPos) {
      this.speed.x *= 0.98;
      this.speed.y *= 0.98;
    } else {
      const friction = TILES.get(this.standingOnTile).friction;

      this.speed.x *= friction;
      this.speed.y *= friction;
    }

    if (this.targetPos) {
      // velocity-based movement is applicable only to remote players
      this.pos.x += this.speed.x;
      this.pos.y += this.speed.y;

      // smooth moving into a target position
      const distance = sqr(this.pos.x - this.targetPos.x) + sqr(this.pos.y - this.targetPos.y);
      if (distance > MIN_DISTANCE_SQR) {
        this.pos.x = (this.pos.x * 2 + this.targetPos.x) / 3;
        this.pos.y = (this.pos.y * 2 + this.targetPos.y) / 3;
      }
      else
        this.targetPos = null;
    }
  }

  this.updateAnimationState = function () {
    let nextAnimation = null;

    const SPEED_RUNNING_MIN = 0.02;
    const ySpeed = Math.abs(this.speed.y);
    const verticalMovement = ySpeed > SPEED_RUNNING_MIN;

    if (this.speed.x > 0.0) {
      this.lookingRight = true;

      if (this.speed.x > SPEED_RUNNING_MIN)
        nextAnimation = ANI_RUNNING_FAST_RIGHT;
      else if (verticalMovement)
        nextAnimation = ANI_RUNNING_RIGHT;
    } else if (this.speed.x < 0.0) {
      this.lookingRight = false;

      if (this.speed.x < -SPEED_RUNNING_MIN)
        nextAnimation = ANI_RUNNING_FAST_LEFT;
      else if (verticalMovement)
        nextAnimation = ANI_RUNNING_LEFT;
    }

    if (nextAnimation == null && verticalMovement) {
      if (this.lookingRight)
        nextAnimation = ANI_RUNNING_RIGHT;
      else
        nextAnimation = ANI_RUNNING_LEFT;
    }

    if (nextAnimation == null) {
      if (this.lookingRight)
        nextAnimation = ANI_STANDING_RIGHT;
      else
        nextAnimation = ANI_STANDING_LEFT;
    }

    if (this.animation.config !== nextAnimation)
      this.setAnimation(nextAnimation);
  }

  // === RENDERING =====================================================================

  this.render = function (ctx) {
    this.updateTextureFrame();

    ctx.drawImage(
      this.texture.image,
      // source
      this.texture.frame.sx,
      this.texture.frame.sy,
      this.texture.frame.sWidth,
      this.texture.frame.sHeight,
      // destination
      this.pos.x - 0.5, this.pos.y - 0.9, 1, 1);
  }

  this.setAnimation = function (aniConfig) {
    this.animation.config = aniConfig;

    // reset counters
    this.animation.frame = aniConfig.fStart;
    this.animation.frameSkipCounter = 0;

    // reset the animation
    this.texture.frame.sx = this.texture.frame.sWidth * this.animation.frame;
    this.texture.frame.sy = this.texture.frame.sHeight * aniConfig.fYOffset;
  }

  this.updateTextureFrame = function () {
    let needFrameUpdate = true;
    if (this.animation.config.fDelay > 0) {
      if (++this.animation.frameSkipCounter % this.animation.config.fDelay === 0)
        needFrameUpdate = true;
      else
        needFrameUpdate = false;
    }

    if (needFrameUpdate) {
      this.animation.frame += this.animation.config.fIncrement + this.animation.config.length;
      this.animation.frame %= this.animation.config.length;
    }

    this.texture.frame.sx = this.texture.frame.sWidth * this.animation.frame;
  }
}

function sqr(x) {
  return x * x;
}

// === ANIMATIONS =====================================================================

// RIGHT

const ANI_STANDING_RIGHT = {
  fYOffset: 0,
  fStart: 0, fIncrement: +1, fDelay: 3,
  length: 6
};

const ANI_RUNNING_RIGHT = {
  fYOffset: 1,
  fStart: 0, fIncrement: +1, fDelay: 1,
  length: 16
};

const ANI_RUNNING_FAST_RIGHT = {
  fYOffset: 1,
  fStart: 0, fIncrement: +1, fDelay: 0,
  length: 16
};

// LEFT

const ANI_STANDING_LEFT = {
  fYOffset: 2,
  fStart: 0, fIncrement: -1, fDelay: 3,
  length: 6
};

const ANI_RUNNING_LEFT = {
  fYOffset: 3,
  fStart: 0, fIncrement: -1, fDelay: 1,
  length: 16
};

const ANI_RUNNING_FAST_LEFT = {
  fYOffset: 3,
  fStart: 0, fIncrement: -1, fDelay: 0,
  length: 16
};