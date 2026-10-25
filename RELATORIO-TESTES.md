# Relatório de verificação — GRID SOUL CYBER OCEAN

**Data:** 24 de outubro de 2026  
**Escopo:** migração do renderer principal para malha conectada, manutenção dos subsistemas existentes e pacote local de teste.

## Resultado

A instalação limpa `npm ci` concluiu pelo lockfile. A suíte `npm run check` finalizou com **60 testes aprovados e 0 falhas**, incluindo verificações de sintaxe do servidor e dos módulos cliente. A instalação inicial identificou uma vulnerabilidade alta em `body-parser` transitivo; foi aplicada uma atualização sem mudança de versão major, seguida de nova instalação limpa. `npm audit --audit-level=high` informou **0 vulnerabilidades**.

O smoke foi executado no Chromium headless com WebGL via SwiftShader (renderização por software), não numa GPU física. Em desktop **1369 × 610**, a demonstração abriu o tubarão com **8.340 triângulos**, **4.170 vértices** e **1 componente conexo**; o painel informou cerca de **8 FPS** nesse ambiente. Ao ajustar densidade para 48, o HUD passou a **18.280 triângulos**. A taxa angular inicial observada foi `0,01 rad/s`; com velocidade do objeto em zero, o HUD mostrou `0,00 rad/s`. O coração da prévia local também registrou uma componente conexa.

O smoke confirmou os toggles independentes da superfície e do wireframe, pausa/retomada, mudança de densidade, posição, persistência das duas flags booleanas de visibilidade e retorno à demonstração. Em viewport **390 × 844**, o canvas se redimensionou e não houve overflow horizontal. O manifesto de rotas foi servido como JSON. Não foram observados erros de página, erros de console da aplicação ou respostas HTTP ≥ 400 da aplicação.

## Revisão independente

Um revisor somente leitura identificou uma divergência entre a taxa de rotação exibida pelo HUD e o movimento executado. A animação agora mede o delta angular efetivamente aplicado dividido pelo tempo real entre quadros; velocidade zero interrompe a rotação do modelo. Foi adicionada uma regressão automatizada para a expressão de medição, e a suíte voltou a passar.

## Integridade e limites

O renderer principal usa buffers triangulados indexados e os testes confirmam componentes conexos para o catálogo procedural. Superfície, wireframe e pontos discretos compartilham a mesma geometria; os pontos ambientais pertencem somente ao cenário. As formas são procedurais e estilizadas, não CAD genérico, anatomia validada nem reprodução fiel de fotografia. Composições customizadas só são aceitas se formarem uma superfície conexa.

O FPS citado é a amostra real do loop neste smoke em SwiftShader e não é benchmark nem promessa de desempenho no computador do usuário. O Chrome com sessão ChatGPT autenticada/CDP e o desempenho em GPU física não foram testados. Exemplos locais funcionam sem IA.

Catálogo químico, Atomic Forge, OSCE, automação local, memória e exemplos continuam presentes e verificados pela suíte. Atlas e utilitários faciais legados permanecem por compatibilidade/testes, mas não são carregados pelo renderer atual; planos antigos não reativam voxels no palco principal.

O ZIP fornecido pelo usuário passou em `unzip -t`. O snapshot íntegro anterior às mudanças está preservado em `/home/ubuntu/work/backups/GRID-SOUL-PRONTO-original-20261024`. `data/gridsoul-memory.json` foi criado somente pelos smokes; foi removido antes do empacotamento e não existia no ZIP original. Os ZIPs de entrega excluem `.env`, credenciais/segredos e estado de memória. Nenhuma alteração foi publicada ou enviada ao GitHub.

## Capturas

- [Prévia desktop 1369 × 610](docs/CYBER-OCEAN-PREVIA.png)
- [Prévia mobile 390 × 844](docs/CYBER-OCEAN-MOBILE-PREVIA.png)
