import { Module } from '@nestjs/common';
import { UserModule } from '../user';
import { CoachIntegrationsController } from './coach-integrations.controller';
import { CoachIntegrationsService } from './coach-integrations.service';

@Module({
  imports: [UserModule],
  controllers: [CoachIntegrationsController],
  providers: [CoachIntegrationsService],
})
export class CoachIntegrationsModule {}
