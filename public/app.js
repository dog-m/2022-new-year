// === INIT =====================================================================

// set-up the canvas element
const canvas = document.getElementById('main-canvas');
const SCALE_BASE = 24 * 1.75;
let SCALE = SCALE_BASE;
let screenWidth, screenHeight, ctx;

// manage events
//canvas.addEventListener("dblclick", () => toggleFullScreen());
//canvas.addEventListener("click", (e) => clickiedOnCanvas(e));
canvas.addEventListener("click", () => toggleFullScreen());
window.addEventListener('resize', () => updateScreenSize());
window.addEventListener('keydown', (e) => press(e));
window.addEventListener('keyup', (e) => release(e));
window.addEventListener('load', () => {
  // load textures
  const atlas = document.getElementById('img-tiles');
  TILES_ATLAS = grabImageData(atlas);
  TILES_ATLAS_WIDTH = atlas.width;

  TILE_OBJECTS_IMAGE = document.getElementById('img-objects');
  PARTICLES_IMAGE = document.getElementById('img-particles');
  for (let i = 0; i < 1; i++)
    PLAYER_TEXTURES.push(document.getElementById('img-player-' + i));

  // setup updates
  setInterval(() => update(), 1000 / UPDATES_EXPECTED);

  // setup rendering
  setInterval(() => render(), 1000 / FPS_EXPECTED);
  /*update();
  render();*/
});

function updateScreenSize() {
  screenWidth = canvas.clientWidth;
  screenHeight = canvas.clientHeight;

  let max = Math.max(screenWidth, screenHeight);
  let min = Math.min(screenWidth, screenHeight);
  SCALE = SCALE_BASE * max / min;

  canvas.setAttribute("width", canvas.clientWidth);
  canvas.setAttribute("height", canvas.clientHeight);
  ctx = canvas.getContext('2d', {
    alpha: false,
    antialias: false,
    depth: false,
    desynchronized: true
  });
}
updateScreenSize();

// === LOGIC =====================================================================

let playerImageIndex = Math.floor(Math.random() * 1);
const game = new Game(playerImageIndex);

function clickiedOnCanvas(e) {
  game.clickAt(
    (e.x - canvas.width / 2) / SCALE,
    (e.y - canvas.height / 2) / SCALE
  );
}

// === UPDATES =====================================================================

const UPDATES_EXPECTED = 30;

function update() {
  game.update();

  //setTimeout(() => update(), 1000 / UPDATES_EXPECTED);
}

// === RENDERING =====================================================================

const FPS_EXPECTED = 25;

function render() {
  ctx.globalAlpha = 1;
  ctx.imageSmoothingEnabled = false;
  ctx.font = '1px serif';
  ctx.lineWidth = 1.0 / SCALE_BASE;
  ctx.fillStyle = '#BBF';
  ctx.fillRect(0, 0, screenWidth, screenHeight);

  // viewport transformations
  ctx.save();
  ctx.translate(screenWidth / 2, screenHeight / 2);
  ctx.rotate(game.camera.angle);
  ctx.scale(SCALE, SCALE);
  ctx.translate(-game.camera.x, -game.camera.y);

  // actual rendering
  game.render(ctx);

  // reset transformations for the next frame
  ctx.restore();

  //setTimeout(() => render(), 1000 / FPS_EXPECTED);
}

// === UTILITIES =====================================================================

function toggleFullScreen() {
  if (!document.fullscreenElement)
    document.documentElement.requestFullscreen();
  else
    if (document.exitFullscreen)
      document.exitFullscreen();
}

function grabImageData(element) {
  const texCanvas = document.getElementById('texture-canvas');
  const context = texCanvas.getContext('2d');
  context.globalAlpha = 1;
  context.imageSmoothingEnabled = false;

  context.clearRect(0, 0, 512, 512);

  context.drawImage(element, 0, 0);

  return context.getImageData(0, 0, element.width, element.height);
}
