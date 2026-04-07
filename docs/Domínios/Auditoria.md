> Representa o registro de todas ações críticas realizadas no sistema, garantindo rastreabilidade, segurança e compliance dentro de cada [[Tenant]].

---

## 🧱 Campos

- [[Tenant]] associado (tenantId, UUID)
- [[Usuário]] que realizou a ação (usuarioId, UUID)
- Ação realizada (acao, string, ex: “login”, “alteração de status”, “criação de projeto”)
- Entidade afetada (entidade, string, ex: “Usuario”, “Projeto”)
- ID da entidade afetada (entidadeId, UUID)
- Data e hora do evento (timestamp, datetime)
- Detalhes adicionais (detalhes, json)

---

## 🔗 Relacionamentos

- Uma [[Auditoria]] pertence a exatamente um [[Tenant]]
- Uma [[Auditoria]] pertence a exatamente um [[Usuário]] que realizou a ação
- Um [[Tenant]] pode ter múltiplas [[Auditoria]]s (1:N)
- Um [[Usuário]] pode ter múltiplas [[Auditoria]]s (1:N)

---

## ⚙️ Métodos

- registrarAcao([[Usuário]], acao, entidade, entidadeId, detalhes?)
- listarAuditorias([[Tenant]] ou [[Usuário]], filtros?)
- exportarAuditorias([[Tenant]] ou período, formato?)
- buscarAuditoria(entidade, entidadeId)

---

## 📏 Regras de Negócio

### Consistência

- Toda ação crítica no sistema deve ser registrada
- Entidades afetadas podem ser qualquer objeto do sistema (ex: [[Projeto]], [[Usuário]], [[Card]])
- Detalhes devem incluir o estado antes e depois da ação quando aplicável

### Operações

- Ações que devem gerar [[Auditoria]]:
    - login e logout
    - criação, atualização ou remoção de [[Usuário]], [[Projeto]], [[Departamento]], [[Papel]]
    - alteração de permissões ou papéis
    - movimentação ou alteração de [[Card]] e [[Sprint]]
    - alterações financeiras (ex: valor/hora)
    - envio ou leitura de [[Notification]]
- Auditoria não pode ser removida manualmente, exceto por políticas de retenção

---

## 🔐 Regras de Segurança

- Apenas usuários com permissão administrativa podem listar ou exportar auditorias
- Usuários comuns não têm acesso aos registros de outros usuários
- Todas as consultas e exportações devem respeitar o contexto do [[Tenant]]
- Auditorias não podem ser alteradas por nenhum usuário

---

## 🧪 BDD

### Registro de ação

- Dado um [[Usuário]] realizando uma ação crítica
- Quando a ação for executada
- Então um registro de [[Auditoria]] deve ser criado com detalhes completos

### Consulta de auditorias

- Dado um administrador de [[Tenant]]
- Quando consultar auditorias com filtros de usuário, entidade ou período
- Então devem ser retornadas apenas as ações dentro do seu [[Tenant]]
- E todos os detalhes devem estar disponíveis

### Exportação

- Dado um administrador de [[Tenant]]
- Quando exportar auditorias para auditoria externa
- Então os dados devem ser gerados no formato solicitado (ex: CSV, JSON)
- E conter todas informações necessárias para compliance

---

## 🧬 SDD (System Design Decisions)

- [[Auditoria]] garante rastreabilidade e compliance
- Permite reconstruir eventos e entender alterações críticas
- Mantém separação entre ações do usuário e registros históricos
- Deve ser imutável e persistente
- Integrável com sistemas de monitoramento e alertas

---

## 🔄 Estados

- registrado → auditoria criada no sistema, imutável
- exportado → auditoria incluída em relatório externo (opcional, para histórico de auditoria)