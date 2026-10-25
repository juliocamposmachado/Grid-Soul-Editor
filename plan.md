# GRID SOUL — evolução para malhas 3D CYBER OCEAN

## Objetivo e escopo

Evoluir a aplicação local existente em Node.js, Express e Three.js sem reconstruí-la do zero: substituir o `InstancedMesh(BoxGeometry)` que formava a criação principal por objetos 3D construídos de triângulos conectados, com superfície sombreada escura, arestas ciano/azul e pontos derivados dos vértices reais. O palco segue a imagem CYBER OCEAN enviada: oceano marinho profundo, ondas trianguladas, atmosfera discreta e HUD em camadas. Cubos, voxels e pontos soltos deixam de ser a geometria principal.

Preservar o servidor e os fluxos de comandos/IA, memória, OrbitControls, calibração Auto/Manual, catálogo periódico, Atom Forge, automação local e OSCE. O catálogo químico fica como subsistema informativo separado, sem atribuir elemento à ordem dos vértices. Entrada de perfis faciais antigos é normalizada para o gerador procedural; o atlas não é carregado no renderer e a face gerada não afirma reproduzir fielmente fotografia nem anatomia validada.

## Arquitetura baseada nos arquivos reais

- `server.js`: manter Express, bridge CDP/extensão, memória, sanitização e limites. Ampliar apenas a lista de formas e parâmetros validados; não executar código da IA nem aceitar vértices arbitrários ou buffers ilimitados.
- `public/index.html`: manter os painéis existentes e converter a área de cena em canvas imersivo com HUD responsivo; adicionar controles ligados ao objeto real e declarar a rota `/` em `public/manus-routes.json`.
- `public/app.js`: inicializar Three.js/OrbitControls, aplicar planos à geometria, persistir o estado de malha, atualizar telemetria e coordenar os painéis já existentes.
- `public/components/wireframe_geometry.js`: geometrias indexadas: tubarão, coração, crânio, face estilizada, esfera, toro, espiral, onda/terreno, nuvem volumétrica, planeta, edifício, ponte, mecanismo e composição customizada limitada. Campos de distância extraídos por marching tetrahedra para sólidos implícitos; outras formas usam BufferGeometry de triângulos. Contar e validar vértices/índices/componentes; aumentar resolução se a amostragem fragmentar a superfície.
- `public/components/wireframe_scene.js`: renderizar superfície, wireframe e amostra de pontos com base na mesma geometria; criar duas ondas de malha e até 420 partículas ambientais; controlar animação/estilo e descartar buffers/materiais substituídos.
- `public/components/visual_autocalibration.js`: presets para as formas aceitas e interpretação de densidade/escala/velocidade explícitas. O campo `population` é legado, nunca número de cubos/triângulos.
- `test/`: atualizar contratos de cliente/servidor e incluir topologia indexada, contagens, formas, adaptação de detalhe, telemetria, estilo e descarte; manter a cobertura dos painéis preexistentes.
- `README.md`, `TODO.md`, `RELATORIO-TESTES.md`: documentar execução local, controles, capacidade real, limitações e evidências verificáveis.

## Decisões de implementação

1. A geometria principal é um `BufferGeometry` indexado e finito, escolhido dentre geradores conhecidos. Os parâmetros vindos da IA são normalizados; detalhe é limitado antes da construção e componentes conexos são medidos após a geração.
2. Três camadas do mesmo objeto usam uma geometria compartilhada: superfície sombreada, wireframe dos triângulos e poucos pontos amostrados do atributo real de posições. Pontos ambientais pertencem somente ao cenário.
3. O tubarão é um sólido procedural alongado com cauda e nadadeiras extraídas como uma única superfície indexada. Coração, crânio, face, prédio, ponte e mecanismo são exemplos volumétricos estilizados; não digitalizações anatômicas ou CAD imprimível.
4. Wireframe ciano e superfície translúcida são padrão, cada um com toggle independente. Cor, intensidade, visibilidades, densidade, escala, posição, pausa, câmera, órbita, pan e zoom controlam objetos e câmera reais. Profundidade e topologia vêm de bounds/índices; FPS vem de amostras temporizadas do loop.
5. O catálogo de 118 elementos e a visualização atômica permanecem independentes da topologia. Planos antigos não conseguem reativar voxels/cubos na renderização principal. Atom Forge permanece um painel CAD paramétrico separado.

## Design — direção CYBER OCEAN

- **Movimento:** HUD sci-fi oceânico e engenharia holográfica, baseado diretamente na imagem fornecida, não numa referência de stock.
- **Princípios:** silhueta legível; topologia visível; telemetria apenas factual; controles em segundo plano; aparência imersiva sem prometer simulação.
- **Cores:** marinho quase preto transmite profundidade; ciano elétrico e azul marcam conectividade; branco azulado serve apenas a vértices e alertas. Painéis translúcidos mantêm o oceano legível por trás.
- **Layout:** canvas cobre todo o palco; marca CYBER OCEAN no topo, telemetria à esquerda, painel translúcido de controles à direita e status no rodapé, com composição estreita responsiva.
- **Assinaturas visuais:** moldura fina com cantos de circuito; triângulos/ciano sobre superfície escura; ondas de vértices com partículas ambientais limitadas.
- **Interação:** mouse/toque orbitam, rolagem/gesto aproxima, arrasto secundário faz pan; controles mudam densidade/material/transforms; pausa suspende movimento sem deformar topologia.
- **Animação:** ondas em amplitude baixa, rotação suave do objeto como grupo rígido e pausa consistente; nenhuma migração dos vértices do modelo.
- **Tipografia:** `system-ui` para texto de leitura em painéis e `ui-monospace`/`SFMono-Regular`/`Consolas` para telemetria, coordenadas e rótulos; valores curtos e hierarquia por espaçamento.
- **Essência da marca:** GRID SOUL é uma oficina de visualização geométrica 3D para curiosos e criadores, distinta por mostrar sua conectividade em vez de fingir que pontos soltos são um modelo; personalidade: técnica, exploratória, transparente.
- **Voz:** microcopy objetiva e verificável. Exemplos: “MALHA CONECTADA · 18.420 triângulos” e “PAUSA · topologia preservada”.
- **Wordmark/logo:** “GRID SOUL” em letras técnicas espaçadas, acompanhado de um símbolo de três segmentos conectados que desenham uma onda/triângulo; a cápsula “CYBER OCEAN” é a assinatura de modo, não um logotipo externo.
- **Cor de marca:** ciano elétrico `#19DFF6`, um traço próprio que contrasta com o oceano quase preto.

## Limites

O planejador escolhe apenas um catálogo finito de geometrias; não cria arbitrariamente qualquer objeto. A face é uma superfície procedural estilizada, não anatomia validada/reprodução facial fiel. O oceano é uma malha animada, não física fluida. O HUD informa FPS local observado, não benchmark de hardware. Não há bloom de pós-processamento, rigging genérico, impressão 3D para estes modelos, CAD genérico, análise médica nem simulação estrutural. O Atomic Forge mantém seu escopo e exportador já documentados. Planos antigos podem preservar forma e estado visual, mas geometria facial voxel/atlas é descartada na normalização.
