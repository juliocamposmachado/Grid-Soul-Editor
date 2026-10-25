# GRID SOUL — Editor 3D integrado · Evolução 01

## Objetivo

Aproximar o GRID SOUL do fluxo de trabalho do [Editor oficial do Three.js][1] sem substituir a identidade CYBER OCEAN, a malha procedural existente ou a ponte local com ChatGPT.

## Referência e decisão técnica

A interface do Editor oficial reúne viewport, hierarquia de objetos, inspector, ferramentas de transformação, histórico e operações de projeto. O código-fonte oficial organiza esse trabalho em torno de uma cena `THREE.Scene`, objetos, seleção, histórico, carregamento e sinais de atualização.[2] A documentação do Three.js define `Object3D` como unidade básica da cena com transformações e relações pai-filho; `TransformControls` fornece manipulação interativa dos objetos com modos de translação, rotação e escala.[3] [4]

O projeto já executava Three.js 0.180.0 e usava `OrbitControls`. A decisão foi adicionar um workspace de edição ao palco existente em vez de migrar a aplicação inteira para o Editor upstream, o que preserva o renderer de malhas CYBER OCEAN, a telemetria e os demais painéis locais. O novo gizmo usa o addon `TransformControls` da versão já instalada. As primitivas e luzes são criadas localmente. Nenhuma nova dependência foi incluída.

## O que foi implementado

O botão **Abrir editor 3D** abre um painel de edição da cena. O usuário pode adicionar cubo, esfera, cilindro, cone, toro, plano, icosaedro e luz pontual. Uma lista mostra os objetos adicionados e permite seleção. O inspetor edita nome, cor, visibilidade e posição, rotação e escala numéricas. O gizmo alterna entre mover, rotacionar e escalar. Duplicar, excluir, desfazer e refazer também estão disponíveis, com histórico limitado a 80 estados.

**Salvar JSON** e **Abrir JSON** exportam ou restauram objetos editáveis, câmera/alvo e os parâmetros da malha procedural principal, inclusive peças customizadas dentro de um esquema com whitelist. A importação limita o arquivo a 1 MB, a cena a 100 objetos e custom a 24 partes permitidas; valores são validados e limitados. Conteúdo JavaScript, geometrias externas e materiais executáveis não são carregados.

O campo **Pedir criação à IA** encaminha a descrição pelo endpoint local já usado pelo ChatGPT. A ponte só é acionada por ação explícita do usuário. O prompt continua restrito aos modelos e parâmetros aceitos pelo servidor. Nesta versão, a IA cria ou modifica a malha procedural principal; não constrói livremente toda a hierarquia ou scripts. Objetos primitivos adicionados manualmente permanecem na cena. A ponte depende do Chrome/CDP dedicado descrito no README e não foi autenticada nem testada nesta sessão.

## Arquivos modificados

- `public/components/scene_editor.js`: workspace, gizmo, inspetor, primitivas, histórico e validação do formato JSON.
- `public/index.html`: botão de acesso, painel do editor e estilo responsivo.
- `public/app.js`: integração com a cena atual, ChatGPT e persistência/restauração do modelo principal.
- `test/scene_editor.test.js`: testes da whitelist e do esquema do projeto.
- `package.json`: `npm run check` inclui verificação sintática do novo módulo.
- `README.md`: descreve o fluxo e seus limites.

## Testes efetivamente realizados

- `npm test`: **64 testes aprovados, 0 falhas** após acrescentar os testes do editor.
- `npm run check`: aprovado; executou verificações de sintaxe, incluindo `scene_editor.js`, e os 64 testes, sem falhas.
- Chromium headless: abriu a página local com HTTP 200; adicionou uma esfera, mudou uma transformação, duplicou, desfez e refez; o histórico exibiu 1 → 2 → 1 → 2 objetos. **Salvar JSON** baixou `grid-soul-scene.json`, e a importação restaurou os dois objetos. Um projeto de round-trip com esfera, luz pontual e modelo principal `heart` foi carregado, e o HUD passou a indicar `HEART`.
- Os testes unitários verificam a rejeição de geometria não permitida/código, limites de quantidade e normalização de vetores, bem como a validação de modelo principal e partes customizadas.

No smoke Chromium apareceu uma mensagem genérica de recurso 404 no console, sem erro de execução JavaScript. O listener de respostas HTTP não capturou resposta com status >= 400; não foi possível identificar a origem daquela mensagem. Não foram verificados dispositivos físicos, outros navegadores, interações de arraste com o gizmo, conexão autenticada à ponte ChatGPT, importação de GLTF/OBJ, ou FPS/uso de memória comparativos.

## Limites da fatia atual

Isto é uma primeira camada funcional, não uma reprodução completa de todos os recursos do Editor oficial. Ainda não há importação/exportação GLTF/OBJ, edição ampla de parâmetros de materiais, mapa HDR/ambiente, controles de câmera como objeto de cena, agrupamento manual, animação/timeline, scripting, nós de material, renderização por imagem/vídeo, colaboração ou IA capaz de gerar composição irrestrita de múltiplos objetos. As primitivas do workspace são objetos editáveis separados da malha conectada principal; sua geometria não é automaticamente convertida em uma única superfície fundida.

A próxima etapa recomendada é expandir o inspector de materiais e a árvore/agrupamento; depois adicionar importação/exportação GLTF com validação e undo/redo de operações de importação. A IA pode evoluir para composições de múltiplos objetos por uma lista de operações declarativas validada pelo servidor, sem aceitar nem executar código gerado.

## Como testar localmente

Extraia o ZIP, abra um terminal na pasta `GRID-SOUL-PRONTO` e execute:

```bash
npm ci
npm run check
npm start
```

Abra `http://127.0.0.1:8765/?demo=1`, clique **Abrir editor 3D**, adicione uma primitiva, selecione-a na hierarquia e teste o inspetor/gizmo. Salve e reabra um JSON pelo painel. Para comandos de IA, configure e mantenha a ponte local ChatGPT ativa conforme as instruções do README. Não exponha o servidor ou a porta CDP à rede pública.

## Referências

[1]: https://threejs.org/editor/ "Three.js Editor"
[2]: https://github.com/mrdoob/three.js/blob/dev/editor/js/Editor.js "Código-fonte do editor Three.js"
[3]: https://threejs.org/docs/#api/en/core/Object3D "Three.js Object3D Documentation"
[4]: https://threejs.org/docs/#examples/en/controls/TransformControls "Three.js TransformControls Documentation"
[5]: https://threejs.org/examples/ "Three.js Examples Catalog"
