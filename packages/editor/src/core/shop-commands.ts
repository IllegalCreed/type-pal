/**
 * 商店命令族：新建/修改/复制/删除店铺货单。
 * 对 Command 仅 type import（commands.ts 反向 re-export），运行期无环。
 */
import type { ShopDef } from '@type-pal/content'
import { validateShops } from '@type-pal/content'
import type { Command } from './command-contract.js'
import type { EditorState } from './edit-session.js'
import type { ProjectReferenceEdge } from './project-reference.js'
import {
  type CurrentProjectReferenceIndexProvider,
  collectCurrentProjectDeletionImpact,
} from './project-reference-adapters.js'

export function nextShopId(shops: readonly ShopDef[]): number {
  validateShops(shops)
  const id = shops.reduce((maximum, shop) => Math.max(maximum, shop.id), -1) + 1
  if (!Number.isSafeInteger(id)) throw new Error('商店编号已超出安全整数范围')
  return id
}

function appendShop(state: EditorState, shop: ShopDef): EditorState {
  const shops = validateShops([...(state.shops ?? []), structuredClone(shop)])
  return {
    ...state,
    shops,
    manifest: state.manifest.content.shops
      ? state.manifest
      : { ...state.manifest, content: { ...state.manifest.content, shops: 'content/shops.json' } },
  }
}

/** 改店铺货单(整表替换;首次 apply 捕获旧值)。 */
export class UpdateShopCommand implements Command {
  readonly label = '修改店铺'
  private old: string[] | undefined
  private captured = false

  constructor(
    private readonly shopId: number,
    private readonly items: string[],
  ) {}

  apply(state: EditorState): EditorState {
    const shop = (state.shops ?? []).find((x) => x.id === this.shopId)
    if (!shop) return state
    validateShops([{ id: this.shopId, items: this.items }])
    if (!this.captured) {
      this.old = [...shop.items]
      this.captured = true
    }
    return {
      ...state,
      shops: (state.shops ?? []).map((x) =>
        x.id === this.shopId ? { ...x, items: [...this.items] } : x,
      ),
    }
  }

  invert(state: EditorState): EditorState {
    if (!this.old) return state
    const old = this.old
    return {
      ...state,
      shops: (state.shops ?? []).map((x) => (x.id === this.shopId ? { ...x, items: [...old] } : x)),
    }
  }
}

/** 新建店铺(空货单;id = max+1 由调用方定)。 */
export class AddShopCommand implements Command {
  readonly label = '新建店铺'
  private added = false
  private previousManifest: EditorState['manifest'] | undefined

  constructor(private readonly shopId: number) {}

  apply(state: EditorState): EditorState {
    const next = appendShop(state, { id: this.shopId, items: [] })
    this.previousManifest ??= state.manifest
    this.added = true
    return next
  }

  invert(state: EditorState): EditorState {
    if (!this.added) return state
    return {
      ...state,
      shops: (state.shops ?? []).filter((x) => x.id !== this.shopId),
      manifest: this.previousManifest!,
    }
  }
}

export class DuplicateShopCommand implements Command {
  readonly label = '复制店铺'
  private copy: ShopDef | undefined
  private previousManifest: EditorState['manifest'] | undefined

  constructor(
    private readonly sourceId: number,
    readonly targetId: number,
  ) {}

  apply(state: EditorState): EditorState {
    const source = this.copy ?? state.shops?.find((shop) => shop.id === this.sourceId)
    if (!source) throw new Error(`商店 ${this.sourceId} 不存在`)
    const copy = this.copy ?? { ...structuredClone(source), id: this.targetId }
    const next = appendShop(state, copy)
    this.copy ??= copy
    this.previousManifest ??= state.manifest
    return next
  }

  invert(state: EditorState): EditorState {
    if (!this.copy) return state
    return {
      ...state,
      shops: (state.shops ?? []).filter((shop) => shop.id !== this.targetId),
      manifest: this.previousManifest!,
    }
  }
}

export class ShopInUseError extends Error {
  constructor(
    readonly shopId: number,
    readonly references: readonly ProjectReferenceEdge[],
  ) {
    super(`商店 ${shopId} 仍被 ${references.length} 处买入脚本引用`)
    this.name = 'ShopInUseError'
  }
}

export class DeleteShopCommand implements Command {
  readonly label = '删除店铺'
  private removed: ShopDef | undefined
  private index = -1

  constructor(
    private readonly shopId: number,
    private readonly currentReferences: CurrentProjectReferenceIndexProvider,
  ) {}

  apply(state: EditorState): EditorState {
    const shops = validateShops(state.shops ?? [])
    const index = shops.findIndex((shop) => shop.id === this.shopId)
    if (index < 0) return state
    const references = collectCurrentProjectDeletionImpact(this.currentReferences, state, {
      kind: 'shop',
      id: String(this.shopId),
    }).blockers
    if (references.length) throw new ShopInUseError(this.shopId, references)
    if (!this.removed) {
      this.removed = structuredClone(shops[index]!)
      this.index = index
    }
    return { ...state, shops: shops.filter((shop) => shop.id !== this.shopId) }
  }

  invert(state: EditorState): EditorState {
    if (!this.removed) return state
    const shops = [...(state.shops ?? [])]
    shops.splice(this.index, 0, structuredClone(this.removed))
    return { ...state, shops: validateShops(shops) }
  }
}
