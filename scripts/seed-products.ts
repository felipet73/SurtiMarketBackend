import fs from 'fs';
import path from 'path';
import https from 'https';
import mongoose from 'mongoose';
import OpenAI from 'openai';
import { Product, ProductSchema } from '../src/products/schemas/product.schema';

type SeedProduct = {
  name: string;
  brand?: string;
  category?: string;
  description?: string;
  images?: string[];
  tags?: string[];
  isActive?: boolean;
  stock?: number;
  sku: string;
  basePrice: number;
  promo?: {
    active?: boolean;
    promoPrice?: number;
    startsAt?: string;
    endsAt?: string;
  };
  ecoScore?: number;
  co2Kg?: number;
  badges?: string[];
  ecoCoinsEnabled?: boolean;
  maxEcoCoinsDiscountPercent?: number;
  reward?: {
    active?: boolean;
    costEcoCoins?: number;
    minHabitScore?: number;
    minCategory?: string;
    startsAt?: string;
    endsAt?: string;
  };
};

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

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    const req = https.get(url, (res) => {
      if (res.statusCode && res.statusCode >= 400) {
        reject(new Error(`HTTP ${res.statusCode} al descargar ${url}`));
        return;
      }
      res.pipe(file);
      file.on('finish', () => file.close(() => resolve()));
    });
    req.setTimeout(30000, () => {
      req.destroy(new Error(`Timeout al descargar ${url}`));
    });
    req.on('error', (err) => {
      fs.unlink(destPath, () => reject(err));
    });
  });
}

function toNumber(value: any, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeProduct(input: SeedProduct, index: number): SeedProduct {
  const name = (input.name || '').trim();
  const sku = (input.sku || '').trim();

  const basePrice = toNumber(input.basePrice, 0);
  const stock = toNumber(input.stock ?? 10, 10);
  const ecoScore = Math.min(100, Math.max(0, toNumber(input.ecoScore ?? 70, 70)));
  const maxEco = Math.min(1, Math.max(0, toNumber(input.maxEcoCoinsDiscountPercent ?? 0.5, 0.5)));

  return {
    name: name || `Producto sostenible ${index + 1}`,
    brand: input.brand?.trim() || 'EcoMarca',
    category: input.category?.trim() || 'Sostenible',
    description: input.description?.trim() || 'Producto sostenible de uso diario.',
    images: Array.isArray(input.images) ? input.images : [],
    tags: Array.isArray(input.tags) ? input.tags : ['eco', 'sostenible'],
    isActive: input.isActive ?? true,
    stock,
    sku: sku || `SKU-${Date.now()}-${index + 1}`,
    basePrice: basePrice > 0 ? basePrice : 9.99,
    promo: input.promo ?? { active: false },
    ecoScore,
    co2Kg: toNumber(input.co2Kg ?? 0, 0),
    badges: Array.isArray(input.badges) ? input.badges : ['RECYCLED'],
    ecoCoinsEnabled: input.ecoCoinsEnabled ?? true,
    maxEcoCoinsDiscountPercent: maxEco,
    reward: input.reward ?? { active: false },
  };
}

function dedupeSkus(products: SeedProduct[]) {
  const seen = new Set<string>();
  for (let i = 0; i < products.length; i++) {
    let sku = products[i].sku;
    while (seen.has(sku)) {
      sku = `${sku}-${Math.floor(Math.random() * 1000)}`;
    }
    products[i].sku = sku;
    seen.add(sku);
  }
}

function safeJsonParse(raw: string): any {
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\[[\s\S]*\]/);
    if (match) {
      return JSON.parse(match[0]);
    }
  }
  return null;
}

async function generateWithAI(count: number): Promise<SeedProduct[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY no está configurada.');

  const model = process.env.OPENAI_TEXT_MODEL || 'gpt-4.1-mini';
  const client = new OpenAI({ apiKey });

  const prompt = `
Genera ${count} productos sostenibles para un marketplace.
Devuelve SOLO un JSON array con objetos que cumplan este esquema:
{
  "name": string,
  "brand": string,
  "category": string,
  "description": string,
  "images": string[],
  "tags": string[],
  "isActive": boolean,
  "stock": number,
  "sku": string,
  "basePrice": number,
  "promo": { "active": boolean, "promoPrice": number | null, "startsAt": string | null, "endsAt": string | null },
  "ecoScore": number,
  "co2Kg": number,
  "badges": string[],
  "ecoCoinsEnabled": boolean,
  "maxEcoCoinsDiscountPercent": number,
  "reward": { "active": boolean, "costEcoCoins": number | null, "minHabitScore": number | null, "minCategory": string | null, "startsAt": string | null, "endsAt": string | null }
}
Reglas:
- sku único, corto, sin espacios.
- ecoScore alto (60-95), co2Kg bajo (0-2).
- categorías y descripciones realistas.
- badges y tags relacionados a sostenibilidad.
`;

  const response = await client.responses.create({
    model,
    input: prompt,
  });

  const text = response.output_text || '';
  const parsed = safeJsonParse(text);
  if (!Array.isArray(parsed)) {
    throw new Error('No se pudo parsear el JSON del modelo.');
  }

  return parsed as SeedProduct[];
}

async function generateImages(
  client: OpenAI,
  product: SeedProduct,
  imageCount: number,
  outDir: string,
  publicBaseUrl: string,
) {
  const prompt = `Foto de producto en fondo limpio: ${product.name}. Marca: ${
    product.brand || 'EcoMarca'
  }. Categoria: ${product.category || 'Sostenible'}. Estilo sostenible.`;

  const result = await client.images.generate({
    model: process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1',
    prompt,
    size: '1024x1024',
    n: imageCount,
  });

  const urls: string[] = [];
  const data = result.data ?? [];
  for (let i = 0; i < data.length; i++) {
    const url = data[i].url;
    const filename = `${product.sku}-${i + 1}.png`;
    const filePath = path.join(outDir, filename);
    if (url) {
      await downloadFile(url, filePath);
    } else {
      const b64 = data[i].b64_json;
      if (!b64) continue;
      const buffer = Buffer.from(b64, 'base64');
      fs.writeFileSync(filePath, buffer);
    }
    urls.push(`${publicBaseUrl}/public/seed/products/${filename}`);
  }

  product.images = urls;
}

function generateFallback(count: number): SeedProduct[] {
  const categories = ['Hogar', 'Cuidado personal', 'Limpieza', 'Cocina', 'Movilidad'];
  const badges = ['RECYCLED', 'LOW_CO2', 'LOCAL', 'ORGANIC'];
  const tags = ['eco', 'sostenible', 'reutilizable', 'reciclable'];

  return Array.from({ length: count }, (_, i) => ({
    name: `Producto sostenible ${i + 1}`,
    brand: 'EcoMarca',
    category: categories[i % categories.length],
    description: 'Producto sostenible con materiales reciclados y bajo impacto ambiental.',
    images: [],
    tags,
    isActive: true,
    stock: 20 + i,
    sku: `SKU-${Date.now()}-${i + 1}`,
    basePrice: 10 + i,
    promo: { active: false },
    ecoScore: 70 + (i % 20),
    co2Kg: 0.5,
    badges: [badges[i % badges.length]],
    ecoCoinsEnabled: true,
    maxEcoCoinsDiscountPercent: 0.5,
    reward: { active: false },
  }));
}

async function main() {
  parseEnvFile(path.resolve(process.cwd(), '.env'));

  const count = Math.max(1, Number(getArgValue('--count', '10')));
  const useAI = (getArgValue('--ai', 'true') || 'true') !== 'false';
  const useImages = (getArgValue('--images', 'true') || 'true') !== 'false';
  const imageCount = Math.max(1, Number(getArgValue('--image-count', '2')));
  const mongoUri = process.env.MONGO_URI;
  const publicBaseUrl = process.env.PUBLIC_BASE_URL || 'http://localhost:3000';

  if (!mongoUri) {
    throw new Error('MONGO_URI no está configurada.');
  }

  const productsRaw = useAI ? await generateWithAI(count) : generateFallback(count);
  const products = productsRaw.map(normalizeProduct);
  dedupeSkus(products);

  if (useAI && useImages) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY no está configurada.');
    const client = new OpenAI({ apiKey });
    const outDir = path.resolve(process.cwd(), 'public', 'seed', 'products');
    ensureDir(outDir);

    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      console.log(`Generando imagenes ${i + 1}/${products.length}... ${product.name}`);
      await generateImages(client, product, imageCount, outDir, publicBaseUrl);
    }
  }

  await mongoose.connect(mongoUri);
  const ProductModel =
    mongoose.models[Product.name] || mongoose.model(Product.name, ProductSchema);

  const result = await ProductModel.insertMany(products, { ordered: false });
  await mongoose.disconnect();

  console.log(`Seed completado. Insertados: ${result.length}`);
}

main().catch((err) => {
  console.error('Error en seed:', err?.message || err);
  process.exit(1);
});
