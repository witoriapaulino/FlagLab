import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Ambiente } from '../generated/prisma/client';
import { PrismaService } from '../prisma.service';
import type { UsuarioLogado } from '../usuarios/usuario.guard';
import { AlterarFlagDto, CriarFlagDto, RollbackDto } from './flags.dto';
import { estadoPorAmbiente, liberadaPara, mudancaRedundante, proximaVersao, ultimaVersao } from './regras';

const AMBIENTES = Object.values(Ambiente);

function chaveDuplicada(e: unknown): boolean {
  return (e as { code?: string })?.code === 'P2002';
}

@Injectable()
export class FlagsService {
  constructor(private readonly prisma: PrismaService) {}

  /** RF01 + RN02: a flag nasce desligada (versão 1) em todos os ambientes. */
  async criar(dto: CriarFlagDto, autor: UsuarioLogado) {
    try {
      return await this.prisma.flag.create({
        data: {
          chave: dto.chave,
          descricao: dto.descricao,
          versoes: {
            create: AMBIENTES.map((ambiente) => ({
              ambiente,
              versao: 1,
              ativa: false,
              autor: autor.nome,
              autorId: autor.id,
              motivo: 'Criação da flag',
            })),
          },
        },
        include: { versoes: true },
      });
    } catch (e) {
      if (chaveDuplicada(e)) throw new ConflictException(`A flag "${dto.chave}" já existe`);
      throw e;
    }
  }

  async listar() {
    const flags = await this.prisma.flag.findMany({ include: { versoes: true }, orderBy: { chave: 'asc' } });
    return flags.map((f) => ({
      chave: f.chave,
      descricao: f.descricao,
      estado: estadoPorAmbiente(f.versoes, AMBIENTES),
      percentual: Object.fromEntries(AMBIENTES.map((a) => [a, ultimaVersao(f.versoes, a)?.percentual ?? 100])),
    }));
  }

  /** RF02/RF06: ligar, desligar ou mudar o percentual gera uma versão nova, com o usuário logado como autor. */
  async alterar(chave: string, ambiente: Ambiente, dto: AlterarFlagDto, autor: UsuarioLogado) {
    const flag = await this.buscar(chave);
    const percentual = dto.percentual ?? 100;
    if (mudancaRedundante(flag.versoes, ambiente, dto.ativa, percentual)) {
      throw new ConflictException(`A flag já está ${dto.ativa ? 'ligada' : 'desligada'} (${percentual}%) em ${ambiente}`);
    }
    try {
      return await this.prisma.flagVersao.create({
        data: {
          flagId: flag.id,
          ambiente,
          versao: proximaVersao(flag.versoes, ambiente),
          ativa: dto.ativa,
          percentual,
          motivo: dto.motivo,
          autor: autor.nome,
          autorId: autor.id,
        },
      });
    } catch (e) {
      // ponytail: duas mudanças simultâneas calculam a mesma versão; o índice único barra a segunda (409).
      // Se virar problema real, usar transação SERIALIZABLE ou lock por flag.
      if (chaveDuplicada(e)) throw new ConflictException('Outra mudança foi gravada ao mesmo tempo; tente de novo');
      throw e;
    }
  }

  /** RF05 + RN05: rollback cria uma versão NOVA com o estado da versão escolhida; o histórico não é apagado. */
  async rollback(chave: string, ambiente: Ambiente, dto: RollbackDto, autor: UsuarioLogado) {
    const flag = await this.buscar(chave);
    const alvo = flag.versoes.find((v) => v.ambiente === ambiente && v.versao === dto.versao);
    if (!alvo) throw new NotFoundException(`Versão ${dto.versao} não existe em ${ambiente}`);
    return this.alterar(
      chave,
      ambiente,
      { ativa: alvo.ativa, percentual: alvo.percentual, motivo: `Rollback para v${dto.versao}: ${dto.motivo}` },
      autor,
    );
  }

  /** RF04: histórico de mudanças (auditoria), da mais nova para a mais antiga. */
  async historico(chave: string, ambiente?: Ambiente) {
    const flag = await this.buscar(chave);
    return this.prisma.flagVersao.findMany({
      where: { flagId: flag.id, ambiente },
      orderBy: [{ ambiente: 'asc' }, { versao: 'desc' }],
    });
  }

  /** RF03/RF06: o que um sistema cliente consulta: { "chave": true/false } do ambiente, opcionalmente para um usuário. */
  async configuracao(ambiente: Ambiente, usuario?: string): Promise<Record<string, boolean>> {
    const flags = await this.prisma.flag.findMany({ include: { versoes: { where: { ambiente } } } });
    return Object.fromEntries(flags.map((f) => [f.chave, liberadaPara(ultimaVersao(f.versoes, ambiente), f.chave, usuario)]));
  }

  private async buscar(chave: string) {
    const flag = await this.prisma.flag.findUnique({ where: { chave }, include: { versoes: true } });
    if (!flag) throw new NotFoundException(`Flag "${chave}" não encontrada`);
    return flag;
  }
}
