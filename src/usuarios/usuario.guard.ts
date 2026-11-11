import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';

export interface UsuarioLogado {
  id: number;
  nome: string;
  email: string;
}

export type RequisicaoAutenticada = { headers: Record<string, string | string[] | undefined>; usuario: UsuarioLogado };

/** RN06: alterar flags exige "Authorization: Bearer <token do usuário>". O usuário vira o autor da mudança. */
@Injectable()
export class UsuarioGuard implements CanActivate {
  constructor(private readonly usuarios: UsuariosService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<RequisicaoAutenticada>();
    const [tipo, token] = String(req.headers.authorization ?? '').split(' ');
    const usuario = tipo === 'Bearer' && token ? await this.usuarios.buscarPorToken(token) : null;
    if (!usuario) throw new UnauthorizedException('Token ausente ou inválido');
    req.usuario = usuario;
    return true;
  }
}
