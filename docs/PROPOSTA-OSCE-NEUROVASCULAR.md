# Proposta inicial — Treino OSCE de Fisiologia Neurovascular

## Objetivo

Criar um módulo formativo para estudantes de medicina que combina explicação oral, interpretação de dados e comunicação clínica simulada. O estudante pratica competências em cenários fictícios e recebe feedback ligado a uma rubrica visível. O módulo não diagnostica pessoas, não recomenda conduta para pacientes reais e não substitui supervisão docente.

OSCEs são organizados em cenários padronizados para observar competências delimitadas e dar feedback; as estações podem combinar interação simulada, interpretação de exames ou casos computadorizados [1]. A concepção das estações deve partir de objetivos, medidas de desempenho, revisão por especialistas e revisão-piloto [2].

## Primeira versão sugerida

### Estação 1 — Acoplamento neurovascular

**Tarefa do estudante:** explicar, em linguagem clara, por que uma região cerebral mais ativa pode receber aumento local de fluxo sanguíneo.

**O estudante demonstra que consegue:** relacionar atividade neural à resposta vascular local; descrever a unidade neurovascular com neurônios, astrócitos e componentes vasculares; reconhecer que essa representação é um modelo didático simplificado, pois existem vias paralelas e interações mais complexas. O acoplamento neurovascular descreve a ligação temporal e regional entre atividade neural e fluxo cerebral [3].

### Estação 2 — Autorregulação e perfusão

**Tarefa do estudante:** interpretar um gráfico didático que relaciona pressão de perfusão e fluxo sanguíneo cerebral, explicando qualitativamente como mecanismos autorregulatórios ajudam a manter o fluxo relativamente estável em uma faixa de condições.

**O estudante demonstra que consegue:** identificar o conceito de autorregulação; explicar que pressão arterial, pressão intracraniana, pressão venosa, gases sanguíneos, metabolismo e postura interagem; evitar tratar faixas ilustrativas do gráfico como valores ou limites universais para decisão clínica. A revisão de fisiologia em humanos destaca que o fluxo resulta de mecanismos sobrepostos e que métodos e relações de autorregulação têm limitações e variação contextual [4].

### Estação 3 — Comunicação com paciente simulado

**Tarefa do estudante:** responder a uma pergunta de uma personagem padronizada fictícia sobre a demonstração de fluxo cerebral, explicar o conceito sem jargão, estabelecer limites do que a demonstração informa sobre saúde individual e verificar a compreensão.

O caso não pede diagnóstico, prescrição, exame físico ou aconselhamento real; a personagem não tem sintomas nem dados clínicos. A proposta futura de exame neurológico com achados padronizados exige roteiro, objetivos e revisão docente próprios e não faz parte desta primeira implementação.

## Feedback e rubrica

Cada estação pode pontuar critérios de 0 a 2: **não demonstrado**, **parcial**, **demonstrado**. A rubrica fica visível antes do treino, com espaço para observação docente. Os critérios devem avaliar precisão conceitual, comunicação, organização do raciocínio e reconhecimento de limites — não a capacidade de adivinhar uma resposta da IA. Uma nota baixa deve sugerir o objetivo a rever e oferecer nova tentativa formativa, não produzir uma classificação de competência clínica.

## Interação no GRID SOUL

O estudante escolhe a estação; recebe instruções, rubrica e tempo configurável; escreve resposta; compara com pontos-chave e se autoavalia por critério. A rubrica editável pelo modo docente local persiste neste navegador sem autenticação. A curva de autorregulação é SVG qualitativo, sem escala numérica. Não há julgamento semântico automático nem envio da resposta à IA. A integração futura do enxame 3D para visualizar atividade neural localizada e fluxo é uma extensão ainda não implementada; qualquer visual deve ser identificado como ilustração, não anatomia ou dado de paciente.

## Implementação inicial no GRID SOUL

A versão inicial oferece três estações formativas sobre acoplamento, autorregulação e comunicação fictícia; objetivos e rubricas são visíveis antes da tentativa. O estudante pode configurar cronômetro para 3, 5 ou 8 minutos, comparar sua resposta com um modelo após finalizar e fazer autoavaliação de 0 a 2 em cada critério. O modo docente salva apenas cópias editadas da rubrica no `localStorage` local e não autentica papéis. Respostas livres e progresso não são persistidos nem enviados à IA. Os modelos são material para revisão, não nota ou avaliação clínica.

Antes de uso oficial, docentes de fisiologia/neurociências e educação médica devem revisar critérios, referências e respostas-modelo, fazer piloto com estudantes e adequar objetivos de curso. Não inserir dados clínicos reais.

## Referências

[1]: https://education.uwmedicine.org/curriculum/assessment/osce/ "University of Washington School of Medicine OSCE overview"
[2]: https://www.ncbi.nlm.nih.gov/books/NBK546672/ "Standardized Patient Assessment of Learners in Medical Education"
[3]: https://pmc.ncbi.nlm.nih.gov/articles/PMC4821024/ "Neurovascular coupling in humans: physiology, methodological advances and clinical implications"
[4]: https://pmc.ncbi.nlm.nih.gov/articles/PMC8576366/ "Regulation of cerebral blood flow in humans"
