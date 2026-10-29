# Validação da versão 2.0

Data: 29/10/2026. Ambiente: Python 3.12.14.

## Resultado

**33 testes automatizados aprovados**, em 5,74 segundos, na suíte
`api-corretor/tests/test_corretor.py`.

Cobertura principal:

- Classificação de uma marca forte, duas marcas fortes com intensidades diferentes,
  branco, marca parcial e marca forte acompanhada de uma marca parcial.
- Imagens JPEG sintéticas em 800, 1000 e 1500 pixels, incluindo sombra gradual e
  perspectiva: A, DUPLA, BRANCO, D e E reconhecidos na sequência esperada.
- Quantidade de questões divergente, arquivo inválido e imagem sem borda rejeitados.
- Autenticação obrigatória nas três operações protegidas; senha incorreta,
  expiração, revogação no logout e limite de tentativas.
- Origem de navegador não autorizada bloqueada e preflight da origem permitida.
- Nenhuma escrita ao ler a imagem; confirmação obrigatória; resposta duvidosa,
  quantidade adulterada e leitura pertencente a outra sessão rejeitadas.
- Gravação mantém as colunas originais e usa RAW.
- Repetição da mesma confirmação já salva não duplica a linha.
- Duas confirmações simultâneas da mesma leitura geram somente uma escrita.
- Falha ao abrir planilha permite nova tentativa sem perder a leitura.
- Timeout após o envio não retorna sucesso e bloqueia novo append cego.
- Upload excessivo, aluno desconhecido, leitura expirada e configuração sem
  proteção rejeitados.

## Interface

O JavaScript passou na verificação de sintaxe do Node. Um teste com DOM simulado
(jsdom) executou login, carregamento privado de alunos, seleção de identidade,
captura simulada, leitura sem gravação, revisão obrigatória, correção manual,
falha 503 preservando a revisão, resultado incerto 409 bloqueando envio, sucesso
confirmado, próximo aluno e logout.

Não foi realizado teste em navegador ou celular real neste ambiente. A captura,
o canvas e as respostas da API foram simulados no teste de interface. A suíte
Python exercitou o processamento real OpenCV das imagens sintéticas e as rotas
Flask, com o Google Sheets substituído por uma planilha simulada.

## Validação que ainda depende do seu ambiente

- Fotografias reais do modelo impresso de gabarito, especialmente caneta, lápis,
  marca fraca, rasura, dupla marcação, sombras e orientação.
- Login e sessão no navegador do seu celular.
- Configuração de origem permitida e Secret Files no Render.
- Gravação numa cópia real das planilhas e resultado das fórmulas com `DUPLA`.

Não foram utilizados nomes reais de alunos nem credenciais Google nos testes.
Não houve acesso ao seu Render, GitHub ou Google Sheets para publicar ou gravar.
