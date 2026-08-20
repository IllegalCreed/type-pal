# 脚本库与可复用脚本作者手册

> 适用版本：contentVersion 16 / SAVE 8（2026-08-20）。脚本模型不带产品版本后缀；作者内容直接使用
> `AuthorCommand`、`AuthorScriptFlow`、`AuthorScriptLibrary` 与 `WorldScriptState`。正式上线前只支持
> 当前 canonical 工程；脚本分片、旧地址 sidecar、旧 upgrader 和“迁移内部实现”均已删除。

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
3. 在统一指令树编辑正文。位置无关脚本不需要地图；需要核对实体、坐标、面向或场景切换时，
   从具体调用点进入场景工作台，在真实地图上预览。
4. “复制”会生成新的稳定 id 和独立正文，不是原脚本的别名。
5. 保存前 validator 会检查悬空引用、非法实体地址、`self` 契约和调用环。

canonical 文件是：

```ts
// content/shared-scripts.json
type AuthorScriptLibrary = Record<
  ScriptId,
  {
    name: string
    description?: string
    self: 'none' | 'optional' | 'required'
    body: AuthorCommand[]
  }
>
```

没有作者可编辑的脚本索引、分片或 chunk 归属。compiler 可在内存中生成 executable blocks，但
它们不进入工程内容。

## 统一编辑器与场景工作台

共享脚本、物品私有脚本、实体 Behavior、场景 Hook 使用同一个 canonical 指令树；Behavior
和 Hook 的 stage/state/transition 也使用同一个流程编辑器。各入口自己的面板只负责稳定 id、
显示名、选择、复制/删除守卫和引用列表，不能另设整段 JSON 编辑器。

场景入口不是独立的“第四套脚本编辑器”，而是在通用编辑器外保留场景专属工作台：

- 上半区是真实地图预览，保留播放、暂停/继续、单步、重置和引擎试玩；
- 下半区是可调高度脚本抽屉，在“场景 Hook / 实体行为”间切换；
- 预览只读降级 canonical flow 和共享调用，不会把生成块或播放器状态写回作者内容。

因此，通用的是正文/流程编辑能力，不是强迫所有入口拥有相同外观。共享脚本库无需常驻地图，
物品私有脚本仍留在物品用途卡中；二者若需要空间语境，应进入具体场景调用点预览。

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
`stopScript` 后返回 caller；当前作者命令没有 `jumpScript`。

“打开脚本”会进入目标脚本，“扫描调用位置”会列出场景 Behavior、Hook、物品和其他共享脚本中的
直接调用方。contentVersion 16 作者界面不显示“迁移内部实现”页签；若工程仍含脚本分片、旧地址或
旧版本字段，当前 loader 会直接拒绝，重新执行当前迁移发布即可，不提供产品内升级工作台。

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

## 重迁与当前发布

当前发布以稳定 ScriptId、PageId、BehaviorId、HookId、StageId/StateId 作为作者冲突键，不以生成块
或数组位置为键。作者独有共享脚本保留；双方修改同一 canonical identity 时显式冲突并保持零写。
迁移器直接生成 contentVersion 16，发布前完整预检，manifest 最后写入；仓库不常驻旧脚本升级链。
