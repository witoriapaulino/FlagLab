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
import { configurarApp } from '../../src/main';
import { PrismaService } from '../../src/prisma.service';

// chave aleatória a cada execução: nada fixo no código
process.env.API_KEY = randomUUID();
const KEY = { 'x-api-key': process.env.API_KEY };
const mudanca = (extra: object) => ({ autor: 'Anna', motivo: 'Teste de integração do FlagLab', ...extra });

describe('FlagLab API (integração)', () => {
  let app: INestApplication;
  let srv: ReturnType<INestApplication['getHttpServer']>;

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = modulo.createNestApplication();
    configurarApp(app);
    await app.init();
    srv = app.getHttpServer();
    const prisma = app.get(PrismaService);
    await prisma.flagVersao.deleteMany();
    await prisma.flag.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  it('RN06: escrita sem x-api-key (ou com a errada) responde 401', async () => {
    await request(srv).post('/flags').send({ chave: 'x', descricao: 'qualquer', autor: 'Anna' }).expect(401);
    await request(srv).post('/flags').set({ 'x-api-key': 'errada' }).send({}).expect(401);
  });

  it('RF01/RN02: cria a flag desligada nos 3 ambientes', async () => {
    const r = await request(srv)
      .post('/flags')
      .set(KEY)
      .send({ chave: 'novo-checkout', descricao: 'Tela nova de checkout', autor: 'Anna' })
      .expect(201);
    expect(r.body.versoes).toHaveLength(3);
    expect(r.body.versoes.every((v: { ativa: boolean; versao: number }) => !v.ativa && v.versao === 1)).toBe(true);
  });

  it('RN01: chave duplicada é 409 e chave fora do padrão é 400', async () => {
    await request(srv).post('/flags').set(KEY).send({ chave: 'novo-checkout', descricao: 'Duplicada', autor: 'Anna' }).expect(409);
    await request(srv).post('/flags').set(KEY).send({ chave: 'Novo Checkout', descricao: 'Inválida', autor: 'Anna' }).expect(400);
  });

  it('RF02/RF03: ligar em PROD não afeta DEV', async () => {
    const r = await request(srv).put('/flags/novo-checkout/ambientes/PROD').set(KEY).send(mudanca({ ativa: true })).expect(200);
    expect(r.body.versao).toBe(2);
    await request(srv).get('/ambientes/PROD/flags').expect(200, { 'novo-checkout': true });
    await request(srv).get('/ambientes/DEV/flags').expect(200, { 'novo-checkout': false });
  });

  it('RN04: ligar de novo é 409; RN03: motivo curto é 400; ambiente inválido é 400', async () => {
    await request(srv).put('/flags/novo-checkout/ambientes/PROD').set(KEY).send(mudanca({ ativa: true })).expect(409);
    await request(srv).put('/flags/novo-checkout/ambientes/PROD').set(KEY).send({ ativa: false, autor: 'Anna', motivo: 'curto' }).expect(400);
    await request(srv).put('/flags/novo-checkout/ambientes/QA').set(KEY).send(mudanca({ ativa: true })).expect(400);
  });

  it('RF05/RN05: rollback cria versão nova e preserva o histórico', async () => {
    await request(srv).put('/flags/novo-checkout/ambientes/PROD').set(KEY).send(mudanca({ ativa: false })).expect(200); // v3
    const r = await request(srv).post('/flags/novo-checkout/ambientes/PROD/rollback').set(KEY).send(mudanca({ versao: 2 })).expect(201);
    expect(r.body).toMatchObject({ versao: 4, ativa: true });
    expect(r.body.motivo).toMatch(/^Rollback para v2:/);

    const h = await request(srv).get('/flags/novo-checkout/historico?ambiente=PROD').expect(200);
    expect(h.body.map((v: { versao: number }) => v.versao)).toEqual([4, 3, 2, 1]);
  });

  it('rollback para versão inexistente é 404; flag inexistente é 404', async () => {
    await request(srv).post('/flags/novo-checkout/ambientes/PROD/rollback').set(KEY).send(mudanca({ versao: 99 })).expect(404);
    await request(srv).get('/flags/nao-existe/historico').expect(404);
  });

  it('listagem mostra o estado atual por ambiente', async () => {
    const r = await request(srv).get('/flags').expect(200);
    expect(r.body).toEqual([
      { chave: 'novo-checkout', descricao: 'Tela nova de checkout', estado: { DEV: false, HOMOLOG: false, PROD: true } },
    ]);
  });
});
