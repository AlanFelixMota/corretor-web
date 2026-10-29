# Atualizar o corretor de provas — versão 2.0

Esta é uma versão preparada para teste. Ela ainda precisa ser avaliada com seu
gabarito impresso e fotografias reais. Seus repositórios e serviços online não
foram alterados automaticamente.

## O que muda

1. Uma senha protege a lista de alunos e as operações da API.
2. A imagem não é mais cortada automaticamente em um quadrado. O quadro inteiro
   é preservado e há botões para girá-lo antes da leitura.
3. O leitor considera todas as alternativas e distingue marcação forte, dúvida,
   marcação dupla e branco. Ele confere quantidade e alinhamento das bolhas antes
   de aceitar a leitura. Os limiares são iniciais e podem precisar de ajuste.
4. Uma tela de revisão mostra a identificação, o quadro alinhado e cada resposta.
   Você pode corrigir qualquer resposta. Dúvidas precisam ser resolvidas.
5. Só o botão de confirmação grava no Sheets. Falhas não mostram sucesso e não
   limpam silenciosamente a revisão. Um envio cujo resultado ficou incerto exige
   conferir a planilha antes de reenviar, para evitar duplicação.
6. A planilha continua calculando as notas. A ordem das colunas não muda.

## Antes de publicar

Guarde os ZIPs originais e anote os comandos de build e inicialização atuais do
Render. Faça os primeiros testes em cópias das suas duas planilhas, com alunos
fictícios. A conta de serviço já existente precisa ter acesso às cópias.

O ideal é validar o modelo de gabarito com: uma foto normal, uma marcação dupla,
uma questão em branco, uma rasura e uma marca fraca. Não é necessário mostrar
nomes reais. Esta entrega não inclui fotos reais nem resultados medidos nelas.

## 1. Prepare os arquivos privados no Render

Abra o serviço da API → **Environment** → **Secret Files**.

- Cadastre `credentials.json` com o conteúdo do arquivo de credenciais Google que
  já utiliza. Se já está cadastrado como Secret File, mantenha-o.
- Cadastre `alunos.txt` com sua lista real. Use o mesmo formato antigo: linhas
  iniciadas por `#` são turmas e as demais são alunos. Há um exemplo fictício em
  `api-corretor/alunos.exemplo.txt`.

O código lê `/etc/secrets/credentials.json` e `/etc/secrets/alunos.txt`.
Não envie esses arquivos ao GitHub nem precisa compartilhá-los aqui.

## 2. Configure o acesso

Ainda em **Environment**, adicione:

| Variável | Valor |
|---|---|
| `CORRETOR_PASSWORD` | Uma senha exclusiva com no mínimo 16 caracteres. |
| `ALLOWED_ORIGINS` | A origem HTTPS do seu site, sem caminho. |

Exemplo: para um site `https://alan.github.io/corretor-web/`, a origem é somente
`https://alan.github.io`. Para domínio próprio, use a origem desse domínio.
Para permitir duas origens, separe-as por vírgula. Não use asterisco.

Para as primeiras gravações, configure também:

- `SHEETS_FILOSOFIA_ID`: ID da cópia de teste da planilha de Filosofia.
- `SHEETS_SOCIOLOGIA_ID`: ID da cópia de teste da planilha de Sociologia.

O ID é o trecho da URL entre `/d/` e `/edit`. Quando esses IDs não estão definidos,
o aplicativo usa os nomes originais das planilhas e grava na primeira aba.

Se estiver configurando antes de atualizar o código, pode usar **Save only** para
evitar uma implantação intermediária. Publique código e configuração em seguida.

## 3. Atualize o repositório da API

Copie o conteúdo da pasta `api-corretor` para a raiz do repositório correspondente.
Atualize `app.py` e `requirements.txt`; inclua `omr.py`, `wsgi.py`,
`gunicorn.conf.py` e os demais arquivos de exemplo/documentação/testes.

Remova `credentials.json` e listas reais de alunos de qualquer repositório. O
`.gitignore` não remove arquivos já rastreados nem o histórico. Se uma chave real
foi publicada em repositório público, revogue-a e substitua-a no Google Cloud e
no Secret File do Render.

No Render, em **Settings → Build & Deploy**, configure:

**Build Command**

```bash
pip install -r requirements.txt
```

**Start Command**

```bash
gunicorn -c gunicorn.conf.py wsgi:app
```

Mantenha uma instância da API. A versão foi testada em Python 3.12 e usa APIs de
Python 3.10 ou superior. Não altere a versão do runtime junto se não for necessário.
Se houver um Health Check Path, use `/health`.

Salve as alterações e publique o novo commit. Se precisar, use **Manual Deploy →
Deploy latest commit**. Aguarde a conclusão. A API pode falhar na inicialização
se faltarem senha, origem permitida ou arquivo de alunos: isso é intencional,
para impedir que inicie com acesso liberado.

A API nova exige login e não é compatível com o site antigo. Escolha um momento
em que não esteja corrigindo provas para atualizar as duas partes em sequência.

## 4. Atualize o repositório do site

Copie o conteúdo de `corretor-web` para a raiz do repositório do site.
Inclua `index.html`, `style.css`, `app.js` e `config.js` na mesma pasta.

**Exclua o arquivo `alunos.txt` antigo do repositório do site.** A relação real
agora fica somente no Secret File da API. Verifique após publicar que o antigo
endereço `/alunos.txt` não entrega mais a lista. Excluir da versão atual não apaga
eventuais cópias no histórico ou já obtidas por terceiros.

O endereço original da API já está em `config.js`. Caso use outro, atualize esse
arquivo e a diretiva `connect-src` do `index.html`. Não coloque a senha no site.

Publique todos os arquivos juntos no mesmo serviço estático/GitHub Pages que já
usa. Não é necessário migrar de hospedagem nem instalar Node.js.

## 5. Faça uma prova fictícia completa

1. Abra o site atualizado e entre com a senha configurada no Render.
2. Confira se turmas e alunos aparecem somente após entrar.
3. Selecione disciplina, turma, aluno fictício e quantidade exata de questões
   objetivas. Essa quantidade não inclui as discursivas.
4. Fotografe o quadro inteiro, com boa luz e sem inclinação excessiva. A primeira
   questão deve estar no topo, e as alternativas em ordem A, B, C, D e E da
   esquerda para a direita. Use os botões de giro se necessário.
5. Toque em **Ler marcações**. Confira que nenhuma linha apareceu na planilha.
6. Na revisão, compare cada resposta com a foto. Resolva `REVISAR` e confira
   também `BRANCO` e `DUPLA`. Você pode escolher manualmente A–E, branco ou dupla.
7. Marque a confirmação e toque em **Salvar na planilha e próximo aluno**.
8. Confira a linha gravada: data/hora, turma, aluno e respostas na ordem antiga.
9. Confira como suas fórmulas calculam uma resposta `DUPLA`. Se elas apenas
   comparam com A–E, ela será diferente do gabarito; fórmulas especiais podem
   precisar de tratamento. Esta entrega não alterou suas fórmulas.
10. Teste sair: a mesma sessão não deve mais obter a lista ou enviar leituras.

Quando estiver satisfeito com os testes, troque os IDs das planilhas de teste
pelos IDs das planilhas reais. Escolha um momento sem revisões pendentes para a
nova implantação. Não transporte registros fictícios para a planilha real.

## Limitações práticas

- A leitura de marcações não é infalível. As imagens sintéticas aprovadas nos
  testes não medem o desempenho com seu modelo impresso, câmera, lápis e caneta.
- O leitor trabalha com um único bloco vertical de questões. A foto de um bloco
  em vários conjuntos lado a lado precisa de adaptação do modelo.
- Sessões e revisões usam SQLite local. Sem disco persistente, reiniciar ou
  implantar a API pode apagá-las. Os dados já confirmados no Google permanecem lá.
- No navegador, atualizar ou fechar a aba perde a foto e a revisão na tela.
- Se a conexão cair durante a gravação, confira a planilha antes de reenviar.
  Não há garantia transacional entre o servidor e o Google Sheets. A proteção
  contra repetição vale para a mesma leitura enquanto seu estado estiver presente.
- A senha é única para o professor. Não há criação de contas de alunos, envio de
  e-mails, recuperação automática de senha nem suporte a vários professores nesta
  versão. Alunos continuam apenas preenchendo o papel.

## Se precisar voltar à versão anterior

Restaure os dois repositórios a partir dos ZIPs/commits originais e restaure o
comando de inicialização anterior da API. Não copie segredos de volta ao GitHub.
A versão anterior não terá as proteções nem o fluxo de revisão desta entrega.
As linhas já confirmadas na planilha não são removidas ao restaurar o código.

## Referências utilizadas

- Render, variáveis e Secret Files: https://render.com/docs/configure-environment-variables
- Render, implantações: https://render.com/docs/deploys
- gspread, autenticação com conta de serviço: https://docs.gspread.org/en/latest/oauth2.html
- Flask, segurança e limites de requisição: https://flask.palletsprojects.com/en/stable/web-security/
- Google Sheets, gravação RAW: https://developers.google.com/workspace/sheets/api/guides/values
