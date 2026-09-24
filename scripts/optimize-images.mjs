#!/usr/bin/env node
/**
 * Re-encodes the placeholder photography in `src/assets`.
 *
 *   npm run images:optimize
 *
 * The script:
 *   • converts each image to progressive JPEG at quality 82 (mozjpeg),
 *   • strips EXIF/GPS metadata,
 *   • resizes to a sensible maximum for the web,
 *   • writes `<name>.opt.jpg` next to the original so nothing is lost.
 *
 * Review the result, then rename it over the original. Replace this pipeline with
 * the clinic's approved images before launch — the originals here are generated
 * illustrations, not clinic photography.
 */

import { readdir, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const assetsDir = fileURLToPath(new URL('../src/assets', import.meta.url));
const MAX_WIDTH = 1600;

/** Filename → target width (aspect ratio is preserved). */
const TARGETS = {
  'hero.jpg': 1200,
  'reception.jpg': 1000,
  'detail.jpg': 1000,
};

async function main() {
  const entries = await readdir(assetsDir);
  const images = entries.filter((name) => /\.(jpe?g|png)$/i.test(name));

  if (images.length === 0) {
    console.log('No images found in src/assets.');
    return;
  }

  for (const name of images) {
    const sourcePath = join(assetsDir, name);
    const targetWidth = TARGETS[name] ?? MAX_WIDTH;
    const outputPath = join(assetsDir, name.replace(/\.(jpe?g|png)$/i, '.opt.jpg'));

    const before = (await stat(sourcePath)).size;
    const buffer = await sharp(sourcePath)
      .rotate() // respect EXIF orientation before stripping metadata
      .resize({ width: targetWidth, withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true, progressive: true, chromaSubsampling: '4:4:4' })
      .toBuffer();

    await writeFile(outputPath, buffer);
    const after = buffer.length;

    console.log(
      `${name.padEnd(16)} ${(before / 1024).toFixed(0).padStart(4)} KB → ` +
        `${(after / 1024).toFixed(0).padStart(4)} KB   (${outputPath.split('/').pop()})`,
    );
  }

  console.log('\nDone. Review the .opt.jpg files, then rename them over the originals.');
}

main().catch((error) => {
  console.error('Image optimisation failed:', error);
  process.exitCode = 1;
});
