# Especificação Técnica — Ajustes e Melhorias Operum (Documento 06, 24-08-26)

> **Escopo:** 6 melhorias solicitadas no documento de ajustes. Consistente com a arquitetura do Operum (Next.js 16, React 19, Prisma 7, Tailwind 4, Zod 4.3.6, Vitest 4.1.2, multi-tenant via `verifySession`, actions finas + services + auditoria).
>
> Marcações: **✅** decidido • **⚠️ DECISÃO** pendente • **🔧** detalhe derivado dos modelos anexos.

## Índice das 6 features
1. Cadastros globais de Funções e Departamentos (associação por projeto)
2. EAP — botão encolher/expandir reposicionado (−/+ na base do card)
3. EAP — corrigir layouts do menu Organizar
4. Atas de reunião (múltiplas por projeto)
5. Planilha de Custos derivada da EAP
6. Tela de Login — remover publicidade Mavellium; adicionar "Equipe de Desenvolvimento"

---

## 1. Cadastros globais de Funções e Departamentos

**Problema atual:** funções e departamentos são cadastrados projeto a projeto, duplicando trabalho.

**Objetivo:** um cadastro **único por tenant** de Funções e Departamentos; cada projeto apenas **associa** os que usará.

### 1.1 Modelo de dados
O tenant já tem `Departamento`/`Role`. Ajustar para o padrão catálogo-global + associação:

- **Catálogo global (escopo tenant):** `Departamento { id, tenantId, nome }` e `Funcao`/`Role` com `escopo = TENANT`. (Já existem — garantir que são globais, não por projeto.)
- **Associação por projeto (tabelas de junção):**

```prisma
model ProjetoDepartamento {
  id            String @id @default(cuid())
  projetoId     String
  departamentoId String
  @@unique([projetoId, departamentoId])
}

model ProjetoFuncao {
  id        String @id @default(cuid())
  projetoId String
  funcaoId  String    // ou roleId, conforme o modelo de Role escopo PROJETO existente
  @@unique([projetoId, funcaoId])
}
```

> ⚠️ DECISÃO: se `UserProjectRole`/`Role(escopo=PROJETO)` já cobre "funções por projeto", **reutilizar** em vez de criar `ProjetoFuncao`. O agente deve inspecionar o schema antes e escolher: (a) associação leve nova, ou (b) reaproveitar o RBAC existente. Recomendo reaproveitar o que já existe para Funções (RBAC) e criar só `ProjetoDepartamento`.

### 1.2 Telas
- **Admin → Cadastros globais** (nova área, ex.: `/admin/cadastros`): CRUD de Funções e Departamentos do tenant.
- **`/projetos/:id/departamentos`** e **`/projetos/:id/funcoes`** (já existem): trocar o CRUD local por um **seletor de associação** — multiselect que lista o catálogo global e marca os associados ao projeto. Adicionar = cria junção; remover = apaga junção (não apaga o cadastro global).

### 1.3 Regras
- Admin gerencia o catálogo global; gerente do projeto só associa/desassocia.
- Remover um item do catálogo global exige que nenhum projeto o utilize (ou soft-block com aviso). ⚠️ DECISÃO: bloquear ou cascatear. Recomendo **bloquear** com mensagem.
- Migração de dados: consolidar os cadastros duplicados hoje existentes em cada projeto num catálogo único (script de migração idempotente, deduplicando por `nome`). 🔧

---

## 2. EAP — botão encolher/expandir reposicionado

**Pedido literal:** o símbolo `–` deve ficar na **parte inferior do retângulo** (hoje está dentro, canto superior direito). **Não** exibir a quantidade de itens encolhidos. Ao encolher, trocar `–` por `+`.

### 2.1 Mudanças (WbsCanvas / componente de nó SVG)
- Remover o badge de contagem de filhos ocultos (o "⊟ 3" da spec da EAP): **não exibir quantidade**. 🔧 (contradiz a versão anterior da EAP — este documento é a fonte da verdade agora)
- Posicionar o toggle **centralizado na borda inferior** do card, meio para fora (estilo "pílula" na base), não dentro do retângulo.
- Ícone: `−` quando expandido, `+` quando `collapsed = true`.
- Só renderizar o toggle em nós **com filhos**.
- Área de clique confortável (≥ 16×16px) e `cursor: pointer`; `stopPropagation` para não iniciar pan/seleção.
- Comportamento de colapso (ocultar subárvore do layout) permanece como já implementado — muda **só a posição e o ícone**, e remove a contagem.

---

## 3. EAP — corrigir layouts do menu Organizar

**Pedido:** acertar os layouts de visualização (referência: vídeo wbstool, modo organograma). O modelo visual está na **Imagem 2** (EAP "Pintar uma sala"): raiz à esquerda (texto vertical), macrofases na coluna do meio, atividades empilhadas à direita, conectores horizontais em cotovelo.

### 3.1 Três layouts (revisar `lib/wbsLayout.ts`)
- **Lado a Lado** (`LADO_A_LADO`): organograma clássico — filhos dispostos horizontalmente abaixo do pai, com algoritmo de largura de subárvore (tidy-tree) para não sobrepor. Já especificado; **validar** que não sobrepõe em árvores largas.
- **Abaixo** (`ABAIXO`): filhos empilhados verticalmente, alinhados ao pai.
- **Abaixo com conector em L** (`ABAIXO_L`): o layout da Imagem 2 — pai à esquerda, filhos empilhados à direita indentados, conector em cotovelo (sai do meio-direito do pai, desce/sobe e entra na borda esquerda do filho). 🔧

### 3.2 Correção principal
O bug reportado é que os layouts não batem com o esperado. Priorizar o **conector em L / cotovelo** da Imagem 2: linha que sai da lateral direita do pai, faz o "degrau" e conecta na lateral esquerda de cada filho — não linha reta diagonal. Recalcular geometria por nó conforme `layout` (misto permitido).

> Referência de tempo do vídeo (0:47) mostra a troca entre os modos — o resultado esperado é a troca instantânea de disposição preservando a árvore.

---

## 4. Atas de reunião (múltiplas por projeto)

**Pedido:** recurso de criação de Atas, **mais de uma por projeto** (tipicamente 1+ por mês). Modelo anexo (documentos de ata) define os campos exatos.

### 4.1 Estrutura da ata (extraída do modelo) 🔧
Campos fixos do cabeçalho + seções:
- **Número** da ata (sequencial por projeto: 01, 02, …)
- **Nome do projeto** (herda do projeto)
- **Local**, **Data**
- **Elaborado por** (nome + função), **Aprovado por** (nome do gerente + função)
- **I. Relação dos presentes** — lista de `{ nome, setor/empresa }`
- **II. Assuntos tratados** — texto livre
- **III. Decisões tomadas** — texto livre
- **IV. Ações a serem empreendidas** — lista de `{ acao, prazo, responsavel }`
- **Documentos anexos** — lista
- **Enviar cópias para** — lista de e-mails
- **Assinaturas** — lista dos principais envolvidos
- **Observações** — texto livre

### 4.2 Modelo de dados
```prisma
model Ata {
  id          String   @id @default(cuid())
  tenantId    String
  projetoId   String
  numero      Int      // sequencial por projeto
  nomeProjeto String
  local       String?
  data        DateTime
  elaboradoPor String
  aprovadoPor  String?
  assuntosTratados String?  @db.Text
  decisoesTomadas  String?  @db.Text
  observacoes      String?  @db.Text
  copiasPara       String[] // e-mails
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  presentes AtaPresente[]
  acoes     AtaAcao[]
  anexos    AtaAnexo[]

  @@unique([projetoId, numero])
  @@index([tenantId]) @@index([projetoId])
}

model AtaPresente { id String @id @default(cuid()) ataId String; nome String; setorEmpresa String? }
model AtaAcao     { id String @id @default(cuid()) ataId String; acao String; prazo DateTime?; responsavel String? }
model AtaAnexo    { id String @id @default(cuid()) ataId String; nome String; url String? } // MinIO
```

### 4.3 Telas e ações
- **`/projetos/:id/atas`** — lista das atas do projeto (número, data, elaborado por), botão "Nova ata".
- **`/projetos/:id/atas/nova`** e **`/atas/:ataId`** — formulário com todas as seções acima; linhas dinâmicas em presentes/ações/anexos.
- `numero` auto-incrementa por projeto no service (dentro de transação, para evitar corrida).
- Server Actions: `criarAta`, `atualizarAta`, `removerAta` (padrão: verifySession → autorização → Zod → `ataService` → auditoria → revalidate).
- **Exportar ata** para `.docx` reproduzindo o layout do modelo (tabela). ⚠️ DECISÃO: gerar `.docx` server-side (recomendado, usar a skill docx no backend) ou só imprimir via `@media print`. Recomendo `.docx` + botão imprimir.
- Autorização: membros do projeto criam/editam; remover só gerente/admin.

---

## 5. Planilha de Custos derivada da EAP

**Pedido:** gerar a planilha de custos **a partir da EAP/WBS** do projeto, conforme modelo. O modelo converte **tempo → custo** usando o salário mínimo como referência.

### 5.1 Lógica de cálculo (extraída das fórmulas do modelo) 🔧
Parâmetros do projeto:
- `valorReferencia` = salário mínimo vigente (no modelo: R$ 1.621,00). ⚠️ DECISÃO: fixo por projeto (campo editável) ou global do tenant. Recomendo **campo editável no projeto**, default = último salário mínimo cadastrado no tenant.
- `horasPorDia` = jornada (modelo: 8).

Derivação de custo (idêntica ao modelo):
```
valorPorDia    = valorReferencia / 30
valorPorHora   = valorPorDia / horasPorDia
valorPorMinuto = valorPorHora / 60
custoAtividade = (tempoMinutos × valorPorMinuto) + custoMateriais
```

Para cada atividade (folha da EAP):
- **Tempo** informado em minutos → derivar horas (`min/60/horasPorDia` em "dias de trabalho") e custo.
- **Valor Orçado** vs **Valor Realizado**: duas colunas de tempo/custo (previsto e real), cada uma com sua data.
- **Situação/Status**: comparação previsto × realizado (ex.: Antecipada / No prazo / Atrasada).

Agregações (rollup, já existe na EAP):
- Subtotal por **macrofase** (nó de nível 1.x) = soma das atividades filhas.
- **Total geral** = soma das macrofases.
- Quadros-resumo: custo orçado × real por fase; tempo orçado × real por fase; distribuição de atividades por elaborador (%).

### 5.2 Origem dos dados
- **Estrutura (fases/atividades e códigos):** vem direto da árvore EAP do projeto (macrofase = nó nível 1.x, atividade = folha).
- **Tempo/materiais/datas/responsável/elaborador:** campos por atividade. Parte já existe em `WbsNodeProperties` (`durationDays`, `cost`, `ownerUserId`). 🔧 **Adicionar** ao `properties` da folha os campos que faltam para custo: `tempoMinutos`, `materiais`, `dataPrevista`, `tempoRealMinutos`, `materiaisReal`, `dataRealizacao`, `elaboradoPor`. ⚠️ DECISÃO: estender `WbsNodeProperties` (custo passa a ser derivado de tempo, não input livre) — ver §5.4.

### 5.3 Telas e export
- **`/projetos/:id/custos`** — tabela gerada a partir da EAP, agrupada por macrofase, com subtotais e total; quadros-resumo (usar Recharts para os gráficos de fase/elaborador).
- **Editar por atividade:** tempo previsto/real, materiais, datas, elaborador — atualiza o `properties` do nó da EAP correspondente.
- **Exportar `.xlsx`** reproduzindo o modelo (aba "Dados" + resumos). Usar a skill xlsx no backend, com **fórmulas nativas** (não valores hardcoded) para o cliente poder ajustar. 🔧
- Botão "Recalcular a partir da EAP" — re-sincroniza a lista de atividades se a árvore mudou.

### 5.4 Integração com o rollup da EAP ⚠️ DECISÃO importante
Hoje a EAP tem `cost` como input em folhas + rollup. O modelo de custos **deriva** custo do tempo. Alinhar:
- **Recomendado:** em folhas, o input passa a ser **tempo (minutos) + materiais**; `cost` da folha vira **derivado** (`tempo × valorPorMinuto + materiais`). O rollup de custo/duração continua somando para os pais. Isso unifica EAP e Planilha numa fonte única de verdade e elimina divergência.
- Isso **altera** o painel de propriedades da EAP (campo de custo direto → campos de tempo/materiais). Confirmar antes de implementar, pois mexe na feature de EAP já pronta.

---

## 6. Tela de Login — Equipe de Desenvolvimento

**Pedido:** remover a publicidade "powered by Mavellium" da tela de login e, no lugar, adicionar no menu um item **"Equipe de Desenvolvimento"** que abre uma tela com os integrantes da empresa **apresentados como alunos**.

### 6.1 Mudanças
- **Remover** o "powered by Mavellium" do `AuthBrandPanel` / tela de login.
- **Adicionar** rota pública **`/equipe`** (ou `/equipe-desenvolvimento`) linkada a partir do login e/ou de um menu.
- Tela de equipe: grid de cards dos integrantes, cada um com foto, nome, papel no projeto e identificação como aluno (curso/termo — ex.: "Fatec Garça — Gestão Empresarial"). Tom institucional/acadêmico, não publicitário. 🔧
- ⚠️ DECISÃO: os dados da equipe (nomes, fotos, papéis) precisam ser fornecidos por você — deixar um array/config editável (`lib/equipe.ts`) para preenchimento posterior; começar com placeholders.
- Manter tema claro e a linguagem visual do resto do Operum. Acessibilidade: alt nas fotos, navegação por teclado.

---

## 7. Estrutura de pastas do projeto (Imagem 1) — nota

A Imagem 1 lista a estrutura de pastas padrão do projeto (01-CAPA … 19-OUTROS DOCS), incluindo **05-EAP'S**, **06-ATAS** e **17-PLANILHA DE CUSTOS**. Isso **contextualiza** as features 2–5 (a EAP, as atas e a planilha são artefatos dessa estrutura), mas o documento de ajustes **não pede** para implementar o sistema de pastas agora.

> ⚠️ DECISÃO: implementar um módulo de "Documentos do projeto" espelhando essas 19 pastas (armazenamento MinIO por categoria) está **fora do escopo deste documento**, mas é o próximo passo natural. Sinalizar como backlog, não implementar aqui salvo confirmação.

---

## 8. BDD (cenários-chave)

```gherkin
Funcionalidade: Cadastro global de departamentos
  Cenário: Associar departamento existente a um projeto
    Dado um departamento "Financeiro" no catálogo do tenant
    Quando o gerente associa "Financeiro" ao projeto X
    Então cria-se ProjetoDepartamento(projeto X, Financeiro)
    E o catálogo global permanece intacto

Funcionalidade: Planilha derivada da EAP
  Cenário: Custo de atividade calculado a partir do tempo
    Dado valorReferencia 1621, horasPorDia 8
    E uma atividade folha "1.1.1" com tempoMinutos 60 e materiais 0
    Quando a planilha é gerada
    Então valorPorMinuto = (1621/30/8/60)
    E o custo da atividade = 60 × valorPorMinuto
    E a macrofase 1.1 soma os custos das suas atividades

Funcionalidade: Múltiplas atas por projeto
  Cenário: Numeração sequencial
    Dado um projeto com atas 01 e 02
    Quando uma nova ata é criada
    Então recebe numero 03 dentro de uma transação sem colisão

Funcionalidade: Encolher nó da EAP
  Cenário: Toggle na base do card
    Dado um nó com filhos, expandido
    Quando o usuário clica no botão na borda inferior
    Então a subárvore é ocultada, o ícone vira "+", sem exibir contagem
```

---

## 9. TDD (Vitest)
- **Custos:** `custosCalc.test.ts` — `valorPorMinuto`, `custoAtividade`, subtotais por macrofase, total geral, % por elaborador (reproduzir números do modelo: total orçado ≈ 58,84 e real ≈ 22,51 para o dataset de exemplo).
- **Atas:** numeração sequencial transacional; export docx bem-formado.
- **Cadastros globais:** associar/desassociar não afeta catálogo; bloqueio ao remover item em uso.
- **EAP layout:** conector em L bate com a geometria da Imagem 2; toggle só em nós com filhos; ícone −/+.
- **Login:** ausência de "Mavellium"; rota `/equipe` renderiza a lista.

---

## 10. Dados fictícios da planilha (a criar a partir da EAP)

O modelo usa a EAP "Girassol em ação". Para os testes/seed, gerar dados fictícios **derivados de uma EAP** (ex.: a EAP "Pintar uma sala" da Imagem 2), atribuindo a cada atividade folha: tempoMinutos, materiais, elaborador e datas previsto/real plausíveis. O custo **não** é inventado — é sempre `tempo × valorPorMinuto + materiais`, para bater com a lógica do modelo. 🔧

---

## 11. Checklist de implementação (ordem sugerida)
1. **Cadastros globais** (Funções/Departamentos + associação por projeto) + migração de deduplicação.
2. **EAP toggle** (reposicionar −/+ na base, remover contagem).
3. **EAP layouts** (corrigir Organizar, conector em L da Imagem 2).
4. **Atas** (modelo de dados + telas + numeração + export docx).
5. **Custos** (estender properties da folha; cálculo tempo→custo; tela + export xlsx com fórmulas; integração com rollup da EAP — §5.4).
6. **Login/Equipe** (remover Mavellium; rota `/equipe`).

Cada item: migration → tipos → lógica pura + testes → service → action (verifySession + Zod + auditoria + revalidate) → UI → build. Parar e validar a cada feature.
