> Representa o feedback fornecido por um [[Usuário]] sobre uma [[Sprint]], incluindo tarefas realizadas, dificuldades encontradas e avaliações de qualidade e dificuldade. Utilizado para retrospectivas, aprendizado contínuo e análise de performance.

---

## 🧱 Campos

- [[Sprint]] associado (sprintId, UUID)
- [[Usuário]] associado (usuarioId, UUID)
- Tarefas realizadas (tarefasRealizadas, text)
- Dificuldades encontradas (dificuldades, text)
- Avaliação de qualidade (qualidade, int, ex: 1-5)
- Avaliação de dificuldade (dificuldade, int, ex: 1-5)
- Data de criação (createdAt, datetime)

---

## 🔗 Relacionamentos

- Um [[SprintFeedback]] pertence a exatamente um [[Sprint]]
- Um [[SprintFeedback]] pertence a exatamente um [[Usuário]]
- Uma [[Sprint]] pode ter múltiplos [[SprintFeedback]]s (um por usuário)
- Um [[Usuário]] pode fornecer múltiplos [[SprintFeedback]]s em diferentes [[Sprint]]

---

## ⚙️ Métodos

- criarFeedback([[Sprint]], [[Usuário]], tarefasRealizadas, dificuldades, qualidade, dificuldade)
- atualizarFeedback(tarefasRealizadas?, dificuldades?, qualidade?, dificuldade?)
- listarFeedbackPorSprint([[Sprint]])
- listarFeedbackPorUsuario([[Usuário]])
- calcularMediaQualidade([[Sprint]])
- calcularMediaDificuldade([[Sprint]])

---

## 📏 Regras de Negócio

### Consistência

- Cada [[Usuário]] só pode criar um [[SprintFeedback]] por [[Sprint]]
- Avaliações (qualidade/dificuldade) devem estar dentro do intervalo permitido (ex: 1-5)
- Feedback deve estar vinculado a [[Sprint]] ativa ou finalizada
- Alterações no feedback devem ser auditadas

### Operações

- Feedbacks são utilizados para gerar métricas médias da sprint (ex: `avaliacaoMediaQualidade` e `avaliacaoMediaDificuldade`)
- Permite análise de melhoria contínua e retrospectivas
- Feedbacks podem ser acessados por administradores, líderes de projeto e o próprio usuário

---

## 🔐 Regras de Segurança

- Apenas usuários pertencentes ao [[Sprint]] podem criar ou atualizar seu feedback
- Administradores podem visualizar todos os feedbacks
- Todas as alterações são auditadas em [[Auditoria]]
- Feedbacks não podem ser alterados por usuários de outros [[Tenant]]

---

## 🧪 BDD

### Criação de feedback

- Dado um [[Usuário]] participante de uma [[Sprint]]
- Quando enviar feedback com tarefas realizadas e avaliações
- Então o [[SprintFeedback]] é registrado
- E as métricas médias da sprint são recalculadas

### Atualização de feedback

- Dado um [[Usuário]] com feedback existente
- Quando atualizar tarefas ou avaliações
- Então o feedback é atualizado
- E as métricas médias da [[Sprint]] são recalculadas

### Visualização de feedback

- Dado um [[Usuário]] ou administrador autorizado
- Quando consultar feedback de uma [[Sprint]]
- Então exibir todas informações e métricas relevantes

---

## 🧬 SDD (System Design Decisions)

- [[SprintFeedback]] é a fonte principal de avaliação qualitativa da sprint
- Permite medir performance subjetiva (qualidade, dificuldade) junto às métricas objetivas de [[DashboardMetric]]
- Deve ser armazenado de forma imutável ou com histórico, garantindo rastreabilidade
- Integra-se com relatórios de desempenho, retrospectivas e análise de equipe

---

## 🔄 Estados

- pendente → feedback iniciado, mas não enviado
- enviado → feedback finalizado e registrado
- atualizado → feedback alterado pelo usuário antes do fechamento da sprint

---
