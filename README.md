# Site do leitor de gabaritos — versão 2.2

## Câmera automática (2.2)

Selecione disciplina, turma, aluno e quantidade de questões. Toque em **Abrir
câmera automática** e permita o acesso à câmera. Mostre o quadro inteiro com a
primeira questão no topo. A borda aparece destacada quando é detectada. Após
pelo menos 1,1 segundo e seis observações estáveis, o site captura um único quadro
e inicia a leitura, sem abrir o aplicativo de câmera nem pedir confirmação da foto.
Dependendo do celular, a estabilidade pode levar mais tempo.

O enquadramento é analisado localmente, em uma imagem reduzida. Apenas a foto
capturada é enviada à API autenticada; o vídeo não é transmitido. O detector de
borda não identifica o aluno nem garante orientação ou leitura correta. A API
continua validando o quadro e a quantidade de bolhas, e o professor revisa as
respostas e confirma antes de gravar no Sheets.

A identificação fica bloqueada enquanto a câmera está aberta. A câmera fecha
após a captura, ao sair da página, ao encerrar a sessão ou ao tocar em Fechar
câmera. Para a próxima prova, selecione o próximo aluno e abra a câmera de novo.
Não há repetição automática de requisições caso a leitura falhe: a foto permanece
para girar e tentar novamente. Também há **Ler este enquadramento** e o fluxo
tradicional **Usar foto ou escolher imagem**.

O acesso ao vídeo requer HTTPS e permissão do navegador. Em caso de bloqueio,
use o Chrome/Safari diretamente ou a opção de foto. A detecção é uma heurística
de borda, contraste, detalhe e estabilidade, sem bibliotecas externas; precisa
ser conferida em celulares reais com o gabarito impresso.

Os testes do detector não precisam de instalação de pacotes: execute
`node --test tests/camera.test.cjs` usando uma versão recente do Node apenas no
ambiente de desenvolvimento. O site publicado continua sem compilação ou npm.

## Atualização 2.1

O botão **Atualizar lista de alunos** lê a aba **Alunos** da planilha de
Filosofia. Leia `CADASTRO_DE_ALUNOS.md` para organizar cada turma em uma coluna.
A atualização preserva seleções válidas e limpa alunos removidos. O botão fica
bloqueado durante a revisão de uma prova. Nenhuma senha foi alterada.

Arquivos para o repositório `corretor-web`:

- `index.html`
- `style.css`
- `app.js`
- `camera.js`
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
