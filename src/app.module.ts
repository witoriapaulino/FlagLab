import { Module } from '@nestjs/common';
import { FlagsController } from './flags/flags.controller';
import { FlagsService } from './flags/flags.service';
import { PrismaService } from './prisma.service';
import { UsuarioGuard } from './usuarios/usuario.guard';
import { UsuariosController } from './usuarios/usuarios.controller';
import { UsuariosService } from './usuarios/usuarios.service';

// ponytail: um módulo só enquanto o projeto é pequeno; separar em módulos quando crescer.
@Module({
  controllers: [FlagsController, UsuariosController],
  providers: [PrismaService, FlagsService, UsuariosService, UsuarioGuard],
})
export class AppModule {}
