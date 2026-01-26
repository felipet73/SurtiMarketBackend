import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SustainabilityService } from './sustainability.service';
import { SubmitAssessmentDto } from './dto/submit-assessment.dto';

@Controller('sustainability')
export class SustainabilityController {
  constructor(private readonly sustainability: SustainabilityService) {}

  @Get('questionnaire')
  questionnaire() {
    return this.sustainability.getQuestionnaire();
  }

  @Post('assessment')
  @UseGuards(JwtAuthGuard)
  submit(@Req() req: any, @Body() dto: SubmitAssessmentDto) {
    return this.sustainability.submitAssessment(req.user.sub, dto.answers);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: any) {
    return this.sustainability.getMyProfile(req.user.sub);
  }
}