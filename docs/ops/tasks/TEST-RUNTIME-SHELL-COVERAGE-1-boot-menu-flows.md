# TEST-RUNTIME-SHELL-COVERAGE-1 - 真实启动与菜单宿主流程补测

Status: build
Phase: phase2
Capability: X1 / N6（既有运行时接线测试，不增能力格）
Coding Owner: Codex
Generation Owner: N/A
Reviewer: both
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional
Unavailable Agents: 无
Branch: codex/runtime-shell-coverage-r1（准入后独立worktree）
Revision: r1
Planning Base: f2592597
Production Freeze: 57dda7ed2376fc25f07756be117bb4a058d09915

## 目标与范围

真实调用bootGame与当前菜单/对话绘制入口，补“正常启动→键盘/受控帧→菜单/对话→场景/读档”的连续接线测试。当前main只覆盖30/3360行，六目标整文件遗漏3830行/2814分支，是选题上限而非收益承诺。此卡不开发新产品功能、不拆main或增加产品测试入口，不走PAL剧情E2E。

六目标：`packages/reforge/src/main.ts`、`opening-menu.ts`、`menu/menu-box.ts`、`menu/save-browser-box.ts`、`menu/magic-box.ts`、`dialog/dialog-box.ts`。不改这些源码。GLM另一张战斗流程卡独立新文件，本卡不领取其W1～W6或给其做视觉分工。

## 前提真值门

一句话：bootGame已是独立页/编辑器共享的公开当前入口，正常启动与主循环接线尚未被现有fast大量执行；真实入口测试可补这个空白，不能继续复制内部函数冒充集成。

| 维度 | 已核事实 | 一手锚点 |
|---|---|---|
| primary source | 启动scope先核、当前工程投影、资源/世界建态、keyboard/主循环到菜单各有当前合同 | `main.ts:339-424/:6223/:6384/:6835-6955` |
| 第一阶段 | UX/资源约定沿已实现的一阶段知识，不在补测试时更改布局或机制 | `phase1-knowledge-harvest.md` C7/N4～5/X3/X7/X9；`game/src/present/menu/`是后续若需像素核验的UX参考，不混同新引擎架构 |
| 当前二阶段 | `boot.ts:13`与`editor/src/play.ts:40/:144`真调用；shop trial测试从main早返回，不是普通启动 | `shop-trial.test.ts:138`、`main.ts:349-352`；AST旧测试见world-async-fixture与save-lineage.chain |
| 目标 | 真import、正式loader合法输入、受控外部IO、完整公共结果；保留旧回归 | 下方H1～H6与[冻结机账](../../testing/coverage-large-domain-evidence.json) |

最强替代解释：主入口复杂资源/无限帧依赖让测试只能mock业务或强造工程，或AST专项已证所有结果。可证伪：正式loader不能消费fixture、正常启动必须改产品接口、入口始终走预览/商店提前return、main实际覆盖未增长。发生则先报告宿主阻碍，不改统计范围或把Ast拷贝当成功。

四类替代根因：不因覆盖红推runtime缺陷；原版数值/碰撞不重裁决；不消费或写PAL迁移产物；旧7627报告被机械拒绝。before→after只补接线证据；无用户行为改变、无需要产品裁决的新政策。

## 上下文与六组流程

必读AGENTS/CLAUDE/READ-FIRST、[总计划](../../testing/coverage-large-domain-plan.md)、现行SAVE-PREFLIGHT/ISOLATION已归档合同、world-async既有测试、[第一阶段知识](../../phase2/reference/phase1-knowledge-harvest.md) N/X。旧文“未实现”以当前源码核实，不按历史标签改产品。

| 组 | 连续链与断言 | 去重与替身边界 |
|---|---|---|
| H1 正常启动 | 正式loader两场景工程→bootGame→至少一帧可观察world/scene；新局选入口、音频偏好/失败、非法scope先拒 | shop-trial早退已有不复制；不得stub runtimeProjectView/buildWorld/bootGame/正式guard |
| H2 标题与存档浏览 | 真runOpeningMenu导航进入读取、空/非空meta、取消返回、选择新入口或槽位、完成后输入/帧清理 | opening-menu.test只证音乐finally；真实save browser state与渲染，不手写相位 |
| H3 世界菜单闭环 | 普通boot后键盘打开→角色/仙术/系统→返回；合法技能列表/不足资源/角色切换，核world允许变更及非目标不变 | 不重复底层magic/use/equip全部矩阵；只证实际main路由，draw记录不是视觉认可 |
| H4 对话/脚本接线 | 正式场景脚本产生DialogBox、多行推进/关闭、等待后恢复、菜单与脚本确认优先级；通过真实tick/键盘 | 旧dialog-box测试只证箭头样式；不手调内部active，不复制main闭包 |
| H5 保存/恢复真实宿主 | scoped内存IDB，新局真实F5→改可观察状态→F9恢复；坏档拒绝仍可操作、成功请求拥有提示 | 旧AST保存/async测试保持；目标是接线/真实模块V8执行，不重复改存档政策；禁止真实用户IDB |
| H6 场景与失败恢复 | 合法脚本/公开入口切第二场景→资源失败保持原世界→同输入资源修复成功；旧请求迟到不覆盖后者 | `world-async-commit.test.ts`已有内层失败/漂移；新增两场景公开链、完整输入/输出与真实IO轨迹 |

## 宿主与准入探针约束

- fixture复用**生产构造能力**，可借鉴wave2 `readyTrialFixture`的自包含RLE/gzip/hash/loader方法，但新宿主自己拥有fixture，不改/跨Owner共享可变状态；入口场景、角色行走精灵、菜单/音效所有资源必须合法且哈希匹配。
- 使用Vitest真实import main；禁AST提取/new Function执行主业务以获取“主入口覆盖”。可观察`window.__reforge` /现有`__tpE2e.dumpSave`，只读观察，不给内部闭包新增生产导出。
- 外部边界只替代浏览器Canvas/ImageBitmap/音频设备/fetch/RAF/IDB（fake-indexeddb已有依赖）；正式loader、runtime projection、save codec/store、script runner、菜单状态机保留。可控Canvas记录调用仅证明代码合同，PNG/RLE仍合法，像素/布局如未浏览器核就明确未完成，不冒充视觉。
- 每测试全新模块/DOM/IDB，记录并清理自身listeners/RAF/对象URL；生产boot目前返回void，不能发明“有dispose API”断言。pending gate在finally放行同一Promise；不要吞掉启动错误后仍宣称成功，非预期IO立即带路径失败。
- 构建先验证H1与H2宿主可行，再一口气H3～H6；若真实入口无法到达，只停受影响族并给证据，不能暗中扩大成main重构。正式实施需三席准入，此前仅允许临时只读可行性诊断。

## 白名单与验证

新测试6文件（`packages/reforge/src/`）：`main.boot-flows.test.ts`、`opening-menu.flows.test.ts`、`main.menu-flows.test.ts`、`main.dialog-flows.test.ts`、`main.save-flows.test.ts`、`main.scene-flows.test.ts`。fixture仅`__tests__/runtime-shell/{project,dom-host,driver}.ts`。新文档/工具为`docs/testing/codex-runtime-shell-{mutants.mjs,coverage.config.mts,evidence.json}`与`docs/testing/codex-runtime-shell.md`；必要README索引/本卡席位日志可写。

不改产品/旧测试/公共fixture/官方配置基线/真实data和projects；不删AST回归，不降低阈值或忽略main。GLM战斗的测试文件与fixture不动。

每组非空正控与完整状态断言；负控6～10针钉真实main/菜单唯一调用点：scope核验迟置、错误路由/取消不返回、资源完成前提交、旧请求覆盖、重复保存提交、失去输入清理。每针精确新增case自身AssertionError，Error/timeout/未执行拒绝，生产hash不变。定向/相邻/全包/TC/Biome后整包同口径before/after到独立/tmp；官方check/ratchet/strict由Codex两包串行集成后统一执行。只声明实测净增；H1首通不作为已完成六组。

视觉时机：本卡以自动化接线为交付，不变UI；需要确认宿主替身与真浏览器差别时只由Codex做一次最小功能样本并留证，不跑剧情、不声称full/Q1/Q2。若发现UI/产品真实缺陷，独立卡/裁决，不塞进测试白名单修实现。

## 推进签字

### build前

- Codex：**premise verified / design agree（2026-09-23，r1）**。直接读main`:339-424`正常boot与shop提前return、`:6223`真实Keyboard与`:6240`公共观测、`:6310-6390`帧时钟/输入路由、`:6835-6955`当前读档/新局；opening-menu`:75-130`自身管理RAF/key事件且读真实store。主入口覆盖30/3360与官方7790报告一致；现有shop-trial真实boot证明可导入但不冒充正常启动可行性已活跑。首次H1必须实证正常场景进入，若只能mock业务/私改状态则停该族，不用AST给自己刷覆盖。
- GLM：**premise verified / design agree（2026-09-23，r1；锚点本人直读，形成结论先于核对他席落盘；本席为战斗卡 Coding Owner，审本卡不实施）**。
  - **真入口/早退分界直读**：`main.ts:339-352` bootGame 首行 `assertSaveScopeProject` 后
    即查 `battle-trial|skill`（拒绝）与 `parseShopTrialParameters`（提前 return）——
    `shop-trial.test.ts:136-143` 用 `shop-trial=0&money=100` 真调 bootGame 但走商店分支，
    确不等于普通启动已覆盖；H1 需无这些参数的正常链。本席确认卡面「shop 早退已有不复制」
    的去重边界。
  - **公共观测与输入锚点**：`main.ts:6222` `new Keyboard()`、`:6224-6245`
    `window.__reforge` 只读 getter（sceneId/entities/dialogue/script）——H3/H4 可经该公开
    窗口观察世界状态而不新增生产导出；`:6352-6356` activeBattle 分派帧输入。H5：
    `main.ts:6835-6860` `?e2e-load=` 走 loadIntent token + payloadBelongsToProject +
    restorePayload 事务——读档链有现行公开路径，坏档拒绝属可测真实分支。
  - **H2 opening-menu 自治**：`opening-menu.ts:75-189` 自管 `requestAnimationFrame(draw)`
    与 `window.addEventListener('keydown', onKey, true)`、cleanup 显式移除；`enterLoad`
    经真实 `saveStore.listMeta/getThumb` 打开 SaveBrowserState——真实导航/取消返回可用
    合成 KeyboardEvent 驱动，不必手调内部 phase；旧测试只证音乐 finally 的说法与本人核对
    一致（opening-menu.test 仅 audio 侧）。
  - **替身边界认同**：Canvas/ImageBitmap/audio/fetch/RAF/IDB 外部边界替身合法，正式
    loader/runtime projection/save codec/菜单状态机保留；`fake-indexeddb` 依赖在仓。
    AST 旧回归（world-async/save-lineage）保留不删、不按 AST 复制冒充 V8 执行——与总计划
    「接线新证明/旧合同转真实入口」分栏一致。
  - **可行性与风险**：main 3330 遗漏行含大量非首批分支，H1 首证正常场景进入是闸门——若
    正常启动被资源依赖卡死而只能 mock 业务，按卡面停族报证据，不暗中扩成 main 重构；
    boot 返回 void、无 dispose API，断言不得发明。
  - **可证伪观察**：①正式 loader 无法消费自包含工程 fixture→H1 阻碍须先报告；②正常链
    必须私改产品接口/内部闭包→范围不可达；③H1～H6 任一组与 AST 旧回归同输入同完整合同
    →去重错不得二次报功；④负控去保护仍绿→无鉴别力。返工项：无。两卡白名单无交集。
- Kimi：**premise verified / design agree（2026-09-23，r1；锚点本人直读，未读 GLM 本轮结论）**。
  - **宿主真实执行可行**：`boot.ts:13` 与 `editor/src/play.ts:14` 真实调用 bootGame；
    `main.ts:349-352` shop trial 提前 return（早退不算正常启动属实）；`shop-trial.test.ts:136`
    真实 boot 证明可导入但不冒充正常启动；卡面禁 AST 提取/new Function、要求 Vitest 真实
    import，H1 首通才准 H3～H6——可行性门禁正确。
  - **观测不增产品接口**：`main.ts:6224` `__reforge`、`:6826` `__tpE2e` 既有只读观测点在册；
    卡面禁止给内部闭包新增生产导出。
  - **IO 替身边界**：替身限 Canvas/ImageBitmap/音频/fetch/RAF/IDB（fake-indexeddb@6.2.5 已在
    依赖树），loader/projection/codec/store/runner/菜单状态机保留——与 wave2 B05 同型，
    不掩盖被测业务；PNG/RLE 仍须合法哈希匹配。
  - **清理与归属**：opening-menu `:75-130` 自管 RAF+keydown 并读真实 saveStore（`:106-109`），
    宿主测试须自清 listeners/RAF/对象 URL；boot 返回 void 不发明 dispose；「接线新证明」与
    「旧合同转真实入口」分栏不二次报功；与战斗卡同包重叠最终并集去重不相加。
  - **可证伪观察**（任一成立即收窄或 counter）：① 正式 loader 不能消费自包含 fixture 或
    正常启动必须改产品接口 → 停 H 族报阻碍；② 入口始终走预览/商店提前 return；
    ③ 替身下沉到被测业务层（loader/codec/菜单状态机被 mock）；④ 启动错误被吞后仍宣称
    成功；⑤ main 实际覆盖未增长却以 AST 拷贝报功。
  - 返工项：无。
- 独立反证：已完成；Kimi d24ead8d与GLM 5b07d84a分别直读真实入口/早退分界/公共观测/外部IO/cleanup，独立锚点和可证伪回答见本人席位。
- 缺签豁免：无。
- build准入：**build allowed（2026-09-23，Codex统一核定，r1准备候选b1f62c6b）**。三席均premise verified/design agree（Codex原签、Kimi d24ead8d、GLM 5b07d84a），无counter/豁免，实现/基线相对准备候选零漂移。仅授权Codex独立worktree按H1～H6和原白名单实施；先过H1/H2真实入口可行性，不扩为产品重构。

### done前

- Codex：pending（实施者自验）。
- GLM：pending（代码/矩阵复核，无视觉）。
- Kimi：pending（独立终审）。
- done准入：blocked。

## 交接日志

- 2026-09-23 Codex（STAT-1后续定位）：Kimi专项窄审e7c4b743已推宿主分支（非整卡accept）；
  本席继续取原始数据，定位到覆盖率合并器的同range双initializer身份冲突。原生12组与旧1378对照见
  [诊断](../../testing/coverage-initializer-diagnosis.md)，37L/42S/2F/37B差额可由该冲突解释；正式修复超本卡白名单，
  已开[TEST-COVERAGE-TRUTH-1](TEST-COVERAGE-TRUTH-1-class-initializers.md) draft等两席设计签名。
  宿主36项保留，不改本卡设计、产品、原测试或官方基线；不以Kimi窄审代整卡done签字。

- 2026-09-23 Codex（独立分支进度镜像）：`codex/runtime-shell-coverage-r1`已推送（tip0996cd87，代码候选1d3d3fb3，基4872b017）；工作树`/Users/zhangxu/illegal/type-pal-runtime-shell`。H1～H6共36项、全reforge1414、TC/Biome、1正控+8业务负控通过，产品/旧测试/官方配置基线零改。分支[实施回执](https://github.com/IllegalCreed/type-pal/blob/codex/runtime-shell-coverage-r1/docs/testing/codex-runtime-shell.md)及机账保存所有证据。局部cb77对照+1615行/+799分支包含script-runner-core的-37行：旧报告:123计2、原1378真实分支见证计0，至少一处旧计数虚高已证，具体工具根因/其余行待Kimi窄核，不以总包提升豁免。开发跳场景旧取消失败提示单列观察，未写成正确UI合同。仍build，不合主线测试/不更新官方基线；待GLM战斗包接收和统计解释后统一门禁。

- 2026-09-23 Codex（build准入）：用户确认“签了”，同步5b07d84a后核两席同r1直接证据与风险回答，无counter；本席统一登记build并同步看板/索引。独立工作树实施H1/H2后继续H3～H6，GLM战斗卡独立推进；不逐测试跑覆盖率、不提前done。

- 2026-09-23 GLM（r1 设计审查）：签 premise verified / design agree（证据见本席）：
  bootGame:339-352 早退分界与 shop-trial 去重、__reforge 公开观测 6224-6245、Keyboard
  :6222、e2e-load 读档事务 :6835-6860、opening-menu:75-189 自治 RAF/key/cleanup 与真实
  saveStore、外部 IO 替身边界与 AST 旧回归保留、H1 首证闸门与 boot 无 dispose 约束。
  四条可证伪观察入席。本席为战斗卡 Owner，本卡不实施；未读 Kimi 结论、未改共享状态，
  不代签、不开始实现。

- 2026-09-23 Kimi（r1 独立设计审查）：签 premise verified / design agree，无返工项。直读
  真实入口（boot.ts:13、play.ts:14；shop 早退 main.ts:349-352 与 shop-trial:136 边界属实）、
  观测点（__reforge :6224、__tpE2e :6826）、IO 替身边界（fake-indexeddb@6.2.5 在依赖树、
  业务层保留）、opening-menu 自管 RAF/key+真实 store（:75-130/:106-109）——宿主可真实执行
  bootGame，替身不掩盖业务，清理/归属分栏到位。五条可证伪观察入席。同时独立审
  TEST-BATTLE-WORKFLOWS-1 r1（另卡同签）。未读 GLM 本轮结论；未改实现/他席/状态。
  Next：三席齐后 Codex 统一核 build。

- 2026-09-23 Codex：用户批准攻大空白区；主树旧7627报告未用，7790报告核准；创建本卡与GLM战斗卡，六组/白名单不重叠。当前仅设计和证据，无正式测试/产品变更，不跑覆盖率。

## 下一位Agent提示词

### 当前下一步

统计根因与正式修复准入转[TEST-COVERAGE-TRUTH-1](TEST-COVERAGE-TRUTH-1-class-initializers.md)r1；
两席并行提示词见该卡。宿主整包审查/官方门禁未完成，不标review/done。

### 历史给Kimi：STAT-1统计异常窄复核（e7c4b743已完成）

在 `/Users/zhangxu/illegal/type-pal-runtime-shell` 同步 `codex/runtime-shell-coverage-r1`（tip0996cd87；代码候选1d3d3fb3，基4872b017），卡仍build，设计不重签。读AGENTS/CLAUDE/READ-FIRST、该分支本卡、`docs/testing/codex-runtime-shell.md`的STAT-1与机账；按分支卡内完整提示词独立复建 `node docs/testing/codex-runtime-shell-mutants.mjs --probe-core-coverage`。核旧1378/新1414的覆盖差分和旧1378真实throw分支见证，给带一手锚点的统计结论/反证与最小后续证据；不由Codex描述推结论，不签整卡accept，不改产品/旧测试/统计配置/基线/状态。不跑官方覆盖率，DEV-TOAST-1不扩成修产品。只在分支卡追加本人“统计专项复核”及日志、提交推送该分支，不代签；若需框架改动，明确为当前白名单外待准入事项。

### 历史r1设计提示词（已完成）

与TEST-BATTLE-WORKFLOWS-1同一r1并行交GLM/Kimi，各自独立核本卡H1～H6的真实调用链、合法自包含工程、可观测结果、外部IO替身和清理边界。先读AGENTS/CLAUDE/READ-FIRST、本卡、总计划/冻结机账、当前main和shop-trial/保存AST旧回归；不读另一席本轮结论。只改本人build前签字/日志，给premise verified/design agree或带file:line反证的counter，提交推送；不代签、不改共享状态、不开始实现/标done。两卡分别裁决，三席齐由Codex核build。本卡Coding Owner为Codex，GLM不做浏览器/视觉、不代写实现。
