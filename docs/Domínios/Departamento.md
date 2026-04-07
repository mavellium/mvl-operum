> Representa uma divisão organizacional dentro de um [[Tenant]], utilizada para agrupar [[Usuário]] por função, estrutura hierárquica e contexto operacional.

---

## 🧱 Campos

- Nome
- Descrição
- Ativo (boolean)
- Data de Criação

---

## 🔗 Relacionamentos

- Um [[Departamento]] pertence a exatamente um [[Tenant]]
- Um [[Departamento]] pode possuir nenhum ou muitos [[Usuário]] (0:N)
- Um [[Usuário]] pode estar em nenhum ou muitos [[Departamento]] (0:N) via [[UsuárioDepartamento]]

---

## ⚙️ Métodos

- criarDepartamento()
- atualizarDepartamento()
- ativarDepartamento()
- desativarDepartamento()
- associarUsuario([[Usuário]])
- removerUsuario([[Usuário]])
- listarUsuarios()

---

## 📏 Regras de Negócio

### Estrutura

- Um [[Departamento]] representa uma divisão funcional ou operacional (ex: TI, Financeiro, Marketing)
- Departamentos são utilizados para organização interna, não para controle direto de acesso
- Não devem existir departamentos duplicados com o mesmo nome dentro de um [[Tenant]]

---

### Associação

- Um [[Usuário]] pode estar associado a múltiplos [[Departamento]]
- A associação é feita via entidade intermediária [[UsuárioDepartamento]]
- Um [[Departamento]] pode existir sem usuários
- Um [[Departamento]] inativo não pode receber novos usuários

---

### Consistência

- O nome do [[Departamento]] deve ser único dentro do [[Tenant]]
- Um [[Departamento]] não pode ser removido se estiver associado a algum [[Usuário]]
- Alterações críticas devem ser auditadas

---

### Organizacional

- Departamentos podem ser usados para:
    - categorização de usuários
    - relatórios organizacionais
    - agrupamento operacional
- Departamentos não devem substituir [[Papel]] para controle de acesso

---

### Financeiro

- Um [[Departamento]] pode ter valor/hora padrão
- Usuários sem valor definido podem herdar o valor do [[Departamento]]

---

## 🔐 Regras de Segurança

- Alterações devem ser restritas a usuários com permissões administrativas
- Associações e remoções de usuários devem ser auditadas
- Departamentos não concedem acesso ao sistema diretamente

---

## 🧪 BDD

### Criação de departamento

- Dado um [[Usuário]] com permissão administrativa
- Quando criar um [[Departamento]]
- Então o sistema deve permitir sua utilização
- E registrar a criação para auditoria

---

### Associação de usuário

- Dado um [[Usuário]] existente
- Quando associar a um [[Departamento]]
- Então deve ser criado um vínculo válido via [[UsuárioDepartamento]]

---

### Remoção inválida

- Dado um [[Departamento]] com usuários associados
- Quando tentar removê-lo
- Então o sistema deve impedir a operação

---

### Departamento inativo

- Dado um [[Departamento]] inativo
- Quando tentar associar um [[Usuário]]
- Então o sistema deve impedir a operação

---

## 🧬 SDD (System Design Decisions)

- [[Departamento]] é uma entidade organizacional, não de segurança
- Não participa diretamente do controle de acesso (RBAC)
- Associação com [[Usuário]] é feita via [[UsuárioDepartamento]]
- Pode influenciar regras financeiras e organizacionais
- Mantém separação clara entre estrutura organizacional e autorização

---

## 🔄 Estados

- ativo
- inativo