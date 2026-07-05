import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  AuthorizationGuard,
  CoachGuard,
  CognitoAuthGuard,
  RequireSubmodule,
  SUBMODULE_KEYS,
} from '../auth';
import { ResponseHelper } from '../common';
import { CoachIntegrationsService } from './coach-integrations.service';

@ApiTags('Coach Integrations')
@ApiBearerAuth()
@UseGuards(CognitoAuthGuard, CoachGuard, AuthorizationGuard)
@RequireSubmodule(SUBMODULE_KEYS.COACH_DASHBOARD_VIEW)
@Controller('coach-integrations')
export class CoachIntegrationsController {
  constructor(
    private readonly coachIntegrationsService: CoachIntegrationsService,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async list() {
    return ResponseHelper.success(
      'Coach integrations fetched successfully.',
      await this.coachIntegrationsService.list(),
    );
  }

  @Post(':provider/connect')
  @HttpCode(HttpStatus.OK)
  async connect(@Param('provider') provider: string) {
    return ResponseHelper.success(
      'Coach integration status fetched successfully.',
      await this.coachIntegrationsService.connect(provider),
    );
  }

  @Get(':provider/callback')
  @HttpCode(HttpStatus.OK)
  async callback(@Param('provider') provider: string) {
    return ResponseHelper.success(
      'Coach integration callback handled successfully.',
      await this.coachIntegrationsService.callback(provider),
    );
  }

  @Delete(':provider')
  @HttpCode(HttpStatus.OK)
  async disconnect(@Param('provider') provider: string) {
    return ResponseHelper.success(
      'Coach integration disconnected successfully.',
      await this.coachIntegrationsService.disconnect(provider),
    );
  }
}
