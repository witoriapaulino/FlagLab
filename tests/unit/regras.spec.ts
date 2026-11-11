import { estadoPorAmbiente, grupo, liberadaPara, mudancaRedundante, proximaVersao, ultimaVersao } from '../../src/flags/regras';

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

  it('RN04: mudar só o percentual NÃO é redundante', () => {
    const v = [{ ambiente: 'PROD', versao: 1, ativa: true, percentual: 100 }];
    expect(mudancaRedundante(v, 'PROD', true, 100)).toBe(true);
    expect(mudancaRedundante(v, 'PROD', true, 30)).toBe(false);
  });

  it('estado por ambiente: ausente conta como desligada', () => {
    expect(estadoPorAmbiente(historico, ['DEV', 'HOMOLOG', 'PROD'])).toEqual({ DEV: true, HOMOLOG: false, PROD: false });
  });
});

describe('liberação gradual (RF06/RN07)', () => {
  it('grupo é estável e fica entre 0 e 99', () => {
    for (const u of ['ana', 'joao', '42', 'x@y.com']) {
      const g = grupo('novo-checkout', u);
      expect(g).toBe(grupo('novo-checkout', u));
      expect(g).toBeGreaterThanOrEqual(0);
      expect(g).toBeLessThan(100);
    }
  });

  it('a mesma pessoa pode cair em grupos diferentes em flags diferentes', () => {
    const usuarios = Array.from({ length: 50 }, (_, i) => `u${i}`);
    const iguais = usuarios.filter((u) => grupo('flag-a', u) === grupo('flag-b', u)).length;
    expect(iguais).toBeLessThan(10);
  });

  it('30% libera para perto de 30% dos usuários', () => {
    const total = 10_000;
    let liberados = 0;
    for (let i = 0; i < total; i++) {
      if (liberadaPara({ ambiente: 'PROD', versao: 1, ativa: true, percentual: 30 }, 'novo-checkout', `user-${i}`)) liberados++;
    }
    expect(liberados / total).toBeGreaterThan(0.27);
    expect(liberados / total).toBeLessThan(0.33);
  });

  it('desligada nunca libera; 100% sempre libera; 0% nunca libera', () => {
    expect(liberadaPara({ ambiente: 'PROD', versao: 1, ativa: false, percentual: 100 }, 'f', 'u')).toBe(false);
    expect(liberadaPara({ ambiente: 'PROD', versao: 1, ativa: true, percentual: 100 }, 'f')).toBe(true);
    expect(liberadaPara({ ambiente: 'PROD', versao: 1, ativa: true, percentual: 0 }, 'f', 'u')).toBe(false);
  });

  it('percentual < 100 sem usuário informado responde desligada', () => {
    expect(liberadaPara({ ambiente: 'PROD', versao: 1, ativa: true, percentual: 50 }, 'f')).toBe(false);
  });

  it('sem versão (flag inexistente no ambiente) responde desligada', () => {
    expect(liberadaPara(undefined, 'f', 'u')).toBe(false);
  });
});
