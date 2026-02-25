import sharp from 'sharp';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';

export type PuzzleTileCloudinary = { correctIndex: number; url: string };

export async function savePuzzleWeeklyAndSlice3x3Cloudinary(params: {
  inputBuffer: Buffer;
  weekKey: string;
  imageId: string;
  cloudinary: CloudinaryService;
  size?: number;
}) {
  const size = params.size ?? 1024;

  const img = sharp(params.inputBuffer).rotate();
  const meta = await img.metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  if (!w || !h) throw new Error('No se pudo leer width/height');

  const side = Math.min(w, h);
  const left = Math.floor((w - side) / 2);
  const top = Math.floor((h - side) / 2);

  const square = img.extract({ left, top, width: side, height: side }).resize(size, size, { fit: 'cover' });

  const baseBuffer = await square.clone().webp({ quality: 82 }).toBuffer();
  const baseUpload = await params.cloudinary.uploadImageBuffer({
    buffer: baseBuffer,
    folder: `puzzles/${params.weekKey}`,
    publicId: `puzzle-${params.imageId}`,
    format: 'webp',
    overwrite: true,
  });

  const grid = 3;
  const tileSize = Math.floor(size / grid);
  const tiles: PuzzleTileCloudinary[] = [];

  for (let row = 0; row < grid; row++) {
    for (let col = 0; col < grid; col++) {
      const correctIndex = row * grid + col;
      const x = col * tileSize;
      const y = row * tileSize;
      const width = col === grid - 1 ? size - x : tileSize;
      const height = row === grid - 1 ? size - y : tileSize;

      const tileBuffer = await square
        .clone()
        .extract({ left: x, top: y, width, height })
        .webp({ quality: 80 })
        .toBuffer();

      const tileUpload = await params.cloudinary.uploadImageBuffer({
        buffer: tileBuffer,
        folder: `puzzles/${params.weekKey}/tiles/${params.imageId}`,
        publicId: `t${correctIndex}`,
        format: 'webp',
        overwrite: true,
      });

      tiles.push({
        correctIndex,
        url: tileUpload.secureUrl,
      });
    }
  }

  return {
    baseUrl: baseUpload.secureUrl,
    tiles,
    imageId: params.imageId,
  };
}
