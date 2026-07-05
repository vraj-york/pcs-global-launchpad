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
import { ProductUpdatesService } from './product-updates.service';

class ProductUpdateWriteDto {
  label!: string;
  href!: string;
  audience?: string;
  status?: string;
  sortOrder?: number;
}

@ApiTags('Product Updates')
@ApiBearerAuth()
@Controller('product-updates')
export class ProductUpdatesController {
  constructor(private readonly productUpdatesService: ProductUpdatesService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @UseGuards(CognitoAuthGuard, CoachGuard, AuthorizationGuard)
  @RequireSubmodule(SUBMODULE_KEYS.COACH_DASHBOARD_VIEW)
  async list(@Query('audience') audience?: string, @Query('status') status?: string) {
    return ResponseHelper.success(
      'Product updates fetched successfully.',
      await this.productUpdatesService.list(
        audience ?? 'COACH',
        status ?? 'RELEASED',
      ),
    );
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(CognitoAuthGuard, SuperAdminGuard, AuthorizationGuard)
  @RequireSubmodule(SUBMODULE_KEYS.PRODUCT_UPDATES_MANAGE)
  async create(@Body() body: ProductUpdateWriteDto) {
    return ResponseHelper.success(
      'Product update created successfully.',
      await this.productUpdatesService.create(body),
    );
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CognitoAuthGuard, SuperAdminGuard, AuthorizationGuard)
  @RequireSubmodule(SUBMODULE_KEYS.PRODUCT_UPDATES_MANAGE)
  async update(@Param('id') id: string, @Body() body: Partial<ProductUpdateWriteDto>) {
    return ResponseHelper.success(
      'Product update updated successfully.',
      await this.productUpdatesService.update(id, body),
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CognitoAuthGuard, SuperAdminGuard, AuthorizationGuard)
  @RequireSubmodule(SUBMODULE_KEYS.PRODUCT_UPDATES_MANAGE)
  async remove(@Param('id') id: string) {
    return ResponseHelper.success(
      'Product update deleted successfully.',
      await this.productUpdatesService.remove(id),
    );
  }
}
