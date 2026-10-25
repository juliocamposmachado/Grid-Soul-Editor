# Grid-Soul-Editor

## GRID SOUL — CYBER OCEAN

**Oficina local de criação visual 3D em malhas trianguladas conectadas.**

O GRID SOUL é uma aplicação local em Node.js, Express e Three.js. O palco principal usa superfícies indexadas de triângulos: o wireframe luminoso, a superfície sombreada e os marcadores discretos de vértice vêm da mesma geometria. O estilo visual acompanha a referência fornecida: oceano marinho profundo, ondas conectadas, ciano/azul elétrico, telemetria sobreposta e controles laterais. Cubos/voxels e nuvens de pontos não são a forma principal de construção.

A cena abre uma demonstração de tubarão quando iniciada com `?demo=1`. Os botões de prévia criam modelos procedurais localmente, sem chamar a IA. A conversa com ChatGPT continua opcional e sujeita à ponte configurada pelo próprio usuário; o servidor valida e limita as formas antes de aplicar um plano.

## Modelos e limites

O catálogo do renderer inclui **tubarão, coração, crânio, rosto estilizado, esfera, toro, espiral, onda, terreno, nuvem volumétrica, planeta, edifício, ponte, mecanismo e composição customizada limitada**. Formas trianguladas implícitas usam campos de distância e extração de superfície; superfícies simples usam geometrias de buffer indexadas. A densidade é limitada para proteger a experiência, e o gerador refina uma solicitação se a triangulação produzir componentes separados. O HUD mostra as contagens reais produzidas.

Os modelos são exemplos procedurais estilizados. A face não é reconstrução anatômica nem reprodução fiel de fotografia, e os modelos não equivalem a CAD paramétrico validado, simulação física, modelo médico ou geometria pronta para impressão. O Atlas facial legado e os utilitários antigos continuam no pacote por compatibilidade/testes, mas o renderer atual não os importa nem os converte em cubos.

## Interface CYBER OCEAN

A interface acompanha a referência: marca superior “CYBER OCEAN”, painel de telemetria à esquerda, controles à direita, cantos luminosos e barra de estado no rodapé. O HUD mede contagem de triângulos/vértices, componentes conexos, profundidade do limite mundial do objeto, rotação/sessão e FPS observado no loop de renderização. A posição corresponde aos controles XYZ; não é uma medição de profundidade oceânica real.

- Arrastar com botão principal orbita; scroll/gesto aproxima ou afasta; botão direito arrasta para pan.
- Densidade ajusta a resolução da geometria. O indicador de triângulos informa o resultado real, que pode variar por forma ou por reparo topológico.
- Cor e intensidade ajustam o wireframe/ondas; wireframe e superfície sombreada possuem toggles independentes e ambos começam ligados.
- Controles XYZ deslocam o modelo; escala ajusta seu tamanho; pausa interrompe o movimento do modelo e do oceano; “Enquadrar” restaura a vista.
- O slider de velocidade controla a rotação automática. Ative Auto para sugestões de escala, velocidade, complexidade e enquadramento; em Manual, os controles continuam editáveis.

A cena contém duas malhas de onda animadas e um número limitado de pontos ambientais. Isso é decoração de ambiente — separado da superfície principal. O modo padrão não depende de pós-processamento bloom.

## Editor de cena 3D · primeira fatia

Use **Abrir editor 3D** para adicionar cubo, esfera, cilindro, cone, toro, plano, icosaedro e luz pontual. O editor oferece lista de objetos adicionados, seleção, gizmo de mover/rotacionar/escalar, campos numéricos de transformação, cor, visibilidade, duplicação, exclusão, undo/redo e salvar/abrir um projeto JSON. O arquivo de projeto usa uma lista fechada de primitivas, limites de quantidade e tamanho e não executa código importado.

O botão **Pedir criação à IA** usa a ponte local ChatGPT já existente. A resposta continua limitada ao planejador e ao catálogo de malhas procedurais do GRID SOUL: nessa versão, ela modifica a malha principal e não gera uma hierarquia arbitrária de objetos, scripts, materiais nodais ou geometrias livres. Os objetos adicionados manualmente no editor permanecem na cena. O modo local e o catálogo procedural funcionam mesmo sem a ponte de IA configurada.

## Uso

Requisitos: Node.js 20+, npm e navegador moderno com WebGL. Three.js 0.180 e OrbitControls são servidos localmente pelo próprio projeto.

```bash
npm ci
npm start
```

Abra `http://127.0.0.1:8765/?demo=1`. O servidor fica limitado ao loopback local; não o exponha à rede pública. Para outra porta, configure `GRID_SOUL_PORT` antes de iniciar. Não abra `index.html` diretamente como arquivo.

Exemplos de comandos que a ponte de IA pode classificar entre os modelos permitidos:

- “Crie um tubarão em wireframe ciano com densidade 48.”
- “Faça um coração, reduza a intensidade e aumente a escala.”
- “Monte um edifício geométrico e deixe somente a malha.”

O prompt fornece uma lista fechada de shapes, e o servidor elimina valores fora dos limites. A IA escolhe parâmetros; não envia código executável nem buffers de vértices arbitrários.

## Ponte com ChatGPT

A prévia local, as formas rápidas e o renderer funcionam sem autenticação ou configuração de IA. Para comandos em linguagem natural, siga as instruções da seção “Ponte com ChatGPT” abaixo.

A ponte padrão usa Playwright/CDP em um perfil de navegador dedicado, porta local `9222`; não reutilize seu perfil pessoal. Inicie o Chrome com perfil específico para o GRID SOUL, autentique manualmente e mantenha-o aberto. A página envia apenas o texto do comando após a ação do usuário. Consulte `GET /api/health` para verificar estado e mantenha o servidor e a porta CDP somente no loopback.

## Subsistemas preservados

- **Catálogo periódico e visualização atômica:** os 118 elementos são metadados independentes da topologia da malha; nenhum vértice recebe identidade química por posição no buffer. A visualização atômica é esquemática.
- **Atomic Forge 3D:** garfo paramétrico, visualização de oficina separada, métricas e STL conforme limites descritos em [docs/ATOMIC-FORGE.md](docs/ATOMIC-FORGE.md). Isto não se transforma em CAD generativo arbitrário.
- **Treino OSCE neurovascular:** módulo educacional local; detalhes, ressalvas e fontes em [docs/PROPOSTA-OSCE-NEUROVASCULAR.md](docs/PROPOSTA-OSCE-NEUROVASCULAR.md).
- **Automação local:** permissões e escopos explícitos, ações confirmadas e processos confinados; leia [docs/SEGURANCA-AUTOMACAO.md](docs/SEGURANCA-AUTOMACAO.md).
- **Memória visual:** guarda parâmetros/estado visual, não novos textos livres de prompts/respostas. Planos faciais antigos são normalizados pelo servidor; não reativam atlas ou cubos.

## Estrutura principal

- `server.js` — servidor Express, ponte opcional de comandos e sanitização/limites do plano.
- `public/index.html` e `public/app.js` — HUD, canvas, controles, gestão de estado e ligação com APIs.
- `public/components/wireframe_geometry.js` — geradores de superfície indexada e inspeção topológica.
- `public/components/wireframe_scene.js` — superfície, wireframe, marcadores derivados dos vértices reais, ondas, pontos ambientais e descarte de recursos.
- `public/components/scene_editor.js` — workspace de primitivas com árvore, gizmo, inspetor, histórico e importação/exportação JSON segura.
- `public/components/visual_autocalibration.js` — presets, leitura de controles explícitos e enquadramento.
- `components/`, `lib/` e `public/engineering*` — catálogo/segurança e Atomic Forge preservados.
- `public/neurovascular-osce*` — treino educacional local.
- `test/` — testes de servidor, políticas, painéis, renderização e topologia da malha.

## Verificação

```bash
npm test
npm run check
```

Os testes da malha verificam buffers indexados e finitos, contagem real de triângulos, componente conexo para cada forma do catálogo, ajuste de densidade, relação dos vértices/linhas/superfície, ambiente oceânico e composição customizada. Testes de servidor e dos outros subsistemas permanecem na mesma suíte.

Leia [plan.md](plan.md), [TODO.md](TODO.md) e [RELATORIO-TESTES.md](RELATORIO-TESTES.md) para arquitetura, limites e evidências da validação desta entrega. O projeto não foi publicado.
