'use client'

import { type Dispatch, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Undo2, Redo2, CornerDownRight, Plus, Trash2, Palette, Save, Printer,
  ZoomIn, ZoomOut, Maximize2,
} from 'lucide-react'
import Modal from '@/components/ui/Modal'
import Tooltip from '@/components/ui/Tooltip'
import { exportMspdi } from '@/lib/wbsExportMspdi'
import { exportWbsSvg, exportWbsPng } from '@/lib/wbsExportSvg'
import { importWbsAction } from '@/app/actions/wbs'
import type { WbsAction } from '@/lib/wbsReducer'
import type { WbsNodeClient } from '@/types/wbs'

export interface WbsMenubarProps {
  syncStatus: 'IDLE' | 'DIRTY' | 'SAVING' | 'ERROR' | 'CONFLICT'
  lastSavedAt: number | null
  zoom: number
  panX: number
  panY: number
  canUndo: boolean
  canRedo: boolean
  canEdit: boolean
  nodes: Record<string, WbsNodeClient>
  rootId: string | null
  selectedNodeIds: string[]
  projetoId: string
  dispatch: Dispatch<WbsAction>
  hasCopiedStyle: boolean
  onFitScreen: () => void
  onManualSave: () => void
  onRequestDelete: () => void
  onPasteStyle: () => void
  showStylePanel: boolean
  onToggleStylePanel: () => void
}

// ── Botão de ícone com tooltip, usado na faixa de ações rápidas ───────────────

function IconButton({
  label, onClick, disabled, active, children,
}: { label: string; onClick: () => void; disabled?: boolean; active?: boolean; children: React.ReactNode }) {
  return (
    <Tooltip label={label}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        className={`h-6 w-6 flex items-center justify-center rounded transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:pointer-events-none ${
          active ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }`}
      >
        {children}
      </button>
    </Tooltip>
  )
}

const SYNC = {
  IDLE:     { label: 'Salvo',     color: '#16a34a', icon: '●' },
  DIRTY:    { label: 'Não salvo', color: '#d97706', icon: '●' },
  SAVING:   { label: 'Salvando…', color: '#3b82f6', icon: '●' },
  ERROR:    { label: 'Erro',      color: '#dc2626', icon: '⚠' },
  CONFLICT: { label: 'Conflito!', color: '#7c3aed', icon: '⚠' },
}

// ── Shortcuts table (shared by Quick Help + Manual section 3) ─────────────────

function ShortcutsTable() {
  const sections: { title: string; rows: [string, string][] }[] = [
    {
      title: 'Navegação',
      rows: [
        ['↑ ↓ ← →', 'Navegar entre elementos'],
        ['Tab', 'Inserir elemento filho'],
        ['Enter', 'Inserir elemento irmão'],
        ['F2 / Duplo clique', 'Renomear elemento'],
      ],
    },
    {
      title: 'Edição',
      rows: [
        ['Ctrl+Z', 'Desfazer'],
        ['Ctrl+Shift+Z', 'Refazer'],
        ['Ctrl+X', 'Recortar'],
        ['Ctrl+C', 'Copiar'],
        ['Ctrl+V', 'Colar'],
        ['Ctrl+A', 'Selecionar tudo'],
        ['Ctrl+Shift+C', 'Copiar estilo'],
        ['Delete', 'Remover elemento'],
      ],
    },
    {
      title: 'Arquivo',
      rows: [
        ['Ctrl+S', 'Salvar'],
        ['Ctrl+O', 'Abrir documento'],
        ['Ctrl+P', 'Imprimir'],
      ],
    },
    {
      title: 'Visualização',
      rows: [
        ['+ / −', 'Zoom in / out'],
        ['Ctrl+0', 'Zoom 100%'],
        ['Esc', 'Cancelar / limpar seleção'],
      ],
    },
  ]

  return (
    <div className="space-y-5">
      {sections.map(s => (
        <div key={s.title}>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">{s.title}</p>
          <table className="w-full text-sm">
            <tbody>
              {s.rows.map(([k, v]) => (
                <tr key={k} className="border-b border-gray-50 last:border-0">
                  <td className="py-1 pr-6 font-mono text-xs text-gray-600 whitespace-nowrap">{k}</td>
                  <td className="py-1 text-gray-700">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}

// ── Manual modal content ──────────────────────────────────────────────────────

function ManualContent() {
  const [tab, setTab] = useState(0)
  const tabs = ['O que é uma EAP?', 'Como criar sua EAP', 'Referência de atalhos']

  return (
    <div className="flex gap-6" style={{ minHeight: 400 }}>
      {/* Sidebar */}
      <nav className="w-44 shrink-0 border-r border-gray-100 space-y-1 pr-4">
        {tabs.map((t, i) => (
          <button
            key={t}
            onClick={() => setTab(i)}
            className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
              tab === i ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            {t}
          </button>
        ))}
      </nav>

      {/* Content */}
      <div className="flex-1 overflow-y-auto text-sm text-gray-700 space-y-4 pr-1">
        {tab === 0 && (
          <>
            <p>
              A <strong>Estrutura Analítica do Projeto (EAP)</strong>, também conhecida como WBS
              (Work Breakdown Structure), é uma decomposição hierárquica do escopo total do
              trabalho do projeto em componentes menores e mais gerenciáveis.
            </p>
            <p>
              Ela serve para decompor o escopo em <strong>pacotes de trabalho</strong>: entregáveis
              concretos, mensuráveis e atribuíveis a uma equipe. Cada pacote deve poder ser
              estimado em custo e prazo de forma independente.
            </p>
            <p>
              Os <strong>códigos hierárquicos</strong> (1, 1.1, 1.1.2…) identificam univocamente
              cada elemento. O código indica a posição do elemento na hierarquia: &ldquo;1.2.3&rdquo; é o
              terceiro filho do segundo filho do elemento raiz.
            </p>
            <p>
              Quanto ao <strong>layout</strong>, use <em>Lado a Lado</em> para visualizar o
              primeiro nível de decomposição de forma ampla; use <em>Abaixo</em> ou{' '}
              <em>Abaixo-L</em> para árvores profundas, pois economizam espaço horizontal.
            </p>
          </>
        )}

        {tab === 1 && (
          <ol className="space-y-5">
            {[
              ['O elemento raiz', 'Ao abrir a ferramenta, um elemento raiz já existe com o código 1. Clique nele para selecioná-lo e pressione F2 para renomear com o nome do seu projeto.'],
              ['Criar o primeiro nível', 'Com o elemento raiz selecionado, pressione Tab para criar um filho (código 1.1). Repita para cada entrega principal do projeto.'],
              ['Decompor em pacotes de trabalho', 'Selecione qualquer elemento e pressione Tab para adicionar um filho, ou Enter para adicionar um irmão no mesmo nível. Continue até que cada folha represente um pacote de trabalho mensurável.'],
              ['Definir custos e duração', 'Selecione um elemento folha (sem filhos) e abra Elemento → Propriedades. Informe custo e duração em dias. Os elementos pai calculam automaticamente o total dos filhos.'],
              ['Ajustar o visual', 'Selecione um ou mais elementos e acesse Elemento → Estilo para personalizar cores, bordas e fonte. Use Ctrl+Shift+C para copiar o estilo a outros elementos.'],
              ['Exportar', 'Use Download → Figura para exportar como imagem (.svg ou .png). Use Download → MS Project XML para importar no Microsoft Project ou ferramentas compatíveis com o formato MSPDI.'],
            ].map(([title, body], i) => (
              <li key={i} className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <div>
                  <strong className="block mb-1">{title}</strong>
                  {body}
                </div>
              </li>
            ))}
          </ol>
        )}

        {tab === 2 && <ShortcutsTable />}
      </div>
    </div>
  )
}

// ── Dropdown item types ───────────────────────────────────────────────────────

interface MenuItem {
  label: string
  shortcut?: string
  action: () => void
  disabled?: boolean
  checked?: boolean
}

function DropdownMenu({
  items,
  onMouseEnter,
  onMouseLeave,
}: {
  items: (MenuItem | null)[]
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}) {
  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="absolute top-full left-0 z-50 bg-white shadow-xl rounded-md border border-gray-200 py-1 min-w-[230px]"
    >
      {items.map((item, idx) => {
        if (!item) return <hr key={idx} className="my-1 border-gray-200" />
        return (
          <button
            key={item.label}
            disabled={item.disabled}
            onClick={item.action}
            className="w-full flex items-center justify-between px-4 py-1.5 text-sm text-left text-gray-800 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
          >
            <span className={item.checked ? 'font-semibold text-blue-600' : ''}>{item.label}</span>
            {item.shortcut && (
              <span className="ml-8 text-xs text-gray-500 shrink-0">{item.shortcut}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

let menubarCloseTimer: ReturnType<typeof setTimeout> | null = null

// ── Main component ────────────────────────────────────────────────────────────

export default function WbsMenubar({
  syncStatus, lastSavedAt, zoom, panX, panY,
  canUndo, canRedo, canEdit,
  nodes, rootId, selectedNodeIds, projetoId,
  hasCopiedStyle,
  dispatch, onFitScreen, onManualSave, onRequestDelete, onPasteStyle,
  showStylePanel, onToggleStylePanel,
}: WbsMenubarProps) {
  const router = useRouter()
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  const [showManual, setShowManual] = useState(false)
  const menubarRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [filePickerTrigger, setFilePickerTrigger] = useState(0)
  const scheduleClose = useCallback(() => { menubarCloseTimer = setTimeout(() => setActiveMenu(null), 200) }, [])
  const cancelClose = useCallback(() => { if (menubarCloseTimer) { clearTimeout(menubarCloseTimer); menubarCloseTimer = null } }, [])

  useEffect(() => {
    if (filePickerTrigger > 0) fileInputRef.current?.click()
  }, [filePickerTrigger])

  // Close dropdown when clicking outside the menubar
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!menubarRef.current?.contains(e.target as Node)) setActiveMenu(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Ctrl+O → open file picker, Ctrl+P → print
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable
      if (isInput) return
      const ctrl = e.ctrlKey || e.metaKey
      if (ctrl && e.key === 'o') { e.preventDefault(); fileInputRef.current?.click() }
      if (ctrl && e.key === 'p') { e.preventDefault(); window.print() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const close = useCallback(() => setActiveMenu(null), [])
  const toggle = useCallback((name: string) => setActiveMenu(prev => prev === name ? null : name), [])

  const firstSelected = selectedNodeIds[0]
  const selectedNode = firstSelected ? nodes[firstSelected] : null

  // File import
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const data = JSON.parse(await file.text())
      const res = await importWbsAction(projetoId, data)
      if (res.ok) router.refresh()
    } catch { /* invalid JSON — ignore silently */ }
    e.target.value = ''
  }

  const sync = SYNC[syncStatus] ?? SYNC.IDLE
  const zoomPercent = Math.round(zoom * 100)

  // Menu definitions
  const menus = useMemo((): { name: string; items: (MenuItem | null)[] }[] => {
    const downloadMspdi = () => {
      const xml = exportMspdi(nodes, rootId, { projectName: projetoId })
      if (!xml) return
      const a = document.createElement('a')
      a.href = URL.createObjectURL(new Blob([xml], { type: 'application/xml;charset=utf-8' }))
      a.download = `eap-${projetoId}.xml`
      a.click()
    }
    const downloadWbs = () => {
      const a = document.createElement('a')
      a.href = URL.createObjectURL(
        new Blob([JSON.stringify({ version: 1, rootId, nodes }, null, 2)], { type: 'application/json' })
      )
      a.download = `eap-${projetoId}.wbs`
      a.click()
    }
    return [
      {
        name: 'Documento',
        items: [
          { label: 'Abrir documento (.wbs)', shortcut: 'Ctrl+O', action: () => { close(); setFilePickerTrigger(t => t + 1) } },
          { label: 'Salvar', shortcut: 'Ctrl+S', action: () => { close(); onManualSave() }, disabled: !canEdit },
          null,
          { label: 'Imprimir', shortcut: 'Ctrl+P', action: () => { close(); window.print() } },
        ],
      },
      {
        name: 'Editar',
        items: [
          { label: 'Desfazer', shortcut: 'Ctrl+Z', action: () => { close(); dispatch({ type: 'UNDO' }) }, disabled: !canUndo },
          { label: 'Refazer', shortcut: 'Ctrl+Shift+Z', action: () => { close(); dispatch({ type: 'REDO' }) }, disabled: !canRedo },
          null,
          { label: 'Recortar', shortcut: 'Ctrl+X', action: () => { close(); if (firstSelected) dispatch({ type: 'CUT', payload: { nodeIds: selectedNodeIds } }) }, disabled: !firstSelected || !canEdit },
          { label: 'Copiar', shortcut: 'Ctrl+C', action: () => { close(); if (firstSelected) dispatch({ type: 'COPY', payload: { nodeIds: selectedNodeIds } }) }, disabled: !firstSelected },
          { label: 'Colar', shortcut: 'Ctrl+V', action: () => { close(); if (firstSelected) dispatch({ type: 'PASTE', payload: { parentId: firstSelected } }) }, disabled: !firstSelected || !canEdit },
          { label: 'Selecionar Tudo', shortcut: 'Ctrl+A', action: () => { close(); dispatch({ type: 'SET_SELECTION', payload: { nodeIds: Object.keys(nodes) } }) } },
          null,
          { label: 'Copiar Estilo', shortcut: 'Ctrl+Shift+C', action: () => { close(); if (firstSelected) dispatch({ type: 'COPY_STYLE', payload: { nodeId: firstSelected } }) }, disabled: !firstSelected },
          { label: 'Colar Estilo', shortcut: 'Ctrl+Shift+V', action: () => { close(); onPasteStyle() }, disabled: !hasCopiedStyle || !firstSelected || !canEdit },
        ],
      },
      {
        name: 'Elemento',
        items: [
          { label: 'Inserir Filho', shortcut: 'Tab', action: () => { close(); if (firstSelected) dispatch({ type: 'INSERT_CHILD', payload: { parentId: firstSelected } }) }, disabled: !firstSelected || !canEdit },
          { label: 'Inserir Irmão', shortcut: 'Enter', action: () => { close(); if (firstSelected && selectedNode?.parentId) dispatch({ type: 'INSERT_SIBLING', payload: { siblingId: firstSelected } }) }, disabled: !firstSelected || !selectedNode?.parentId || !canEdit },
          { label: 'Remover', shortcut: 'Delete', action: () => { close(); onRequestDelete() }, disabled: !firstSelected || !selectedNode?.parentId || !canEdit },
          null,
          { label: 'Estilo', action: () => { close(); onToggleStylePanel() }, disabled: !firstSelected },
          { label: 'Propriedades', action: () => { close(); onToggleStylePanel() }, disabled: !firstSelected },
        ],
      },
      {
        name: 'Organizar',
        items: [
          { label: 'Lado a Lado', action: () => { close(); if (firstSelected) dispatch({ type: 'SET_LAYOUT', payload: { nodeId: firstSelected, layout: 'LADO_A_LADO' } }) }, disabled: !firstSelected || !canEdit, checked: selectedNode?.layout === 'LADO_A_LADO' },
          { label: 'Abaixo', action: () => { close(); if (firstSelected) dispatch({ type: 'SET_LAYOUT', payload: { nodeId: firstSelected, layout: 'ABAIXO' } }) }, disabled: !firstSelected || !canEdit, checked: selectedNode?.layout === 'ABAIXO' },
          { label: 'Abaixo com conector em L', action: () => { close(); if (firstSelected) dispatch({ type: 'SET_LAYOUT', payload: { nodeId: firstSelected, layout: 'ABAIXO_L' } }) }, disabled: !firstSelected || !canEdit, checked: selectedNode?.layout === 'ABAIXO_L' },
        ],
      },
      {
        name: 'Download',
        items: [
          { label: 'Figura SVG (.svg)', action: () => { close(); exportWbsSvg(nodes, rootId, `eap-${projetoId}.svg`) } },
          { label: 'Figura PNG (.png)', action: () => { close(); exportWbsPng(nodes, rootId, `eap-${projetoId}.png`) } },
          { label: 'MS Project XML (MSPDI)', action: () => { close(); downloadMspdi() } },
          { label: 'Arquivo WBS (.wbs)', action: () => { close(); downloadWbs() } },
        ],
      },
      {
        name: 'Ajuda',
        items: [
          { label: 'Ajuda Rápida', action: () => { close(); setShowHelp(true) } },
          { label: 'Manual', action: () => { close(); setShowManual(true) } },
        ],
      },
    ]
  }, [close, setFilePickerTrigger, onManualSave, canEdit, dispatch, canUndo, canRedo, firstSelected, selectedNodeIds, selectedNode, hasCopiedStyle, onPasteStyle, projetoId, rootId, nodes, onRequestDelete, setShowHelp, setShowManual, onToggleStylePanel])

  return (
    <>
      <div
        ref={menubarRef}
        data-wbs-toolbar=""
        onMouseLeave={scheduleClose}
        className="flex items-center h-8 shrink-0 border-b border-gray-200 bg-white select-none"
      >
        {/* Menus */}
        <div className="flex items-center flex-1">
          {menus.map(menu => (
            <div key={menu.name} className="relative">
              <button
                className={`h-8 px-3 text-sm transition-colors rounded-sm cursor-pointer ${
                  activeMenu === menu.name
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`}
                onMouseEnter={() => { cancelClose(); setActiveMenu(menu.name) }}
                onClick={() => toggle(menu.name)}
              >
                {menu.name}
              </button>
              {activeMenu === menu.name && (
                <DropdownMenu
                  items={menu.items}
                  onMouseEnter={cancelClose}
                  onMouseLeave={scheduleClose}
                />
              )}
            </div>
          ))}
        </div>

        {/* Ações rápidas com ícone */}
        <div className="flex items-center gap-0.5 px-2 border-l border-gray-200">
          <IconButton label="Desfazer (Ctrl+Z)" onClick={() => dispatch({ type: 'UNDO' })} disabled={!canUndo}>
            <Undo2 className="w-4 h-4" />
          </IconButton>
          <IconButton label="Refazer (Ctrl+Shift+Z)" onClick={() => dispatch({ type: 'REDO' })} disabled={!canRedo}>
            <Redo2 className="w-4 h-4" />
          </IconButton>
          <span className="w-px h-4 bg-gray-200 mx-1" />
          <IconButton
            label="Inserir filho (Tab)"
            onClick={() => firstSelected && dispatch({ type: 'INSERT_CHILD', payload: { parentId: firstSelected } })}
            disabled={!firstSelected || !canEdit}
          >
            <CornerDownRight className="w-4 h-4" />
          </IconButton>
          <IconButton
            label="Inserir irmão (Enter)"
            onClick={() => firstSelected && selectedNode?.parentId && dispatch({ type: 'INSERT_SIBLING', payload: { siblingId: firstSelected } })}
            disabled={!firstSelected || !selectedNode?.parentId || !canEdit}
          >
            <Plus className="w-4 h-4" />
          </IconButton>
          <IconButton
            label="Remover (Delete)"
            onClick={onRequestDelete}
            disabled={!firstSelected || !selectedNode?.parentId || !canEdit}
          >
            <Trash2 className="w-4 h-4" />
          </IconButton>
          <span className="w-px h-4 bg-gray-200 mx-1" />
          <IconButton
            label="Estilo e propriedades"
            onClick={onToggleStylePanel}
            disabled={!firstSelected}
            active={showStylePanel}
          >
            <Palette className="w-4 h-4" />
          </IconButton>
          <span className="w-px h-4 bg-gray-200 mx-1" />
          <IconButton label="Salvar (Ctrl+S)" onClick={onManualSave} disabled={!canEdit}>
            <Save className="w-4 h-4" />
          </IconButton>
          <IconButton label="Imprimir (Ctrl+P)" onClick={() => window.print()}>
            <Printer className="w-4 h-4" />
          </IconButton>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-0.5 px-2 border-l border-gray-200">
          <IconButton label="Diminuir zoom" onClick={() => dispatch({ type: 'SET_VIEWPORT', payload: { zoom: Math.max(0.1, zoom / 1.2), panX, panY } })}>
            <ZoomOut className="w-4 h-4" />
          </IconButton>
          <button
            onClick={() => dispatch({ type: 'SET_VIEWPORT', payload: { zoom: 1, panX, panY } })}
            className="w-12 text-center text-xs text-gray-600 tabular-nums rounded hover:bg-gray-100 py-0.5"
            title="Zoom 100% (Ctrl+0)"
          >
            {zoomPercent}%
          </button>
          <IconButton label="Aumentar zoom" onClick={() => dispatch({ type: 'SET_VIEWPORT', payload: { zoom: Math.min(3, zoom * 1.2), panX, panY } })}>
            <ZoomIn className="w-4 h-4" />
          </IconButton>
          <IconButton label="Ajustar à tela" onClick={onFitScreen}>
            <Maximize2 className="w-4 h-4" />
          </IconButton>
        </div>

        {/* Sync indicator */}
        <div
          className="flex items-center gap-1 text-xs px-3 border-l border-gray-200"
          title={lastSavedAt ? `Último save: ${new Date(lastSavedAt).toLocaleTimeString('pt-BR')}` : undefined}
        >
          <span style={{ color: sync.color }}>{sync.icon}</span>
          <span className="text-gray-500">{sync.label}</span>
        </div>
      </div>

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".wbs,.json"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Quick help modal */}
      <Modal isOpen={showHelp} onClose={() => setShowHelp(false)} title="Atalhos de teclado" maxWidth="max-w-lg">
        <ShortcutsTable />
      </Modal>

      {/* Manual modal */}
      <Modal isOpen={showManual} onClose={() => setShowManual(false)} title="Manual — EAP" maxWidth="max-w-3xl">
        <ManualContent />
      </Modal>
    </>
  )
}
