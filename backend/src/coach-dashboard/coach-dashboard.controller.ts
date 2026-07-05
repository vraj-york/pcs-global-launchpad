import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  AuthorizationGuard,
  CoachGuard,
  CognitoAuthGuard,
  CurrentUser,
  RequireSubmodule,
  SUBMODULE_KEYS,
} from '../auth';
import { ResponseHelper } from '../common';
import { CoachDashboardService } from './coach-dashboard.service';
import {
  CancelSessionDto,
  CoachActivityQueryDto,
  CoachInsightQueryDto,
  GetCoachDashboardSessionsQueryDto,
  RescheduleSessionDto,
  ScheduleSessionDto,
  UpdateCoachAvailabilityDto,
} from './dto/coach-dashboard.dto';

type CurrentUserPayload = {
  sub: string;
  email?: string;
  groups: string[];
};

@ApiTags('Coach Dashboard')
@ApiBearerAuth()
@UseGuards(CognitoAuthGuard, CoachGuard, AuthorizationGuard)
@RequireSubmodule(SUBMODULE_KEYS.COACH_DASHBOARD_VIEW)
@Controller('coach-dashboard')
export class CoachDashboardController {
  constructor(private readonly coachDashboardService: CoachDashboardService) {}

  @Get('summary')
  @HttpCode(HttpStatus.OK)
  async getSummary(@CurrentUser() user: CurrentUserPayload) {
    return ResponseHelper.success(
      'Coach dashboard summary fetched successfully.',
      await this.coachDashboardService.getSummary(user.sub),
    );
  }

  @Get('sessions')
  @HttpCode(HttpStatus.OK)
  async getSessions(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: GetCoachDashboardSessionsQueryDto,
  ) {
    return ResponseHelper.success(
      'Coach dashboard sessions fetched successfully.',
      await this.coachDashboardService.getDashboardSessions(user.sub, query.date),
    );
  }

  @Post('sessions')
  @HttpCode(HttpStatus.CREATED)
  async createSession(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ScheduleSessionDto,
  ) {
    return ResponseHelper.success(
      'Coach session scheduled successfully.',
      await this.coachDashboardService.createSession(user.sub, dto),
    );
  }

  @Patch('sessions/:id/reschedule')
  @HttpCode(HttpStatus.OK)
  async rescheduleSession(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') sessionId: string,
    @Body() dto: RescheduleSessionDto,
  ) {
    return ResponseHelper.success(
      'Coach session rescheduled successfully.',
      await this.coachDashboardService.rescheduleSession(user.sub, sessionId, dto),
    );
  }

  @Post('sessions/:id/join')
  @HttpCode(HttpStatus.OK)
  async joinSession(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') sessionId: string,
  ) {
    return ResponseHelper.success(
      'Coach meeting link fetched successfully.',
      await this.coachDashboardService.joinSession(user.sub, sessionId),
    );
  }

  @Get('sessions/:id/quick-prep')
  @HttpCode(HttpStatus.OK)
  async getQuickPrep(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') sessionId: string,
  ) {
    return ResponseHelper.success(
      'Coach quick prep fetched successfully.',
      await this.coachDashboardService.getQuickPrep(user.sub, sessionId),
    );
  }

  @Delete('sessions/:id')
  @HttpCode(HttpStatus.OK)
  async cancelSession(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') sessionId: string,
    @Body() dto: CancelSessionDto,
  ) {
    return ResponseHelper.success(
      'Coach session cancelled successfully.',
      await this.coachDashboardService.cancelSession(user.sub, sessionId, dto),
    );
  }

  @Get('activity')
  @HttpCode(HttpStatus.OK)
  async getActivity(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: CoachActivityQueryDto,
  ) {
    return ResponseHelper.success(
      'Coach activity fetched successfully.',
      await this.coachDashboardService.getActivity(user.sub, query.limit ?? 10),
    );
  }

  @Get('insight')
  @HttpCode(HttpStatus.OK)
  async getInsight(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: CoachInsightQueryDto,
  ) {
    return ResponseHelper.success(
      'Coach insight fetched successfully.',
      await this.coachDashboardService.getInsight(user.sub),
    );
  }

  @Get('availability')
  @HttpCode(HttpStatus.OK)
  async getAvailability(@CurrentUser() user: CurrentUserPayload) {
    return ResponseHelper.success(
      'Coach availability fetched successfully.',
      await this.coachDashboardService.getAvailability(user.sub),
    );
  }

  @Put('availability')
  @HttpCode(HttpStatus.OK)
  async updateAvailability(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateCoachAvailabilityDto,
  ) {
    return ResponseHelper.success(
      'Coach availability updated successfully.',
      await this.coachDashboardService.updateAvailability(user.sub, dto),
    );
  }

  @Get('clients')
  @HttpCode(HttpStatus.OK)
  async getClients(@CurrentUser() user: CurrentUserPayload) {
    return ResponseHelper.success(
      'Coach clients fetched successfully.',
      await this.coachDashboardService.getClients(user.sub),
    );
  }
}
