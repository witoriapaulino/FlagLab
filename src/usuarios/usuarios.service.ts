import { ConflictException, Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma.service';
import { CriarUsuarioDto } from './usuarios.dto';

export const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex');

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

  /** RF07: cria o usuário e devolve o token UMA vez. No banco fica só o hash. */
  async criar(dto: CriarUsuarioDto) {
    const token = randomBytes(24).toString('base64url');
    try {
      const u = await this.prisma.usuario.create({ data: { nome: dto.nome, email: dto.email, tokenHash: hashToken(token) } });
      return { id: u.id, nome: u.nome, email: u.email, token };
    } catch (e) {
      if ((e as { code?: string })?.code === 'P2002') throw new ConflictException(`E-mail ${dto.email} já cadastrado`);
      throw e;
    }
  }

  buscarPorToken(token: string) {
    return this.prisma.usuario.findUnique({ where: { tokenHash: hashToken(token) }, select: { id: true, nome: true, email: true } });
  }
}
