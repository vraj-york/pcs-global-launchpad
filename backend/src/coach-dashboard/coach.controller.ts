import {
  Body,
  Controller,
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
  CoachCalendarQueryDto,
  CoachSessionsQueryDto,
  CoachSessionRequestsQueryDto,
  SessionRequestCancelDto,
  SessionRequestSlotsDto,
  UpdateSessionNotesDto,
} from './dto/coach-dashboard.dto';

type CurrentUserPayload = {
  sub: string;
  email?: string;
  groups: string[];
};

@ApiTags('Coach')
@ApiBearerAuth()
@UseGuards(CognitoAuthGuard, CoachGuard, AuthorizationGuard)
@RequireSubmodule(SUBMODULE_KEYS.COACH_DASHBOARD_VIEW)
@Controller('coach')
export class CoachController {
  constructor(private readonly coachDashboardService: CoachDashboardService) {}

  @Get('sessions')
  @HttpCode(HttpStatus.OK)
  async getSessions(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: CoachSessionsQueryDto,
  ) {
    return ResponseHelper.success(
      'Coach sessions fetched successfully.',
      await this.coachDashboardService.getSessionsPageSessions(user.sub, query),
    );
  }

  @Get('sessions/:id')
  @HttpCode(HttpStatus.OK)
  async getSessionDetail(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') sessionId: string,
  ) {
    return ResponseHelper.success(
      'Coach session detail fetched successfully.',
      await this.coachDashboardService.getSessionDetail(user.sub, sessionId),
    );
  }

  @Get('sessions/:id/notes')
  @HttpCode(HttpStatus.OK)
  async getSessionNotes(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') sessionId: string,
  ) {
    return ResponseHelper.success(
      'Coach session notes fetched successfully.',
      await this.coachDashboardService.getSessionNotes(user.sub, sessionId),
    );
  }

  @Put('sessions/:id/notes')
  @HttpCode(HttpStatus.OK)
  async updateSessionNotes(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') sessionId: string,
    @Body() dto: UpdateSessionNotesDto,
  ) {
    return ResponseHelper.success(
      'Coach session notes updated successfully.',
      await this.coachDashboardService.updateSessionNotes(user.sub, sessionId, dto),
    );
  }

  @Get('session-requests')
  @HttpCode(HttpStatus.OK)
  async getSessionRequests(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: CoachSessionRequestsQueryDto,
  ) {
    return ResponseHelper.success(
      'Coach session requests fetched successfully.',
      await this.coachDashboardService.getSessionRequests(user.sub, query),
    );
  }

  @Post('session-requests/:id/accept')
  @HttpCode(HttpStatus.OK)
  async acceptSessionRequest(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') requestId: string,
  ) {
    return ResponseHelper.success(
      'Coach session request accepted successfully.',
      await this.coachDashboardService.acceptSessionRequest(user.sub, requestId),
    );
  }

  @Post('session-requests/:id/decline')
  @HttpCode(HttpStatus.OK)
  async declineSessionRequest(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') requestId: string,
    @Body() dto: SessionRequestCancelDto,
  ) {
    return ResponseHelper.success(
      'Coach session request declined successfully.',
      await this.coachDashboardService.declineSessionRequest(
        user.sub,
        requestId,
        dto,
      ),
    );
  }

  @Post('session-requests/:id/propose-slots')
  @HttpCode(HttpStatus.OK)
  async proposeSlots(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') requestId: string,
    @Body() dto: SessionRequestSlotsDto,
  ) {
    return ResponseHelper.success(
      'Coach request slots proposed successfully.',
      await this.coachDashboardService.proposeSlots(user.sub, requestId, dto),
    );
  }

  @Patch('session-requests/:id/slots')
  @HttpCode(HttpStatus.OK)
  async editSlots(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') requestId: string,
    @Body() dto: SessionRequestSlotsDto,
  ) {
    return ResponseHelper.success(
      'Coach request slots updated successfully.',
      await this.coachDashboardService.editProposedSlots(user.sub, requestId, dto),
    );
  }

  @Post('session-requests/:id/remind')
  @HttpCode(HttpStatus.OK)
  async remindSessionRequest(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') requestId: string,
  ) {
    return ResponseHelper.success(
      'Coach session request reminder queued successfully.',
      await this.coachDashboardService.remindSessionRequest(user.sub, requestId),
    );
  }

  @Post('session-requests/:id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelSessionRequest(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') requestId: string,
    @Body() dto: SessionRequestCancelDto,
  ) {
    return ResponseHelper.success(
      'Coach session request cancelled successfully.',
      await this.coachDashboardService.cancelSessionRequest(user.sub, requestId, dto),
    );
  }

  @Get('session-requests/:id/reason')
  @HttpCode(HttpStatus.OK)
  async getSessionRequestReason(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') requestId: string,
  ) {
    return ResponseHelper.success(
      'Coach session request reason fetched successfully.',
      await this.coachDashboardService.getSessionRequestReason(user.sub, requestId),
    );
  }

  @Get('calendar')
  @HttpCode(HttpStatus.OK)
  async getCalendar(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: CoachCalendarQueryDto,
  ) {
    return ResponseHelper.success(
      'Coach calendar fetched successfully.',
      await this.coachDashboardService.getCalendar(user.sub, query),
    );
  }

  @Get('clients/:clientId/sessions')
  @HttpCode(HttpStatus.OK)
  async getClientSessions(
    @CurrentUser() user: CurrentUserPayload,
    @Param('clientId') clientId: string,
    @Query() query: CoachSessionsQueryDto,
  ) {
    return ResponseHelper.success(
      'Coach client sessions fetched successfully.',
      await this.coachDashboardService.getClientSessions(
        user.sub,
        clientId,
        query,
      ),
    );
  }
}
