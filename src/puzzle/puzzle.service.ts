import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { OpenAiService } from '../ai/openai.service';
import { getISOWeekKey } from '../common/utils/week-key';
import { savePuzzleWeeklyAndSlice3x3 } from '../common/utils/puzzle-3x3-storage';
import { PuzzleWeeklyCache, PuzzleWeeklyCacheDocument } from './schemas/puzzle-weekly-cache.schema';
import { UserWeeklyPuzzleProgress, UserWeeklyPuzzleProgressDocument } from './schemas/user-weekly-puzzle-progress.schema';
import { WalletLedger, WalletLedgerDocument, LedgerType } from '../wallet/schemas/wallet-ledger.schema';

@Injectable()
export class PuzzleService {
  constructor(
    @InjectModel(PuzzleWeeklyCache.name) private cacheModel: Model<PuzzleWeeklyCacheDocument>,
    @InjectModel(UserWeeklyPuzzleProgress.name) private progressModel: Model<UserWeeklyPuzzleProgressDocument>,
    @InjectModel(WalletLedger.name) private ledgerModel: Model<WalletLedgerDocument>,
    private readonly openai: OpenAiService,
  ) {}

  private computeSolved(positions: number[]) {
    return positions.length === 9 && positions.every((v, i) => v === this.solvedState()[i]);
  }

  private shufflePositions(): number[] {
    // Permutación simple 0..8 (para MVP). Si quieres “solvable only” tipo 8-puzzle clásico, lo hacemos luego.
    const arr = Array.from({ length: 9 }, (_, i) => i);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    // Evita que salga ya resuelto:
    if (this.computeSolved(arr)) [arr[0], arr[1]] = [arr[1], arr[0]];
    return arr;
  }

  async getWeeklyAssets() {
    const weekKey = getISOWeekKey(new Date());
    let cache = await this.cacheModel.findOne({ weekKey }).exec();
    if (cache) return cache;

    // Prompt del puzzle: mejor simple y sin texto (ideal para rompecabezas)
    const prompt = [
      'Ilustración cuadrada estilo vector/flat, alta claridad, sin texto, sin marcas.',
      'Tema: hábitos sostenibles; elemento central claro; fondo suave, continuidad visual.',
      'Colores vibrantes, líneas limpias, composición centrada, sin detalles finos en bordes.'
    ].join(' ');

    const buffer = await this.openai.generatePuzzleImageBuffer({ prompt, size: '512x512' });

    const publicBaseUrl = process.env.PUBLIC_BASE_URL ?? 'http://localhost:3000';
    const imageId = weekKey; // ✅ MISMA imagen/tiles toda la semana

    const saved = await savePuzzleWeeklyAndSlice3x3({
      inputBuffer: buffer,
      weekKey,
      imageId,
      publicBaseUrl,
      publicPrefix: '/public',
      size: 1024,
    });

    cache = await this.cacheModel.create({
      weekKey,
      imageUrl: saved.baseUrl,
      imageId: saved.imageId,
      tiles: saved.tiles,
    });

    return cache;
  }

  async getMyWeeklyPuzzle(userId: string) {
    const weekKey = getISOWeekKey(new Date());
    const uid = new Types.ObjectId(userId);

    const assets = await this.getWeeklyAssets();

    let progress = await this.progressModel.findOne({ userId: uid, weekKey }).exec();

    if (progress && !progress.positions.includes(-1)) {
      // Usamos la ficha 8 como hueco (blank)
      const migrated = progress.positions.map(v => (v === 8 ? -1 : v));

      // (Opcional) si por alguna razón no quedó -1, forzamos el último slot
      if (!migrated.includes(-1)) migrated[8] = -1;

      // (Opcional) si hay valores fuera de 0..7, normaliza:
      // migrated = migrated.map(v => (v > 7 ? -1 : v));

      progress.positions = migrated;
      progress.isSolved = this.isSolved(migrated);
      await progress.save();
    }
    //isSolved: false,
    //rewardGranted: false,

    if (!progress) {
      progress = await this.progressModel.create({
        userId: uid,
        weekKey,
        grid: 3,
        //positions: this.shufflePositions(),
        positions: this.generateSolvableShuffle(70),
        isSolved: false,
        rewardGranted: false,
        ecoCoinsGranted: 0,
        puzzlePointsGranted: 0,
      });
    }

    return {
      weekKey,
      assets: {
        imageUrl: assets.imageUrl,
        grid: 3,
        tiles: assets.tiles,
      },
      progress: {
        positions: progress.positions,
        isSolved: progress.isSolved,
        rewardGranted: progress.rewardGranted,
      },
    };
  }

  async updateMyState(userId: string, positions: number[]) {
    // Validación fuerte: debe ser permutación de 0..8
    if (positions.length !== 9) throw new BadRequestException('positions debe tener 9 elementos');
    const set = new Set(positions);
    if (set.size !== 9) throw new BadRequestException('positions tiene duplicados');
    for (const n of positions) if (n < 0 || n > 8) throw new BadRequestException('positions fuera de rango');

    const weekKey = getISOWeekKey(new Date());
    const uid = new Types.ObjectId(userId);

    const solved = this.computeSolved(positions);

    const progress = await this.progressModel.findOneAndUpdate(
      { userId: uid, weekKey },
      { $set: { positions, isSolved: solved } },
      { new: true, upsert: true },
    );

    return {
      weekKey,
      positions: progress.positions,
      isSolved: progress.isSolved,
      rewardGranted: progress.rewardGranted,
    };
  }

  async claimRewardIfSolved(userId: string) {
    const weekKey = getISOWeekKey(new Date());
    const uid = new Types.ObjectId(userId);

    const progress = await this.progressModel.findOne({ userId: uid, weekKey }).exec();
    if (!progress) throw new BadRequestException('No hay progreso para esta semana');

    if (!progress.isSolved) throw new BadRequestException('Aún no está resuelto');
    if (progress.rewardGranted) {
      return { ok: true, idempotent: true, ecoCoinsGranted: progress.ecoCoinsGranted, puzzlePointsGranted: progress.puzzlePointsGranted };
    }

    // Recompensas (ajustables)
    const ecoCoins = 40;
    const puzzlePoints = 100;

    // Ledger idempotente: usamos refId = progress._id y source PUZZLE_WEEKLY
    // Tu schema WalletLedger ya tiene índice único (userId,type,source,refId) sparse, perfecto.
    await this.ledgerModel.create({
      userId: uid,
      type: LedgerType.EARN,
      amount: ecoCoins,
      source: 'PUZZLE_WEEKLY',
      refId: progress._id,
      note: `Weekly puzzle solved (${weekKey})`,
    });

    progress.rewardGranted = true;
    progress.ecoCoinsGranted = ecoCoins;
    progress.puzzlePointsGranted = puzzlePoints;
    await progress.save();

    return { ok: true, ecoCoinsGranted: ecoCoins, puzzlePointsGranted: puzzlePoints };
  }

  private grid = 3;

  private solvedState(): number[] {
    return [0,1,2,3,4,5,6,7,-1];
  }

  private isSolved(pos: number[]) {
    return pos.every((v, i) => v === this.solvedState()[i]);
  }

  private canSlide(fromIndex: number, blankIndex: number) {
    const g = this.grid;
    const fr = Math.floor(fromIndex / g);
    const fc = fromIndex % g;
    const br = Math.floor(blankIndex / g);
    const bc = blankIndex % g;
    return Math.abs(fr - br) + Math.abs(fc - bc) === 1;
  }

  private getNeighbors(blankIndex: number) {
    const g = this.grid;
    const r = Math.floor(blankIndex / g);
    const c = blankIndex % g;
    const res: number[] = [];
    if (r > 0) res.push(blankIndex - g);
    if (r < g - 1) res.push(blankIndex + g);
    if (c > 0) res.push(blankIndex - 1);
    if (c < g - 1) res.push(blankIndex + 1);
    return res;
  }

  private generateSolvableShuffle(steps = 60) {
    let pos = this.solvedState();
    for (let i = 0; i < steps; i++) {
      const blank = pos.indexOf(-1);
      const neighbors = this.getNeighbors(blank);
      const pick = neighbors[Math.floor(Math.random() * neighbors.length)];
      const tile = pos[pick];
      pos = [...pos];
      pos[blank] = tile;
      pos[pick] = -1;
    }
    if (this.isSolved(pos)) return this.generateSolvableShuffle(steps + 10);
    return pos;
  }

  async move(userId: string, tileIndex: number) {
    const uid = new Types.ObjectId(userId);
    const weekKey = getISOWeekKey(new Date());

    const progress = await this.progressModel.findOne({ userId: uid, weekKey }).exec();
    if (!progress) throw new BadRequestException('No puzzle');

    if (progress && !progress.positions.includes(-1)) {
      // Usamos la ficha 8 como hueco (blank)
      const migrated = progress.positions.map(v => (v === 8 ? -1 : v));

      // (Opcional) si por alguna razón no quedó -1, forzamos el último slot
      if (!migrated.includes(-1)) migrated[8] = -1;

      // (Opcional) si hay valores fuera de 0..7, normaliza:
      // migrated = migrated.map(v => (v > 7 ? -1 : v));

      progress.positions = migrated;
      progress.isSolved = this.isSolved(migrated);
      await progress.save();
    }

    const fromIndex = progress.positions.indexOf(tileIndex);
    const blankIndex = progress.positions.indexOf(-1);

    if (!this.canSlide(fromIndex, blankIndex)) {
      return {
        ok: false,
        positions: progress.positions,
        isSolved: progress.isSolved,
        rewardGranted: progress.rewardGranted,
      };
    }

    const next = [...progress.positions];
    next[blankIndex] = tileIndex;
    next[fromIndex] = -1;

    if (fromIndex < 0) throw new BadRequestException('tileIndex inválido');
    if (blankIndex < 0) throw new BadRequestException('estado inválido: no existe hueco (-1)');
    
    const solved = this.isSolved(next);

    progress.positions = next;
    progress.isSolved = solved;
    await progress.save();

    return {
      ok: true,
      positions: next,
      isSolved: solved,
      rewardGranted: progress.rewardGranted,
    };
  }
}