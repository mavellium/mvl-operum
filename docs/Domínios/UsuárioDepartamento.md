> Representa o vínculo entre um [[Usuário]] e um [[Departamento]] dentro de um [[Tenant]].

---

## 🧱 Campos

- ID
- [[Usuário]]
- [[Departamento]]
- Data de Associação
- Data de Saída (opcional)
- Status (ativo | inativo | removido)

---

## 🔗 Relacionamentos

- Um [[UsuárioDepartamento]] pertence a exatamente um [[Usuário]]
- Um [[UsuárioDepartamento]] pertence a exatamente um [[Departamento]]
- Um [[Usuário]] pode possuir nenhum ou muitos [[UsuárioDepartamento]] (0:N)
- Um [[Departamento]] pode possuir nenhum ou muitos [[UsuárioDepartamento]] (0:N)

---

## ⚙️ Métodos

- associarUsuario([[Usuário]])
- removerUsuario([[Usuário]])
- ativar()
- inativar()
- remover()
- registrarAssociacao()
- registrarSaida()

---

## 📏 Regras de Negócio

### Associação

- A relação entre [[Usuário]] e [[Departamento]] deve ser feita exclusivamente através de [[UsuárioDepartamento]]
- Um [[Usuário]] pode estar associado a múltiplos [[Departamento]]
- Um [[Departamento]] pode possuir múltiplos [[Usuário]]

---

### Consistência

- Não pode existir duplicidade de vínculo ativo para o mesmo par:
    - ([[Usuário]], [[Departamento]])
- Um [[UsuárioDepartamento]] deve pertencer ao mesmo [[Tenant]] do [[Usuário]] e do [[Departamento]]

---

### Ciclo de vida

- Um [[UsuárioDepartamento]] pode possuir os estados:
    - ativo
    - inativo
    - removido
- Um vínculo:
    - ativo → válido para uso
    - inativo → mantido para histórico, sem efeito operacional
    - removido → apenas histórico, não reutilizável

---

### Integridade

- Um [[UsuárioDepartamento]] não pode ser ativado se:
    - o [[Usuário]] estiver inativo ou bloqueado
    - o [[Departamento]] estiver inativo

---

### Organizacional

- A associação não concede permissões
- A associação é utilizada para:
    - organização interna
    - categorização
    - relatórios
    - regras financeiras (opcional)

---

## 🔐 Regras de Segurança

- A associação e remoção de vínculos devem ser auditadas
- Alterações devem ser restritas a usuários com permissões administrativas
- O vínculo não deve ser utilizado como base de autorização

---

## 🧪 BDD

### Associação válida

- Dado um [[Usuário]] ativo
- E um [[Departamento]] ativo
- Quando associar o usuário ao departamento
- Então deve ser criado um [[UsuárioDepartamento]] válido

---

### Associação duplicada

- Dado que já existe um vínculo ativo entre [[Usuário]] e [[Departamento]]
- Quando tentar criar um novo vínculo
- Então o sistema deve impedir a operação

---

### Associação inválida

- Dado um [[Departamento]] inativo
- Quando tentar associar um [[Usuário]]
- Então o sistema deve impedir a operação

---

### Remoção de vínculo

- Dado um [[UsuárioDepartamento]] ativo
- Quando for removido
- Então o vínculo deve ser marcado como removido
- E não deve ser reutilizado

---

## 🧬 SDD (System Design Decisions)

- [[UsuárioDepartamento]] é uma entidade de vínculo organizacional  
- Não participa do modelo de autorização (RBAC)  
- Mantém separação entre estrutura organizacional e controle de acesso  
- Permite histórico e rastreabilidade de associações

---

## 🔄 Estados

- ativo
- inativo
- removido