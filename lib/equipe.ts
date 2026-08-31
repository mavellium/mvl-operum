/**
 * Equipe de Desenvolvimento — cadastro editável em código.
 *
 * ESTE ARQUIVO É O LUGAR-FONTE DA VERDADE PARA A PÁGINA /equipe.
 * Para alterar os integrantes, edite o array `DESENVOLVEDORES` abaixo
 * (nome, papel, email e rede) e faça commit.
 */

export interface Desenvolvedor {
  nome: string
  papel: string
  instituicao: string
  curso: string
  email: string
  rede?: string
}

/** Instituição/curso origem da equipe (placeholders ajustáveis). */
export const EQUIPE_INFO = {
  instituicao: 'Fatec Garça',
  curso: 'Tecnologia em Gestão Empresarial',
}

export const DESENVOLVEDORES: Desenvolvedor[] = [
  {
    nome: 'Nome do Aluno 1',
    papel: 'Gerente de Projeto / Backend',
    instituicao: 'Fatec Garça',
    curso: 'Gestão Empresarial',
    email: 'aluno1@fatec.edu.br',
    rede: 'https://www.linkedin.com/in/aluno1',
  },
  {
    nome: 'Nome do Aluno 2',
    papel: 'Frontend',
    instituicao: 'Fatec Garça',
    curso: 'Gestão Empresarial',
    email: 'aluno2@fatec.edu.br',
    rede: 'https://www.linkedin.com/in/aluno2',
  },
  {
    nome: 'Nome do Aluno 3',
    papel: 'Banco de Dados / DevOps',
    instituicao: 'Fatec Garça',
    curso: 'Gestão Empresarial',
    email: 'aluno3@fatec.edu.br',
    rede: 'https://www.linkedin.com/in/aluno3',
  },
]
