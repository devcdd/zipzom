import { Module } from '@nestjs/common';
import { AdminController } from './admin/admin.controller.js';
import { Db } from './db.js';
import { MatchesController } from './matching/matches.controller.js';
import { NoticesController } from './notices/notices.controller.js';
import { NoticesService } from './notices/notices.service.js';
import { RegionsController } from './notices/regions.controller.js';
import { ProfilesController } from './profiles/profiles.controller.js';
import { ProfilesService } from './profiles/profiles.service.js';
import { ExtractionService } from './sync/extraction.service.js';
import { SyncService } from './sync/sync.service.js';

// ponytail: 단일 모듈. 도메인이 커지면 feature module로 분리
@Module({
  controllers: [NoticesController, RegionsController, ProfilesController, MatchesController, AdminController],
  providers: [Db, SyncService, ExtractionService, NoticesService, ProfilesService],
})
export class AppModule {}
