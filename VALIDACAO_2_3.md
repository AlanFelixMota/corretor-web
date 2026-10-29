# Validação da versão 2.3

Data: 29/10/2026.

## Escopo

Captura com tremulação tolerada; orientação da grade; marca dupla mais clara;
destino fixo na aba Respostas Lidas; busca de alunos; progresso da planilha atual;
desmarcação reversível; sugestão do próximo pendente; testes automáticos.
Nenhum cadastro de avaliações, mudança de colunas ou cálculo de notas foi criado.

## Evidência local

- API: **59 testes aprovados**, Python 3.12. Inclui as quatro orientações de uma
  grade sintética com respostas diferentes, orientação ambígua bloqueada,
  confirmação manual explícita, segunda marca em três tons, rasura parcial,
  consulta de progresso sem escrita, alteração/limpeza das linhas e aba de destino.
- Site: **17 testes aprovados**, Node 24. Inclui detector, tremor com mudança de
  fundo, análise mais lenta, perda breve da borda, busca sem acentos, filtros,
  desmarcação/restauração, novo registro, troca de unidade, próximo pendente,
  captura automática única com o contador real, falhas e permissão pendente.
- A foto fornecida pelo professor retornou A,A,A,A,A nas posições original,
  invertida em 180 graus e girada 90 graus. A foto não integra os repositórios.
- A suíte do navegador usa DOM simulado, câmera/canvas e Google fictícios.
  A detecção dos pixels e o processamento OpenCV são exercitados separadamente.
  Não houve teste com a câmera física de um celular nesta etapa.
- Não foram utilizados nomes reais ou credenciais nos testes; nenhuma resposta
  foi acrescentada, editada ou apagada nas planilhas reais.

## Checks e publicação

Os workflows em .github/workflows executam os testes em pushes e pull requests.
A API é verificada em Python 3.12 e 3.14; o site em Node 24. Conferir os Checks
antes de mesclar. Eles não configuram proteção de branch nem bloqueiam sozinhos
os mecanismos de publicação já existentes.

A liberação exige API 2.3 primeiro e site 2.3 depois. Testar uma cópia da planilha
com registros fictícios antes de usar em uma turma. A aprovação dos testes não
mede a precisão geral para canetas, lápis, rasuras e impressões diferentes.

A desmarcação altera apenas a lista da sessão do navegador. Os dados gravados
continuam no Sheets. Copiar e zerar a aba atual limpa o progresso na próxima
consulta. Sessões/leituras no servidor continuam usando SQLite temporário;
recuperação após perda de conexão ou reinício permanece fora deste escopo.
