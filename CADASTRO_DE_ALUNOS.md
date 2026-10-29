# Cadastro de alunos pelo Google Sheets — versão 2.1

O cadastro fica na aba **Alunos** da planilha **Notas Provas Rosa Filosofia**.
Ela atende tanto a Filosofia quanto a Sociologia. Não é necessário duplicar a
lista na outra planilha nem torná-la pública.

## Como preparar

Na planilha de Filosofia, adicione uma aba com o nome exato **Alunos**.
Na primeira linha, coloque o nome de cada turma. A partir da segunda linha,
preencha os nomes dos alunos na coluna correspondente:

| 1 Série A | 1 Série B | 2 Série A |
|---|---|---|
| Aluno exemplo 1 | Aluno exemplo 3 | Aluno exemplo 5 |
| Aluno exemplo 2 | Aluno exemplo 4 | |

- Não escreva `#` nos nomes das turmas.
- Pode deixar lacunas entre nomes; células vazias são ignoradas.
- Use um cabeçalho único por turma e evite repetir um nome dentro da mesma turma.
- As listas das diferentes turmas não precisam terminar na mesma linha.
- Turmas sem alunos não aparecem no seletor até terem um nome preenchido.
- Para incluir uma turma, basta criar outra coluna com o cabeçalho e os nomes.
- Quando a aba existir, seu conteúdo será o cadastro oficial. Preencha todas
  as turmas desejadas; o sistema não mistura os nomes dela com a lista antiga.

## Como usar no site

Entre normalmente. O site consulta o cadastro ao carregar a lista.
Após editar a planilha, toque em **Atualizar lista de alunos**. Esse botão busca
as alterações na hora, sem exigir outra implantação nem acesso ao Render.

A API usa cache de até um minuto para evitar consultas desnecessárias; o botão
de atualização ignora esse cache. A turma e o aluno selecionados são preservados
quando continuam cadastrados. Se o aluno foi removido, a seleção é limpa para
evitar associar uma prova à pessoa errada.

Durante uma revisão de gabarito, a atualização fica bloqueada. Termine ou
descarte essa revisão antes de trocar o cadastro. A validação de novas leituras
também consulta o cadastro atual da API, respeitando o cache de um minuto.

Se a consulta falhar, o site exibe um aviso e mantém a última lista conhecida.
Enquanto a aba nova ainda não existir, continua disponível o cadastro privado
anterior. Uma aba existente e vazia é respeitada como cadastro vazio: ela não
restaura automaticamente alunos que você removeu.

## Proteção das notas

Esta integração somente lê a aba **Alunos**. O aplicativo grava as respostas em
uma aba diferente e ignora a aba Alunos mesmo se ela estiver na primeira posição.
As fórmulas e os registros existentes não são modificados pela atualização da
lista. A planilha permanece privada, acessada pela conta de serviço já usada.

## Configuração opcional

O padrão funciona sem configurar novas variáveis no Render. Se futuramente
preferir outro arquivo de cadastro, `ALUNOS_PLANILHA_ID` permite apontar para ele;
essa planilha precisa ser compartilhada com a mesma conta de serviço.
`ALUNOS_ABA` permite mudar o nome da aba (padrão: Alunos).
