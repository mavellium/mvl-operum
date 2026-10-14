/**
 * Erros de cadastro compartilhados. A associação de funções e departamentos a cada
 * projeto foi removida: todo o catálogo do tenant vale em qualquer projeto
 * (tabelas `ProjetoFuncao`/`ProjetoDepartamento` ficam só para dados antigos).
 */

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConflictError'
  }
}

export class InUseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InUseError'
  }
}
