# GRID SOUL CYBER OCEAN — Evolução 01

## Objetivo

Entregar o primeiro incremento prático preservando a aplicação existente e reduzindo trabalho desnecessário por quadro na animação ambiental.

## Diagnóstico do projeto original

O ZIP contém uma aplicação local Node.js/Express e Three.js 0.180.0. O palco principal usa geometrias indexadas construídas em `public/components/wireframe_geometry.js`. As superfícies, o wireframe e os marcadores discretos derivam da mesma malha; o catálogo inclui formas procedurais como tubarão, coração, rosto estilizado, crânio, terreno, edifício e outras. `public/components/wireframe_scene.js` reúne a apresentação da malha e o ambiente oceânico animado. `public/app.js` liga o renderer, controles de câmera e interface. O projeto ainda contém módulos auxiliares, extensão de navegador, subsistemas de automação e uma suíte Node.js.

O gerador impõe limites de densidade e há testes para conectividade e contagens topológicas. O ambiente usa superfícies de onda com posições atualizadas a cada quadro. Antes da alteração, a atualização também recalculava normais de vértice para as duas geometrias de onda, embora tanto suas superfícies quanto linhas usassem `MeshBasicMaterial`, que não utiliza as normais para iluminação. A posição das ondas também não declarava uso dinâmico no `BufferAttribute`.

## Pesquisa e decisão de engenharia

Foram consultados o [catálogo oficial de exemplos do Three.js](https://threejs.org/examples/), incluindo `webgl_shaders_ocean`, `webgl_buffergeometry`, `webgl_buffergeometry_indexed`, `webgl_buffergeometry_instancing` e famílias de pós-processamento; a [documentação de BufferGeometry](https://threejs.org/docs/#api/en/core/BufferGeometry); e o [repositório oficial do Three.js](https://github.com/mrdoob/three.js). O catálogo demonstra alternativas mais avançadas de oceano e buffer geometry, enquanto a documentação descreve atributos e geometria de buffer. O repositório apresenta Three.js como biblioteca 3D cross-browser com renderizadores WebGL e WebGPU.

A solução escolhida mantém o renderer WebGL, a geometria procedural conectada e o esquema atual de ondas. Migrar para o exemplo de oceano por shader ou para WebGPU exigiria uma mudança muito maior e não é necessária para corrigir este custo específico. A alteração de baixo risco declara o atributo da posição como `DynamicDrawUsage` e remove o cálculo redundante de normais. O uso dinâmico é uma indicação de atualização para o renderer, não uma promessa de desempenho; não foram coletadas métricas comparativas de FPS ou GPU.

## Implementação

Em `public/components/wireframe_scene.js`, cada geometria de onda agora configura seu atributo `position` com `THREE.DynamicDrawUsage`; o loop de animação deixou de chamar `computeVertexNormals()` sem necessidade. `test/wireframe_geometry.test.js` agora verifica que o atributo tem o uso dinâmico esperado. O ZIP original enviado foi preservado, e nenhum commit, push ou publicação foi realizado.

## Testes e resultados

- Linha de base antes da alteração: `npm test` — 60 testes aprovados, 0 falhas.
- Após a alteração: `npm run check` — validação de sintaxe e suíte; 60 testes aprovados, 0 falhas.
- Smoke em Chromium headless local: a página retornou HTTP 200, título `GRID SOUL — CYBER OCEAN`, dois elementos canvas e a tela do renderer com 1280 × 720 pixels internos. O navegador conseguiu obter contexto WebGL. A largura do documento permaneceu igual à viewport de 1280 px.
- O console do navegador reportou dois erros genéricos de recursos HTTP 404; não foi possível associá-los a uma rota específica com o registro coletado. Não foram observados erros de execução JavaScript (`pageerror`). Portanto, o teste confirma inicialização e disponibilidade de WebGL, mas não atesta ausência completa de erros de recurso nem compatibilidade com todos os navegadores/GPU.

Não foram coletadas métricas de FPS, tempos de quadro, uso de memória GPU/CPU ou comparações antes/depois. Não foi verificada interação de câmera por gesto nem testado hardware físico.

## Limitações e próximos passos

Os modelos do projeto são procedurais e estilizados, não modelos anatômicos validados nem CAD de fabricação. A evolução atual é uma otimização localizada; não altera algoritmo de malha, formas, renderização principal ou sistema de interação. Próximo passo de maior valor: identificar e corrigir os dois recursos 404 no smoke browser e adicionar uma medição reproduzível de tempo de atualização/renderização em perfis de qualidade distintos. Recomenda-se avaliar um shader oceânico apenas se medição real revelar gargalo no loop de atualização existente.

## Instalação e execução local

Requisitos declarados pelo projeto: Node.js 20 ou superior e npm. Extraia o arquivo ZIP, abra um terminal na pasta `GRID-SOUL-PRONTO`, execute `npm ci` e depois `npm start`. Abra `http://localhost:8765` no navegador. Para rodar as validações, execute `npm run check` (sintaxe e testes) ou `npm test` (somente testes). Não é necessário configurar IA para abrir e testar o palco procedural. O pacote não inclui `node_modules`, caches ou credenciais; as dependências estão declaradas em `package.json` e `package-lock.json`.

## Referências

- [1]: https://threejs.org/examples/ "Three.js Examples"
- [2]: https://threejs.org/examples/webgl_shaders_ocean.html "Three.js WebGL Shaders Ocean Example"
- [3]: https://threejs.org/examples/webgl_buffergeometry.html "Three.js WebGL Buffer Geometry Example"
- [4]: https://threejs.org/examples/webgl_buffergeometry_indexed.html "Three.js WebGL Indexed Buffer Geometry Example"
- [5]: https://threejs.org/examples/webgl_buffergeometry_instancing.html "Three.js WebGL Buffer Geometry Instancing Example"
- [6]: https://threejs.org/docs/#api/en/core/BufferGeometry "Three.js BufferGeometry Documentation"
- [7]: https://github.com/mrdoob/three.js "Three.js Official Repository"
