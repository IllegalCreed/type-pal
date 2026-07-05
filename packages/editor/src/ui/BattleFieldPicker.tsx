/**
 * 战场选择器(B2 编辑器侧)—— setBattleField 的 fieldId 下拉 + 着色预览。
 * 清单 = {assetBase.root}/battle-fields.json(提取库层,58 field);预览复用引擎
 * loadBattleBg(索引 PNG 按调色板着色,用 0 号板 —— 编辑器预览不追场景准色)。
 * 清单/预览加载失败退化数字输入(demo 工程无战斗资产)。
 */
import type { AssetBase } from '@type-pal/reforge'
import { loadBattleBg, loadPalette } from '@type-pal/reforge'
import { useEffect, useRef, useState } from 'react'

let fieldsCache: Promise<number[]> | null = null
function loadFieldIds(root: string): Promise<number[]> {
  fieldsCache ??= fetch(`${root}/battle-fields.json`)
    .then((r) => (r.ok ? (r.json() as Promise<{ id: number }[]>) : []))
    .then((list) => list.map((f) => f.id))
    .catch(() => [])
  return fieldsCache
}

export function BattleFieldPicker(props: {
  value: number
  onChange: (v: number) => void
  assetBase: AssetBase
}) {
  const { value, onChange, assetBase } = props
  const [ids, setIds] = useState<number[] | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    let alive = true
    void loadFieldIds(assetBase.root).then((list) => {
      if (alive) setIds(list)
    })
    return () => {
      alive = false
    }
  }, [assetBase.root])

  useEffect(() => {
    let alive = true
    const cvs = canvasRef.current
    if (!cvs) return
    void (async () => {
      try {
        const pal = await loadPalette(assetBase, 0)
        const bg = await loadBattleBg(assetBase, value, pal)
        if (!alive || !canvasRef.current) return
        const ctx = canvasRef.current.getContext('2d')
        if (!ctx) return
        ctx.imageSmoothingEnabled = false
        ctx.clearRect(0, 0, 160, 100)
        ctx.drawImage(bg, 0, 0, 160, 100)
      } catch {
        if (!alive || !canvasRef.current) return
        const ctx = canvasRef.current.getContext('2d')
        ctx?.clearRect(0, 0, 160, 100) // 缺图清空(demo)
      }
    })()
    return () => {
      alive = false
    }
  }, [assetBase, value])

  if (ids !== null && ids.length === 0) {
    // 工程没带战斗资产 → 裸数字
    return (
      <input
        className="in cf-num"
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onWheel={(e) => e.currentTarget.blur()}
      />
    )
  }
  return (
    <span className="bf-picker">
      <select
        className="in"
        value={String(value)}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        {ids?.includes(value) === false && <option value={String(value)}>{value} (缺)</option>}
        {(ids ?? [value]).map((id) => (
          <option key={id} value={String(id)}>
            战场 {String(id).padStart(3, '0')}
          </option>
        ))}
      </select>
      <canvas ref={canvasRef} width={160} height={100} className="bf-preview" />
    </span>
  )
}
