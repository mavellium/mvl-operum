# Especificação Técnica de Engenharia (SPEC v4) — Módulo WBS/EAP (WBSTool) — MVL Operum

> **Status:** todas as decisões abertas estão **travadas**. Nenhum `⚠️` bloqueante restante.
>
> **Decisões finais:** (1) **1 WBS por projeto**; (2) **rollup automático** de custo e duração (parentes = soma das folhas, read-only); (3) **export MSPDI** (MS Project) — Word **fora de escopo**; (4) **`code` sem `@@unique`** no banco, renumeração transacional.
>
> Marcações: **🔧** = mudança/adição vs especificação original.

---

## 0. Princípios de design

1. **`order` é a fonte de verdade da ordenação**; `code` ("1.2.1") é **derivado** e recalculado a cada mutação estrutural.
2. **`code` não é `@@unique` no banco** — unicidade lógica via `(parentId, order)`. Elimina colisão na renumeração em lote.
3. **1 WBS por projeto.** ✅ travado. A árvore persistida em `WbsNode` é a WBS do projeto; arquivos `.wbs`/XML são apenas import/export.
4. **Toda mutação estrutural roda em `$transaction`**; recálculo de `code`/`order` em memória primeiro, persistência em lote depois.
5. **O servidor é a autoridade sobre `code`.** O cliente envia operações estruturais (parent/order); o service recalcula o `code` autoritativamente. Nunca confiar em `code` vindo do cliente. 🔧
6. **Autorização por papel** (RBAC), não só sessão.
7. **Auditoria** das ações críticas via `auditoriaService`.
8. **Travessias iterativas** (sem recursão) + **limites duros** (nós/profundidade).
9. **Rollup automático:** `cost` e `durationDays` são **inputs apenas em folhas**; em nós com filhos o valor exibido é a **soma derivada** dos descendentes (read-only). Calculado em runtime, **não persistido**. 🔧

---

## 1. Software Design Description (SDD)

### 1.1 Schema (Prisma 7)

```prisma
enum WbsLayoutOrientation {
  LADO_A_LADO   // filhos lado a lado (organograma / WBS-chart)
  ABAIXO        // filhos empilhados verticalmente, alinhados ao pai
  ABAIXO_L      // filhos empilhados com conector em L
}

model WbsNode {
  id         String  @id @default(cuid())
  tenantId   String
  projetoId  String
  parentId   String?

  order      Int      // posição 0-based entre irmãos — FONTE DE VERDADE da ordenação
  code       String   // DERIVADO ("1.2.1"); recalculado pelo servidor
  title      String

  layout     WbsLayoutOrientation @default(ABAIXO)
  collapsed  Boolean  @default(false)

  style      Json     // WbsNodeStyle
  properties Json     // WbsNodeProperties

  version    Int      @default(0)   // optimistic concurrency da árvore (ver §1.5)

  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  tenant   Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  projeto  Projeto  @relation(fields: [projetoId], references: [id], onDelete: Cascade)
  parent   WbsNode? @relation("WbsHierarchy", fields: [parentId], references: [id], onDelete: Cascade)
  children WbsNode[] @relation("WbsHierarchy")

  @@unique([parentId, order])
  @@index([tenantId])
  @@index([projetoId])
  @@index([parentId])
}
```

- Adicionar relações inversas `wbsNodes WbsNode[]` em `Tenant` e `Projeto`.
- 1 WBS por projeto ⇒ no máximo **um** nó com `parentId = null` por projeto (o raiz, code "1").
- Constraint de `code`: **sem `@@unique`** (decisão final). A unicidade lógica vem de `(parentId, order)` + recálculo determinístico; a renumeração roda em `$transaction` sem risco de colisão.

### 1.2 Tipos — `types/wbs.ts`

```typescript
export type WbsLayoutOrientation = 'LADO_A_LADO' | 'ABAIXO' | 'ABAIXO_L';
export type ClipboardActionType = 'COPY' | 'CUT' | null;
export type DropPosition = 'INSIDE' | 'BEFORE' | 'AFTER';

export interface WbsNodeStyle {
  backgroundColor: string; borderColor: string; textColor: string;
  borderWidth: number; fontSize: number; borderRadius: number;
}

export interface WbsNodeProperties {
  cost?: number;            // 🔧 INPUT só em folhas; em nós-pai o valor é derivado (rollup). >= 0
  durationDays?: number;    // 🔧 antes era string. INPUT só em folhas; rollup soma os filhos. >= 0
  ownerUserId?: string;     // referência a UsuarioProjeto ativo (antes era string livre)
  description?: string;
}

// Valores derivados (não persistidos) — ver lib/wbsRollup.ts
export interface WbsRollup { cost: number; durationDays: number; isRolledUp: boolean; }

export interface WbsNodeClient {
  id: string;
  parentId: string | null;
  order: number;            // 🔧
  code: string;             // derivado
  title: string;
  layout: WbsLayoutOrientation;
  collapsed: boolean;       // 🔧
  style: WbsNodeStyle;
  properties: WbsNodeProperties;
  childrenIds: string[];    // ORDENADO por `order`
}

export interface WbsNodeGeometry { id: string; x: number; y: number; width: number; height: number; }
export interface WbsConnector { fromId: string; toId: string; path: string; }
export interface WbsLayoutResult {
  geometry: Record<string, WbsNodeGeometry>;
  connectors: WbsConnector[];
  bounds: { width: number; height: number };
}

export interface WbsViewport { zoom: number; panX: number; panY: number; } // client-only

export interface WbsHistoryEntry { nodes: Record<string, WbsNodeClient>; rootId: string | null; }

export interface WbsTreeState {
  nodes: Record<string, WbsNodeClient>;
  rootId: string | null;
  selectedNodeIds: string[];
  editingNodeId: string | null;            // 🔧 edição inline em andamento
  clipboard: { nodes: WbsNodeClient[]; copiedStyle: WbsNodeStyle | null; actionType: ClipboardActionType; };
  history: { past: WbsHistoryEntry[]; future: WbsHistoryEntry[] };
  viewport: WbsViewport;                   // 🔧
  sync: { status: 'IDLE' | 'DIRTY' | 'SAVING' | 'ERROR' | 'CONFLICT'; lastSavedAt: number | null; serverVersion: number; };
}
```

### 1.3 Fluxo (Next.js 16 App Router) — alinhado ao padrão Operum

```
components/wbs/* (Client, React 19)
   ↓ dispatch (optimistic + undo/redo)
React Context + useReducer (lib/wbsReducer.ts)
   ↓ autosave debounced (§1.5) — envia OPERAÇÕES estruturais, não codes
app/actions/wbs.ts (Server Actions FINAS)
   verifySession() → autorização RBAC (§1.6) → Zod (lib/validation/wbsSchemas.ts)
   ↓
services/wbsService.ts (Prisma + $transaction + recálculo AUTORITATIVO de code/order)
   ↓
PostgreSQL → auditoriaService → revalidatePath('/projetos/[projetoId]/wbs')
```

- **Rota:** `app/projetos/[projetoId]/wbs/page.tsx` (Server Component). Carrega via `wbsService.getTree`. Se o projeto não tiver árvore, cria o nó raiz "1" automaticamente.
- **Novos arquivos:** `services/wbsService.ts`, `lib/wbsReducer.ts`, `lib/wbsCode.ts` (recálculo puro), `lib/wbsLayout.ts` (layout puro), `lib/wbsRollup.ts` (rollup puro), `lib/wbsExportMspdi.ts` (export MS Project), `lib/validation/wbsSchemas.ts`, `app/actions/wbs.ts`, `components/wbs/*`.

### 1.4 Carga da árvore (sem N+1) 🔧

`getTree(projetoId, tenantId)`: **um único** `prisma.wbsNode.findMany({ where: { projetoId, tenantId }, orderBy: { order: 'asc' } })`, montagem da árvore em memória (map por `id`, push em `children` por `parentId`). **Não** usar includes recursivos.

### 1.5 Sincronização e concorrência

- **Autosave debounced** ~1.5s (estrutura) / ~3s (estilo).
- **Optimistic concurrency:** `save` envia `serverVersion` carregado; service compara; divergência → `CONFLICT` → UI oferece recarregar sem perder trabalho local.
- **Reconciliação de falha:** se a action falhar, reverter ao último snapshot (do `history`/servidor) e exibir toast de erro. 🔧

### 1.6 Autorização (RBAC) 🔧

- **Leitura:** qualquer membro ativo do projeto (`UsuarioProjeto.active = true`).
- **Escrita:** `role` global `admin`/`gerente`, **ou** papel de projeto com `Permission { recurso: 'wbs', acao: 'write' }`.
- A action chama um helper `requireWbsWrite(session, projetoId)` antes de qualquer mutação.

---

## 2. Matriz de Funcionalidades do Menu + Interações

> Toda action: `verifySession` → autorização → Zod → `wbsService` → auditoria (crítico) → `revalidatePath`.

| ID & Função | Comportamento | Persistência |
| :--- | :--- | :--- |
| **1.1.1 Novo Documento** | Reseta para raiz "1". Empilha estado em undo. | `wbsService.resetTree` (`$transaction`). **Auditado.** |
| **1.1.2 Abrir Documento** | Lê `.wbs` (JSON) local; valida `wbsImportSchema` (limites incl.). Substitui estado local. | Client-side até salvar. |
| **1.1.3 Salvar** | Serializa `.wbs` (Blob/download) + persiste (`saveTree`, checa `version`). | Download + DB. |
| **1.1.4 Imprimir** | `window.print()` + `@media print` (Tailwind 4): oculta nav/sidebars, expande SVG. | Visual. |
| **1.2.1–1.2.4 Recortar/Copiar/Colar** | Clone **profundo iterativo**; ao colar: novos `id`, religação de `parentId`, recálculo de `order`/`code`. CUT remove origem após colar. | Clipboard no reducer; final em `$transaction`. |
| **1.2.5 Copiar Estilo** | Captura só `WbsNodeStyle`. | Memória. |
| **1.3.1 Inserir Filho** | `parentId` = selecionado; `order` = nº filhos; code derivado. | `insertChild` (Zod + tx). **Auditado.** |
| **1.3.2 Inserir Irmão** | Mesmo `parentId`; `order` após selecionado; reordena subsequentes. | tx. **Auditado.** |
| **1.4.1–1.4.3 Organizar** | Altera `layout` do nó/subárvore; dispara recálculo geométrico (§5). | Coluna `layout`. |
| **1.5.1 Baixar Figura** | `<svg>`→XML→`.svg`; ou Canvas oculto→`.png`. | Client-side. |
| **1.5.2 Export MSPDI** | Transforma a árvore em XML MSPDI (MS Project) com rollup nos summary tasks (§7.2). | Client-side. |

### Interações que NÃO eram de menu (🔧 faltavam):

**2.6 Seleção**
- Clique = single; Ctrl/Cmd+clique = toggle; Shift+clique = range (na ordem de travessia); clique no vazio = limpa; **marquee** (arrastar no vazio) = retângulo.

**2.7 Drag-and-drop de reparenting**
- Pointer events nativos no SVG (não `@hello-pangea/dnd`, que é list-based) + hit-testing.
- Zonas de drop por nó-alvo: **INSIDE** (vira filho, append), **BEFORE/AFTER** (vira irmão na posição).
- **Prevenção de ciclo:** rejeitar drop cujo alvo seja descendente do nó arrastado (ou ele mesmo).
- Recalcula `order`/`code` da origem e do destino em `$transaction`.

**2.8 Atalhos de teclado** (editor guiado por teclado, como o wbstool)

| Tecla | Ação |
| :-- | :-- |
| `Enter` | Inserir irmão abaixo do selecionado |
| `Tab` | Inserir filho do selecionado |
| `F2` / duplo-clique | Renomear inline (usa `components/ui/InlineEdit`) |
| `Delete` / `Backspace` | Excluir nó (+ subárvore) com confirmação (`ConfirmDialog`) |
| `↑ ↓ ← →` | Navegar entre nós |
| `Ctrl/Cmd + C / X / V` | Copiar / Recortar / Colar |
| `Ctrl/Cmd + Z / Shift+Z` | Undo / Redo |
| `Ctrl/Cmd + S` | Salvar |
| `Esc` | Cancelar edição / limpar seleção |
| `+ / -` / `Ctrl+0` | Zoom in/out / reset |

**2.9 Colapsar/expandir**
- `collapsed = true` → a subárvore é **omitida do layout** (não ocupa espaço); badge com contagem de filhos ocultos no nó.

**2.10 Rollup automático de custo e duração** ✅ (decisão final) — `lib/wbsRollup.ts`

- **Input só em folhas.** No painel de propriedades, `cost`/`durationDays` são editáveis apenas em nós **sem filhos**. Nós com filhos exibem o valor **derivado**, read-only, com um indicador "Σ (rollup)".
- **Função pura** `computeRollups(nodes, rootId): Record<string, WbsRollup>`, em pós-ordem **iterativa**:
  - **Folha:** `{ cost: properties.cost ?? 0, durationDays: properties.durationDays ?? 0, isRolledUp: false }`.
  - **Nó com filhos:** `cost = Σ rollup(filho).cost`; `durationDays = Σ rollup(filho).durationDays`; `isRolledUp: true`.
- **Não persistido.** Recalculado em runtime e **memoizado** por hash da árvore. O banco guarda só os inputs das folhas. Isso evita dessincronização entre valor-pai e filhos.
- **Transição folha↔pai:** se um nó-folha tinha `cost` próprio e ganha filhos, o valor próprio passa a ser ignorado em favor do rollup (mantido no `properties` apenas como histórico, não exibido). Ao voltar a ser folha, volta a usar o próprio valor.
- **Semântica de duração:** soma simples dos dias dos descendentes (modelo de *esforço agregado*). ⚠️ **Nota técnica** (não bloqueante): este modelo não considera dependências/paralelismo; se no futuro entrarem datas de início/fim ou dependências entre nós, a duração-pai deverá migrar para *caminho crítico* (máx.), não soma.
- **Consumidores:** painel de propriedades (display), chips no nó (§6.2) e export MSPDI (§7, campos `Cost`/`Duration` dos summary tasks).

---

## 3. BDD

```gherkin
Funcionalidade: Autorização e isolamento multi-tenant
  Cenário: Membro sem permissão tenta editar
    Dado um usuário "member" sem Permission wbs:write no projeto
    Quando aciona "Inserir Filho"
    Então a action recusa por autorização e nada é persistido

  Cenário: Gerente insere filho com isolamento correto
    Dado usuário "gerente", tenant "tenant-mvl-1", membro ativo de "projeto-operum-alpha"
    Quando insere filho no raiz "node-root"
    Então persiste com tenantId/projetoId corretos
    E o "code" é recalculado pelo SERVIDOR (não confiando no cliente)
    E registra Auditoria "WBS_NODE_CREATED"

Funcionalidade: Renumeração transacional
  Cenário: Remover irmão intermediário
    Dado filhos codes "1.1","1.2","1.3" e orders 0,1,2
    Quando remove "1.2"
    Então tudo ocorre em uma transação
    E o ex-"1.3" vira order 1 / code "1.2", descendentes em cascata
    E não há violação de constraint

  Cenário: Ordenação com dois dígitos (regressão lexical)
    Dado 11 filhos "1.1".."1.11"
    Quando recarrega do banco
    Então a ordem vem por "order" (..., 1.9, 1.10, 1.11), nunca lexical

Funcionalidade: Drag-and-drop
  Cenário: Prevenção de ciclo
    Dado um nó "A" com descendente "A.1.1"
    Quando o usuário arrasta "A" para dentro de "A.1.1"
    Então o drop é rejeitado e a árvore não muda

Funcionalidade: Concorrência otimista
  Cenário: Conflito de versão
    Dado A carregou serverVersion 5 e B salvou elevando para 6
    Quando A salva com 5
    Então o service retorna CONFLICT e o cliente oferece recarregar
```

---

## 4. TDD (Vitest 4.1.2) — `__tests__/unit/wbs/`

Reducer **puro e imutável**. Casos mínimos:

- `INSERT_SIBLING` / `INSERT_CHILD` recalculam `order` e `code`.
- `DELETE_NODE` renumera irmãos e cascata sem colisão.
- Regressão lexical: 11 irmãos ordenam por `order`.
- `PASTE_STYLE` altera só estilo, preserva título/propriedades.
- `MOVE_NODE` (DnD) recalcula e **rejeita ciclo** (alvo descendente).
- `UNDO`/`REDO` restauram estrutura.
- Imutabilidade do estado anterior.
- **Rollup** (`wbsRollup.test.ts`): folha usa o próprio valor; pai = soma dos filhos (custo e dias); rollup em cascata em 3 níveis; nó que ganha filhos passa a exibir rollup e ignora valor próprio.
- **Layout** (`wbsLayout.test.ts`): subárvores irmãs em `LADO_A_LADO` não se sobrepõem; `ABAIXO` empilha; `ABAIXO_L` gera path em L correto.
- **MSPDI** (`wbsExportMspdi.test.ts`): snapshot do XML para árvore pequena; `Summary=1` em pais; `Cost`/`Duration` refletem o rollup; XML bem-formado.
- **Integração**: `saveTree` retorna `CONFLICT` em version divergente; `.wbs` acima do limite rejeitado por Zod; renumeração em tx sem violar constraint; `getTree` sem N+1; servidor ignora `code` enviado pelo cliente e recalcula.

(Exemplos de teste completos estão na v2 §4; manter e estender com `MOVE_NODE`/ciclo e rollup.)

---

## 5. Geometria e Conectores — `lib/wbsLayout.ts` (puro, iterativo)

Constantes: `W=160 H=60 DX=40 DY=60`.

- **ABAIXO:** `X_filho=X_pai`, `Y_filho[i]=Y_pai+H+DY+i*(H+DY)`.
- **ABAIXO_L:** como ABAIXO, mas `X_filho=X_pai+DX`; conector em L: `M (X_pai+W/2) (Y_pai+H) V (centro do filho) H (borda esq. do filho)`.
- **LADO_A_LADO (tidy tree, Reingold-Tilford/Walker):**
  1. Pós-ordem iterativa: `subtreeWidth = max(W, Σ larguras filhos + DX entre eles)`.
  2. Pré-ordem iterativa: filhos em `Y_pai+H+DY`, distribuídos lado a lado consumindo `subtreeWidth`; `X_pai = centro do intervalo dos filhos`.
  3. Conector: meio-inferior do pai → desce `DY/2` → barra horizontal → descidas até o meio-superior de cada filho.
- **Layout misto:** `layout` é por nó; a função compõe cada subárvore conforme seu próprio `layout`.
- **Nós colapsados** são pulados (não entram em `subtreeWidth` nem em geometria).

---

## 6. UI/UX — Editor WBS

### 6.1 Layout da tela (desktop)

```
┌─────────────────────────────────────────────────────────────┐
│ Toolbar:  [Arquivo▾][Editar▾][Inserir▾][Organizar▾][Exportar▾]│
│           ⟲ ⟳   |   + 100% -  ⤢ fit   |   ● salvo / salvando…  │
├──────────────────────────────────────────┬──────────────────┤
│                                           │  Propriedades     │
│            CANVAS (SVG, zoom/pan)         │  ── Estilo ──     │
│         árvore WBS interativa             │  fundo/borda/texto│
│                                           │  largura • raio   │
│                              ┌─────────┐  │  fonte • layout   │
│                              │ minimap │  │  ── Negócio ──    │
│                              └─────────┘  │  custo • duração  │
│                                           │  responsável(▾)   │
└──────────────────────────────────────────┴──────────────────┘
```

- **Toolbar** mapeia a §2 (menus); botões de undo/redo, controle de zoom e indicador de sync ("salvo • salvando… • erro • conflito").
- **Canvas** central com SVG; pan (espaço+arrastar ou botão do meio), zoom (roda+Ctrl / pinch), `fit-to-screen`, `100%`. **Minimap** opcional no canto para árvores grandes.
- **Painel de propriedades** lateral (some quando nada selecionado): seção **Estilo** (color pickers para fundo/borda/texto; sliders para `borderWidth`/`fontSize`/`borderRadius`; select de `layout`) e seção **Negócio** (custo com máscara de moeda; duração; **responsável** via `components/user/UserSelector` restrito a membros do projeto; descrição). Edição multi-nó aplica a todos os selecionados.

### 6.2 Anatomia do nó

```
┌───────────────────────────┐  ← borderColor / borderWidth / borderRadius
│ [1.2]  Título do elemento  │  ← code badge (canto) + título (textColor, fontSize)
│ 💰 R$ 12k   👤 Ana   ⏱ 5d │  ← chips de propriedades (só quando preenchidas)
│                       ⊟ 3  │  ← handle colapsar (⊟/⊞) + contagem de filhos ocultos
└───────────────────────────┘
   ↑ anel de foco/seleção (offset) quando selecionado
```

### 6.3 Estados

- **Vazio / primeira visita:** árvore com só o nó raiz "1" já criado + dica "Tab para filho, Enter para irmão".
- **Carregando:** skeleton do canvas.
- **Salvando:** indicador discreto na toolbar (não bloqueia edição — é otimista).
- **Erro de save:** toast + reversão ao último snapshot.
- **Conflito de versão:** modal "alguém editou esta WBS" → recarregar / manter local.

### 6.4 Microinterações

- **DnD:** preview translúcido do nó arrastado; **indicador de drop** distinto por zona (linha entre irmãos = BEFORE/AFTER; halo no nó = INSIDE); cursor "proibido" sobre alvo inválido (ciclo).
- **Re-layout:** transição suave (~150–200ms) das coordenadas ao inserir/mover/colapsar.
- **Seleção:** anel de foco; marquee com retângulo semitransparente.
- **Feedback otimista:** mutações aparecem na hora; sync ocorre em background.

### 6.5 Sistema visual (consistente com Operum / Tailwind 4)

- Reaproveitar tokens/utilitários já usados no app; nada de cores hardcoded fora do `WbsNodeStyle` do próprio nó.
- Tipografia e espaçamento dos menus/modais via Tailwind; nó renderizado no SVG usa os valores de `style`.
- Reusar `components/ui/{Button,Modal,ConfirmDialog,InlineEdit}` e `components/user/{UserSelector,UserAvatar}`.

### 6.6 Responsivo / mobile

- O app tem `BottomNav` (mobile-aware). Em telas pequenas o canvas WBS vira **modo leitura**: zoom/pan e colapsar, sem edição estrutural fina (DnD e atalhos exigem ponteiro/teclado). Edição plena = desktop/tablet com teclado.

### 6.7 Acessibilidade

- SVG com `role="tree"`; cada nó `role="treeitem"` com `aria-level`, `aria-expanded` (quando tem filhos), `aria-selected`.
- Navegação 100% por teclado (§2.8); foco visível; ordem de foco = ordem de travessia.
- Contraste mínimo AA respeitado pelos defaults de `WbsNodeStyle`; avisar no painel quando o contraste texto/fundo for insuficiente.

---

## 7. Export/Import — formatos

### 7.1 `.wbs` (interchange nativo)
JSON `{ version, rootId, nodes }` validado por `wbsImportSchema` (Zod) + limites (§8); formato versionado.

### 7.2 MS Project — MSPDI ✅ (decisão final) — `lib/wbsExportMspdi.ts`

Função pura `exportMspdi(nodes, rootId, opts): string` → string XML (UTF-8, entidades escapadas). Produz um documento `<Project>` (namespace `http://schemas.microsoft.com/project`) com um `<Tasks>` contendo um `<Task>` por nó, em **pré-ordem** (DFS). `UID`/`ID` = inteiro sequencial começando em 1.

**Mapeamento campo-a-campo:**

| `<Task>` (MSPDI) | Origem no `WbsNode` |
| :-- | :-- |
| `UID`, `ID` | índice sequencial em pré-ordem (1..N) |
| `Name` | `title` |
| `WBS` | `code` |
| `OutlineNumber` | `code` |
| `OutlineLevel` | profundidade (raiz = 1) |
| `Summary` | `1` se tem filhos, senão `0` |
| `Cost` | `computeRollups(...)[id].cost` (rollup §2.10) — decimal |
| `Duration` | `durationDays → "PT{dias*hoursPerDay}H0M0S"` |
| `DurationFormat` | `7` (dias) |
| `Notes` | `properties.description` (opcional) |

**Detalhes:**
- `opts.hoursPerDay` (default **8**) converte `durationDays` para a duração de trabalho ISO (`PT40H0M0S` para 5 dias). ⚠️ **Validar contra um import real do MS Project** — `Cost` (unidade/moeda) e o cálculo de duração de summary tasks são os pontos sensíveis do MSPDI; ajustar `hoursPerDay`/`Calendar` se necessário.
- Cabeçalho mínimo do `<Project>`: `SaveVersion`, `Name` (= nome do projeto), `CurrencyCode` (do tenant, se houver). Sem links de dependência (o modelo não os tem).
- **Teste:** snapshot do XML gerado para uma árvore pequena (3–4 nós) + validação de boa-formação XML.

> **Word:** **fora de escopo** nesta versão (não solicitado). Removido o item 1.5.3 de export Word da matriz; manter só `.svg`/`.png`/`.wbs`/MSPDI.

---

## 8. Limites e nomenclatura

- **Limites (padrões finais; ajustáveis em config):** ≤ 5.000 nós/projeto; profundidade ≤ 20; `.wbs` ≤ 5 MB. Validados no import (Zod) e na inserção.
- **Nomenclatura:** alinhar ao schema existente — domínio em pt (`wbsService`, `wbsSchemas`, `app/actions/wbs.ts`, `projetoId`).

---

## 9. Performance

- Nó memoizado (`React.memo`) recebendo só seu `WbsNodeClient` + geometria via seletor; ou store com seletores (Zustand) por baixo do reducer puro.
- `computeLayout` memoizado por hash da árvore + layouts.
- Culling/virtualização do que está fora do viewport no SVG; minimap.

---

## 10. Checklist de implementação (ordem)

1. Migration `WbsNode` (+ relações inversas; **sem `@@unique` em `code`**).
2. `types/wbs.ts`.
3. `lib/wbsCode.ts` (recálculo puro de order/code).
4. `lib/wbsRollup.ts` (rollup puro custo/duração). Testes.
5. `lib/wbsReducer.ts` (+ undo/redo, MOVE_NODE com prevenção de ciclo). Testes.
6. `lib/wbsLayout.ts` (3 orientações, iterativo). Testes.
7. `lib/validation/wbsSchemas.ts` (payloads + `.wbs` + limites).
8. `services/wbsService.ts` (getTree sem N+1, mutações tx, recálculo autoritativo de code, import/export, concorrência).
9. `app/actions/wbs.ts` (sessão + RBAC + Zod + service + auditoria + revalidate).
10. `app/projetos/[projetoId]/wbs/page.tsx` + `components/wbs/*` (canvas SVG, toolbar, painel de propriedades com inputs de custo/duração só em folhas, DnD por pointer events, atalhos, zoom/pan, minimap).
11. Export `.svg`/`.png`/`.wbs`; depois `lib/wbsExportMspdi.ts` (MSPDI). Testes.
12. `@media print`.
13. Integração/e2e (DnD, conflito, N+1, autoridade de code, rollup, MSPDI).