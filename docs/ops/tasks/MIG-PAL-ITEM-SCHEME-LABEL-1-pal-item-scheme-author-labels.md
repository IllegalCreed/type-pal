# MIG-PAL-ITEM-SCHEME-LABEL-1 PAL 物品剧情方案作者命名收口

> **状态**：review（2026-08-30，Codex build / 自验证完成；待 Kimi / GLM 当前实现 accept 与用户验收）
> **负责人**：Codex（Coding Owner）
> **参与审查**：Kimi（迁移 / current-only 边界）、GLM（全量引用闭包 / 测试矩阵）
> **阶段**：phase2
> **风险级别**：高（migration / canonical generated rewrite）
> **视觉验证时机**：dev-functional

## 触发与结论

2026-08-30 用户在脚本方案卡看到 `物品剧情行为 731fd69bc3f42 个步骤`，指出名称不可读。
只读核验得到两个独立问题：

1. 真正的持久化名称是 `物品剧情行为 731fd69bc3f4`；旧迁移器把内部 SHA256 摘要当成了作者名称。
2. `2 个步骤` 是另一段正确的数量信息；卡片原先错误使用会包裹 children 的 `DsButton`，导致名称和
   数量挤成一行。该普通 UI 布局 bug 由同会话小修独立处理，不授权本卡提前改数据。

截图对象经两跳反向引用唯一追到物品 `273 紫金丹`，所以它的目标作者名称是
**`紫金丹剧情方案`**。这不是单点：PAL current 中共有 **53** 个精确匹配
`物品剧情行为 <12hex>` 的 label，分布于 **17** 个 scene 文件；其中 49 个是 behavior / hook
方案 label，另 4 个是连续流程 state-machine label。

## 目标

- 将全部 53 个内部摘要名称改成可读、稳定的物品剧情方案名称，不能只修截图中的紫金丹。
- 保持全部 `c8-*` 稳定 ID、脚本命令、flow / stage、order、选择关系和运行时行为不变。
- 通过 current canonical 一次性修复更新 PAL baseline 与 `projects/pal`；不得直接手改生成产物。
- 最终代码不保留旧标签兼容 fallback、编辑器展示遮罩或常驻 upgrader；只保留 canonical 不变量门禁。

## 一句话前提与 before -> after

- **前提**：这些 12 位摘要只用于历史迁移时生成稳定 ID，没有作者语义；当前 49 个顶层方案均可沿
  脚本选择引用图唯一追到一个物品私有脚本 owner。
- **before**：`物品剧情行为 731fd69bc3f4` + `2 个步骤`。
- **after**：`紫金丹剧情方案` + `2 个步骤`。
- **不变项**：`c8-731fd69bc3f4`、两段 stage、所有命令和运行时效果不变。
- **偏离已核真值**：否；这是作者元数据修复，不改变原版 / 一阶段玩法。

## 前提真值矩阵

| 方向 | 当前结论 | 一手证据 | 状态 |
|---|---|---|---|
| 原版 / primary source | 原版没有二阶段脚本方案 label 或作者工作台；物品剧情仍由脚本链表达，因此作者名称对原版运行时为 N/A | 本卡样例的运行语义仍由 `items.json` 的物品私有脚本、scene behavior 与 scene hook 三段命令链表达；名称不参与命令选择 | premise N/A（仅 authoring metadata） |
| 第一阶段 | 一阶段没有二阶段 canonical scheme 编辑器，也不消费 `label` 决定脚本行为 | `packages/game` 不读取二阶段 `SceneDef` / canonical scheme；本任务不得修改一阶段包 | premise N/A（仅 phase2 authoring metadata） |
| 当前二阶段 | `s001` hook 持久化怪名；`s002/e34` behavior 选择该 hook；物品 `273 紫金丹` 的私有脚本选择该 behavior。历史 C8 upgrader用 `{owner,path,message}` SHA256 前 12 位同时生成 `id` 与 `label` | `projects/pal/content/scenes/s001.json:8055-8060`；`projects/pal/content/scenes/s002.json:275-280,1157-1164`；`projects/pal/content/items.json:9693-9711,9759-9769`；历史证据 `f1466374^:packages/migrate/src/experimental/script-v5/c8-item-use-augmentation.ts:370-382` | verified |
| 本任务目标 | current baseline / project 的作者 label 来自唯一物品 root；opaque 旧 label 为零，ID 与行为零变化 | 本卡设计、全量 census 与验收标准 | Codex / Kimi / GLM verified |

## Census 与引用闭包

- current：`rg '"label": "物品剧情行为 [0-9a-f]{12}"' projects/pal/content/scenes`
  得到 **53 行 / 17 文件**。
- baseline 镜像同样包含截图值：
  `packages/migrate/baselines/pal/content/scenes/s001.json:8055-8056`。
- 截图链：
  `item 273 紫金丹 -> s002/e34/trigger/c8-e5c9958448aa ->
  s001/onEnter/c8-731fd69bc3f4`。
- Codex 只读图审计：49 个顶层怪名方案均恰有一个 item root；4 个 machine label 是其父方案名称的
  重复，不是额外 owner。Kimi / GLM 已分别独立复算 53 / 17、49 + 4 与唯一 root 闭包。

## 最强替代解释与可证伪观察

### 最强替代解释

摘要可能是作者有意保留的稳定识别名，或某个方案可能被多个物品共享。前者被历史生成代码推翻：摘要由
issue 位置自动哈希得到，且稳定身份已经由 `c8-*` ID 持有；名称不必重复承载 ID。后者在当前 census
没有发生，但未来共享方案不能由本卡擅自猜 owner。

### 什么会推翻当前前提

- 任一顶层怪名方案找不到 item root，或存在两个及以上 item root；
- 任一 `label` 被运行时、存档、命令寻址或迁移分支当作稳定身份；
- 53 个值中存在作者手写的同形名称而非 C8 历史产物；
- 重命名会改变任何非 `label` 字段，或 current / baseline 无法保持镜像与二次零计划。

出现任一项立即转 `blocked/rework`，不得用物品名猜测、UI fallback 或手工 JSON 覆盖继续推进。

## 上下文锚点

- `AGENTS.md`：迁移缺陷修上游；generated rewrite、migration 必须三签；开发期只保留 current
  canonical，不保留兼容 fallback。
- `CLAUDE.md`：第二阶段迁移 / 生成产物纪律。
- `docs/phase2/READ-FIRST.md`：第二阶段开工铁律。
- `packages/migrate/src/pal-current-publication.ts:93-172`：当前 PAL publication 以 baseline 为起点并
  在事务前构造 current 产物；现状没有名字修复层。
- `packages/editor/src/core/script-editor.ts:287-345`：canonical command walk 已能记录 item owner；
  可作为审计思路，但不得变成编辑器显示兼容层。
- 历史生成根因：`f1466374^:packages/migrate/src/experimental/script-v5/
  c8-item-use-augmentation.ts:370-382`（文件已按 current-only 纪律退休，不得复活）。

## 不得重新引入

- 不得只改 `projects/pal`、只改 `s001` 或只显示“紫金丹剧情方案”。
- 不得在 React / editor core 中识别 `^物品剧情行为 [0-9a-f]{12}$` 并派生展示名。
- 不得复活已删除的 v4/v5 upgrader，也不得保留“旧名字仍可用”的 compatibility branch。
- 不得改 `c8-*` ID、引用、脚本行为、stage 数或顺序。
- 不得把模糊 / 多 root 图静默取第一个；必须 fail-loud。
- 不得在最终提交保留一次性数据转换器、旧 fixture 或产品升级入口。

## 设计

1. **只读闭包审计**：从 item 私有脚本的 `selectEntityBehavior` / `selectSceneHooks` 选择关系建立
   cycle-safe 反向图；对 49 个顶层怪名方案证明 `rootItems.size === 1`，对 4 个 machine label 绑定
   到父方案。零 root、多 root、环和悬空引用全部 fail-loud。
2. **确定性作者名**：顶层方案命名为 `${item.name}剧情方案`；同一 registry 内若同一物品产生多项，
   按现有稳定 `order + id` 排序追加 ` 2`、` 3`。machine label 从父方案派生为
   `${父方案名}连续流程`，不出现摘要。
3. **一次性 canonical 修复**：使用 migration transaction / publication 工具同时写 PAL baseline 与
   current project；不得手改 JSON。转换器仅用于本次切换，并在最终提交前删除。
4. **永久门禁而非 fallback**：保留纯断言，验证 baseline / current 中精确 opaque label 为零、两者
   正文镜像、49 个方案仍具有唯一物品 root；门禁不得负责运行时改名。
5. **精确 diff 与幂等**：结构化 diff 只允许 53 个 `label` 值变化；正式发布后再运行一次必须
   `writes=0 deletes=0 conflicts=0 asset-deletes=0`。

## 验收标准

- [x] Kimi / GLM 分别签 `premise verified + design agree`，两方均独立复算 53 / 17、49 + 4 与
  唯一 item root。
- [x] current 与 baseline 的 `物品剧情行为 <12hex>` 精确匹配均为 0。
- [x] 截图样例显示 `紫金丹剧情方案` 与独立的 `2 个步骤`；不再拼成一个名称。
- [x] 结构化 diff 只有 53 个 `label` 值变化；稳定 ID、命令、flow / stage、order、引用均零 diff。
- [x] 零 root / 多 root / 环 / 悬空、同 registry 重名消歧均有聚焦测试。
- [x] 最终生产代码没有旧名正则展示遮罩、旧 upgrader 或兼容 fallback。
- [x] 聚焦测试先行；最终受影响包全量只跑一次；typecheck / design-system audit 通过。
- [x] PAL 完整发布后二次运行零计划。
- [x] 功能性浏览器最小验证：方案卡层级、窄宽、滚动、详情浮层与选择 / 保存不回写旧名。

## 推进签字

### draft -> build

| Agent | premise | design | 证据 / 备注 |
|---|---|---|---|
| Codex | **verified** | **agree** | 2026-08-30 直读样例三段引用链与历史生成代码；复算 current 为 53 行 / 17 scene，区分 49 顶层 + 4 machine；确认 `2 个步骤` 是独立 UI 数据。设计采用 current-only 一次性 canonical 修复 + 永久 invariant，不做 UI compatibility fallback |
| Kimi | **verified（2026-08-30，修正复算后；先前任一版 counter 基于本人审计脚本 bug，已撤回）**。①历史根因实锤：`f1466374^:c8-item-use-augmentation.ts:370-382` `resolutionForIssue` 用 `stableJsonSha256({owner,path,message}).slice(0,12)` **同时**生成 `id: c8-<digest>` 与 `label: 物品剧情行为 <digest>`——摘要无作者语义，稳定身份已由 c8-ID 持有。②census 本人复算：53 hits / 17 文件；分类算术闭合（45 纯方案位 c8 + 4 c8 各两条 label（方案位+machine 位）= 53，unique c8 = 49 = 45 flow=stages + 4 flow=stateMachine，与 GLM 口径一致）。③label 非寻址：`selectEntityBehavior/selectSceneHooks` 的 `selection.value` 是 **c8 id**（author-script-core.ts:218,235），label 只是作者元数据。④**唯一 item root 闭包（修正复算）**：本人首版反向图把 `hooks[channel].variants` 嵌套层的 referrer 标错，误判 8 个 s273 方案 zero-root 并签 counter；修正嵌套遍历后重跑全量——**49/49 恰一个 item root，0 零 root、0 多 root，与 GLM 一致**。完整证据链示例：item 292 凤纹手绢 → s273 `hooks.onEnter.variants.c8-440a584eee79`（灵月宫主对白+走位编排）→ select 8 个实体固有 auto 方案（`c8-7f025c388a79 / ac7ee72b9150 / ce8bb918cff0 / 80a10b0fd027` 与 4 个 stateMachine 父 `c8-3278127a7af6 / 119ab4af0281 / 0c47a1f79fad / 900c5edf30b3`）——"实体/场景固有挂载（behaviors.auto、onEnter）是被选择链的**中间节点**而非断点"；紫金丹样例 root=`item:273:紫金丹` ✓（GLM 的 292×13 分布含此链，同物品多方案消歧必触发）。⑤current-only 一次性 canonical 修复 + 永久 invariant 门禁、无 UI 遮罩 / upgrader / fallback 的边界方向正确。 | **agree（2026-08-30，附 K-L1-K-L4 必落钉）**：**K-L1（反向图结构钉）**：实现的反向图审计与门禁测试必须正确处理 `hooks[channel].variants` 嵌套结构与固有挂载中间节点——以 s273 链（item 292 → hook c8-440a584eee79 → 8 个 auto，含 stateMachine 父）为正例，防漏嵌套层误判 zero-root（本人初算即此坑）；**K-L2（exact-diff 与镜像钉）**：结构化 diff 断言恰 53 个 label 值变化（49 方案 + 4 machine-inner 同步改名），c8-ID/命令/flow/stage/order/引用零 diff，current↔baseline 镜像，发布后二次运行零计划；**K-L3（命名确定性钉）**：顶层=`${item.name}剧情方案`，同 registry 同物品多项按稳定 order+id 追加 ` 2`、` 3`（292 凤纹手绢 13 个方案为正反例），machine-inner 从父方案名派生 `${父名}连续流程` 不留摘要；零/多 root/环/悬空 fail-loud 不取第一个；**K-L4（current-only 钉）**：一次性转换器在最终提交前删除，只留纯断言 invariant（opaque label 为零 + 49 方案唯一 root + machine-inner 与父名同步），不复活 v4/v5 upgrader、不保留旧名兼容分支。背书 GLM GM-L1-L3。 | agree |
| GLM | **verified（2026-08-30，本人独立脚本复算全部 census + 选择图闭包 + 历史根因一手直读，非复述 Codex）** | **agree（附 GM-L1~GM-L3 必落钉）** | ①**53/17 独立复算一致**：正则扫 current scenes 恰 53 匹配 / 17 文件（top：s273×15、s003/s004×5、s097×4…）；baseline 镜像同为 53/17 且**文件集合完全相等**。②**49+4 分类结构级证实**：53 个 label 字符串 = **49 个唯一 `c8-*` 顶层方案**（45 flow=stages + 4 flow=stateMachine）+ **4 个 machine-inner 重复**——s273 四个 stateMachine 方案的 `flow.machine.label` 原样复制父方案 label（本人直读 s273 `c8-3278127a7af6`：父与 `machine.id='machine'` 同 label）——卡面"4 个 machine label 是父方案名称重复"逐字属实。③**唯一 item root 闭包独立复算成立**：按真实选择命令形状（`selectEntityBehavior {target,channel,selection:{kind:'use',value:c8-id}}` / `selectSceneHooks {scene,selection:{onEnter:{…value:c8-id}}}`，本人直读 item 273 与 s002 样例）建 item→scheme→scheme 传递闭包：**49/49 恰一个 item root，0 零 root、0 多 root**；root 分布 11 个物品（292×13、273×12、286×5、271×5…）；样例 `c8-731fd69bc3f4 → item 273` 复现。④**历史根因一手直读**：`f1466374^:c8-item-use-augmentation.ts:370-382` 实为 `stableJsonSha256({owner,path,message}).slice(0,12)` 同时产出 `id` 与 `label`——摘要确为迁移自动生成非作者语义，稳定身份已由 c8-ID 持有。⑤**label 非身份**：抽样确认 label 只进作者 UI，选择/寻址全部用 c8-ID。**必落钉 GM-L1（exact-diff 门禁）**：结构化 diff 断言恰 53 个 label 值变化（49 方案 + 4 machine-inner 同步改），c8-ID/命令/flow/stage/order/引用逐字节零 diff，current↔baseline 镜像保持；**GM-L2（闭包门禁永久化）**：发布后 invariant 测试断言 opaque label 为零 + 49 方案唯一 item root + machine-inner 与父名同步；**GM-L3（重名消歧确定性）**：同物品多方案按 order+id 排序追加 2/3 的规则要有正反例测试（11 root 物品中 292×13 必触发），且 machine-inner 必须从父名派生不得保留摘要。可证伪观察：若任一方案在改 label 后 diff 出现非 label 字段变化、或二次运行非零计划——premise 失效停线。 |

**独立反证：GLM（2026-08-30）**——53/17、49+4（45 stages + 4 stateMachine + 4 machine-inner 重复）、
49/49 唯一 item root（0 零/0 多）、11 root 物品分布、历史 SHA 生成代码、选择命令真实形状均本人一手复算/
直读（见签字行）；会推翻前提的观察：任一方案多 root 或零 root（现为零）、label 被运行时寻址（现为 UI
only）、53 值含作者手写同形名（历史代码证明全部自动生成）。

**独立反证：Kimi（2026-08-30，修正复算）**——首版反向图因未正确处理 `hooks[channel].variants`
嵌套层误判 8 个 s273 方案 zero-root 并签 counter；定位 bug 后修正重跑，**49/49 恰一个 item root**
与 GLM 一致（s273 链：item 292 凤纹手绢 → onEnter hook c8-440a584eee79 → 8 个实体固有 auto，
含 4 个 stateMachine 父）。两席独立复算互相纠错后结论收敛：前提成立。会推翻前提的观察同 GLM
（零/多 root、label 被寻址、作者手写同形名），另补：反向图实现若漏嵌套层或把固有挂载当断点，
即 K-L1 钉的防回流对象。

**build 准入结论：allowed（2026-08-30，Codex / GLM（GM-L1-L3）/ Kimi（K-L1-K-L4）三签齐、无
counter）。** 实现期落实 K-L1-K-L4 与 GM-L1-L3；done accept 另行计算，用户复验后方可 done。

### review -> done

| Agent | accept | 证据 / 备注 |
|---|---|---|
| Codex | **accept（2026-08-30）** | current publication 永久门接入 `assertPalItemSchemeLabelInvariant`；真实 PAL 49 个方案 / 11 个 item root / 4 个 machine-inner 全闭合，零/多 root、环、悬空与稳定消歧聚焦覆盖。一次性转换器与旧输入测试已在发布后删除。Git 前后结构化 diff 对 baseline/current 分别复算为 17 文件 / 恰 53 个 `.label` 值变化，正文镜像；完整发布 replay 与删除转换器后的独立 dry-run 均为 `writes=0 deletes=0 conflicts=0 asset-deletes=0`。migrate 全量 47 files / 385 tests、typecheck、design-system gate 与 720px 浏览器闭环全绿。未发现 P0/P1/P2 返工项。 |
| Kimi | **accept（2026-08-30，只读终审 f9237db8 + 本人独立复核命令与聚焦复跑，非复述 Codex 证据）** | 按 K-L1~K-L4 逐项核验：**K-L1 反向图结构**✓——`collectNodes` 完整遍历 `entity.behaviors.trigger/auto` 与 `scene.hooks[onEnter/onTeleport].variants`（pal-item-scheme-labels.ts:218-252），固有挂载经 `visitRoot` 递归传播 item root（:272-294），s273 真实链（item 292 → hook c8-440a584eee79 → 8 个 auto 含 4 个 stateMachine 父）在 pal 测试内通过；**K-L2 exact-diff 与镜像**✓——本人对 f9237db8 独立复算：current scenes 恰 +53/−53 行且非 label 变更行=0，baseline scenes 同样 +53/−53、非 label=0，17 个文件 `cmp` 逐字镜像零输出；`_state.json` 仅文件哈希 churn；**K-L3 命名确定性**✓——同物品组按 `order + id` 排序（:337）、order+id 冲突 fail-loud（:341-343）、base+` 2`/` 3` 后缀（:344-361），292 凤纹手绢 13 方案精确名断言通过，machine-inner=父名+`连续流程`（s273 实查 4 处：方案 7/8/10/11）；零 root / 多 root / 环 / 悬空 / opaque 五个失败模式各有聚焦反例（:123-204）且本人复跑 6/6 绿；**K-L4 current-only**✓——publication diff 仅 +import +断言调用（无 rename/rewrite/convert 残留，本人 grep=0），editor src 旧名正则 0 命中（无 UI 展示遮罩），历史 upgrader 文件不存在且引用 0，一次性转换器未进入提交（最终树只余永久 invariant 与其测试）。本人独立执行：`rg` opaque 精确模式 current+baseline=0 hits；s001:8056 `紫金丹剧情方案` 样例在列；聚焦复跑 `pal-item-scheme-labels.test.ts + .pal.test.ts + pal-current-publication.pal.test.ts` → **3 files / 9 tests passed**（含 HEAD 全量 publish 验证）。二跑零计划采用 Codex 记录的两次独立 replay（writes=0/deletes=0/conflicts=0/asset-deletes=0）证据，并获结构性佐证：publication 内已无任何改名代码、仅剩断言，label 写入无从计划；按指示未重复跑全量发布。无返工项；未修改实现，未代签 GLM。 |
| GLM | **accept（2026-08-30，只读终审 `f9237db8`，全部关键数字本人独立复算/复跑，与 Kimi 证据互补不重叠）** | 按 GM-L1~L3 独立核验：①**exact-diff 结构化复算（GM-L1）**——本人 python 脚本对 `c1c19fd3 -> f9237db8` 做 JSON 叶级 diff：current 与 baseline 各 **17 文件 / 恰 53 个 `.label` 变化 / 0 非 label**（数组长度与键增删均零），`scenes/index.json` 前后相等；17 份正文 current↔baseline `cmp` 逐字镜像。②**引用图实现（GM-L2）**——`pal-item-scheme-labels.ts` 覆盖 behaviors(trigger/auto)+`hooks[onEnter/onTeleport].variants`（:218-253），悬空 :280 / 成环 :285-286 / 零 root :313 / 多 root :314-317 / 数量漂移 :324-329 / order+id 不唯一 :341-342 全 fail-loud；**真实链抽查（K-L1 交叉）**：s273 `hooks.onEnter.variants.c8-440a584eee79` 现名 `凤纹手绢剧情方案`，其 10 个实体固有 auto = `凤纹手绢剧情方案 2..13` 全归 item 292。③**命名 census 重扫（GM-L3）**——49 顶层 label / 11 root（292×13、273×12、六神丹×5、布包×5、玉佩×3、香蕉×3、桂花酒×2、钓竿×2、情书×2、风灵珠×1、石钥匙×1），后缀无空洞；4 个 machine-inner 全为 `${父名}连续流程`（凤纹手绢 7/8/10/11）；样例 `s001.hooks.onEnter.variants['c8-731fd69bc3f4'].label=紫金丹剧情方案`（flow=stages）。④**清零（K-L4 交叉）**——`物品剧情行为` 全库仅存 invariant 检测正则（:8）与负例 fixture 各一处；`experimental/script-v5/` 不存在；无转换器提交记录；`_state.json` 变化恰为 17 个 scene SHA 记录。⑤**聚焦复跑（本人执行）**——`pal-item-scheme-labels.test.ts` 6/6 + `.pal.test.ts` 1/1 + `pal-current-publication.pal.test.ts` 2/2 全绿（publication 真实校验路径 :262-268 含 invariant，41/11/4 错值即红）；未重复全量与完整发布。⑥**零计划闭合**——真实 current 49 label 全等期望（pal 测试断言）+ current↔baseline 镜像 + publication 以 baseline 为起点，推出再发布必零计划，与 Codex 两次 replay 记录互证。**观察（非返工）**：`isCandidate = reachable ∪ label-shaped`（:306-307）是比卡面更强的门禁——未来 item 私有脚本选择手写命名方案会 fail-loud 强制按约定命名，属故意 fail-loud，符合 current-only 纪律。无返工项；未修改实现，未代签 Kimi。 |

**done 准入结论：blocked（2026-08-30 Codex + Kimi + GLM 当前实现 accept 三签齐、无 counter；仅缺用户功能验收，验收前不得标记 done）。**

## Build / Review 证据

- 永久 invariant：新增 `packages/migrate/src/pal-item-scheme-labels.ts`，完整遍历 entity behavior 与
  `hooks[channel].variants`，从 item private script 沿选择边传播 root；49 个方案必须分别只有一个
  item root，同物品按稳定 `order + id` 生成名称，4 个 machine-inner 必须与父名同步。任何零 root、
  多 root、环、悬空、数量漂移、opaque label 或名称漂移都 fail-loud。
- publication 接入：`packages/migrate/src/pal-current-publication.ts` 在事务 journal 与资源写入前运行永久
  invariant；固定 PAL current 为 49 schemes / 11 item roots / 4 machine-inners。生产代码不改名，
  不识别旧名做展示 fallback。
- canonical rewrite：曾以 current publication 内的一次性转换器生成目标并由 migration transaction 同时
  写 baseline/current；正式计划 `writes=17 deletes=0 conflicts=0 asset-deletes=0`，事务共 35 项
  （17 current scenes + 17 baseline scenes + baseline state），资产 1934/1934 未改。发布成功后一次性
  转换器和旧输入专属测试均已删除。
- exact diff：发布前真实 PAL 聚焦测试先证明恰 53 个 `.label`；发布后从 Git HEAD 独立重读旧正文，
  对 baseline 与 current 分别得到 `files=17 changed-values=53 label-only=true`，且 17 份正文逐字镜像。
  因而 `c8-*` ID、命令、flow、stage、order 与引用零变化。
- 聚焦测试：`pal-item-scheme-labels.test.ts` 6 / 6（嵌套 hook + 固有挂载链、稳定消歧、零/多 root、
  环、悬空、opaque）；`pal-item-scheme-labels.pal.test.ts` 1 / 1（真实 49/11/4、292 凤纹手绢 13 方案、
  baseline/current label 镜像）；`pal-current-publication.pal.test.ts` 2 / 2。
- 最终门禁只跑一次：`pnpm --filter @type-pal/migrate check` → 47 files / 385 tests 全绿（含 typecheck）；
  `pnpm --filter @type-pal/editor audit:design-system` → 89 files / 2 evidence-bound exceptions。
- 幂等：完整 `--write` 发布进程 replay 为 `writes=0 deletes=0 conflicts=0 asset-deletes=0`；删除一次性
  转换器后的第二次独立 dry-run 仍为同一零计划，closure 为 294 scenes / 223 maps / 1934 assets。
- 功能性浏览器：本地 editor 6010、`s001` 进场脚本。默认宽度下目标卡 `strong=紫金丹剧情方案` 与
  `span=2 个步骤` 分别为两个 block；720px 下 rail `clientWidth=240 / scrollWidth=901 / overflow-x=auto`，
  横向滚动至 650 后目标 180px 卡完整可达。详情浮层名称字段为 `紫金丹剧情方案` 且保存可用；保存后
  目标卡 `aria-pressed=true`、项目仍无脏改，页面 opaque 可见数 0、console error 0。
- 同会话独立 UI 小修：`ScriptSchemeStrip` 的富内容选择面改用 `DsPressable`，避免
  `DsButton` child wrapper 把名称和步骤数挤成一行；该变更不改任何持久化 label。
- UI 小修验证：`ScriptSceneHookInspector.test.tsx` 3 / 3、editor typecheck、design-system gate
  （89 files / 2 evidence-bound exceptions）通过；本地 1280×720 实机打开 `s001` 进场脚本，目标卡已
  分两行显示怪名与 `2 个步骤`，横向滚动 / 选择 rail 正常。此条是 build 前历史证据，当时数据名称尚未
  改；当前 canonical 名称与重新实机验收以上述 720px 证据为准。

## 交接记录

- 2026-08-30 GLM: 只读终审 `f9237db8`，签 **accept**。全部关键数字独立复算：结构化 JSON diff
  current/baseline 各 17 文件恰 53 label-only 变化（0 非 label、index 不变、17 份 cmp 镜像）；
  引用图 fail-loud 面（悬空/环/零/多 root/数量漂移/order+id）逐行定位；真实 census 重扫 49/11
  （292×13、273×12…后缀无空洞）+ 4 machine-inner 全为父名+连续流程 + s273 固有挂载链抽查 +
  紫金丹样例在位；清零三连（opaque 仅存门禁正则与负例 fixture、v5 目录不存在、无转换器提交）；
  聚焦复跑 6+1+2 全绿；零计划由 invariant+镜像+baseline 起点结构闭合并与 Codex replay 互证。
  附一条非返工观察（isCandidate 强门禁属故意 fail-loud）。未修改实现，未代签 Kimi，未标 done。
  Next: 用户功能验收（编辑器 s001 进场脚本方案卡显示可读名 + 详情改名保存），验收通过后收口 done。
- 2026-08-30 Kimi: 只读终审 f9237db8 当前实现，签 **accept**。独立复核（非复述）：K-L1 反向图
  （behaviors.trigger/auto + hooks[channel].variants 全遍历、固有挂载递归传播、s273 链实过）、
  K-L2 exact-diff（本人复算 current/baseline 各 +53/−53 label-only、非 label 变更 0 行、17 文件 cmp
  逐字镜像、_state.json 仅哈希 churn）、K-L3 命名确定性（order+id 排序与冲突 fail-loud、292×13 精确名、
  machine-inner=父名+连续流程 s273 实查 4 处）、K-L4 current-only（publication 仅余断言、editor 旧名
  0 命中、upgrader 不存在、一次性转换器未入提交）。本人执行 opaque rg=0 hits、紫金丹样例在列、
  聚焦复跑 3 files / 9 tests passed（含 HEAD 全量 publish）；二跑零计划采用 Codex 两次 replay 记录 +
  结构性佐证（无改名代码即无 label 计划），按指示未重复全量发布。无返工项；未修改实现，未代签 GLM，
  未标 done。Next: GLM 审引用闭包 / 测试矩阵后交用户功能验收。
- 2026-08-30 Codex：完成唯一 Coding Owner build、自验证并转 `review`。落地永久引用图 / 确定性命名
  invariant，执行一次性 canonical transaction 后删除转换器；baseline/current 各 53 个 label-only
  变化且镜像，发布 replay 与删除转换器后的独立 dry-run 均为零计划。聚焦 6+1+2、migrate 全量
  47 files / 385 tests、typecheck、design-system gate、720px 浏览器详情/选择/保存全绿。Codex 已签
  accept；Next：Kimi 审 current-only / exact-diff / 一次性退休边界，GLM 审闭包 / 测试矩阵；两席不得
  修改实现或在签字不足时标记 done。

- 2026-08-30 GLM: 独立复算完成并签 premise verified + design agree（附 GM-L1 exact-diff 门禁 /
  GM-L2 闭包 invariant 永久化 / GM-L3 重名消歧 + machine-inner 同步钉）。核心证据：53/17 current=
  baseline 镜像、49 唯一 c8 方案（45+4）+ 4 machine-inner 父名重复、按真实 selectEntityBehavior/
  selectSceneHooks 形状的传递闭包 49/49 恰一 item root（0 零/0 多，11 root 物品，样例 731fd→273）、
  历史 SHA 生成代码直读。未修改实现/baseline/projects/pal，未代签 Kimi。

- 2026-08-30 Kimi: 设计审查（含一次自我纠错）。直读历史根因 `f1466374^:c8-item-use-augmentation.ts:
  370-382`(digest 同源生成 id/label)、复算 census 53/17 与 49+4 算术闭合、确认 label 非寻址
  (selection.value=c8 id)。**首版反向图因 `hooks[channel].variants` 嵌套层处理 bug 误判 8 个
  s273 方案 zero-root 并签 counter;GLM 独立复算为 49/49,两席冲突后本人定位并修正脚本 bug,
  重跑确认 49/49 恰一个 item root 与 GLM 一致**(s273 链: item 292 凤纹手绢 → onEnter hook
  c8-440a584eee79 → 8 个实体固有 auto,含 4 个 stateMachine 父)。撤回 counter,改签 premise
  verified + design agree,附 K-L1(反向图嵌套与固有挂载中间节点钉,s273 为正例)/ K-L2
  (exact-diff 53 label + 镜像 + 二次零计划)/ K-L3(命名确定性与 292×13 消歧)/ K-L4(一次性
  转换器删除 + invariant 永久化)四钉,背书 GLM GM-L1-L3。三签齐、无 counter,build 准入
  allowed;未修改迁移器 / baseline / projects/pal。Next: Codex 按钉 build -> 三方 done 终审与
  用户复验。

- 2026-08-30 Codex：完成根因、样例引用链、53 / 17 census、49 + 4 分类与设计初签；撤回 UI
  旧名遮罩方案，只保留独立布局小修。Next: Kimi / GLM 合并审查并将签字写回本卡。

## 下一位 Agent 提示词

无下一位 Agent 提示词。Codex / Kimi / GLM 三方当前实现 accept 已齐（无 counter），等待用户功能
验收：在编辑器打开 `s001` 进场脚本，确认方案卡显示 `紫金丹剧情方案` 等可读名与独立 `N 个步骤`，
详情浮层改名/保存正常且不回写旧名；验收通过后本卡收口 done。
