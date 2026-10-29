# Validação da versão 2.0

Data: 29/10/2026. Ambiente: Python 3.12.14.

## Resultado

**46 testes automatizados aprovados** nas suítes
`api-corretor/tests/test_corretor.py`.

`api-corretor/tests/test_cadastro.py` cobre leitura do cadastro por colunas,
lacunas, cabeçalhos ambíguos, nomes duplicados, cadastro vazio, cache, atualização
forçada, falha do Google e troca de cadastro sem reiniciar a API. Também verifica
que a aba Alunos não recebe gravações de respostas quando é movida para o início.
O teste de interface com DOM simulado confirmou a preservação de seleções válidas,
a limpeza de alunos removidos e o bloqueio da atualização durante a revisão.

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
- Configuração privada por variáveis de ambiente para lista de alunos e
  conta de serviço Google, sem depender de arquivos no repositório.
- Inicialização real pelo comando já existente `gunicorn app:app`, usando dados
  fictícios: `/health` respondeu com status `ok` e versão `2.0.1`.

Uma fotografia real do modelo fornecido pelo usuário foi processada pelo leitor
e retornou A, A, A, A, A, coincidindo com a conferência visual das cinco questões.
Isso valida essa amostra, sem medir a precisão geral em rasuras e marcas duplas.

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
