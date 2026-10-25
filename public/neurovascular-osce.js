export const NEUROVASCULAR_OSCE_SOURCES = Object.freeze([
  {
    id: 'uw-osce',
    title: 'University of Washington — OSCE',
    url: 'https://education.uwmedicine.org/curriculum/assessment/osce/',
    note: 'Descrição institucional de estações padronizadas e feedback formativo.'
  },
  {
    id: 'standardized-patients',
    title: 'NCBI Bookshelf — Standardized Patient Assessment of Learners',
    url: 'https://www.ncbi.nlm.nih.gov/books/NBK546672/',
    note: 'Desenho de casos simulados, objetivos, avaliação, piloto e segurança.'
  },
  {
    id: 'neurovascular-coupling',
    title: 'Phillips et al. — Neurovascular coupling in humans',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4821024/',
    note: 'Revisão fisiológica, mecanismos e complexidade do acoplamento neurovascular.'
  },
  {
    id: 'cbf-regulation',
    title: 'Claassen et al. — Regulation of cerebral blood flow in humans',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8576366/',
    note: 'Revisão sobre mecanismos integrados, autorregulação e limitações de interpretação.'
  }
]);

export const NEUROVASCULAR_OSCE_STATIONS = Object.freeze([
  {
    id: 'coupling',
    number: '01',
    title: 'Acoplamento neurovascular',
    durationLabel: 'Explicação fisiológica',
    objective: 'Explicar por que uma região cerebral mais ativa pode receber aumento local de fluxo sanguíneo.',
    scenario: 'Em uma demonstração fictícia de neurofisiologia, a atividade de uma pequena região cortical aumenta durante uma tarefa sensorial. O registro didático mostra aumento local de fluxo. Nenhum paciente real ou diagnóstico está envolvido.',
    task: 'Explique, em até 3 minutos, como atividade neural pode se relacionar a mudanças locais nos vasos e no fluxo. Use linguagem clara e identifique a unidade neurovascular como um modelo com mecanismos cooperativos, não como uma única cadeia obrigatória.',
    modelAnswer: 'O acoplamento neurovascular descreve a relação temporal e regional entre atividade neural e fluxo sanguíneo cerebral. Sinais associados à atividade local interagem com neurônios, astrócitos e componentes vasculares, incluindo músculo liso, modificando o calibre vascular e o fluxo. Esse esquema é didático: existem vias paralelas, redundância e respostas dependentes do contexto; não se deve afirmar que um único tipo celular explica toda a resposta.',
    rubric: [
      { id: 'relation', label: 'Relaciona atividade neural a resposta vascular local', detail: 'Explica que a mudança é regional e ligada à atividade neural.' },
      { id: 'unit', label: 'Identifica componentes da unidade neurovascular', detail: 'Menciona neurônios, astrócitos e vasos/componentes vasculares.' },
      { id: 'nuance', label: 'Reconhece que o mecanismo é integrado e não exclusivo', detail: 'Evita apresentar uma via celular única como explicação completa.' },
      { id: 'communication', label: 'Explica com clareza, sem transformar o esquema em diagnóstico', detail: 'Organiza a resposta em linguagem compreensível e mantém o contexto fictício.' }
    ],
    sourceIds: ['neurovascular-coupling']
  },
  {
    id: 'autoregulation',
    number: '02',
    title: 'Autorregulação e perfusão',
    durationLabel: 'Interpretação qualitativa',
    objective: 'Interpretar qualitativamente a autorregulação cerebral sem tratar uma figura didática como faixa ou alvo clínico universal.',
    scenario: 'Em uma simulação fictícia de laboratório, uma pequena mudança transitória na pressão de perfusão é acompanhada por fluxo cerebral global que permanece próximo ao basal. A tela não apresenta limites numéricos nem dados de uma pessoa.',
    task: 'Descreva o que esse padrão pode ilustrar sobre autorregulação. Cite dois fatores que também podem modular o fluxo cerebral e explique por que o gráfico, sozinho, não permite definir um limiar clínico individual.',
    modelAnswer: 'O padrão pode ilustrar que mecanismos autorregulatórios contribuem para manter o fluxo cerebral relativamente estável ao longo de parte das variações de pressão de perfusão. A relação é dinâmica e depende de fatores como pressão arterial, pressão intracraniana e venosa, postura, gases sanguíneos, metabolismo e condições fisiológicas. Uma curva esquemática não define faixa segura ou alvo para uma pessoa: mecanismos se sobrepõem e há limitações de medição e contexto.',
    rubric: [
      { id: 'concept', label: 'Define autorregulação em termos qualitativos', detail: 'Reconhece a contribuição para estabilidade relativa do fluxo frente a variações de perfusão.' },
      { id: 'factors', label: 'Cita moduladores adicionais do fluxo cerebral', detail: 'Por exemplo: gases sanguíneos, metabolismo, postura ou pressões venosa/intracraniana.' },
      { id: 'limits', label: 'Não infere limiar ou alvo clínico individual do gráfico', detail: 'Diferencia uma figura didática de avaliação clínica ou dado individual.' },
      { id: 'reasoning', label: 'Apresenta uma interpretação coerente e delimitada', detail: 'Relaciona o padrão observado à hipótese sem extrapolar causalidade ou conduta.' }
    ],
    sourceIds: ['cbf-regulation']
  },
  {
    id: 'communication',
    number: '03',
    title: 'Comunicação com paciente simulado',
    durationLabel: 'Explicação e checagem de compreensão',
    objective: 'Explicar a fisiologia em linguagem acessível, responder a uma dúvida simulada e verificar compreensão.',
    scenario: 'Paciente padronizada fictícia: “Estou participando de uma aula demonstrativa. Disseram que uma parte do cérebro recebe mais sangue quando está ativa. Isso quer dizer que algo está errado comigo?” A personagem não tem sintomas ou dados clínicos; é um exercício de comunicação, não uma consulta.',
    task: 'Escreva uma resposta breve e acolhedora. Explique o conceito sem jargão, deixe claro que a demonstração não permite avaliar saúde individual e faça uma pergunta de retorno para conferir o que a pessoa entendeu.',
    modelAnswer: '“Em uma demonstração, essa mudança pode representar uma resposta normal do fluxo à atividade de uma região do cérebro. O desenho mostra um conceito geral, não mede sua saúde nem permite concluir se há algo errado com você. Quer me contar, com suas palavras, o que entendeu sobre essa relação?”',
    rubric: [
      { id: 'empathy', label: 'Responde com respeito e acolhimento', detail: 'Reconhece a dúvida da pessoa sem minimizar ou alarmar.' },
      { id: 'plain-language', label: 'Explica o conceito sem depender de jargão', detail: 'Usa uma explicação simples para atividade regional e fluxo.' },
      { id: 'boundary', label: 'Distingue demonstração didática de avaliação de saúde', detail: 'Não diagnostica, tranquiliza ou alarma com base em dados inexistentes.' },
      { id: 'teach-back', label: 'Verifica compreensão com pergunta aberta', detail: 'Convida a pessoa simulada a explicar o que entendeu.' }
    ],
    sourceIds: ['uw-osce', 'standardized-patients', 'neurovascular-coupling']
  }
]);

export function calculateOsceScore(rubric, ratings) {
  if (!Array.isArray(rubric) || !rubric.length || !ratings || typeof ratings !== 'object') return null;
  let earned = 0;
  for (const criterion of rubric) {
    const value = ratings[criterion.id];
    if (!Number.isInteger(value) || value < 0 || value > 2) return null;
    earned += value;
  }
  const maximum = rubric.length * 2;
  return { earned, maximum, percent: Math.round((earned / maximum) * 100) };
}

export function normalizeRubricOverrides(input, stations = NEUROVASCULAR_OSCE_STATIONS) {
  let parsed = input;
  if (typeof input === 'string') {
    try { parsed = JSON.parse(input); } catch { return {}; }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
  const safe = {};
  for (const station of stations) {
    const edited = parsed[station.id];
    if (!Array.isArray(edited)) continue;
    const baseIds = new Set(station.rubric.map(item => item.id));
    const validRows = edited.filter(row => row && baseIds.has(row.id));
    const byId = new Map(validRows.map(row => [row.id, row]));
    if (validRows.length !== station.rubric.length || byId.size !== station.rubric.length) continue;
    safe[station.id] = station.rubric.map(item => {
      const row = byId.get(item.id);
      const label = typeof row.label === 'string' ? row.label.trim().slice(0, 140) : '';
      const detail = typeof row.detail === 'string' ? row.detail.trim().slice(0, 240) : '';
      return {
        id: item.id,
        label: label || item.label,
        detail: detail || item.detail
      };
    });
  }
  return safe;
}
