# GRID SOUL — critérios de produto

## Agente de automação local preexistente

- [x] Executar somente ações iniciadas/autorizadas localmente; consentimento separado para terminal, arquivos, programas e navegador; escopos de pastas e origens Web individuais; confirmação de cada navegação/leitura/preenchimento/clique/mutação; revogação e parada.
- [x] Painel integrado, CLI permitida sem shell livre, terminal nativo explícito, abertura de apps permitidos, operações confinadas de arquivo e Playwright isolado.
- [x] Progresso e erros por SSE, auditoria minimizada, proteção de credenciais, catálogo/validação de comandos, limites de rede, tarefas canceláveis e bloqueio de endereços locais.
- [x] Ponte de IA e interface Three.js existentes preservadas; revisão de segurança, documentação e backup feitos; 30 testes anteriores passaram. Não houve publicação.
- [x] A ponte informa ao health o ID/runtime da extensão instalada e sua versão, sem ID/chave fixos no manifest; esse identificador serve só para diagnóstico, não como autenticação. Ao receber uma consulta autorizada sem aba ChatGPT existente, abre o site; se o content script estiver ausente, tenta injeção idempotente restrita aos hosts declarados. O usuário precisa autenticar-se e reenviar a consulta se necessário.

## Atomic Forge — entrega implementada nesta fatia

- [x] Painel responsivo sobreposto preserva o palco principal da aplicação; Three.js 0.180 e addons são servidos localmente.
- [x] Garfo paramétrico editável, validado, extrudado como sólido triangular fechado; prévia orbitável, corte de espessura e animação visual progressiva.
- [x] Bounding box, área, volume e triângulos calculados da malha. Massa apenas como estimativa teórica a 100% sólido com densidade publicada; sem densidade, sem massa estimada.
- [x] Catálogo de seis grades Polymaker com fontes oficiais, método/orientação quando declarado, dados ausentes e divergências preservadas.
- [x] STL binário com verificação de malha, JSON e relatório técnico baixáveis após ação/confirmação. Nenhum slicer ou impressora é iniciado.
- [x] Análise local determinística; proposta ChatGPT opcional, consentimento por envio, finalidade restrita e revalidação dimensional antes de apresentar a sugestão.
- [x] Testes de geometria/exportação, API, catálogos, fluxo de consentimento, heartbeat da extensão e ativos Three.js; 40/40 testes passaram em 2026-10-21.

## Módulo educacional — Treino OSCE de fisiologia neurovascular

- [x] Adicionar ao GRID SOUL um painel responsivo de treino separado do comando ao enxame; preservar a cena Three.js, Atomic Forge e agente local.
- [x] Oferecer três estações formativas: acoplamento neurovascular; interpretação qualitativa de autorregulação/perfusão; comunicação e explicação com paciente simulado fictício.
- [x] Mostrar instruções, objetivos e rubrica antes de começar cada estação; permitir autoavaliação com nível 0–2 por critério e apresentar feedback/modelo somente depois de finalizar a tentativa.
- [x] Disponibilizar relógio configurável e progresso de sessão sem guardar texto livre do estudante em arquivo ou servidor.
- [x] Incluir modo docente local para revisar/editar cópias das rubricas e restaurar conteúdo original; não enviar respostas de estudantes à IA nem a serviço externo.
- [x] Identificar o gráfico SVG da autorregulação como qualitativo/esquemático, sem escala numérica; fornecer fontes e ressalvas junto ao conteúdo; usar somente vinhetas fictícias, sem pedir ou aceitar dados identificáveis de pacientes, nem fornecer diagnóstico ou tratamento de casos reais.
- [x] Testar conteúdo, pontuação e salvaguardas com suíte Node (45/45 testes); documentar que rubricas e material didático precisam de validação por docentes antes de uso oficial.

## Nitidez, parâmetros autoajustáveis, exemplos e FAQ — implementação desta fatia

- [x] Ao aplicar uma solicitação suportada ou exemplo, calibrar densidade/resolução de malha, energia, escala e enquadramento; órbita/zoom do usuário permanecem disponíveis.
- [x] Limitar a geometria a um orçamento seguro de triângulos, manter `population` apenas como campo de compatibilidade (nunca número de cubos) e respeitar densidade/energia/escala explicitamente solicitadas dentro dos limites; indicar sugestões Auto.
- [x] Iniciar com modo automático ativo; permitir densidade, velocidade e escala em Manual; ao alterar um controle, indicar essa passagem e permitir reativar/recalibrar Auto.
- [x] Oferecer botões funcionais de exemplos de formas suportadas, gerados no cliente sem chamada ao ChatGPT, com explicação visível de que são prévias locais.
- [x] Exibir FAQ concisa sobre como formular pedidos, usar auto/manual, executar exemplos, abrir Atomic Forge/OSCE e autorizar o agente local sem prometer capacidades não implementadas.
- [x] Preservar catálogo químico independente, memória, cena Three.js e painéis existentes; substituir o renderer principal por malha conectada sem publicar.

Validação final desta fatia: `npm ci` limpo; `npm audit --audit-level=high` — 0 vulnerabilidades; `npm run check` — 60/60 testes; smoke Chromium/WebGL via SwiftShader em 1369×610 e 390×844, métricas/topologia/controles/persistência verificados, sem erros de página/HTTP/console. Chrome autenticado e GPU física não foram testados; nenhuma alteração foi publicada. Ver [RELATORIO-TESTES.md](RELATORIO-TESTES.md).

## Atomic Forge — requisitos de plataforma ainda pendentes

### 1. Interface futurista e controles funcionais

- [ ] Criar interface científica responsiva com painéis holográficos, visualização 3D ao vivo, animações, indicadores e controles intuitivos, preservando identidade visual, malha principal e funcionalidades existentes.
- [ ] Tornar funcionais: novo projeto por linguagem natural; Engenheiro IA; laboratório atômico; modelagem (girar, ampliar, cortar e inspecionar); estrutura interna; simulação apenas quando método/modelo apropriados estiverem implementados; animação progressiva; materiais/fontes; configurações de fabricação; exportação STL/3MF e STEP somente quando suportados; integração real com fatiador; terminal/automação com permissões; relatório técnico.
- [ ] Não deixar botões decorativos nem declarar cálculos, exportações, análise, slicing ou simulação que não tenham sido executados.

### 2. Engenheiro de IA e definição de requisitos

- [ ] Interpretar pedidos como “garfo futurista para impressão 3D”; fazer perguntas somente sobre dados ausentes relevantes, permitir aceitar sugestões ou inserir medidas.
- [ ] Transformar pedido em requisitos verificáveis; propor parâmetros explícitos; definir critérios de fabricação; comparar candidatos usando dados publicados; estimar massa/volume/consumo com hipóteses; indicar limitações/riscos; gerar e validar geometria; apresentar prévia/animação; solicitar aprovação antes de exportar ou qualquer ação externa.
- [ ] Separar fatos documentados, cálculos geométricos, estimativas, hipóteses e resultados simulados; não usar IA como fonte de verdade nem executar código/comandos que ela retorne.
- [ ] Enviar descrições à IA externa somente após consentimento explícito por ação; não incluir arquivos ou dados pessoais automaticamente.

### 3. Laboratório atômico e tabela periódica

- [ ] Para os 118 elementos, expor símbolo, nome, número atômico, massa atômica, densidade quando disponível, dados mecânicos/térmicos, condutividade, estado/classificação, fontes, condições de medição, incertezas, aplicações e limitações.
- [ ] Permitir explorar elementos e relações com materiais de engenharia; representações de átomos/ligações devem ser identificadas como esquemáticas, não em escala real.
- [ ] Distinguir elemento, substância pura, liga, polímero, cerâmica, compósito e material comercial; não tratar elemento como filamento imprimível nem inventar composição.

### 4. Motor de materiais comerciais

- [ ] Catalogar PLA, PETG, ABS, ASA, nylon e exemplos de filamentos reforçados; cada registro precisa de ficha técnica e fonte verificável do grade comercial exato.
- [ ] Comparar resistência/rigidez, densidade/massa, temperatura de serviço e resposta térmica, química/umidade, flexibilidade/desgaste/impacto, facilidade/adesão entre camadas, compatibilidade com impressora, custo/disponibilidade dos dados e uso indicado — somente quando houver evidência.
- [ ] Manter valor ausente como “não informado”; não inventar propriedades ou generalizar valores entre grades/métodos/orientações.
- [ ] Para contato com alimentos, explicar dependência de filamento/aditivos, equipamento/bico, contaminação, acabamento e limpeza; não declarar o modelo seguro para alimentos sem evidência e validação apropriadas.

### 5. Motor geométrico paramétrico

- [ ] Criar CAD real e reproduzível, derivado de parâmetros e não de imagem ou nuvem de microcubos. Preferir build123d/CadQuery quando apropriado; usar trimesh/numpy-stl/Open3D somente onde necessários; manter Three.js para prévia e não tornar bibliotecas opcionais obrigatórias sem motivo.
- [ ] Detectar versões, dependências e compatibilidade antes de instalar ferramentas; oferecer módulos opcionais.
- [ ] Modelar sólidos/superfícies, furos/roscas/encaixes/tolerâncias, espessuras mínimas, nervuras/reforços, cavidades/estrutura interna, componentes/mecanismos simples, unidades métricas/conversões e geometria personalizada.

### 6. Distribuição estrutural e simulação

- [ ] Calcular volume, massa e centro de gravidade quando geometria/densidade suportarem; localizar paredes finas/regiões frágeis; verificar interferências/encaixes, espessuras/dimensões, orientação e necessidade de suportes.
- [ ] Integrar FEM apenas com solver compatível e análise térmica apenas com modelo/dados adequados; comparar variantes com justificativa compreensível.
- [ ] Informar hipóteses, condições de contorno, unidades e limitações; diferenciar cálculo geométrico, estimativa simplificada e simulação numérica; nunca apresentar simulação não executada como resultado.

### 7. Animação vinculada aos dados

- [ ] Oferecer vistas externa, explodida, corte transversal, estrutura interna, distribuição por região, modelo atômico esquemático, montagem, impressão por camadas e comparação de versões.
- [ ] Implementar pausa/reprodução/velocidade, rotação/zoom e seleção de componentes. Animação precisa acompanhar geometria/operações executadas; microcubos podem explicar campos, mas não substituem CAD nem apresentam átomos como cubos em escala física.

### 8. Fabricação, exportação e slicing

- [ ] Exportar STL, 3MF e STEP somente com exportador compatível; JSON do projeto e relatório técnico devem ser reproduzíveis.
- [ ] Antes da exportação, verificar unidades/dimensões, integridade/normais da malha, componentes desconectados, espessuras e erros geométricos; distinguir bloqueios de avisos e não declarar segurança de impressão por checagem simples.
- [ ] Integrar fatiador compatível de fato; mostrar parâmetros, estimativas de tempo/material e G-code somente quando produzidos/validados. Imprimir fisicamente exige consentimento expresso e verificação da máquina.

### 9. Instalação e ambiente local

- [ ] Instalador reproduzível/documentado detecta SO, Python/Node, memória/disco/dependências; cria venv; instala versões por lockfile; detecta CAD/slicers opcionais; configura/inicializa; executa testes/exportações; produz logs legíveis e permite atualizar/reparar/desinstalar componentes adicionados.
- [ ] Oferecer perfil mínimo e módulos opcionais; não substituir versões/remover pacotes do sistema nem executar comandos privilegiados sem explicar e pedir autorização.

### 10. Arquitetura modular compatível

- [ ] Integrar sem duplicar funções existentes: `engineering_agent`, `materials_database`, `periodic_table`, `cad_engine`, `geometry_validation`, `structural_analysis`, `manufacturing`, `animation_engine`, `export_manager`, `installer` e `audit_log`, adaptando nomes/caminhos à arquitetura GRID SOUL.

### 11. Segurança, permissões e recuperação

- [ ] Aprovar instalação de ferramentas, alterações do sistema e ações externas sensíveis; proteger tokens/senhas/chaves; nunca executar comandos da IA sem validação; limitar subprocessos e arquivos; não expor terminal remotamente.
- [ ] Confirmar exclusão/sobrescrita; não enviar projetos/dados privados a serviços externos sem consentimento; oferecer cancelamento, logs e backup/restauração; não imprimir fisicamente sem autorização.

### 12. Demonstração de ponta a ponta e preservação

- [ ] Manter compatibilidade com a arquitetura instalada, integração de IA, malha triangular conectada e identidade GRID SOUL; não reintroduzir cubos no renderer principal, evitar substituir arquivos importantes ou inventar resultados.
- [ ] Começar com garfo paramétrico reproduzível, dimensões configuráveis e testes dos módulos. O marco de plataforma funcional exige solicitar a peça, responder perguntas, gerar CAD, visualizar, consultar materiais/dimensões, validar, exportar e obter relatório explicativo.
- [ ] Manter backup verificável antes de cada etapa significativa, documentar somente o que foi realmente testado e não fazer commit/push/publicação no GitHub sem autorização explícita.

## Estado desta etapa

- [x] Backup privado anterior à ampliação criado e ZIP validado: `GRID-SOUL-PRE-ATOMIC-FORGE-20261021.zip`.
- [x] Primeira fatia funcional implementada: garfo paramétrico, prévia 3D, seis grades com fontes, métricas geométricas, STL binário, JSON/relatório, análise local e consentimento IA.
- [ ] Todo o restante acima continua pendente até existir implementação e evidência verificável. A conclusão dos testes desta fatia não significa que a plataforma completa esteja implementada.
- [x] Nenhuma alteração foi publicada no GitHub; publicação exige autorização explícita.

## Evolução CYBER OCEAN — renderer de malha triangulada

- [x] Trocar a geometria principal por uma superfície 3D contínua composta por vértices, arestas e faces triangulares conectadas. Mostrar wireframe luminoso em ciano/azul elétrico e vértices discretos derivados de posições reais da mesma geometria. Cubos, voxels e pontos soltos não podem ser o objeto principal.
- [x] A direção visual segue a imagem “CYBER OCEAN”: fundo marinho quase preto, profundidade, ondas feitas por superfície/vértices conectados, partículas ambientais limitadas, névoa sutil quando compatível, luz ciano, composição central e HUD com identificação, telemetria, controles, estado, posição e desempenho somente quando medidos ou identificados como simulados.
- [x] Adaptar criações por linguagem natural a geradores de malha realmente aceitos. Incluir modelos procedurais estilizados de tubarão com corpo/nadadeiras/cauda, coração, crânio, rosto, edifício, ponte, peça mecânica, planeta e formas científicas/abstratas. Não aceitar código ou vértices arbitrários vindos da IA e não chamar estes modelos de CAD/anatomia validada.
- [x] Controles funcionais: órbita por mouse/toque, zoom por scroll/gesto, pan, densidade da malha, brilho, cor principal, escala/posição, pausar/retomar, alternar wireframe/superfície sombreada (wireframe padrão), reiniciar a câmera e mostrar métricas calculadas do objeto.
- [x] Preservar e adaptar comandos/IA sanitizados, memória, exemplos locais, catálogo dos 118 elementos como subsistema separado, Atom Forge, automação e OSCE sempre que possível. Planos/atlas antigos de face não podem reativar cubos no renderer; a face procedural não deve ser apresentada como reprodução 3D fiel do atlas frontal.
- [x] Modularizar geometrias/ambiente/render em módulos pequenos, validar contagem/índices/valores finitos antes de renderizar, limitar densidade/partículas, descartar geometrias e materiais obsoletos e manter compatibilidade com browsers modernos e telas pequenas.
- [x] Executar instalação/verificação de dependências, compilação/sintaxe, testes automatizados, smoke real em navegador/WebGL se disponível, interação dos controles, checagem de conectividade triangular, limites, responsividade e comparação visual com a referência. Declarar cada limitação e não marcar teste não executado como aprovado.
- [x] Preservar backup original verificável, atualizar documentação/relatório, gerar ZIP de desenvolvimento e ZIP executável de teste sem credenciais/segredos, validar abertura e conteúdo de ambos e fornecer links diretos.
