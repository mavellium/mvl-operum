> Representa uma notificação enviada a um [[Usuário]] dentro do sistema, podendo ser informativa, alerta ou de ação necessária. Utilizada para manter os usuários atualizados sobre eventos de [[Projeto]], [[Sprint]], tarefas, feedbacks ou auditorias.

---

## 🧱 Campos

- [[Usuário]] associado (usuarioId, UUID)
- Tipo de notificação (tipo, string, ex: “info”, “alerta”, “ação”)
- Título (titulo, string)
- Mensagem (mensagem, text)
- Link relacionado (link, string, opcional)
- Status de leitura (lida, boolean)
- Data de criação (createdAt, datetime)

---

## 🔗 Relacionamentos

- Uma [[Notification]] pertence a exatamente um [[Usuário]]
- Um [[Usuário]] pode ter múltiplas [[Notification]]s (1:N)
- Pode estar associada a [[Projeto]], [[Sprint]], [[Card]] ou [[Auditoria]] via link opcional

---

## ⚙️ Métodos

- criarNotification([[Usuário]], tipo, titulo, mensagem, link?)
- marcarComoLida()
- listarNotificacoes([[Usuário]], filtroLidas?)
- contarNaoLidas([[Usuário]])
- deletarNotification()
- enviarNotificacao([[Usuário]] ou grupo)

---

## 📏 Regras de Negócio

### Consistência

- Cada [[Notification]] deve estar vinculada a um [[Usuário]]
- Notificações críticas (ex: segurança, auditoria) não podem ser ignoradas sem registro
- Notificações podem ter prioridade para ordenação ou alerta visual

### Operações

- Notificações podem ser criadas por:
    - ações do usuário (ex: comentário em [[Card]])
    - sistema automaticamente (ex: fim de [[Sprint]], tarefa atrasada)
    - administradores ou gestores de [[Projeto]]
- Notificações lidas devem ser registradas para histórico e métricas

---

## 🔐 Regras de Segurança

- Cada [[Usuário]] só pode acessar suas próprias [[Notification]]s
- Administradores podem visualizar notificações de usuários de seu [[Tenant]]
- Todas ações críticas (criação, leitura, deleção) devem ser auditadas em [[Auditoria]]
- Notificações de outro [[Tenant]] não podem ser acessadas

---

## 🧪 BDD

### Criação de notificação

- Dado um evento relevante para um [[Usuário]]
- Quando gerar uma [[Notification]]
- Então deve ser registrada com status “não lida”

### Marcação como lida

- Dado um [[Usuário]] com notificações não lidas
- Quando visualizar ou marcar como lida
- Então o status da notificação é atualizado
- E o histórico de leitura é registrado

### Listagem de notificações

- Dado um [[Usuário]]
- Quando listar notificações
- Então devem aparecer apenas notificações pertencentes ao [[Usuário]]
- E podem ser filtradas por status (lida/não lida)

---

## 🧬 SDD (System Design Decisions)

- [[Notification]] fornece comunicação assíncrona e rastreável para [[Usuário]]
- Permite alertar sobre eventos do sistema e ações críticas
- Deve ser persistida para histórico e métricas de engajamento
- Integração opcional com e-mail ou push notifications
- Prioridade e tipo permitem diferentes exibições na interface

---

## 🔄 Estados

- não lida → nova notificação ainda não visualizada
- lida → usuário visualizou ou marcou como lida
- arquivada → notificação removida da visualização principal, mas mantida no histórico

---
