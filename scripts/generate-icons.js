const fs = require('fs');
const { PNG } = require('pngjs');
const path = require('path');

const sizes = [16, 48, 128];

const colors = {
  enabled: { r: 76, g: 175, b: 80 },   // Material Green 500 - более яркий
  disabled: { r: 158, g: 158, b: 158 } // Серый более нейтральный
};

function createIcon(size, color, outputPath) {
  const png = new PNG({ width: size, height: size });

  // Fill with transparent
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = 0;
    png.data[i + 1] = 0;
    png.data[i + 2] = 0;
    png.data[i + 3] = 0;
  }

  const cx = size / 2;
  const cy = size / 2;
  const cornerRadius = Math.max(2, Math.round(size / 8));

  // Draw rounded rectangle background
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let inside = false;

      // Check if inside rounded rectangle
      if (x >= cornerRadius && x < size - cornerRadius) {
        inside = true;
      } else if (y >= cornerRadius && y < size - cornerRadius) {
        inside = true;
      } else {
        // Check corners
        let cornerX, cornerY;
        if (x < cornerRadius && y < cornerRadius) {
          cornerX = cornerRadius; cornerY = cornerRadius;
        } else if (x >= size - cornerRadius && y < cornerRadius) {
          cornerX = size - cornerRadius - 1; cornerY = cornerRadius;
        } else if (x < cornerRadius && y >= size - cornerRadius) {
          cornerX = cornerRadius; cornerY = size - cornerRadius - 1;
        } else {
          cornerX = size - cornerRadius - 1; cornerY = size - cornerRadius - 1;
        }
        const dx = x - cornerX;
        const dy = y - cornerY;
        inside = (dx * dx + dy * dy) <= cornerRadius * cornerRadius;
      }

      if (inside) {
        const idx = (y * size + x) * 4;
        png.data[idx] = color.r;
        png.data[idx + 1] = color.g;
        png.data[idx + 2] = color.b;
        png.data[idx + 3] = 255;
      }
    }
  }

  // Draw "S" - calculate all dimensions symmetrically
  const thick = Math.max(2, Math.floor(size / 6));

  // Padding from edge (more padding for small icons)
  const pad = size <= 16 ? 3 : Math.max(2, Math.floor(size * 0.15));

  // S bounds (symmetric)
  const left = pad;
  const right = size - pad - 1;
  const top = pad;
  const bottom = size - pad - 1;
  const midY = Math.floor(size / 2);

  // Draw S by setting white pixels
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let drawWhite = false;

      // Top horizontal bar
      if (y >= top && y < top + thick && x >= left && x <= right) {
        drawWhite = true;
      }
      // Upper left vertical bar
      if (x >= left && x < left + thick && y >= top && y <= midY) {
        drawWhite = true;
      }
      // Middle horizontal bar
      if (y >= midY - Math.floor(thick/2) && y < midY + Math.ceil(thick/2) && x >= left && x <= right) {
        drawWhite = true;
      }
      // Lower right vertical bar
      if (x > right - thick && x <= right && y >= midY && y <= bottom) {
        drawWhite = true;
      }
      // Bottom horizontal bar
      if (y > bottom - thick && y <= bottom && x >= left && x <= right) {
        drawWhite = true;
      }

      if (drawWhite) {
        const idx = (y * size + x) * 4;
        png.data[idx] = 255;
        png.data[idx + 1] = 255;
        png.data[idx + 2] = 255;
        png.data[idx + 3] = 255;
      }
    }
  }

  const buffer = PNG.sync.write(png);
  fs.writeFileSync(outputPath, buffer);
  console.log(`Created: ${outputPath}`);
}

// Setup directories
const iconsDir = path.join(__dirname, '..', 'icons');
fs.rmSync(iconsDir, { recursive: true, force: true });
fs.mkdirSync(path.join(iconsDir, 'enabled'), { recursive: true });
fs.mkdirSync(path.join(iconsDir, 'disabled'), { recursive: true });

// Generate
for (const size of sizes) {
  createIcon(size, colors.enabled, path.join(iconsDir, 'enabled', `icon${size}.png`));
  createIcon(size, colors.disabled, path.join(iconsDir, 'disabled', `icon${size}.png`));
}

console.log('Done!');
