/**
 * 商店页(数据模式·商店标签)—— 店铺货单编辑。
 * 左:店列表(id + 货数)+ 新建;中:货单(物品行 + 删除/上下移 + 加货下拉);右:提示。
 * 买价/卖价随物品(items 表 buyPrice/sellPrice),此处只编「这家店卖什么」;
 * 脚本「商店」指令(openShop)按店号引用。
 */
import type { AssetCatalogV1, ItemData, ShopDef } from '@type-pal/content'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AddShopCommand,
  DeleteShopCommand,
  DuplicateShopCommand,
  nextShopId,
  UpdateShopCommand,
} from '../core/commands.js'
import type { EditSession } from '../core/edit-session.js'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import type { EditorDerivedStatus } from '../core/editor-derived-contract.js'
import { type EditorPlayIdentity, playProjectQuery } from '../core/play-url.js'
import type { ProjectReferenceEdge, ProjectReferenceIndex } from '../core/project-reference.js'
import type { CurrentProjectReferenceIndexProvider } from '../core/project-reference-adapters.js'
import {
  ItemPickerThumbnail,
  itemPickerDescription,
  itemPickerSearchText,
} from './add-picker-option-presentation.js'
import { DsAddPickerDialog } from './design-system/add-picker.js'
import {
  DsButton,
  DsEmptyState,
  DsFieldGroup,
  DsIconButton,
  DsNumberField,
  DsStatus,
  DsTag,
} from './design-system/controls.js'
import { DsDialog } from './design-system/overlays.js'
import {
  DsActionGroup,
  DsCatalogControls,
  DsCatalogRow,
  DsCatalogWorkspace,
  DsInspectorHost,
  DsInspectorSection,
  DsInspectorTabs,
  DsObjectHero,
  DsObjectWorkspace,
  DsPropertyGrid,
  DsPropertyRow,
  DsReadoutList,
  DsReadoutRow,
  DsReferenceList,
  DsReferencePanel,
  DsReferenceRow,
  DsSequenceIndex,
  DsWorkbenchSection,
} from './design-system/recipes.js'
import {
  DsReorderCollection,
  type DsReorderIntent,
  DsReorderItem,
  DsReorderMoveButton,
  reorderDsItems,
  useDsReorderKeys,
} from './design-system/reorder.js'

type ShopInspectorTab = 'summary' | 'references' | 'help'

function shopCatalogTitle(shop: ShopDef, itemsById: ReadonlyMap<string, ItemData>): string {
  const firstItemId = shop.items[0]
  if (!firstItemId) return '空货单'
  const firstItemName = itemsById.get(firstItemId)?.name.trim() || firstItemId
  const kinds = new Set(shop.items).size
  return kinds > 1 ? `${firstItemName}等 ${kinds} 种货品` : firstItemName
}

export function ShopTab(props: {
  shops: ShopDef[]
  items: ItemData[]
  session: EditSession
  assetCatalog?: AssetCatalogV1
  assetReader?: EditorAssetReader
  focusObjectId?: string
  onObjectFocus?: (id: string | undefined) => void
  tabBar?: React.ReactNode
  referenceIndex?: ProjectReferenceIndex
  referenceStatus?: EditorDerivedStatus
  getCurrentReferenceIndex?: CurrentProjectReferenceIndexProvider
  onOpenReference?: (reference: ProjectReferenceEdge) => void
  playIdentity?: EditorPlayIdentity
  isProjectDirty?: () => boolean
}) {
  const { shops, items, session, assetCatalog, assetReader, focusObjectId, onObjectFocus, tabBar } =
    props
  const [selId, setSelId] = useState<number>(shops[0]?.id ?? 0)
  const [inspectorTab, setInspectorTab] = useState<ShopInspectorTab>('summary')
  const [intent, setIntent] = useState<{ kind: 'delete' | 'trial'; shopId: number }>()
  const [money, setMoney] = useState('1000')
  const [notice, setNotice] = useState<string>()
  const stockSectionRef = useRef<HTMLDivElement>(null)
  const emptyRef = useRef<HTMLDivElement>(null)
  const shop = shops.find((x) => x.id === selId) ?? shops[0]
  const stockKinds = new Set(shop?.items ?? []).size
  const referenceReady = props.referenceStatus === 'current' && props.referenceIndex !== undefined
  const references = shop
    ? (props.referenceIndex?.deletionImpact({ kind: 'shop', id: String(shop.id) }).blockers ?? [])
    : []
  const referencePanelState = referenceReady
    ? references.length
      ? 'ready'
      : 'empty'
    : props.referenceStatus === 'stale'
      ? 'partial'
      : props.referenceStatus === 'checking'
        ? 'loading'
        : 'error'
  const dirty = props.isProjectDirty?.() ?? session.isDirty()
  const validMoney = /^\d+$/.test(money) && Number.isSafeInteger(Number(money))
  const act = (action: () => void): void => {
    try {
      action()
      setNotice(undefined)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error))
    }
  }
  const stockReorderKeys = useDsReorderKeys(shop?.items ?? [])
  const itemsById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items])
  const stockItemOptions = useMemo(
    () =>
      items
        .filter((item) => !shop?.items.includes(item.id))
        .map((item) => ({
          id: item.id,
          label: item.name,
          description: itemPickerDescription(item),
          searchText: [...itemPickerSearchText(item), `买价 ${item.buyPrice} 文`],
          leading: <ItemPickerThumbnail item={item} catalog={assetCatalog} reader={assetReader} />,
          trailing: <DsTag tone="neutral">买价 {item.buyPrice} 文</DsTag>,
        })),
    [assetCatalog, assetReader, items, shop?.items],
  )
  const selectShop = (id: number): void => {
    setSelId(id)
    setIntent(undefined)
    onObjectFocus?.(String(id))
  }

  useEffect(() => {
    const id = Number(focusObjectId)
    if (focusObjectId && Number.isInteger(id) && shops.some((candidate) => candidate.id === id)) {
      setSelId(id)
    }
  }, [focusObjectId, shops])

  useEffect(() => {
    if (
      focusObjectId !== undefined &&
      !shops.some((candidate) => String(candidate.id) === focusObjectId)
    ) {
      onObjectFocus?.(shop ? String(shop.id) : undefined)
    }
    if (intent && intent.shopId !== shop?.id) setIntent(undefined)
  }, [focusObjectId, shops, shop, onObjectFocus, intent])

  const submitIntent = (): void =>
    act(() => {
      if (!intent || intent.shopId !== shop?.id) throw new Error('当前店铺已变化，请重新操作。')
      const latest = session.getState()
      if (intent.kind === 'delete') {
        if (!referenceReady || !props.getCurrentReferenceIndex)
          throw new Error('引用尚未完成刷新，当前不能删除。')
        if (references.length) throw new Error('请先处理全部买入引用。')
        const index = latest.shops?.findIndex(({ id }) => id === intent.shopId) ?? -1
        const next = latest.shops?.[index + 1] ?? latest.shops?.[index - 1]
        session.dispatch(new DeleteShopCommand(intent.shopId, props.getCurrentReferenceIndex))
        if (next) selectShop(next.id)
        else onObjectFocus?.(undefined)
      } else {
        if (props.isProjectDirty?.() ?? session.isDirty()) throw new Error('请先保存项目，再试买。')
        if (!props.playIdentity || !validMoney) throw new Error('初始金钱必须为非负安全整数。')
        window.open(
          `play.html?${playProjectQuery(props.playIdentity)}&shop-trial=${intent.shopId}&money=${Number(money)}`,
          '_blank',
          'noopener,noreferrer',
        )
      }
      setIntent(undefined)
    })

  const setItems = (next: string[]): void => {
    if (shop) session.dispatch(new UpdateShopCommand(shop.id, next))
  }
  const reorderStock = (intent: DsReorderIntent): boolean => {
    if (!shop) return false
    const next = reorderDsItems(shop.items, intent)
    if (next === shop.items) return false
    if (next.every((itemId, index) => itemId === shop.items[index])) return false
    stockReorderKeys.move(intent)
    setItems([...next])
    return true
  }

  return (
    <>
      <DsCatalogWorkspace
        label="商店目录"
        className="outliner data-outliner shop-outliner"
        contentClassName="shop-catalog"
        header={
          <>
            {tabBar}
            <DsCatalogControls
              title="商店"
              count={shops.length}
              unit="家"
              actions={[
                {
                  id: 'create-shop',
                  label: '新建店铺',
                  icon: 'add',
                  onClick: () => {
                    act(() => {
                      const id = nextShopId(session.getState().shops ?? [])
                      session.dispatch(new AddShopCommand(id))
                      selectShop(id)
                    })
                  },
                },
              ]}
            />
          </>
        }
      >
        {shops.map((x) => (
          <DsCatalogRow
            key={x.id}
            selected={x.id === shop?.id}
            title={shopCatalogTitle(x, itemsById)}
            meta={String(x.id)}
            onClick={() => selectShop(x.id)}
          />
        ))}
      </DsCatalogWorkspace>

      <div className="canvas-wrap data-body shop-workbench">
        {shop ? (
          <DsObjectWorkspace
            as="main"
            label="店铺货单工作区"
            className="shop-main"
            contentClassName="shop-main-inner"
            hero={
              <DsObjectHero
                eyebrow="店铺"
                title="货单"
                objectId={`#${shop.id}`}
                summary="配置这家店出售的物品及展示顺序；售价直接引用物品数据。"
                meta={<DsTag tone="neutral">{stockKinds} 种货</DsTag>}
                actions={
                  <>
                    <DsButton
                      icon="copy"
                      onClick={() =>
                        act(() => {
                          const id = nextShopId(session.getState().shops ?? [])
                          session.dispatch(new DuplicateShopCommand(shop.id, id))
                          selectShop(id)
                        })
                      }
                    >
                      复制店铺
                    </DsButton>
                    <DsButton
                      icon="open"
                      disabled={!props.playIdentity}
                      onClick={() => {
                        setNotice(undefined)
                        setMoney('1000')
                        setIntent({ kind: 'trial', shopId: shop.id })
                      }}
                    >
                      独立试买
                    </DsButton>
                    <DsButton
                      icon="delete"
                      variant="danger"
                      disabled={
                        !referenceReady || references.length > 0 || !props.getCurrentReferenceIndex
                      }
                      onClick={() => {
                        setNotice(undefined)
                        setIntent({ kind: 'delete', shopId: shop.id })
                      }}
                    >
                      删除店铺
                    </DsButton>
                  </>
                }
              />
            }
          >
            {notice ? <DsStatus tone="error">{notice}</DsStatus> : null}
            {!referenceReady ? (
              <DsStatus>引用尚未完成刷新，当前不能删除店铺。</DsStatus>
            ) : references.length ? (
              <DsStatus
                action={<DsButton onClick={() => setInspectorTab('references')}>查看引用</DsButton>}
              >
                {references.length} 处买入引用会阻止删除。
              </DsStatus>
            ) : null}
            <div ref={stockSectionRef} tabIndex={-1}>
              <DsWorkbenchSection
                className="shop-stock-card"
                eyebrow="在售物品"
                title="当前货单"
                contentLayout="list"
                actions={
                  <DsAddPickerDialog
                    adoptionId="shop/stock"
                    triggerLabel="上架物品"
                    title="上架物品"
                    description="搜索物品，确认后加入当前货单；售价继续引用物品定义。"
                    confirmLabel="上架物品"
                    options={stockItemOptions}
                    scopeKey={`shop:${shop.id}:stock`}
                    revision={session.getHistoryVersion()}
                    emptyMessage="当前没有可上架的物品。"
                    fallbackFocusRef={stockSectionRef}
                    onConfirm={(itemId) => {
                      const latestShop = session
                        .getState()
                        .shops?.find((candidate) => candidate.id === shop.id)
                      if (
                        !latestShop ||
                        latestShop.items.includes(itemId) ||
                        !itemsById.has(itemId)
                      )
                        return false
                      session.dispatch(
                        new UpdateShopCommand(latestShop.id, [...latestShop.items, itemId]),
                      )
                    }}
                  />
                }
              >
                <DsReorderCollection
                  adoptionId="shop/stock"
                  scopeKey={`shop:${shop.id}:items`}
                  entries={shop.items.map((id, index) => ({
                    key: stockReorderKeys.keys[index]!,
                    label: itemsById.get(id)?.name ?? `未知物品 ${id}`,
                  }))}
                  revision={session.getHistoryVersion()}
                  onReorder={reorderStock}
                >
                  <div className="shop-stock-list">
                    {shop.items.map((id, i) => {
                      const it = itemsById.get(id)
                      const itemName = it?.name ?? `未知物品 ${id}`
                      const reorderKey = stockReorderKeys.keys[i]!
                      return (
                        <DsReorderItem itemKey={reorderKey} key={reorderKey}>
                          <div className="shop-stock-row">
                            <DsSequenceIndex value={i + 1} accessibleLabel={`第 ${i + 1} 项`} />
                            <span className="shop-stock-identity">
                              <strong>{itemName}</strong>
                              <span>
                                <code>{id}</code>
                                {it ? ` · 买价 ${it.buyPrice} 文` : ' · 不在物品表'}
                              </span>
                            </span>
                            <DsActionGroup density="compact" className="shop-stock-actions">
                              <DsReorderMoveButton
                                itemKey={reorderKey}
                                direction="backward"
                                label={`上移 ${itemName}`}
                              />
                              <DsReorderMoveButton
                                itemKey={reorderKey}
                                direction="forward"
                                label={`下移 ${itemName}`}
                              />
                              <DsIconButton
                                label={`下架 ${itemName}`}
                                icon="delete"
                                onClick={() => setItems(shop.items.filter((_, j) => j !== i))}
                                variant="danger"
                              />
                            </DsActionGroup>
                          </div>
                        </DsReorderItem>
                      )
                    })}
                    {shop.items.length === 0 ? (
                      <DsEmptyState
                        layout="embedded"
                        title="暂无在售物品"
                        description={
                          items.length > 0 ? '可从右上角上架物品。' : '当前项目没有可上架的物品。'
                        }
                      />
                    ) : null}
                  </div>
                </DsReorderCollection>
              </DsWorkbenchSection>
            </div>
          </DsObjectWorkspace>
        ) : (
          <div ref={emptyRef} tabIndex={-1} className="shop-empty-state">
            <span aria-hidden="true">🏪</span>
            <h2>还没有商店</h2>
            <p>点击左侧“新建店铺”创建第一份货单。</p>
          </div>
        )}
      </div>

      <DsInspectorHost as="aside" className="inspector inspector--tabbed shop-inspector">
        <div className="insp-head">
          <div className="what">商店</div>
          <div className="who">{shop ? `店 ${shop.id}` : '未选择'}</div>
        </div>
        <DsInspectorTabs
          id="shop-inspector"
          label="商店检查器"
          activeId={inspectorTab}
          onChange={(id) => setInspectorTab(id as ShopInspectorTab)}
          items={[
            {
              id: 'summary',
              label: '摘要',
              panel: (
                <div className="shop-inspector-body">
                  {shop ? (
                    <DsInspectorSection title="当前店铺" description={`店 ${shop.id}`}>
                      <DsPropertyGrid>
                        <DsPropertyRow label="在售物品">{stockKinds} 种</DsPropertyRow>
                        <DsPropertyRow label="引用编号">#{shop.id}</DsPropertyRow>
                      </DsPropertyGrid>
                    </DsInspectorSection>
                  ) : (
                    <div className="insp-empty">还没有商店。</div>
                  )}
                </div>
              ),
            },
            {
              id: 'references',
              label: '引用',
              panel: (
                <div className="shop-inspector-body">
                  <DsInspectorSection title="买入引用">
                    <DsReferencePanel
                      state={referencePanelState}
                      count={
                        referenceReady
                          ? { kind: 'exact', value: references.length }
                          : { kind: 'unknown' }
                      }
                      impact={{
                        kind: 'blocking',
                        description: referenceReady
                          ? references.length
                            ? '先处理全部买入引用，才能删除店铺。'
                            : '当前店铺没有买入引用。'
                          : '引用结果不是当前版本，删除已禁用。',
                      }}
                    >
                      {references.length ? (
                        <DsReferenceList>
                          {references.map((reference) => (
                            <DsReferenceRow
                              key={reference.id}
                              title={reference.source.label}
                              path={reference.where}
                              labels={[{ label: '买入引用' }]}
                              action={
                                reference.locator.kind !== 'unavailable' && props.onOpenReference
                                  ? {
                                      label: '打开',
                                      onActivate: () => props.onOpenReference!(reference),
                                    }
                                  : undefined
                              }
                              status={
                                reference.locator.kind === 'unavailable'
                                  ? {
                                      label: '暂不可定位',
                                      reason: reference.locator.reason,
                                      tone: 'warning',
                                    }
                                  : undefined
                              }
                            />
                          ))}
                        </DsReferenceList>
                      ) : null}
                    </DsReferencePanel>
                  </DsInspectorSection>
                </div>
              ),
            },
            {
              id: 'help',
              label: '说明',
              panel: (
                <div className="shop-inspector-body">
                  <DsInspectorSection title="定价规则" description="价格来自物品数据">
                    <p>
                      买价读取物品的 buyPrice；当铺按 sellPrice 收购所有可出售物品，不需要逐店配置。
                    </p>
                  </DsInspectorSection>

                  <DsInspectorSection title="剧情调用" description="通过“商店”指令开店">
                    <ol className="shop-help-steps">
                      <li>打开掌柜 NPC 的触发脚本。</li>
                      <li>插入“商店”指令并选择买入或卖出模式。</li>
                      <li>买入模式引用当前店铺编号 #{shop?.id ?? '—'}。</li>
                    </ol>
                    <p className="ds-inspector-supporting-copy">
                      货单改动即时生效，可使用 ⌘Z 撤销。
                    </p>
                  </DsInspectorSection>
                </div>
              ),
            },
          ]}
        />
      </DsInspectorHost>
      <DsDialog
        open={intent !== undefined}
        title={intent?.kind === 'delete' ? '删除店铺' : '独立试买'}
        description={
          intent?.kind === 'delete'
            ? '仅删除这份货单，不删除物品。删除后可以撤销。'
            : '读取已保存项目，背包从空开始；本次金钱与物品不会保存，不运行剧情。'
        }
        fallbackFocusRef={shop ? stockSectionRef : emptyRef}
        onClose={() => {
          setIntent(undefined)
          setNotice(undefined)
        }}
        footer={
          <>
            <DsButton
              onClick={() => {
                setIntent(undefined)
                setNotice(undefined)
              }}
            >
              取消
            </DsButton>
            <DsButton
              variant={intent?.kind === 'delete' ? 'danger' : 'primary'}
              disabled={
                intent?.kind === 'delete'
                  ? !referenceReady || references.length > 0
                  : dirty || !validMoney || !props.playIdentity
              }
              onClick={submitIntent}
            >
              {intent?.kind === 'delete' ? '确认删除' : '开始试买'}
            </DsButton>
          </>
        }
      >
        <DsFieldGroup>
          <DsReadoutList>
            <DsReadoutRow label="店铺编号">#{intent?.shopId}</DsReadoutRow>
          </DsReadoutList>
          {intent?.kind === 'trial' ? (
            <>
              <DsNumberField
                label="初始金钱"
                value={money}
                min={0}
                max={Number.MAX_SAFE_INTEGER}
                integer
                onChange={(event) => setMoney(event.currentTarget.value)}
                help="单位：文。只用于本次试买。"
              />
              {dirty ? <DsStatus tone="warning">请先保存项目，再试买。</DsStatus> : null}
            </>
          ) : null}
          {notice ? <DsStatus tone="error">{notice}</DsStatus> : null}
        </DsFieldGroup>
      </DsDialog>
    </>
  )
}
