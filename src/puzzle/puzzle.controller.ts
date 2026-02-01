import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PuzzleService } from './puzzle.service';
import { UpdatePuzzleStateDto } from './dto/update-puzzle-state.dto';
import { MovePuzzleDto } from './dto/move-puzzle.dto';

@Controller('puzzle')
export class PuzzleController {
  constructor(private readonly puzzle: PuzzleService) {}

  // Obtiene assets semanales + estado del usuario (crea si no existe)
  @Get('weekly/me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: any) {
    return this.puzzle.getMyWeeklyPuzzle(req.user.sub);
  }

  // Guarda posiciones actuales (cada vez que mueve/swapea)
  @Post('weekly/me/state')
  @UseGuards(JwtAuthGuard)
  updateState(@Req() req: any, @Body() dto: UpdatePuzzleStateDto) {
    return this.puzzle.updateMyState(req.user.sub, dto.positions);
  }

  // Reclama recompensa si ya está resuelto
  @Post('weekly/me/claim')
  @UseGuards(JwtAuthGuard)
  claim(@Req() req: any) {
    return this.puzzle.claimRewardIfSolved(req.user.sub);
  }

  @Post('weekly/me/move')
    @UseGuards(JwtAuthGuard)
    move(@Req() req: any, @Body() dto: MovePuzzleDto) {
    return this.puzzle.move(req.user.sub, dto.tileIndex);
  }
}