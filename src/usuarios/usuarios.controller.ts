import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { ApiKeyGuard } from '../flags/api-key.guard';
import { UsuarioGuard, type RequisicaoAutenticada } from './usuario.guard';
import { CriarUsuarioDto } from './usuarios.dto';
import { UsuariosService } from './usuarios.service';

@ApiTags('usuarios')
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuarios: UsuariosService) {}

  /** Só o administrador (x-api-key = API_KEY) cadastra usuários. */
  @Post()
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('api-key')
  criar(@Body() dto: CriarUsuarioDto) {
    return this.usuarios.criar(dto);
  }

  /** Quem sou eu? Usado pelo painel web para validar o token. */
  @Get('eu')
  @UseGuards(UsuarioGuard)
  @ApiBearerAuth()
  eu(@Req() req: RequisicaoAutenticada) {
    return req.usuario;
  }
}
