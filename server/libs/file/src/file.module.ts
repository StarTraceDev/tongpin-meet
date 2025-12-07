import { Module } from '@nestjs/common'

import { AuthModule } from '../../auth/src/auth.module'

import { FileController } from './file.controller'
import { FileService } from './file.service'
import { LocalStorageProvider } from './local-storage'
import { MeetingFileController } from './meeting-file.controller'
import { STORAGE_PROVIDER } from './storage'

@Module({
  imports: [AuthModule],
  controllers: [FileController, MeetingFileController],
  providers: [FileService, { provide: STORAGE_PROVIDER, useClass: LocalStorageProvider }],
  exports: [FileService, STORAGE_PROVIDER],
})
export class FileModule {}
