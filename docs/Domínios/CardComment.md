> Representa um comentário feito por um [[Usuário]] em um [[Card]]. Serve para comunicação, registro de feedback ou atualização de status da tarefa.

---

## 🧱 Campos

- Conteúdo (texto do comentário)
- [[Usuário]] que criou o comentário
- [[Card]] associado
- Data de criação (createdAt)
- Data de atualização (opcional, updatedAt)

---

## 🔗 Relacionamentos

- Um [[CardComment]] pertence a exatamente um [[Card]] (N:1)
- Um [[CardComment]] pertence a exatamente um [[Usuário]] (N:1)

---

## ⚙️ Métodos

- criarComentario([[Card]], [[Usuário]], conteudo)
- atualizarComentario(conteudo)
- removerComentario()
- listarComentarios([[Card]])
- notificarParticipantes()

---

## 📏 Regras de Negócio

### Estrutura

- O conteúdo do comentário é obrigatório
- Comentários não podem ser duplicados idênticos por mesmo [[Usuário]] no mesmo [[Card]] em menos de X minutos (para evitar spam)
- Cada comentário é registrado com timestamp para histórico

---

### Consistência

- Um [[CardComment]] só pode ser criado por [[Usuário]] associado ao [[Projeto]] do [[Card]]
- Comentários de [[Card]] arquivado ou bloqueado não podem ser adicionados
- Atualizações de comentário só podem ser feitas pelo autor ou por administrador

---

### Operações de Notificação

- Ao criar um comentário, todos os [[Usuário]] com acesso ao [[Card]] devem ser notificados via [[Notification]]
- O sistema deve evitar notificações duplicadas para o mesmo [[Usuário]]

---

## 🔐 Regras de Segurança

- Apenas [[Usuário]] associados ao [[Card]] podem criar ou editar comentários
- Remoção de comentário deve ser auditada
- Comentários não podem alterar dados críticos do [[Card]]

---

## 🧪 BDD

### Criação de comentário

- Dado um [[Usuário]] ativo e associado ao [[Projeto]] do [[Card]]
- Quando criar um [[CardComment]]
- Então o comentário deve ser registrado com timestamp
- E notificações devem ser enviadas para os demais participantes

---

### Atualização de comentário

- Dado um [[CardComment]] existente
- Quando o autor atualizar o conteúdo
- Então registrar a data de atualização
- E enviar notificação de atualização

---

### Remoção de comentário

- Dado um [[CardComment]]
- Quando o autor ou administrador remover
- Então excluir ou marcar como removido (soft delete)
- E registrar a ação em [[Auditoria]]

---

## 🧬 SDD (System Design Decisions)

- [[CardComment]] é uma extensão do [[Card]] para comunicação e registro histórico
- Todas as operações são vinculadas ao [[Usuário]] autor
- Histórico completo é mantido para auditoria e rastreabilidade
- Notificações automatizadas aumentam colaboração

---

## 🔄 Estados do CardComment

- ativo → comentário visível normalmente
- editado → comentário atualizado, mantendo histórico
- removido → soft delete, não visível no fluxo normal

---
