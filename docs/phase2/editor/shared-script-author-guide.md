# 脚本库与可复用脚本作者手册

> 适用版本：contentVersion 5（2026-07-25）。旧版
> `content/scripts/index.json + chunks`、`ScriptRef.chunk`、`shared/scc-*` 和“迁移内部实现”只属于
> v4 迁移边界，不是当前作者模型。

可复用脚本用于“改一处，所有调用方同时生效”的项目级逻辑。它不是减少录入步骤的万能容器，
也不会替代结构化能力、实体本地行为、场景 hook 和编辑器模板。

## 什么时候用哪一种

| 需求 | 选择 | 存储位置 |
|---|---|---|
| 某个实体自己的交互、巡逻或演出 | 具名 Behavior | 场景实体 `behaviors.trigger/auto` |
| 场景进场或传送出口 | 具名 Hook variant | 场景 `hooks.onEnter/onTeleport` |
| 只服务一件物品的复杂用途 | 物品私有脚本 | 该物品的 `itemPrivateScript`，在物品工作台内联编辑 |
| 回复、传送、配方、资源池等已有机制 | 结构化能力 | 对应能力字段 |
| 多个场景、实体或物品必须执行同一段固定逻辑 | 可复用脚本 | `content/shared-scripts.json` |
| 文本、物品或数量不同但结构相同的重复录入 | 模板 | 插入后展开为各处自己的普通作者内容 |

“被另一个行为调用”不等于“应当共享”。只有具备稳定业务语义、确实需要多个调用点同步更新的
逻辑，才提升到脚本库。

## 创建与编辑

1. 在编辑器“剧情 → 脚本库”点击 `＋`。
2. 填写显示名、说明和 `self` 契约。创建后稳定 `shared/user/...` id 不随显示名变化。
3. 在指令树编辑正文。位置无关脚本不需要地图；含实体、坐标、面向或场景切换时，可选真实场景
   做预览。
4. “复制”会生成新的稳定 id 和独立正文，不是原脚本的别名。
5. 保存前 validator 会检查悬空引用、非法实体地址、`self` 契约和调用环。

canonical 文件是：

```ts
// content/shared-scripts.json
type SharedScriptLibraryV5 = Record<
  ScriptId,
  {
    name: string
    description?: string
    self: 'none' | 'optional' | 'required'
    body: AuthorCommandV5[]
  }
>
```

没有作者可编辑的脚本索引、分片或 chunk 归属。compiler 可在内存中生成 executable blocks，但
它们不进入工程内容。

## `self` 契约

- `不使用`：callee 作用域屏蔽 caller self；脚本正文不能依赖执行实体。
- `可选`：调用点可显式给 `EntityAddress`；未给时继承 caller self，也允许最终为空。
- `必须提供`：显式地址优先，否则继承 caller self；仍为空时 validator/compiler 拒绝。

实体地址总是 `{ scene, entity }`。同名实体出现在多个场景时必须明确选择，不能存裸 `e12`
让运行时猜当前场景。

## 调用与跳转

在 Behavior、Hook、物品私有脚本或另一段共享脚本中插入“调用可复用脚本”，选择目标后保存：

```ts
{ kind: 'callScript', script: 'shared/user/door-sequence' }
{ kind: 'callScript', script: 'shared/user/npc-line', self: { scene: 'village', entity: 'elder' } }
```

调用点只保存稳定 `script` id 和可选 `self`，不保存 `chunk`。callee 正常结束或执行
`stopScript` 后返回 caller；v5 作者命令没有 `jumpScript`。

“打开脚本”会进入目标脚本，“扫描调用位置”会列出场景 Behavior、Hook、物品和其他共享脚本中的
直接调用方。canonical v5 工程不显示“迁移内部实现”页签；若诊断仍出现 legacy 内部块，说明工程
未完成 v4 → v5 升级，应回到启动页迁移工作台，不要把它当作者 API。

## 物品私有脚本

物品私有脚本归物品拥有，稳定 identity 为 `itemId + scriptId(use)`。它在用途效果卡内展开正文：

- 不进入共享脚本库；
- 不提供“打开共享脚本”反跳；
- 复制物品时随物品正文深拷贝；
- 删除/修改走物品自身的 undo、引用和保存闭环。

当同一逻辑后来确实需要跨物品复用时，再显式提取为共享脚本并把用途改成 `runScript`。

## 删除与错误

- 有任何直接调用方的共享脚本不能删除；先从引用列表处理调用点。
- 无引用脚本可删除，撤销会完整恢复稳定 id、元数据和正文。
- 共享脚本之间禁止形成 `callScript` 环。
- `self: required` 缺调用实体、实体地址悬空、引用目标缺失或作者正文含 v4
  `jumpScript`/动态 binding 时，保存和发布均 fail-loud。

## 重迁与 MG2

MG2 以稳定 ScriptId、PageId、BehaviorId、HookId、StageId/StateId 作为作者冲突键，不以生成块
或数组位置为键。作者独有共享脚本保留；双方修改同一 canonical identity 时显式冲突并保持零写。
v4 → v5 compatibility sidecar 只服务旧存档地址迁移，普通属性面板不会编辑它。
