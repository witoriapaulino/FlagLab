/**
 * Regras de negócio puras (sem banco). Ficam isoladas para serem testadas
 * sem PostgreSQL (tests/unit/regras.spec.ts).
 */
export interface VersaoFlag {
  ambiente: string;
  versao: number;
  ativa: boolean;
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

/** RN04: mudança que não altera o estado atual é rejeitada (não gera versão vazia). */
export function mudancaRedundante(versoes: VersaoFlag[], ambiente: string, ativa: boolean): boolean {
  return ultimaVersao(versoes, ambiente)?.ativa === ativa;
}

export function estadoPorAmbiente(versoes: VersaoFlag[], ambientes: readonly string[]): Record<string, boolean> {
  return Object.fromEntries(ambientes.map((a) => [a, ultimaVersao(versoes, a)?.ativa ?? false]));
}
