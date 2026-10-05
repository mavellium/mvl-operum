// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { Packer } from 'docx'
import { writeFile, mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
const testRequire = createRequire(import.meta.url)
const JSZip = createRequire(testRequire.resolve('docx'))('jszip')
import { join } from 'node:path'
import { buildCharterDocx, buildStakeholderDocx } from '@/lib/exports/projectDocumentsDocx'
import { buildAtaDocx } from '@/lib/exports/ataDocx'
import { parseDocumentCost } from '@/lib/documentCost'
import { charterChanges } from '@/lib/charterChanges'
import type { CharterDocumentProps } from '@/components/projetos/documentacao/ProjectCharterDocument'
const charter: CharterDocumentProps = { nomeProjeto: 'Projeto Operum', categoria: 'Instituição / curso / termo / semestre', gerenteProjeto: 'Gerente', elaboradoPor: 'Elaborador', aprovadoPor: '', versao: '1', dataAprovacao: '', justificativa: 'Justificativa documentada', objetivos: 'Objetivo documentado', metodologia: 'Metodologia preservada', descricaoProduto: 'Produto um\nProduto dois', premissas: 'Equipe disponível', restricoes: 'Prazo de entrega', limitesAutoridade: 'Aprovar atividades', principaisEnvolvidos: 'Instituição: Faculdade\nProfessor: Fábio\nPatrocinador: Cliente\nFornecedores: Equipe', membros: [{ name: 'Integrante' }], fases: [{ id: 'f1', fase: 'Planejamento', dataLimite: '2026-10-10', custo: '1.000,50' }, { id: 'f2', fase: 'Entrega', dataLimite: '2026-11-10', custo: '2.000,25' }] }
async function inspect(name: string, doc: Parameters<typeof Packer.toBuffer>[0]) {
  const dir = process.env.OPERUM_DOCUMENT_RENDER_DIR || '/tmp/operum-document-tests'
  await mkdir(dir, { recursive: true }); const path = join(dir, `${name}.docx`)
  const buffer = await Packer.toBuffer(doc)
  if (process.env.OPERUM_DOCUMENT_RENDER_DIR) await writeFile(path, buffer)
  return (await JSZip.loadAsync(buffer)).file('word/document.xml').async('string')
}
describe('modelos documentais', () => {
  it('custo em formato brasileiro preserva milhar e centavos', () => { expect(parseDocumentCost('R$ 1.000,50')).toBe(1000.5); expect(parseDocumentCost('1000.50')).toBe(1000.5) })
  it('diff registra apenas campos alterados, incluindo remoção', () => { expect(charterChanges({ objetivos: 'Antes', metodologia: 'Igual' }, { objetivos: 'Depois', metodologia: 'Igual' })).toEqual([{ field: 'objetivos', before: 'Antes', after: 'Depois' }]); expect(charterChanges({ categoria: 'Faculdade' }, {})).toContainEqual({ field: 'categoria', before: 'Faculdade', after: null }) })
  it('partes interessadas usa paisagem e as oito colunas do modelo', async () => {
    const xml = await inspect('stakeholders', await buildStakeholderDocx({ categoria: 'Faculdade', nomeProjeto: 'Operum', gerenteProjeto: 'Gerente', elaboradoPor: 'Elaborador', aprovadoPor: '', versao: '1', dataCriacao: '', dataAprovacao: '' }, [{ ref: '01', nome: 'Integrante', empresaEquipe: 'Equipe', cargoCompetencia: 'Desenvolvedor', email: 'pessoa@example.test', telefoneFax: '(11) 90000-0000', endereco: 'Campus', observacoes: 'Parte interessada' }]))
    expect(xml).toContain('w:orient="landscape"'); expect(xml).toContain('w:w="15138"'); expect(xml).toContain('Telefone/Celular'); expect(xml).toContain('Observação')
  })
  it('termo mantém a ordem do modelo, numera fases e calcula total', async () => {
    const xml = await inspect('charter', await buildCharterDocx(charter))
    expect(xml).toContain('3.000,75'); expect(xml).toContain('1.1 Planejamento'); expect(xml.indexOf('Descrição do produto')).toBeLessThan(xml.indexOf('Macro fases')); expect(xml.indexOf('Designação de gerente')).toBeLessThan(xml.indexOf('Metodologia do projeto'))
  })
  it('ata mantém ações em três colunas e assinaturas vazias', async () => {
    const xml = await inspect('ata', buildAtaDocx({ instituicao: 'Faculdade', numero: 1, nomeProjeto: 'Operum', local: 'Campus', data: new Date('2026-10-05T12:00:00Z'), elaboradoPor: 'Autor', aprovadoPor: null, assuntosTratados: 'Planejamento\nDesenvolvimento', decisoesTomadas: 'Entregar a versão', observacoes: 'Próxima reunião', copiasPara: ['Equipe'], presentes: [{ nome: 'Integrante', setorEmpresa: 'Equipe' }], acoes: [{ acao: 'Entregar projeto', prazo: new Date('2026-11-01T12:00:00Z'), responsavel: 'Integrante' }], anexos: [{ nome: 'Plano de projeto', url: null }] }))
    expect(xml).toContain('Setor/Empresa'); expect(xml).toContain('Responsável'); expect(xml).toContain('________________________'); expect(xml.indexOf('II. Assuntos')).toBeLessThan(xml.indexOf('III. Decisões'))
  })
})
