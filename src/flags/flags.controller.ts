import { Body, Controller, Get, Param, ParseEnumPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { Ambiente } from '../generated/prisma/client';
import { ApiKeyGuard } from './api-key.guard';
import { AlterarFlagDto, CriarFlagDto, RollbackDto } from './flags.dto';
import { FlagsService } from './flags.service';

const ambientePipe = new ParseEnumPipe(Ambiente);

@ApiTags('flags')
@Controller()
export class FlagsController {
  constructor(private readonly flags: FlagsService) {}

  @Post('flags')
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('api-key')
  criar(@Body() dto: CriarFlagDto) {
    return this.flags.criar(dto);
  }

  @Get('flags')
  listar() {
    return this.flags.listar();
  }

  @Put('flags/:chave/ambientes/:ambiente')
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('api-key')
  alterar(@Param('chave') chave: string, @Param('ambiente', ambientePipe) ambiente: Ambiente, @Body() dto: AlterarFlagDto) {
    return this.flags.alterar(chave, ambiente, dto);
  }

  @Post('flags/:chave/ambientes/:ambiente/rollback')
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('api-key')
  rollback(@Param('chave') chave: string, @Param('ambiente', ambientePipe) ambiente: Ambiente, @Body() dto: RollbackDto) {
    return this.flags.rollback(chave, ambiente, dto);
  }

  @Get('flags/:chave/historico')
  historico(@Param('chave') chave: string, @Query('ambiente', new ParseEnumPipe(Ambiente, { optional: true })) ambiente?: Ambiente) {
    return this.flags.historico(chave, ambiente);
  }

  @Get('ambientes/:ambiente/flags')
  configuracao(@Param('ambiente', ambientePipe) ambiente: Ambiente) {
    return this.flags.configuracao(ambiente);
  }
}
