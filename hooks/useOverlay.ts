'use client'
import { useEffect, useRef, useState, type RefObject } from 'react'

type Layer = { node: HTMLElement; close: () => void; returnTo: HTMLElement | null; update: (level: number) => void }
const layers: Layer[] = []
const originals = new Map<HTMLElement, boolean>()
let overflow = ''
const selector = 'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
function controls(node: HTMLElement) {
  return Array.from(node.querySelectorAll<HTMLElement>(selector)).filter(element => {
    if (element.tabIndex < 0 || element.closest('[inert], [hidden], [aria-hidden="true"]')) return false
    let current: HTMLElement | null = element
    while (current) {
      const style = getComputedStyle(current)
      if (style.display === 'none' || style.visibility === 'hidden') return false
      if (current === node) break
      current = current.parentElement
    }
    return true
  })
}
function focus(layer: Layer) { (controls(layer.node)[0] ?? layer.node).focus() }
function reconcile() {
  for (const [node, value] of originals) { node.inert = value; node.toggleAttribute('inert', value) }
  originals.clear()
  const top = layers.at(-1)
  if (top) {
    let node: HTMLElement = top.node
    while (node.parentElement && node !== document.body) {
      for (const sibling of node.parentElement.children) if (sibling !== node && sibling instanceof HTMLElement) {
        originals.set(sibling, sibling.hasAttribute('inert'))
        sibling.inert = true
        sibling.setAttribute('inert', '')
      }
      node = node.parentElement
    }
  }
  layers.forEach((layer, index) => layer.update(100 + index * 10))
}
function keydown(event: KeyboardEvent) {
  const top = layers.at(-1)
  if (!top || event.defaultPrevented) return
  if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); top.close(); return }
  if (event.key !== 'Tab') return
  const elements = controls(top.node), first = elements[0], last = elements.at(-1)
  if (!first) { event.preventDefault(); top.node.focus(); return }
  if (!top.node.contains(document.activeElement) || (event.shiftKey && document.activeElement === first) || (!event.shiftKey && document.activeElement === last)) {
    event.preventDefault(); (event.shiftKey ? last : first)?.focus()
  }
}
function focusin(event: FocusEvent) {
  const top = layers.at(-1)
  if (top && !top.node.contains(event.target as Node)) focus(top)
}
export function useOverlay(ref: RefObject<HTMLElement | null>, onClose: () => void, enabled: boolean) {
  const close = useRef(onClose)
  useEffect(() => { close.current = onClose })
  const [zIndex, setZIndex] = useState(100)
  useEffect(() => {
    const node = ref.current
    if (!enabled || !node) return
    const layer: Layer = { node, close: () => close.current(), returnTo: document.activeElement instanceof HTMLElement ? document.activeElement : null, update: setZIndex }
    if (!layers.length) {
      overflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      document.addEventListener('keydown', keydown)
      document.addEventListener('focusin', focusin)
    }
    layers.push(layer)
    reconcile()
    if (!node.contains(document.activeElement)) focus(layer)
    return () => {
      const wasTop = layers.at(-1) === layer
      const index = layers.indexOf(layer)
      if (index !== -1) layers.splice(index, 1)
      reconcile()
      if (!layers.length) {
        document.body.style.overflow = overflow
        document.removeEventListener('keydown', keydown)
        document.removeEventListener('focusin', focusin)
      }
      if (wasTop) {
        if (layer.returnTo?.isConnected && !layer.returnTo.closest('[inert]')) layer.returnTo.focus()
        else if (layers.at(-1)) focus(layers.at(-1)!)
      }
    }
  }, [enabled, ref])
  return zIndex
}
