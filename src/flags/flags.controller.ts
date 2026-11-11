import { Body, Controller, Get, Param, ParseEnumPipe, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Ambiente } from '../generated/prisma/client';
import { UsuarioGuard, type RequisicaoAutenticada } from '../usuarios/usuario.guard';
import { AlterarFlagDto, CriarFlagDto, RollbackDto } from './flags.dto';
import { FlagsService } from './flags.service';

const ambientePipe = new ParseEnumPipe(Ambiente);

@ApiTags('flags')
@Controller()
export class FlagsController {
  constructor(private readonly flags: FlagsService) {}

  @Post('flags')
  @UseGuards(UsuarioGuard)
  @ApiBearerAuth()
  criar(@Body() dto: CriarFlagDto, @Req() req: RequisicaoAutenticada) {
    return this.flags.criar(dto, req.usuario);
  }

  @Get('flags')
  listar() {
    return this.flags.listar();
  }

  @Put('flags/:chave/ambientes/:ambiente')
  @UseGuards(UsuarioGuard)
  @ApiBearerAuth()
  alterar(
    @Param('chave') chave: string,
    @Param('ambiente', ambientePipe) ambiente: Ambiente,
    @Body() dto: AlterarFlagDto,
    @Req() req: RequisicaoAutenticada,
  ) {
    return this.flags.alterar(chave, ambiente, dto, req.usuario);
  }

  @Post('flags/:chave/ambientes/:ambiente/rollback')
  @UseGuards(UsuarioGuard)
  @ApiBearerAuth()
  rollback(
    @Param('chave') chave: string,
    @Param('ambiente', ambientePipe) ambiente: Ambiente,
    @Body() dto: RollbackDto,
    @Req() req: RequisicaoAutenticada,
  ) {
    return this.flags.rollback(chave, ambiente, dto, req.usuario);
  }

  @Get('flags/:chave/historico')
  historico(@Param('chave') chave: string, @Query('ambiente', new ParseEnumPipe(Ambiente, { optional: true })) ambiente?: Ambiente) {
    return this.flags.historico(chave, ambiente);
  }

  /** Sem ?usuario, flags com percentual < 100 respondem false. */
  @Get('ambientes/:ambiente/flags')
  @ApiQuery({ name: 'usuario', required: false, description: 'Identificador do usuário final (liberação gradual)' })
  configuracao(@Param('ambiente', ambientePipe) ambiente: Ambiente, @Query('usuario') usuario?: string) {
    return this.flags.configuracao(ambiente, usuario);
  }
}
