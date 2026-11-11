import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { FlagsController } from './flags.controller';
import { FlagsService } from './flags.service';

@Module({
  controllers: [FlagsController],
  providers: [FlagsService, PrismaService],
})
export class FlagsModule {}
