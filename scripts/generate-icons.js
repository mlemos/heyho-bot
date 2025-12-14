#!/usr/bin/env node
/**
 * PWA Icon Generator for HeyHo Bot
 *
 * Creates square PWA icons with the AI sparkle icon.
 * Uses pure Node.js PNG encoding.
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// ===========================================
// PNG Encoder
// ===========================================

function encodePNG(width, height, pixels) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8);  // bit depth
  ihdr.writeUInt8(6, 9);  // color type (RGBA)
  ihdr.writeUInt8(0, 10); // compression
  ihdr.writeUInt8(0, 11); // filter
  ihdr.writeUInt8(0, 12); // interlace
  const ihdrChunk = createChunk('IHDR', ihdr);

  // IDAT chunk
  const rawData = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    rawData[y * (1 + width * 4)] = 0; // filter byte
    pixels.copy(rawData, y * (1 + width * 4) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const compressed = zlib.deflateSync(rawData, { level: 9 });
  const idatChunk = createChunk('IDAT', compressed);

  // IEND chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuffer = Buffer.from(type, 'ascii');
  const crc = crc32(Buffer.concat([typeBuffer, data]));
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc, 0);
  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

function crc32(data) {
  let crc = 0xFFFFFFFF;
  const table = getCRC32Table();
  for (let i = 0; i < data.length; i++) {
    crc = table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

let crcTable = null;
function getCRC32Table() {
  if (crcTable) return crcTable;
  crcTable = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[i] = c;
  }
  return crcTable;
}

// ===========================================
// AI Sparkle Icon Drawing
// ===========================================

function drawSparkle(pixels, size, cx, cy, radius, color) {
  // Draw a 4-pointed sparkle/star shape
  const innerRadius = radius * 0.3;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > radius) continue;

      // Calculate angle
      const angle = Math.atan2(dy, dx);

      // Create 4-pointed star shape
      const starFactor = Math.abs(Math.cos(2 * angle));
      const targetRadius = innerRadius + (radius - innerRadius) * starFactor;

      if (dist <= targetRadius) {
        // Soft edges
        const alpha = dist < targetRadius * 0.8 ? 1 : 1 - (dist - targetRadius * 0.8) / (targetRadius * 0.2);
        const idx = (y * size + x) * 4;

        pixels[idx] = Math.round(color[0] * alpha + pixels[idx] * (1 - alpha));
        pixels[idx + 1] = Math.round(color[1] * alpha + pixels[idx + 1] * (1 - alpha));
        pixels[idx + 2] = Math.round(color[2] * alpha + pixels[idx + 2] * (1 - alpha));
      }
    }
  }
}

function createAIIcon(size, bgColor, sparkleColor) {
  const pixels = Buffer.alloc(size * size * 4);

  // Fill with background color
  for (let i = 0; i < size * size; i++) {
    pixels[i * 4] = bgColor[0];
    pixels[i * 4 + 1] = bgColor[1];
    pixels[i * 4 + 2] = bgColor[2];
    pixels[i * 4 + 3] = 255;
  }

  // Draw main large sparkle (center-left)
  const mainCx = size * 0.38;
  const mainCy = size * 0.45;
  const mainRadius = size * 0.32;
  drawSparkle(pixels, size, mainCx, mainCy, mainRadius, sparkleColor);

  // Draw smaller sparkle (top-right)
  const smallCx = size * 0.72;
  const smallCy = size * 0.65;
  const smallRadius = size * 0.18;
  drawSparkle(pixels, size, smallCx, smallCy, smallRadius, sparkleColor);

  return pixels;
}

// ===========================================
// Main
// ===========================================

const projectRoot = path.join(__dirname, '..');
const publicDir = path.join(projectRoot, 'public');

// Colors (matching app dark theme)
const bgColor = [9, 9, 11];        // #09090b - dark background
const sparkleColor = [255, 255, 255]; // White sparkles

// Generate 192x192 icon
console.log('Generating 192x192 AI icon...');
const icon192Pixels = createAIIcon(192, bgColor, sparkleColor);
const icon192 = encodePNG(192, 192, icon192Pixels);
fs.writeFileSync(path.join(publicDir, 'icon-192.png'), icon192);
console.log('Created icon-192.png');

// Generate 512x512 icon
console.log('Generating 512x512 AI icon...');
const icon512Pixels = createAIIcon(512, bgColor, sparkleColor);
const icon512 = encodePNG(512, 512, icon512Pixels);
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), icon512);
console.log('Created icon-512.png');

console.log('HeyHo Bot PWA icons generated successfully!');
