import { estadoPorAmbiente, mudancaRedundante, proximaVersao, ultimaVersao } from '../../src/flags/regras';

const historico = [
  { ambiente: 'PROD', versao: 1, ativa: false },
  { ambiente: 'PROD', versao: 3, ativa: false },
  { ambiente: 'PROD', versao: 2, ativa: true },
  { ambiente: 'DEV', versao: 1, ativa: false },
  { ambiente: 'DEV', versao: 2, ativa: true },
];

describe('regras de versionamento das flags', () => {
  it('estado atual é a MAIOR versão do ambiente, não a última da lista', () => {
    expect(ultimaVersao(historico, 'PROD')?.versao).toBe(3);
    expect(ultimaVersao(historico, 'PROD')?.ativa).toBe(false);
  });

  it('ambiente sem versões não tem estado', () => {
    expect(ultimaVersao(historico, 'HOMOLOG')).toBeUndefined();
  });

  it('próxima versão é a maior + 1, por ambiente', () => {
    expect(proximaVersao(historico, 'PROD')).toBe(4);
    expect(proximaVersao(historico, 'DEV')).toBe(3);
    expect(proximaVersao(historico, 'HOMOLOG')).toBe(1);
  });

  it('RN04: mudança para o mesmo estado é redundante', () => {
    expect(mudancaRedundante(historico, 'PROD', false)).toBe(true);
    expect(mudancaRedundante(historico, 'PROD', true)).toBe(false);
  });

  it('estado por ambiente: ausente conta como desligada', () => {
    expect(estadoPorAmbiente(historico, ['DEV', 'HOMOLOG', 'PROD'])).toEqual({ DEV: true, HOMOLOG: false, PROD: false });
  });
});
