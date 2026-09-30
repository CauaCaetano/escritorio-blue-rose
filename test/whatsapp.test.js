// Etapa 5: links do WhatsApp (só preparam o texto; nada é enviado)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizarWhatsapp, linksWhatsapp } from '../server/whatsapp.js';

test('normaliza números brasileiros', () => {
  assert.equal(normalizarWhatsapp('(16) 98765-4321'), '5516987654321');
  assert.equal(normalizarWhatsapp('16 3333-4444'), '551633334444');
  assert.equal(normalizarWhatsapp('+55 16 98765-4321'), '5516987654321');
  assert.equal(normalizarWhatsapp(''), null);
  assert.throws(() => normalizarWhatsapp('123'), /inválido/);
});

test('monta links com o texto codificado, com e sem número', () => {
  const com = linksWhatsapp('5516987654321', 'Oi! Tudo bem? 🌹');
  assert.equal(com.app, 'https://wa.me/5516987654321?text=Oi!%20Tudo%20bem%3F%20%F0%9F%8C%B9');
  assert.match(com.web, /^https:\/\/web\.whatsapp\.com\/send\?phone=5516987654321&text=/);
  const sem = linksWhatsapp(null, 'Olá');
  assert.equal(sem.app, 'https://wa.me/?text=Ol%C3%A1');
});
