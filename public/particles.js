let PARTICLES_IMAGE = null;
const PARTICLE_FRAME_SIZE = 8;

function Particle(config) {
  this.imageIndex = config.index ?? 0;
  this.airFriction = config.friction ?? 1.0;

  const size = 0.5;
  const size2 = size / 2;

  this.render = function (ctx, entity) {
    ctx.drawImage(
      PARTICLES_IMAGE,
      // source
      this.imageIndex * PARTICLE_FRAME_SIZE,
      0,
      PARTICLE_FRAME_SIZE,
      PARTICLE_FRAME_SIZE,
      // destination
      entity.pos.x - size2, entity.pos.y - size2, size, size);
  }
}

const particleSnowflake = new Particle({ index: 0, friction: 1.01 });
const particleSnow = new Particle({ index: 1 });
const particleBoost = new Particle({ index: 2, friction: 0.91 });
const particleHint = new Particle({ index: 3, friction: 1.2 });



function ParticleManager() {

  function ParticleEntity() {
    this.srcObject = null;
    this.pos = { x: 0, y: 0 };
    this.speed = { x: 0, y: 0 };
    this.lifetime = 0;

    this.render = function (ctx) {
      this.srcObject.render(ctx, this);
    }
  }

  // all possible particles
  this.particles = new Array(250);
  for (let i = 0; i < this.particles.length; i++)
    this.particles[i] = new ParticleEntity();

  this.update = function () {
    for (let entity of this.particles)
      if (entity.lifetime > 0) {
        // decay
        --entity.lifetime;

        // move
        entity.pos.x += entity.speed.x;
        entity.pos.y += entity.speed.y;

        // correct movement
        entity.speed.x *= entity.srcObject.airFriction;
        entity.speed.y *= entity.srcObject.airFriction;
      }
  }

  this.render = function (ctx) {
    for (let entity of this.particles)
      if (entity.lifetime > 0)
        entity.render(ctx);
  };

  this.spawn = function (srcObject, x, y, speedX, speedY, lifetime) {
    // looking for inactive particle entity
    let particle = null;
    let minLifetime = 999999;
    for (let entity of this.particles)
      if (entity.lifetime < minLifetime) {
        minLifetime = entity.lifetime;
        particle = entity;

        if (minLifetime < 1)
          break;
      }

    // configure and reply
    particle.srcObject = srcObject;
    particle.pos.x = x;
    particle.pos.y = y;
    particle.speed.x = speedX;
    particle.speed.y = speedY;
    particle.lifetime = lifetime;
    return particle;
  }
}