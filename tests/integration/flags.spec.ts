/**
 * Integração: API NestJS completa + PostgreSQL real (Supertest).
 * Precisa de DATABASE_URL com as migrações aplicadas.
 * ATENÇÃO: apaga todos os dados do banco no início. Use um banco só de teste.
 */
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { grupo } from '../../src/flags/regras';
import { configurarApp } from '../../src/main';
import { PrismaService } from '../../src/prisma.service';

// chave de administrador aleatória a cada execução: nada fixo no código
process.env.API_KEY = randomUUID();
const ADMIN = { 'x-api-key': process.env.API_KEY };
const mudanca = (extra: object) => ({ motivo: 'Teste de integração do FlagLab', ...extra });

describe('FlagLab API (integração)', () => {
  let app: INestApplication;
  let srv: ReturnType<INestApplication['getHttpServer']>;
  let ANNA: { Authorization: string };
  let BRUNO: { Authorization: string };

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = modulo.createNestApplication();
    configurarApp(app);
    await app.init();
    srv = app.getHttpServer();
    const prisma = app.get(PrismaService);
    await prisma.flagVersao.deleteMany();
    await prisma.flag.deleteMany();
    await prisma.usuario.deleteMany();

    const anna = await request(srv).post('/usuarios').set(ADMIN).send({ nome: 'Anna', email: 'anna@flaglab.dev' }).expect(201);
    const bruno = await request(srv).post('/usuarios').set(ADMIN).send({ nome: 'Bruno', email: 'bruno@flaglab.dev' }).expect(201);
    ANNA = { Authorization: `Bearer ${anna.body.token}` };
    BRUNO = { Authorization: `Bearer ${bruno.body.token}` };
  });

  afterAll(async () => {
    await app.close();
  });

  it('RF07: só o administrador cria usuários; e-mail repetido é 409; o token não fica no banco', async () => {
    await request(srv).post('/usuarios').send({ nome: 'X', email: 'x@flaglab.dev' }).expect(401);
    await request(srv).post('/usuarios').set(ADMIN).send({ nome: 'Anna 2', email: 'anna@flaglab.dev' }).expect(409);
    const u = await app.get(PrismaService).usuario.findUnique({ where: { email: 'anna@flaglab.dev' } });
    expect(u?.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(ANNA.Authorization).not.toContain(u!.tokenHash);
  });

  it('RF07: /usuarios/eu identifica o dono do token', async () => {
    const r = await request(srv).get('/usuarios/eu').set(ANNA).expect(200);
    expect(r.body).toMatchObject({ nome: 'Anna', email: 'anna@flaglab.dev' });
    expect(r.body.tokenHash).toBeUndefined();
  });

  it('RN06: escrita sem token, com token errado ou só com a chave de admin responde 401', async () => {
    const corpo = { chave: 'x-y', descricao: 'qualquer coisa' };
    await request(srv).post('/flags').send(corpo).expect(401);
    await request(srv).post('/flags').set({ Authorization: 'Bearer errado' }).send(corpo).expect(401);
    await request(srv).post('/flags').set(ADMIN).send(corpo).expect(401);
  });

  it('RF01/RN02: cria a flag desligada nos 3 ambientes, com o usuário logado como autor', async () => {
    const r = await request(srv).post('/flags').set(ANNA).send({ chave: 'novo-checkout', descricao: 'Tela nova de checkout' }).expect(201);
    expect(r.body.versoes).toHaveLength(3);
    for (const v of r.body.versoes) expect(v).toMatchObject({ versao: 1, ativa: false, percentual: 100, autor: 'Anna' });
  });

  it('RN01: chave duplicada é 409 e chave fora do padrão é 400', async () => {
    await request(srv).post('/flags').set(ANNA).send({ chave: 'novo-checkout', descricao: 'Duplicada' }).expect(409);
    await request(srv).post('/flags').set(ANNA).send({ chave: 'Novo Checkout', descricao: 'Inválida' }).expect(400);
  });

  it('RN06: o autor vem do login; enviar "autor" no corpo é rejeitado (400)', async () => {
    await request(srv).put('/flags/novo-checkout/ambientes/DEV').set(BRUNO).send(mudanca({ ativa: true, autor: 'Anna' })).expect(400);
  });

  it('RF02/RF03: ligar em PROD não afeta DEV', async () => {
    const r = await request(srv).put('/flags/novo-checkout/ambientes/PROD').set(BRUNO).send(mudanca({ ativa: true })).expect(200);
    expect(r.body).toMatchObject({ versao: 2, autor: 'Bruno', percentual: 100 });
    await request(srv).get('/ambientes/PROD/flags').expect(200, { 'novo-checkout': true });
    await request(srv).get('/ambientes/DEV/flags').expect(200, { 'novo-checkout': false });
  });

  it('RN04: ligar de novo é 409; RN03: motivo curto é 400; ambiente inválido é 400', async () => {
    await request(srv).put('/flags/novo-checkout/ambientes/PROD').set(ANNA).send(mudanca({ ativa: true })).expect(409);
    await request(srv).put('/flags/novo-checkout/ambientes/PROD').set(ANNA).send({ ativa: false, motivo: 'curto' }).expect(400);
    await request(srv).put('/flags/novo-checkout/ambientes/QA').set(ANNA).send(mudanca({ ativa: true })).expect(400);
  });

  it('RF05/RN05: rollback cria versão nova e preserva o histórico', async () => {
    await request(srv).put('/flags/novo-checkout/ambientes/PROD').set(ANNA).send(mudanca({ ativa: false })).expect(200); // v3
    const r = await request(srv).post('/flags/novo-checkout/ambientes/PROD/rollback').set(ANNA).send(mudanca({ versao: 2 })).expect(201);
    expect(r.body).toMatchObject({ versao: 4, ativa: true, autor: 'Anna' });
    expect(r.body.motivo).toMatch(/^Rollback para v2:/);

    const h = await request(srv).get('/flags/novo-checkout/historico?ambiente=PROD').expect(200);
    expect(h.body.map((v: { versao: number }) => v.versao)).toEqual([4, 3, 2, 1]);
    expect(h.body.map((v: { autor: string }) => v.autor)).toEqual(['Anna', 'Anna', 'Bruno', 'Anna']);
  });

  it('rollback para versão inexistente é 404; flag inexistente é 404', async () => {
    await request(srv).post('/flags/novo-checkout/ambientes/PROD/rollback').set(ANNA).send(mudanca({ versao: 99 })).expect(404);
    await request(srv).get('/flags/nao-existe/historico').expect(404);
  });

  it('listagem mostra o estado e o percentual atuais por ambiente', async () => {
    const r = await request(srv).get('/flags').expect(200);
    expect(r.body).toEqual([
      {
        chave: 'novo-checkout',
        descricao: 'Tela nova de checkout',
        estado: { DEV: false, HOMOLOG: false, PROD: true },
        percentual: { DEV: 100, HOMOLOG: 100, PROD: 100 },
      },
    ]);
  });

  it('RF06/RN07: liberação gradual a 30% respeita o grupo de cada usuário', async () => {
    await request(srv).post('/flags').set(ANNA).send({ chave: 'relatorio-beta', descricao: 'Relatório novo em beta' }).expect(201);
    await request(srv).put('/flags/relatorio-beta/ambientes/PROD').set(ANNA).send(mudanca({ ativa: true, percentual: 30 })).expect(200);

    // escolhe um usuário de cada lado do corte usando a mesma função da API
    const ids = Array.from({ length: 200 }, (_, i) => `cliente-${i}`);
    const dentro = ids.find((u) => grupo('relatorio-beta', u) < 30)!;
    const fora = ids.find((u) => grupo('relatorio-beta', u) >= 30)!;

    const a = await request(srv).get(`/ambientes/PROD/flags?usuario=${dentro}`).expect(200);
    const b = await request(srv).get(`/ambientes/PROD/flags?usuario=${fora}`).expect(200);
    const semUsuario = await request(srv).get('/ambientes/PROD/flags').expect(200);
    expect(a.body['relatorio-beta']).toBe(true);
    expect(b.body['relatorio-beta']).toBe(false);
    expect(semUsuario.body['relatorio-beta']).toBe(false);
    // flag a 100% continua ligada para todos
    expect(b.body['novo-checkout']).toBe(true);

    // mudar só o percentual gera versão nova; repetir o mesmo é 409
    await request(srv).put('/flags/relatorio-beta/ambientes/PROD').set(ANNA).send(mudanca({ ativa: true, percentual: 50 })).expect(200);
    await request(srv).put('/flags/relatorio-beta/ambientes/PROD').set(ANNA).send(mudanca({ ativa: true, percentual: 50 })).expect(409);
  });

  it('rollback restaura também o percentual', async () => {
    const r = await request(srv).post('/flags/relatorio-beta/ambientes/PROD/rollback').set(ANNA).send(mudanca({ versao: 2 })).expect(201);
    expect(r.body).toMatchObject({ ativa: true, percentual: 30 });
  });
});
