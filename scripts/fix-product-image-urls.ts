import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { Product, ProductSchema } from '../src/products/schemas/product.schema';

function parseEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

function getArgValue(name: string, fallback?: string) {
  const arg = process.argv.find((a) => a.startsWith(`${name}=`));
  if (arg) return arg.split('=')[1];
  const idx = process.argv.indexOf(name);
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
  return fallback;
}

async function main() {
  parseEnvFile(path.resolve(process.cwd(), '.env'));

  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) throw new Error('MONGO_URI no está configurada.');

  const from = getArgValue('--from', '/seed/products/') ?? '/seed/products/';
  const to = getArgValue('--to', '/public/seed/products/') ?? '/public/seed/products/';

  await mongoose.connect(mongoUri);
  const ProductModel =
    mongoose.models[Product.name] || mongoose.model(Product.name, ProductSchema);

  const cursor = ProductModel.find({
    images: { $elemMatch: { $regex: from } },
  }).cursor();

  let updated = 0;
  for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
    const images = Array.isArray(doc.images) ? doc.images : [];
    const next = images.map((url) => (typeof url === 'string' ? url.replace(from, to) : url));
    if (JSON.stringify(images) !== JSON.stringify(next)) {
      doc.images = next;
      await doc.save();
      updated++;
    }
  }

  await mongoose.disconnect();
  console.log(`Productos actualizados: ${updated}`);
}

main().catch((err) => {
  console.error('Error:', err?.message || err);
  process.exit(1);
});
