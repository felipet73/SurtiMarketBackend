import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/role.decorator';
import { Role } from '../common/enums/role.enum';
import { AdminPromptsService } from './admin-prompts.service';
import { UpdateChallengeTemplateDto } from './dto/update-challenge-template.dto';
import { UpdateDashboardTemplateDto } from './dto/update-dashboard-template.dto';

@Controller('admin/prompts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminPromptsController {
  constructor(private readonly prompts: AdminPromptsService) {}

  @Get('challenges')
  listChallengeTemplates(
    @Query('activeOnly') activeOnly?: string,
    @Query('focusDimension') focusDimension?: string,
  ) {
    return this.prompts.listChallengeTemplates(activeOnly === 'true', focusDimension);
  }

  @Get('challenges/:id')
  getChallengeTemplateById(@Param('id') id: string) {
    return this.prompts.getChallengeTemplateById(id);
  }

  @Patch('challenges/:id')
  updateChallengeTemplate(@Param('id') id: string, @Body() dto: UpdateChallengeTemplateDto) {
    return this.prompts.updateChallengeTemplate(id, dto);
  }

  @Patch('challenges/:id/active')
  setChallengeTemplateActive(@Param('id') id: string, @Query('value') value?: string) {
    return this.prompts.setChallengeTemplateActive(id, value === 'true');
  }

  @Get('dashboard')
  listDashboardTemplates(@Query('activeOnly') activeOnly?: string) {
    return this.prompts.listDashboardTemplates(activeOnly === 'true');
  }

  @Get('dashboard/:id')
  getDashboardTemplateById(@Param('id') id: string) {
    return this.prompts.getDashboardTemplateById(id);
  }

  @Patch('dashboard/:id')
  updateDashboardTemplate(@Param('id') id: string, @Body() dto: UpdateDashboardTemplateDto) {
    return this.prompts.updateDashboardTemplate(id, dto);
  }

  @Patch('dashboard/:id/active')
  setDashboardTemplateActive(@Param('id') id: string, @Query('value') value?: string) {
    return this.prompts.setDashboardTemplateActive(id, value === 'true');
  }
}
