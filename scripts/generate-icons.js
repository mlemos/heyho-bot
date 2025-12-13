#!/usr/bin/env node
/**
 * PWA Icon Generator for HeyHo Bot
 *
 * Creates square PWA icons by compositing the HeyHo logo onto a black background.
 * Uses pure Node.js PNG parsing/encoding.
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// ===========================================
// PNG Decoder (for reading the source logo)
// ===========================================

function decodePNG(buffer) {
  // Verify PNG signature
  const signature = buffer.slice(0, 8);
  if (signature.toString('hex') !== '89504e470d0a1a0a') {
    throw new Error('Invalid PNG signature');
  }

  let offset = 8;
  let width, height, bitDepth, colorType;
  let imageData = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.slice(offset + 4, offset + 8).toString('ascii');
    const data = buffer.slice(offset + 8, offset + 8 + length);
    offset += 12 + length; // length + type + data + crc

    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data.readUInt8(8);
      colorType = data.readUInt8(9);
    } else if (type === 'IDAT') {
      imageData.push(data);
    } else if (type === 'IEND') {
      break;
    }
  }

  // Decompress image data
  const compressed = Buffer.concat(imageData);
  const decompressed = zlib.inflateSync(compressed);

  // Parse pixel data based on color type
  const bytesPerPixel = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 4 ? 2 : 1;
  const pixels = Buffer.alloc(width * height * 4);

  for (let y = 0; y < height; y++) {
    const filterByte = decompressed[y * (1 + width * bytesPerPixel)];
    const rowStart = y * (1 + width * bytesPerPixel) + 1;

    for (let x = 0; x < width; x++) {
      const srcIdx = rowStart + x * bytesPerPixel;
      const dstIdx = (y * width + x) * 4;

      let r, g, b, a;
      if (colorType === 6) { // RGBA
        r = decompressed[srcIdx];
        g = decompressed[srcIdx + 1];
        b = decompressed[srcIdx + 2];
        a = decompressed[srcIdx + 3];
      } else if (colorType === 2) { // RGB
        r = decompressed[srcIdx];
        g = decompressed[srcIdx + 1];
        b = decompressed[srcIdx + 2];
        a = 255;
      } else if (colorType === 4) { // Grayscale + Alpha
        r = g = b = decompressed[srcIdx];
        a = decompressed[srcIdx + 1];
      } else { // Grayscale
        r = g = b = decompressed[srcIdx];
        a = 255;
      }

      // Apply PNG filter (simplified - only handles filter 0 and 1)
      if (filterByte === 1 && x > 0) { // Sub filter
        r = (r + pixels[dstIdx - 4]) & 255;
        g = (g + pixels[dstIdx - 3]) & 255;
        b = (b + pixels[dstIdx - 2]) & 255;
        a = (a + pixels[dstIdx - 1]) & 255;
      }

      pixels[dstIdx] = r;
      pixels[dstIdx + 1] = g;
      pixels[dstIdx + 2] = b;
      pixels[dstIdx + 3] = a;
    }
  }

  return { width, height, pixels };
}

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
// Image Processing
// ===========================================

function createSquareIcon(srcPixels, srcWidth, srcHeight, targetSize, bgColor) {
  const pixels = Buffer.alloc(targetSize * targetSize * 4);

  // Fill with background color
  for (let i = 0; i < targetSize * targetSize; i++) {
    pixels[i * 4] = bgColor[0];
    pixels[i * 4 + 1] = bgColor[1];
    pixels[i * 4 + 2] = bgColor[2];
    pixels[i * 4 + 3] = 255;
  }

  // Calculate scaling to fit logo in center with padding
  const padding = Math.floor(targetSize * 0.1);
  const availableWidth = targetSize - padding * 2;
  const availableHeight = targetSize - padding * 2;

  const scaleX = availableWidth / srcWidth;
  const scaleY = availableHeight / srcHeight;
  const scale = Math.min(scaleX, scaleY);

  const scaledWidth = Math.floor(srcWidth * scale);
  const scaledHeight = Math.floor(srcHeight * scale);
  const offsetX = Math.floor((targetSize - scaledWidth) / 2);
  const offsetY = Math.floor((targetSize - scaledHeight) / 2);

  // Simple nearest-neighbor scaling and compositing
  for (let y = 0; y < scaledHeight; y++) {
    for (let x = 0; x < scaledWidth; x++) {
      const srcX = Math.floor(x / scale);
      const srcY = Math.floor(y / scale);
      const srcIdx = (srcY * srcWidth + srcX) * 4;
      const dstX = offsetX + x;
      const dstY = offsetY + y;
      const dstIdx = (dstY * targetSize + dstX) * 4;

      const srcR = srcPixels[srcIdx];
      const srcG = srcPixels[srcIdx + 1];
      const srcB = srcPixels[srcIdx + 2];
      const srcA = srcPixels[srcIdx + 3] / 255;

      if (srcA > 0) {
        // Alpha compositing
        const dstR = pixels[dstIdx];
        const dstG = pixels[dstIdx + 1];
        const dstB = pixels[dstIdx + 2];

        pixels[dstIdx] = Math.round(srcR * srcA + dstR * (1 - srcA));
        pixels[dstIdx + 1] = Math.round(srcG * srcA + dstG * (1 - srcA));
        pixels[dstIdx + 2] = Math.round(srcB * srcA + dstB * (1 - srcA));
        pixels[dstIdx + 3] = 255;
      }
    }
  }

  return pixels;
}

// ===========================================
// Main
// ===========================================

const projectRoot = path.join(__dirname, '..');
const publicDir = path.join(projectRoot, 'public');

// Read HeyHo logo (white on black for dark theme)
const logoPath = path.join(projectRoot, 'heyho-white-on-black.png');
const logoBuffer = fs.readFileSync(logoPath);

console.log('Reading HeyHo logo...');
const logo = decodePNG(logoBuffer);
console.log(`Logo size: ${logo.width}x${logo.height}`);

// Background color (matching app dark theme)
const bgColor = [0, 0, 0]; // Pure black to match logo background

// Generate 192x192 icon
console.log('Generating 192x192 icon...');
const icon192Pixels = createSquareIcon(logo.pixels, logo.width, logo.height, 192, bgColor);
const icon192 = encodePNG(192, 192, icon192Pixels);
fs.writeFileSync(path.join(publicDir, 'icon-192.png'), icon192);
console.log('Created icon-192.png');

// Generate 512x512 icon
console.log('Generating 512x512 icon...');
const icon512Pixels = createSquareIcon(logo.pixels, logo.width, logo.height, 512, bgColor);
const icon512 = encodePNG(512, 512, icon512Pixels);
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), icon512);
console.log('Created icon-512.png');

console.log('HeyHo Bot PWA icons generated successfully!');
