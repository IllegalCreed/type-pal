# PRE-E2E-AUDIT-1 · 两阶段全仓代码审计台账

审计基线：`09ee6e3c`（商店已完成；content20 / SAVE8）。
Owner：Codex；本批使用内部并行只读取证，**不代表 Kimi / GLM 签字**。
性质：只读审计台账，不是实现任务卡，不授权修改产品代码、存档格式、迁移器或当前内容。
进度：**A–E五批首轮只读取证已收口，修复尚未开始。** B批基线`84434b8a`、C批基线`35aa1dc5`、D批基线`50ed0f0f`、E批基线`223a20f0`，产品代码未变。
总体判断、风险归并、待证项与建议修复顺序见[总收口](summary.md)；完成审计不代表产品无缺陷或E2E已通过。

## 约束与覆盖

- 先读 `AGENTS.md`、`CLAUDE.md`、`docs/phase2/READ-FIRST.md` 与 `docs/ops/agent-workflow.md`。
- 依用户已批准路线图，在商店生命周期后、R4 薄 E2E 前审计。确认缺陷、待验证疑点、可选优化分开，
  不把所有优化都变成 E2E 前置条件，不把静态异味当作已复现故障。
- 第一阶段按自身原版/工具合同判断；第二阶段按当前 canonical 与干净架构判断。
  第一阶段的缺陷不自动阻断第二阶段 R4；不因本次审计重开已完成的商店/场景验收。
- 修复另按风险分卡/分批并执行必要签字，不能把本台账或商店签字当作修复准入。

| 批次 | 范围 | 本轮状态 |
|---|---|---|
| A | 数据安全：加载、保存、迁移发布、资源写入 | 已读主要端到端调用链，并对下列案例取证；不是所有字段/磁盘故障穷举 |
| B | 世界/脚本/切场景、异步取消与收尾、状态所有权 | [B批报告](world-lifecycle.md)：9条确认观察（8家族），U-01已追证为B-04；U-02待证 |
| C | 战斗规则、操作、AI/状态、结算、音画调用 | [C批报告](battle.md)：7项确认（两阶段分列）；服务Q2，不替代实战E2E |
| D | 编辑器Command/undo/redo、引用/删除、工作区及试玩 | [D批报告](editor-workflows.md)：5项（含1项试玩隔离/告知缺口），保存/身份部分复用A |
| E | 测试可信度、构建/发布、性能与维护性 | [E批报告](engineering.md)：6项记录，含旧调用面纪律与lint未绿；发布/性能未测范围明确保留 |

本批已覆盖的链路：

- `game`：Save API→IndexedDB/内存后端，F5/F9、导入导出、菜单保存、bootstrap恢复与异步loadScene。
- `pal-extract/shared`：MKF/SSS/YJ2、事件roundtrip、提取器清理/分批写盘边界；没有穷举全部解码算法。
- `reforge/content`：当前加载器/FileSource、SAVE8 preflight/normalize、SaveStore、主壳保存队列/快照barrier调用与恢复预检；barrier内部留B批。
- `editor`：main/App新建打开保存→workspace授权/锁/handle-store→序列化→FSA写入；另读clone/export边界。
- `migrate`：source→纯publication/baseline→作者快照→merge→target校验→物化→事务journal→前滚恢复→replay；
  另读根构建及发布入口，不等于执行远程部署。

未做：真实用户目录故障注入、真实IndexedDB破坏试验、浏览器慢网剧情复现、远程部署、完整通关/战斗E2E。
所有业务写入复现只发生在内存桩；Vite仅作模块转换，可能使用正常模块缓存，不能称整个Node进程绝对零OS写入。

## 第一批结论摘要

**A批9项确认的问题/防护缺口；当时留下的U-01已由B-04追证，尚未修复。** 严重度表示触发后的影响，触发条件与
E2E门槛另列。没有证据表明用户现有项目或存档已经遭到损坏。

| ID | 阶段 | 严重度 | 确认内容 | E2E影响 |
|---|---|---|---|---|
| A-01 | 二阶段运行时 | P1 | 同源不同项目共用存档键，B快存覆盖A快存 | 优先处理多项目/编辑器试玩与检查点隔离 |
| A-02 | 二阶段编辑器 | P1 | 第二编辑器首次保存的陈旧全量快照覆盖A已存内容 | 多窗口保存/冲突测试前修 |
| A-03 | 二阶段编辑器 | P1 | 跨文件保存中断可留下悬空人物引用，重开后无修复不能再保存 | 保存故障恢复可信度前置 |
| A-04 | 一阶段运行时 | P1 | sceneLoading窗口仍允许F5，读回路径跳过尚未跑的onEnter | 一阶段F5检查点前修；不直接阻断二阶段R4 |
| A-05 | 一阶段存储 | P1 | 请求success即报告保存成功，未等待事务提交 | 一阶段保存成功断言可能假通过 |
| A-06 | 一阶段工具 | P1 | 损坏导入文件可覆盖好槽，随后运行失败 | 一阶段导入/存档保护专项前修 |
| A-07 | 二阶段编辑器 | P2 | 新建/打开项目未确认放弃，直接丢弃未保存会话 | 编辑器切项目保护测试前修 |
| A-08 | 二阶段迁移 | P1，条件性 | 最后快照检查到journal采样之间的并发作者保存会被覆盖 | README要求单writer；严格串行薄E2E不必因此全部冻结 |
| A-09 | 二阶段物化 | P2，条件性 | 目标父目录symlink可使二进制写到项目外 | 当前PAL无symlink，薄E2E暂无该触发条件 |

建议优先顺序：二阶段存档空间隔离与编辑器保存安全（A-01/02/03）→切项目保护（A-07）；
一阶段存档安全（A-04/05/06）单独排期。A-08/09纳入写盘防护批次，明确并发和目录条件。
这只是审计优先级建议，尚未开始修复或批准新存档/文件布局。

## A-01 · 不同项目的快速/自动存档会互相覆盖

- 证据：`packages/reforge/src/save/store.ts:34-68` 固定DB `type-pal-saves`，三store只按slotId写；
  `main.ts:584-585` 每个项目都无参数创建同一实现；`main.ts:5581-5622`及`:5768-5774`对quick/auto使用相同槽名。
  `save/types.ts:40-48`与`current-codec.ts:68-75`只在payload/读取时验证projectId，没有写入命名空间。
- 触发：同源运行A、B两个合法项目，A先快存，B随后快存，再回A读quick。无需并发、无需坏文件。
- 真实Store＋内存IDB边界输出：两实例均open `type-pal-saves/1`；六次put落同一组`meta/payload/thumb:quick`；
  A读取的projectId从A变B，A的preflight拒绝B，但A原存档已被覆盖。
- 反证：项目id guard确实防止错误加载；不同origin天然隔离，单项目不触发。**防错读不等于防覆盖**。
  同projectId不同workspace是否应共享还需产品定义，本条不先替用户决定；不同projectId已足以证实问题。
- 修复方向：为存储定义清晰的项目/工作区命名空间，读取列表与写入采用同一身份；当前开发档如何处理须另定，
  不增加旧key静默fallback掩盖冲突。复现见 `probe-save-boundaries.mjs` 的A-01。

## A-02 · 锁只串行，不识别另一编辑器的旧快照

- 证据：`editor/src/ui/App.tsx:567`新打开项目snapshotRef=null；`:2098-2108`首次保存传空Map。
  `core/project-io.ts:408-412`据此全写，`workspace-persistence.ts:178,462,618`的授权/锁保护身份和互斥，
  普通本地项目没有对内容版本做compare-and-swap。
- 触发：两编辑器从相同旧快照打开本地项目。A改人物名并保存；B只改项目名称，随后首次保存。
- 实际模块链：`buildBlankProject→openLocalProject→toEditorState→serializeProjectWithMapCopies→writeProject`；
  FSA/IDB为内存边界，模拟两份独立快照，不冒称启动了两个浏览器窗口。结果A的`Saved by A`被还原为`主角`，
  B的项目名称仍成功写入。
  最终探针分别调用真实`UpdateLocaleCommand`和`RenameProjectCommand`；人物显示名入口确实写locale（`ActorMode.tsx:606-614`），
  不是把只读名称ID当成UI可编辑字段。
- 反证：Web Lock能防交错写，但A完成后B再写仍可覆盖陈旧数据；本条不外推到PAL指纹模式，也不要求两次同时运行。
- 修复方向：打开时持有磁盘基线，写入前在同一互斥域校验目标版本/差异；冲突显式报告，不把当前磁盘重采样当旧快照。
  复现见 `probe-editor-persistence.mjs` 的A-02。

## A-03 · 合法状态的部分保存会破坏已发布引用

- 证据：`editor/src/core/project-io.ts:175-187,245-248`先产出场景后产出人物表；`:496-504`逐文件原地close；
  `App.tsx:2098-2138`恢复快照只在当前页面内存。正常作者路径是`ActorMode.tsx:299-315`新人物和
  `App.tsx:2027-2031`放置人物实体。
- 触发：新建new-npc并放入既有start场景，合法完整状态已通过序列化校验；在actors.json close时注入失败。
- 实际输出：磁盘场景actor=new-npc，人物表仍只有hero；真实openLocalProject成功，但再次序列化拒绝
  `角色 "new-npc" 不在 actors 表`。浏览器/OS真实断电未复现，此处是内存FSA逐文件close故障注入。
- 反证：同页面保留恢复快照可重试；重新创建同ID人物或删除悬空实体可人工修复（只核源码，未实机）。
  **不是永久不可恢复**；但重建同ID不能自动找回失败写入的完整人物属性。manifest-last/catalog超集只保护部分资源关系，
  无法撤销已覆盖的普通场景正文。
- 修复方向：建立跨内容文件的发布/恢复边界，持久化必要恢复信息；不能仅交换两个文件写入顺序。
  复现见 `probe-editor-persistence.mjs` 的A-03。

## A-04 · 一阶段的过渡态被当成可快存状态

- 证据：`game/src/tools/quick-save.ts:18-19`只查explore/dialog/menu；`core/event-system.ts:3488`异步切场景；
  `shell/bootstrap.ts:871-900,1688,1710`读档强制explore且`fromSavedGame=true`不跑onEnter。
- 调真实`tickEventSystem([loadScene15,end])`、延迟sceneLoader后得到explore、sceneLoading=true、目标15、cursor已清；
  真实canQuickSave=true，Save API保存上述中间态。没有手写opcode执行模型。
- 读回跳过onEnter是调用链证据，尚未跑慢网浏览器/完整bootstrap；真实场景14.json对应游戏场景15，
  onEnter `L_5117`（`data/extracted/data/scene/14.json:4`、`events/all.json:33023`），含靠岸初始化和对话。
- 反证：目标没有onEnter或它已执行完则不产生同样后果；本条限定加载中且尚未执行目标进场脚本的窗口。
  一阶段菜单存档另观察到await listSlots后才取活gs（`menu-driver.ts:1008`），归入同一快照时机家族，暂不另计缺陷。
- 修复方向：所有存档入口共用稳定状态/快照边界。只影响一阶段检查点可信度，不能套二阶段的实现架构。
  复现见 `probe-save-boundaries.mjs` 的A-04。

## A-05 · 请求成功不等于事务提交成功

- 证据：`game/src/core/save/indexed-db.ts:52-67`丢掉transaction句柄，只等put请求success；
  `tools/quick-save.ts:45-46`随后报告成功。真实IndexedDbSave＋延迟事务桩显示Promise已resolve但事务仍pending，
  complete/abort监听都未绑定，后续abort无法改变已报告成功的结果。
- 这不是假设浏览器随意违约：[IndexedDB提交算法](https://w3c.github.io/IndexedDB/#commit-a-transaction)
  在处理完请求后才尝试写入，写失败可abort，成功提交后才发complete。
- 反证：正常提交成功不暴露问题；没有在用户磁盘上制造故障。现有API测试走内存后端，不覆盖这个生产差异。
- 修复方向：保存成功以事务完成为界，处理abort/error并验证重读；不能只等toast来建设一阶段检查点。
  复现见 `probe-save-boundaries.mjs` 的A-05。

## A-06 · 损坏导入先覆盖好槽，后在运行时失败

- 证据：`game/src/tools/save-io.ts:19-24`只验证format、partyMembers数组和wNumScene数字；
  `tools/tools-panel.ts:655`直接存parser结果；Save API只检查槽号，`scene-system.ts:508`后续解引用party。
- 探针保留真实导出的format/version，仅改gs.party=null。真实parseImportedSave→Save.saveSlot→loadSlot接受并覆盖好槽；
  真实tickSceneInput随后抛`Cannot set properties of null (setting 'facing')`。
- 反证：正常当前导出的完整文件不触发；没有操作用户数据库。额外未校验version是线索，不据此将二阶段current-only规则
  强套到一阶段；核心证据是同版本坏必要字段通过并覆盖。
- 修复方向：导入完成必要结构/范围验证后才允许覆盖，失败保留好槽。复现见 `probe-save-boundaries.mjs` 的A-06。

## A-07 · 新建/打开缺少未保存内容离开保护

- 证据：`editor/src/ui/App.tsx:2146-2149,2210-2225`新建直接返回picker、打开完成直接onOpened；
  `main.tsx:149-162,188`直接替换两份EditSession/ScriptEditSession。已查该调用域无dirty/放弃确认；
  源码中现有dirty确认只用于试玩/导出，不覆盖这些入口。
- 触发：有未保存主编辑或脚本编辑时完成“打开项目”或点击“新建项目”。结论来自完整调用链，未跑浏览器交互。
- 反证：取消目录选择不会替换项目；保存后切换正常。本条不声称导出/保存本身缺少既有确认。
- 修复方向：统一离开项目的产品保护，覆盖两份会话，并明确保存/放弃/取消；不在用户未选择放弃时丢会话。

## A-08 · 计划检查到事务采样之间仍有并发写窗口

- 证据：`migrate/scripts/migrate-content.mts:108-125`先检查快照，再物化，再创建事务；
  `src/migration-write-plan.ts:37-44`普通JSON写删不携带计划时旧hash；`migration-transaction.ts:330-331`
  提交时重读作者刚保存的文件作为previousHash，旧plan因而获准覆盖新值。
- 调真实planner、快照复核、write-plan、commit；仅fs边界为内存，模拟作者在复核后保存。
  输出authorEditLost=true，最终name回old，上游buyPrice=60，replay仍writes/deletes/conflicts全0。
- **条件限制**：`packages/migrate/README.md:49`已要求迁移期间不要让编辑器保存；守规单writer不触发。
  现有journal建立后hash检查能拒绝更晚的修改，本条只指检查到journal采样的缺口。
- 修复方向：计划时的precondition一直携带到写删，不要在提交时重采样旧值为覆盖授权。
  严格串行薄E2E不因本条一概冻结；并发保存/重迁安全不能宣称已满足。复现见 `probe-migration-boundaries.mjs` 的A-08。

## A-09 · 资源物化未拒绝目标父目录symlink

- 证据：`migrate/src/pal-assets.ts:1250-1265`按resolve路径mkdir/write/rename，没有校验实际父链；
  `migration-transaction.ts:75`的symlink拒绝发生在后续JSON事务中，无法保护先行物化。
- 真实materializePalAssets＋内存fs的symlink解析：项目内videos目录指向virtual-outside，written=1，外部旧文件被NEW替换。
  没有创建真实symlink或写任何外部目录。
- **条件限制**：普通编辑器不创建symlink；本批只读检查当前PAL父链/资产树未发现symlink，所以当前数据没有此触发条件。
  authored记录跳过物化、源hash/重复路径校验均正常，不是ownership合并失败。
- 修复方向：任何二进制写入前预检所有真实父路径与链接，明确拒绝越界。复现见 `probe-migration-boundaries.mjs` 的A-09。

## 疑点与撤回记录

- **U-01，已追证至[B-04](world-lifecycle.md)**：真实恢复函数体证明坏money/新增非法facing可突破预检，
  party=null会产生未收口拒绝但不替换旧世界；position=null被安全拒绝。最新读档胜出和caller取消守卫有效。
  不再把三个codec观测笼统当世界污染，也不重复加入A批确认数。仍未修复。
- **撤回X-01**：“dry-run启动恢复事务会写盘”不单独算缺陷。
  `packages/migrate/README.md:35-37`与MG2历史卡明确要求下一次命令先恢复中断事务。
  帮助文字`without writing`可补恢复例外提示，最多P3告知优化，不阻断E2E。
- 提取器先清可重生成输出再提取的策略未在本批冒报为canonical作者数据丢失；需按原始源可用性/发布使用方式另核。

## 验证记录与可复现方式

新增的三个脚本只是审计证据，**断言的是本基线的缺陷结果**，不是正式回归门禁。修复后应把对应正确性断言
放入正式测试并退役旧假设探针；不为维持它们引入旧版本兼容。仅在独立Node进程运行：

```sh
node --import tsx docs/ops/audits/pre-e2e/probe-save-boundaries.mjs
node --import tsx docs/ops/audits/pre-e2e/probe-editor-persistence.mjs
node --import tsx docs/ops/audits/pre-e2e/probe-migration-boundaries.mjs
```

Codex主Agent已独立运行上述最终落盘版（含防护），全部证实相应结果。editor脚本用Vite middleware模块加载、
hmr=false且不listen，拒绝fetch/picker，仅接受自己创建的内存目录；迁移脚本把所有用到的fs调用改到虚拟路径Map，
拒绝非虚拟路径。没有运行迁移CLI、extract、build输出更新、真实FSA/IndexedDB写入。

现有测试也通过，但未能拦截这些反例，不能据此撤销已复现的发现：

| 测试域 | 实际执行 | 结果 |
|---|---|---|
| game | `src/core/save/__tests__/api.test.ts`、`src/tools/save-io.test.ts`、`src/tools/quick-save.test.ts`、`src/core/menu/save-slot-menu.test.ts`、`src/shell/bootstrap-load.test.ts` | 5 files / 31 tests |
| pal-extract/shared调用 | `src/io/mkf.test.ts`、`src/io/sss.test.ts`、`src/io/yj2.test.ts`、`src/events/roundtrip.test.ts` | 4 / 12 |
| editor | `src/core/{workspace-persistence,open-actions,fsa-copy,project-io,clone}.test.ts` | 5 / 57 |
| reforge | `src/save/{store,ops,current-save.current-characterization,browser-state}.test.ts`、`src/{project-loader,file-source}.test.ts` | 6 / 34 |

每组用 `pnpm --filter @type-pal/<包名> exec vitest run <上述文件>`。共20文件/134测试；game/extract/editor由
内部只读审计分工执行，reforge与最终复现脚本由主Agent执行。本批没有把旧的全量通过记录当作新复跑。

## 下一步

本轮审计已完成风险归并；按[总收口](summary.md)先处理质量门禁、存档与作者数据安全，再修所用运行态边界。
Q2、一阶段与一般优化分开排期；U-02经进一步复核仍待证，不计已确认缺陷。
当前没有开始任何修复，也没有修改能力地图已验收状态。
本轮无外部Agent交接提示词；审计不追加三签，后续正式修复按任务风险及任务卡协议交接。
