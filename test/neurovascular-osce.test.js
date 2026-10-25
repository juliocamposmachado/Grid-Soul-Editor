import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  NEUROVASCULAR_OSCE_SOURCES,
  NEUROVASCULAR_OSCE_STATIONS,
  calculateOsceScore,
  normalizeRubricOverrides
} from '../public/neurovascular-osce.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('módulo possui três estações focadas em fisiologia e vinhetas explicitamente fictícias', () => {
  assert.deepEqual(NEUROVASCULAR_OSCE_STATIONS.map(station => station.id), [
    'coupling', 'autoregulation', 'communication'
  ]);
  for (const station of NEUROVASCULAR_OSCE_STATIONS) {
    assert.ok(station.objective.length > 20);
    assert.ok(station.task.length > 20);
    assert.ok(station.modelAnswer.length > 40);
    assert.equal(station.rubric.length, 4);
    assert.ok(station.scenario.toLocaleLowerCase('pt-BR').includes('fict'));
    assert.ok(station.sourceIds.length > 0);
    assert.ok(station.sourceIds.every(id => NEUROVASCULAR_OSCE_SOURCES.some(source => source.id === id)));
  }
});

test('autoavaliação exige todos os critérios entre 0 e 2 e calcula escore formativo', () => {
  const rubric = NEUROVASCULAR_OSCE_STATIONS[0].rubric;
  assert.deepEqual(calculateOsceScore(rubric, {
    relation: 2, unit: 1, nuance: 2, communication: 1
  }), { earned: 6, maximum: 8, percent: 75 });
  assert.equal(calculateOsceScore(rubric, { relation: 2 }), null);
  assert.equal(calculateOsceScore(rubric, {
    relation: 2, unit: 1, nuance: 3, communication: 1
  }), null);
  assert.equal(calculateOsceScore(rubric, {
    relation: 2, unit: 1, nuance: -1, communication: 1
  }), null);
});

test('edição docente mantém somente rubrica reconhecida e limita texto/IDs', () => {
  const station = NEUROVASCULAR_OSCE_STATIONS[0];
  const forged = {
    coupling: [
      { id: 'relation', label: 'x'.repeat(300), detail: 'y'.repeat(400) },
      ...station.rubric.slice(1).map(row => ({ ...row })),
      { id: 'unexpected', label: 'script', detail: 'no' }
    ],
    unknownStation: [{ id: 'x', label: 'ignored', detail: 'ignored' }]
  };
  const normalized = normalizeRubricOverrides(forged, [station]);
  assert.equal(normalized.coupling.length, 4);
  assert.equal(normalized.coupling[0].label.length, 140);
  assert.equal(normalized.coupling[0].detail.length, 240);
  assert.deepEqual(normalizeRubricOverrides('{broken', [station]), {});
  assert.deepEqual(normalizeRubricOverrides({ coupling: [{ id: 'wrong' }] }, [station]), {});
});

test('painel não envia respostas a endpoints nem registra texto livre do estudante em armazenamento', async () => {
  const ui = await readFile(path.join(ROOT, 'public/neurovascular-osce-ui.js'), 'utf8');
  const page = await readFile(path.join(ROOT, 'public/index.html'), 'utf8');
  assert.doesNotMatch(ui, /\bfetch\s*\(/);
  assert.doesNotMatch(ui, /XMLHttpRequest|sendBeacon/);
  assert.match(ui, /localStorage\.setItem\(STORAGE_KEY, JSON\.stringify\(next\)\)/);
  assert.match(ui, /attempt\.answer = answer/);
  assert.match(page, /id="oscePanel" role="dialog" aria-modal="true"/);
  assert.match(page, /não são enviadas ao ChatGPT nem gravadas/);
  assert.match(page, /src="\/neurovascular-osce-ui\.js"/);
  assert.match(ui, /setBackgroundInert\(true\)/);
  assert.match(ui, /event\.key !== 'Tab'/);
  assert.match(ui, /target\.focus\(\)/);
  assert.match(ui, /trocar de estação não apaga/);
});
