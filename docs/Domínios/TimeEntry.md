> Representa o registro de tempo dedicado por um [[Usuário]] a um [[Card]] específico. Permite rastrear esforço, gerar métricas de produtividade e calcular custos.

---

## 🧱 Campos

- [[Usuário]] associado (usuarioId, UUID)
- [[Card]] associado (cardId, UUID)
- Início do registro (startedAt, datetime)
- Fim do registro (endedAt, datetime)
- Duração em minutos ou segundos (duration, int)
- Flag de registro em andamento (isRunning, boolean)
- Flag de registro manual (isManual, boolean)
- Data de criação (createdAt, datetime)

---

## 🔗 Relacionamentos

- Um [[TimeEntry]] pertence a exatamente um [[Usuário]]
- Um [[TimeEntry]] pertence a exatamente um [[Card]]
- Um [[Card]] pode ter múltiplos [[TimeEntry]]s
- Um [[Usuário]] pode ter múltiplos [[TimeEntry]]s

---

## ⚙️ Métodos

- iniciarRegistro([[Usuário]], [[Card]])
- pausarRegistro([[TimeEntry]])
- finalizarRegistro([[TimeEntry]])
- editarRegistro([[TimeEntry]], dados)
- deletarRegistro([[TimeEntry]])
- calcularDuracao([[TimeEntry]])
- listarRegistrosPorCard([[Card]])
- listarRegistrosPorUsuario([[Usuário]])

---

## 📏 Regras de Negócio

### Consistência

- Um [[TimeEntry]] deve estar sempre vinculado a [[Usuário]] e [[Card]] existentes
- Um [[Usuário]] não pode ter múltiplos [[TimeEntry]]s em andamento para o mesmo [[Card]]
- A duração calculada deve ser positiva
- Registros manuais podem ter duração definida pelo [[Usuário]]

### Operações

- Iniciar um registro cria um [[TimeEntry]] com isRunning = true
- Finalizar registro atualiza endedAt, calcula duration e seta isRunning = false
- Edições de registros devem ser auditadas
- Exclusão deve respeitar permissões e manter histórico para auditoria

---

## 🔐 Regras de Segurança

- Apenas [[Usuário]] associados ao [[Card]] podem criar ou editar [[TimeEntry]]
- Ações críticas (criação, edição, exclusão) devem gerar entrada em [[Auditoria]]
- Registros não podem ser alterados por [[Usuário]] sem permissão adequada

---

## 🧪 BDD

### Iniciar registro de tempo

- Dado um [[Usuário]] autorizado
- Quando iniciar [[TimeEntry]] em um [[Card]]
- Então criar registro com isRunning = true
- E registrar startedAt

### Finalizar registro de tempo

- Dado um [[TimeEntry]] em andamento
- Quando finalizar
- Então atualizar endedAt
- E calcular duration
- E marcar isRunning = false

### Edição de registro

- Dado um [[TimeEntry]] existente
- Quando [[Usuário]] autorizado editar
- Então atualizar campos permitidos
- E registrar alteração em [[Auditoria]]

---

## 🧬 SDD (System Design Decisions)

- [[TimeEntry]] permite rastrear esforço e gerar métricas financeiras e de produtividade
- Registros em andamento são tratados separadamente para evitar conflitos
- Suporta relatórios por [[Usuário]], [[Card]] e [[Sprint]]
- Integração com [[DashboardMetric]] para consolidar horas e custos

---

## 🔄 Estados

- em andamento → isRunning = true
- finalizado → isRunning = false, duration calculado
- removido → soft delete, mantido para auditoria