import { Global, Module } from '@nestjs/common';
import { CloudinaryStorageService } from './cloudinary.service';

@Global()
@Module({
  providers: [CloudinaryStorageService],
  exports: [CloudinaryStorageService],
})
export class StorageModule {}
