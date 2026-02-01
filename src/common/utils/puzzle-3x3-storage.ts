import { promises as fs } from 'fs';
import { join } from 'path';
import sharp from 'sharp';

export type PuzzleTile = { correctIndex: number; url: string };

export async function savePuzzleWeeklyAndSlice3x3(params: {
  inputBuffer: Buffer;      // png/jpg
  weekKey: string;          // "2026-W05"
  imageId: string;          // estable: weekKey o hash prompt
  publicBaseUrl: string;    // http://localhost:3000
  publicPrefix?: string;    // /public
  size?: number;            // default 512
}) {
  const publicPrefix = params.publicPrefix ?? '/public';
  const size = params.size ?? 1024;

  const baseDir = join(process.cwd(), 'public', 'puzzles', params.weekKey);
  const tilesDir = join(process.cwd(), 'public', 'puzzles', params.weekKey, 'tiles', params.imageId);

  await fs.mkdir(baseDir, { recursive: true });
  await fs.mkdir(tilesDir, { recursive: true });

  const baseWebpPath = join(baseDir, `puzzle.webp`);
  const baseUrl = `${params.publicBaseUrl}${publicPrefix}/puzzles/${params.weekKey}/puzzle.webp`;

  // Normalizar a cuadrado + resize
  const img = sharp(params.inputBuffer).rotate();
  const meta = await img.metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  if (!w || !h) throw new Error('No se pudo leer width/height');

  const side = Math.min(w, h);
  const left = Math.floor((w - side) / 2);
  const top = Math.floor((h - side) / 2);

  const square = img.extract({ left, top, width: side, height: side }).resize(size, size, { fit: 'cover' });

  // Guardar base semanal
  await square.clone().webp({ quality: 82 }).toFile(baseWebpPath);

  // Tiles 3x3
  const grid = 3;
  const tileSize = Math.floor(size / grid);
  const tiles: PuzzleTile[] = [];

  for (let row = 0; row < grid; row++) {
    for (let col = 0; col < grid; col++) {
      const correctIndex = row * grid + col;
      const x = col * tileSize;
      const y = row * tileSize;
      const width = col === grid - 1 ? size - x : tileSize;
      const height = row === grid - 1 ? size - y : tileSize;

      const tilePath = join(tilesDir, `t${correctIndex}.webp`);
      await square.clone().extract({ left: x, top: y, width, height }).webp({ quality: 80 }).toFile(tilePath);

      tiles.push({
        correctIndex,
        url: `${params.publicBaseUrl}${publicPrefix}/puzzles/${params.weekKey}/tiles/${params.imageId}/t${correctIndex}.webp`,
      });
    }
  }

  return { baseUrl, tiles, imageId: params.imageId };
}