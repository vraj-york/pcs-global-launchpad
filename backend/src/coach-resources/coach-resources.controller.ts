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
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  AuthorizationGuard,
  CoachGuard,
  CognitoAuthGuard,
  RequireSubmodule,
  SUBMODULE_KEYS,
  SuperAdminGuard,
} from '../auth';
import { ResponseHelper } from '../common';
import { CoachResourcesService } from './coach-resources.service';

class CoachResourceWriteDto {
  lead!: string;
  connector!: string;
  linkLabel!: string;
  href!: string;
  icon!: string;
  accent!: string;
  audience?: string;
  isPublished?: boolean;
}

class CoachResourceReorderDto {
  items!: Array<{ id: string; sortOrder: number }>;
}

@ApiTags('Coach Resources')
@ApiBearerAuth()
@Controller('coach-resources')
export class CoachResourcesController {
  constructor(private readonly coachResourcesService: CoachResourcesService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @UseGuards(CognitoAuthGuard, CoachGuard, AuthorizationGuard)
  @RequireSubmodule(SUBMODULE_KEYS.COACH_DASHBOARD_VIEW)
  async list(@Query('audience') audience?: string) {
    return ResponseHelper.success(
      'Coach resources fetched successfully.',
      await this.coachResourcesService.list(audience ?? 'COACH'),
    );
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(CognitoAuthGuard, SuperAdminGuard, AuthorizationGuard)
  @RequireSubmodule(SUBMODULE_KEYS.COACH_RESOURCES_MANAGE)
  async create(@Body() body: CoachResourceWriteDto) {
    return ResponseHelper.success(
      'Coach resource created successfully.',
      await this.coachResourcesService.create(body),
    );
  }

  @Patch('reorder')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CognitoAuthGuard, SuperAdminGuard, AuthorizationGuard)
  @RequireSubmodule(SUBMODULE_KEYS.COACH_RESOURCES_MANAGE)
  async reorder(@Body() body: CoachResourceReorderDto) {
    return ResponseHelper.success(
      'Coach resources reordered successfully.',
      await this.coachResourcesService.reorder(body.items ?? []),
    );
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CognitoAuthGuard, SuperAdminGuard, AuthorizationGuard)
  @RequireSubmodule(SUBMODULE_KEYS.COACH_RESOURCES_MANAGE)
  async update(
    @Param('id') id: string,
    @Body() body: Partial<CoachResourceWriteDto>,
  ) {
    return ResponseHelper.success(
      'Coach resource updated successfully.',
      await this.coachResourcesService.update(id, body),
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CognitoAuthGuard, SuperAdminGuard, AuthorizationGuard)
  @RequireSubmodule(SUBMODULE_KEYS.COACH_RESOURCES_MANAGE)
  async remove(@Param('id') id: string) {
    return ResponseHelper.success(
      'Coach resource deleted successfully.',
      await this.coachResourcesService.remove(id),
    );
  }
}
