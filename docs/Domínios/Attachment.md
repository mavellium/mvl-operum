> Representa arquivos anexados a um [[Card]], podendo ser documentos, imagens ou outros tipos de mídia. Permite centralizar informações e evidências relacionadas a tarefas.

---

## 🧱 Campos

- [[Card]] associado (cardId, UUID)
- Nome do arquivo (fileName, string)
- Tipo de arquivo (fileType, string)
- Caminho ou URL do arquivo (filePath, string)
- Tamanho do arquivo em bytes (fileSize, int)
- Flag de capa (isCover, boolean)
- Data de criação (createdAt, datetime)

---

## 🔗 Relacionamentos

- Um [[Attachment]] pertence a exatamente um [[Card]]
- Um [[Card]] pode ter muitos [[Attachment]]s

---

## ⚙️ Métodos

- adicionarAttachment([[Card]], arquivo)
- removerAttachment([[Card]], [[Attachment]])
- definirComoCapa([[Attachment]])
- listarAttachmentsPorCard([[Card]])
- baixarAttachment([[Attachment]])

---

## 📏 Regras de Negócio

### Consistência

- Um [[Attachment]] deve sempre estar vinculado a um [[Card]] existente
- Apenas um [[Attachment]] por card pode ser marcado como capa (isCover = true)
- Tipos de arquivo podem ser restritos por política do [[Tenant]]
- O tamanho do arquivo deve respeitar limites de armazenamento do [[Tenant]]

---

### Operações

- Adicionar um attachment cria registro em [[Attachment]] e armazena arquivo no storage definido
- Remover attachment remove o registro e opcionalmente o arquivo do storage
- Alterar capa deve atualizar a flag isCover de outros attachments do card

---

## 🔐 Regras de Segurança

- Apenas [[Usuário]] com permissão de edição no [[Card]] podem adicionar ou remover attachments
- Upload de arquivos deve ser escaneado para segurança (malware, tipos permitidos)
- Toda ação crítica deve gerar entrada em [[Auditoria]]

---

## 🧪 BDD

### Adicionar attachment

- Dado um [[Card]] existente
- Quando um [[Usuário]] autorizado fizer upload
- Então criar registro [[Attachment]]
- E armazenar arquivo no storage

---

### Remover attachment

- Dado um [[Attachment]] existente
- Quando o [[Usuário]] autorizado remover
- Então deletar registro [[Attachment]]
- E remover arquivo do storage se aplicável

---

### Definir capa

- Dado vários [[Attachment]]s em um [[Card]]
- Quando marcar um como capa
- Então atualizar isCover do attachment
- E resetar isCover dos demais attachments do card

---

## 🧬 SDD (System Design Decisions)

- [[Attachment]] é uma extensão do [[Card]] para centralizar evidências e arquivos
- Mantém integridade referencial com [[Card]]
- Suporta filtros, visualizações e downloads por [[Usuário]] autorizado
- Sistema de storage pode ser local ou cloud, integrável via path/filePath

---

## 🔄 Estados

- ativo → attachment disponível e associado ao card
- removido → soft delete, histórico mantido para auditoria