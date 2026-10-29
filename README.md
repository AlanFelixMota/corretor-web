# Site do leitor de gabaritos — versão 2.0

## Atualização 2.1

O botão **Atualizar lista de alunos** lê a aba **Alunos** da planilha de
Filosofia. Leia `CADASTRO_DE_ALUNOS.md` para organizar cada turma em uma coluna.
A atualização preserva seleções válidas e limpa alunos removidos. O botão fica
bloqueado durante a revisão de uma prova. Nenhuma senha foi alterada.

Arquivos para o repositório `corretor-web`:

- `index.html`
- `style.css`
- `app.js`
- `config.js`
- `.gitignore`

Esta versão busca turmas e alunos pela API autenticada. **Remova o `alunos.txt`
antigo deste repositório e da publicação do site.** `.gitignore` não remove arquivos
que já estavam sendo rastreados pelo Git.

Não coloque senhas, credenciais nem nomes reais de alunos nos arquivos do site.
A senha é definida no Render, na API. No navegador, apenas o token temporário
é guardado em `sessionStorage` até sair, fechar a aba ou expirar (8 horas).

`config.js` já aponta para o endereço da API original:
`https://api-corretor-provas.onrender.com`. Se mudar esse endereço, ajuste também
o domínio em `connect-src` no Content-Security-Policy do `index.html`.

O site é estático e não exige Node.js, npm ou comando de compilação. Publique
todos os arquivos juntos; não basta trocar somente o HTML. Nenhuma biblioteca
externa ou CDN é carregada pelo site.

O professor seleciona disciplina, turma, aluno e quantidade de questões; fotografa
o quadro inteiro; gira a imagem se necessário; pede a leitura; confere a imagem e
as respostas; resolve as leituras duvidosas; confirma e salva. A nota continua
sendo calculada pelo Google Sheets.

Recarregar ou fechar a página perde a foto e a revisão que estiverem na tela.
A gravação no Google acontece somente no botão de confirmação, mas se a resposta
se perder durante o envio é necessário conferir a planilha antes de reenviar.
