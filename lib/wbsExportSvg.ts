import { computeLayout } from './wbsLayout'
import { computeRollups } from './wbsRollup'
import type { WbsNodeClient } from '@/types/wbs'

const PADDING = 48

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function trunc(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '…' : s
}

/** Builds a self-contained SVG string for the entire WBS tree. Pure — no browser APIs. */
export function generateWbsSvg(
  nodes: Record<string, WbsNodeClient>,
  rootId: string | null,
): string {
  if (!rootId) return ''

  const layout = computeLayout(nodes, rootId)
  const rollups = computeRollups(nodes, rootId)
  const { bounds, geometry, connectors } = layout

  const W = bounds.width + PADDING * 2
  const H = bounds.height + PADDING * 2
  const lines: string[] = []

  // Connectors first (behind nodes)
  for (const c of connectors) {
    lines.push(`    <path d="${esc(c.path)}" stroke="#cbd5e1" stroke-width="1.5" fill="none"/>`)
  }

  // Nodes
  for (const [id, g] of Object.entries(geometry)) {
    const node = nodes[id]
    if (!node) continue
    const s = node.style
    const roll = rollups[id]
    const isParent = node.childrenIds.length > 0

    // Background rect
    lines.push(
      `    <rect x="${g.x}" y="${g.y}" width="${g.width}" height="${g.height}"` +
      ` fill="${esc(s.backgroundColor)}" stroke="${esc(s.borderColor)}"` +
      ` stroke-width="${s.borderWidth}" rx="${s.borderRadius}"/>`
    )

    // Code badge (top-left)
    if (node.code) {
      lines.push(
        `    <text x="${g.x + 6}" y="${g.y + 12}"` +
        ` font-size="9" fill="#6b7280" font-family="system-ui,Arial,sans-serif"` +
        ` font-weight="600">${esc(node.code)}</text>`
      )
    }

    // Chips
    const cost = isParent && roll ? roll.cost : node.properties.cost
    const days = isParent && roll ? roll.durationDays : node.properties.durationDays
    const chips: string[] = []
    if (cost !== undefined && cost > 0) {
      const v = cost >= 1e6 ? `${(cost / 1e6).toFixed(1)}m` : cost >= 1000 ? `${(cost / 1000).toFixed(0)}k` : `${cost}`
      chips.push(`$${v}`)
    }
    if (days !== undefined && days > 0) chips.push(`${days}d`)

    // Title — nudge up when chips present
    const titleY = chips.length > 0 ? g.y + g.height * 0.42 : g.y + g.height / 2
    lines.push(
      `    <text x="${g.x + g.width / 2}" y="${titleY}"` +
      ` font-size="${s.fontSize}" fill="${esc(s.textColor)}" font-family="system-ui,Arial,sans-serif"` +
      ` font-weight="500" text-anchor="middle" dominant-baseline="middle">${esc(trunc(node.title, 26))}</text>`
    )

    if (chips.length) {
      lines.push(
        `    <text x="${g.x + g.width / 2}" y="${g.y + g.height - 7}"` +
        ` font-size="8" fill="#6b7280" font-family="system-ui,Arial,sans-serif"` +
        ` text-anchor="middle">${esc(chips.join(' · '))}</text>`
      )
    }
  }

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`,
    `  <rect width="${W}" height="${H}" fill="#f8fafc"/>`,
    `  <g transform="translate(${PADDING},${PADDING})">`,
    ...lines,
    '  </g>',
    '</svg>',
  ].join('\n')
}

/** Downloads the WBS as an SVG file. */
export function exportWbsSvg(
  nodes: Record<string, WbsNodeClient>,
  rootId: string | null,
  filename: string,
): void {
  const svg = generateWbsSvg(nodes, rootId)
  if (!svg) return
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
}

/** Renders the SVG onto a hidden canvas and downloads as PNG (2× retina). */
export function exportWbsPng(
  nodes: Record<string, WbsNodeClient>,
  rootId: string | null,
  filename: string,
): void {
  const svg = generateWbsSvg(nodes, rootId)
  if (!svg) return
  const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(svgBlob)
  const img = new Image()
  img.onload = () => {
    const scale = 2
    const canvas = document.createElement('canvas')
    canvas.width = img.width * scale
    canvas.height = img.height * scale
    const ctx = canvas.getContext('2d')
    if (!ctx) { URL.revokeObjectURL(url); return }
    ctx.scale(scale, scale)
    ctx.fillStyle = '#f8fafc'
    ctx.fillRect(0, 0, img.width, img.height)
    ctx.drawImage(img, 0, 0)
    canvas.toBlob(pngBlob => {
      if (!pngBlob) return
      const a = document.createElement('a')
      a.href = URL.createObjectURL(pngBlob)
      a.download = filename
      a.click()
    }, 'image/png')
    URL.revokeObjectURL(url)
  }
  img.src = url
}
