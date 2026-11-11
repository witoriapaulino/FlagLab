import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';

/** RN06: criar e alterar flags exige o cabeçalho x-api-key igual à variável API_KEY. */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<{ headers: Record<string, string | string[] | undefined> }>();
    const esperado = Buffer.from(process.env.API_KEY ?? '');
    const recebido = Buffer.from(String(req.headers['x-api-key'] ?? ''));
    const ok = esperado.length > 0 && esperado.length === recebido.length && timingSafeEqual(esperado, recebido);
    if (!ok) throw new UnauthorizedException('x-api-key ausente ou inválida');
    return true;
  }
}
