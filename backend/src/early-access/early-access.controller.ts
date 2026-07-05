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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';
import {
  AuthorizationGuard,
  CoachGuard,
  CognitoAuthGuard,
  CurrentUser,
  RequireSubmodule,
  SUBMODULE_KEYS,
  SuperAdminGuard,
} from '../auth';
import { ResponseHelper } from '../common';
import { EarlyAccessService } from './early-access.service';

class JoinWaitlistDto {
  @IsOptional()
  @IsString()
  featureKey?: string;
}

class UpdateFeatureDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  audience?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  isPublished?: boolean;
}

type CurrentUserPayload = {
  sub: string;
  email?: string;
  groups: string[];
};

@ApiTags('Early Access')
@ApiBearerAuth()
@Controller('early-access')
export class EarlyAccessController {
  constructor(private readonly earlyAccessService: EarlyAccessService) {}

  @Get('features')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CognitoAuthGuard, CoachGuard, AuthorizationGuard)
  @RequireSubmodule(SUBMODULE_KEYS.COACH_DASHBOARD_VIEW)
  async listFeatures() {
    return ResponseHelper.success(
      'Early-access features fetched successfully.',
      await this.earlyAccessService.listFeatures(),
    );
  }

  @Post('waitlist')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CognitoAuthGuard, CoachGuard, AuthorizationGuard)
  @RequireSubmodule(SUBMODULE_KEYS.COACH_DASHBOARD_VIEW)
  async joinWaitlist(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: JoinWaitlistDto,
  ) {
    return ResponseHelper.success(
      'Early-access waitlist updated successfully.',
      await this.earlyAccessService.joinWaitlist(user.sub, body.featureKey),
    );
  }

  @Delete('waitlist/:featureKey')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CognitoAuthGuard, CoachGuard, AuthorizationGuard)
  @RequireSubmodule(SUBMODULE_KEYS.COACH_DASHBOARD_VIEW)
  async leaveWaitlist(
    @CurrentUser() user: CurrentUserPayload,
    @Param('featureKey') featureKey: string,
  ) {
    return ResponseHelper.success(
      'Early-access waitlist updated successfully.',
      await this.earlyAccessService.leaveWaitlist(user.sub, featureKey),
    );
  }

  @Get('waitlist')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CognitoAuthGuard, SuperAdminGuard, AuthorizationGuard)
  @RequireSubmodule(SUBMODULE_KEYS.EARLY_ACCESS_MANAGE)
  async listWaitlist() {
    return ResponseHelper.success(
      'Early-access waitlist fetched successfully.',
      await this.earlyAccessService.listWaitlist(),
    );
  }

  @Patch('features/:id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CognitoAuthGuard, SuperAdminGuard, AuthorizationGuard)
  @RequireSubmodule(SUBMODULE_KEYS.EARLY_ACCESS_MANAGE)
  async updateFeature(@Param('id') id: string, @Body() body: UpdateFeatureDto) {
    return ResponseHelper.success(
      'Early-access feature updated successfully.',
      await this.earlyAccessService.updateFeature(id, body),
    );
  }
}
