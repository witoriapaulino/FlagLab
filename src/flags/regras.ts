/**
 * Regras de negócio puras (sem banco). Ficam isoladas para serem testadas
 * sem PostgreSQL (tests/unit/regras.spec.ts).
 */
import { createHash } from 'node:crypto';

export interface VersaoFlag {
  ambiente: string;
  versao: number;
  ativa: boolean;
  /** % de usuários que recebem a flag ligada (0–100). Ausente = 100. */
  percentual?: number;
}

/** Estado atual = maior versão daquele ambiente. */
export function ultimaVersao<T extends VersaoFlag>(versoes: T[], ambiente: string): T | undefined {
  let ultima: T | undefined;
  for (const v of versoes) {
    if (v.ambiente === ambiente && (!ultima || v.versao > ultima.versao)) ultima = v;
  }
  return ultima;
}

export function proximaVersao(versoes: VersaoFlag[], ambiente: string): number {
  return (ultimaVersao(versoes, ambiente)?.versao ?? 0) + 1;
}

/** RN04: mudança que não altera o estado atual (ligada/desligada e percentual) é rejeitada. */
export function mudancaRedundante(versoes: VersaoFlag[], ambiente: string, ativa: boolean, percentual = 100): boolean {
  const atual = ultimaVersao(versoes, ambiente);
  return atual !== undefined && atual.ativa === ativa && (atual.percentual ?? 100) === percentual;
}

export function estadoPorAmbiente(versoes: VersaoFlag[], ambientes: readonly string[]): Record<string, boolean> {
  return Object.fromEntries(ambientes.map((a) => [a, ultimaVersao(versoes, a)?.ativa ?? false]));
}

/**
 * RN07: grupo estável de 0 a 99 para o par (flag, usuário). O mesmo usuário cai sempre
 * no mesmo grupo, então não "pisca" entre ligado e desligado a cada consulta.
 */
export function grupo(chave: string, usuario: string): number {
  return createHash('sha256').update(`${chave}:${usuario}`).digest().readUInt32BE(0) % 100;
}

/** RF06: a flag está liberada para este usuário? Sem usuário, só vale se estiver em 100%. */
export function liberadaPara(versao: VersaoFlag | undefined, chave: string, usuario?: string): boolean {
  if (!versao?.ativa) return false;
  const percentual = versao.percentual ?? 100;
  if (percentual >= 100) return true;
  if (!usuario) return false;
  return grupo(chave, usuario) < percentual;
}
