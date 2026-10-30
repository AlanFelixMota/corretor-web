# Validação da versão 2.4

## Resultado

- 82 testes da API aprovados localmente em Python 3.12.
- 23 testes do site aprovados localmente em Node 24, incluindo integração com
  DOM, câmera/canvas e rede simulados; o contador de estabilidade é o real.
- As suítes anteriores continuam cobrindo orientação, marcas claras, sessão,
  cadastro, destino exato, valores RAW, revisão e proteção contra duplicação.
- Novos cenários: prova em dupla; mesma resposta nos dois registros; alunos
  repetidos/de outra turma rejeitados; participantes não alteráveis no salvar;
  uma operação de gravação para a dupla; timeout, retorno parcial e dois envios
  simultâneos sem novo append; manual sem foto; mancha/grade inválida abrindo
  manual; rede indisponível sem fallback automático; todas as questões manuais
  exigindo escolha; fonte já carregada sem consulta na captura; progresso sem
  leitura extra depois do sucesso; uma etapa de tela por vez.

## Desempenho medido

Medição local isolada com a mesma foto fornecida, cinco respostas A. Sete
execuções por configuração, descartando a primeira; mediana das seis restantes:

| Configuração | Mediana do processamento |
|---|---:|
| 2.3, OpenCV com oito threads | 573,4 ms |
| 2.3, OpenCV com uma thread | 641,2 ms |
| 2.4, OpenCV com uma thread | 197,45 ms |

O ganho observado é de cerca de 66% frente à configuração anterior com oito
threads. As respostas permaneceram A,A,A,A,A. Trata-se do processamento local,
sem upload, download, Google Sheets, inicialização do Render ou câmera física.
Não implica que a latência total no celular caiu na mesma proporção.
A foto real não faz parte dos repositórios.

## Escopo da verificação

Nenhuma credencial real foi usada nos testes. Não houve gravação, edição ou
exclusão de notas nas planilhas reais. O Google é substituído por uma planilha
simulada, inclusive nos cenários de envio parcial e resultado incerto.

Os workflows verificam a API em Python 3.12 e 3.14 e o site em Node 24. Conferir
os Checks antes de mesclar; os workflows não configuram proteção de branch.
O teste físico no celular e a percepção de rolagem precisam de validação após
uma publicação autorizada. Revisão e confirmação continuam obrigatórias.

## Operação

Liberar API 2.4 antes do site 2.4. Não há nova variável obrigatória, coluna ou
migração na planilha. A dupla gera duas linhas com o mesmo conjunto de respostas,
uma por aluno, na aba exata Respostas Lidas. Gravação incerta nunca é repetida
automaticamente. Conferir todos os alunos envolvidos antes de reenviar.

O progresso é atualizado pelo recibo de gravação e pode ser relido manualmente.
Copiar/zerar a planilha segue sendo o processo entre unidades. O armazenamento
SQLite continua temporário, e recuperação de rascunhos após reinício não foi
incluída nesta versão.
