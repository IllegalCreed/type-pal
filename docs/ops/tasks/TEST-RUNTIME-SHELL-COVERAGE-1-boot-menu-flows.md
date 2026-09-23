# TEST-RUNTIME-SHELL-COVERAGE-1 - 真实启动与菜单宿主流程补测

Status: draft
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
- GLM：premise pending / design pending。
- Kimi：premise pending / design pending。
- 独立反证：待非Owner直读loader资源/启动/cleanup/旧tests并给可证伪回答。
- 缺签豁免：无。
- build准入：blocked（三席未齐，不开始正式实现）。

### done前

- Codex：pending（实施者自验）。
- GLM：pending（代码/矩阵复核，无视觉）。
- Kimi：pending（独立终审）。
- done准入：blocked。

## 交接日志

- 2026-09-23 Codex：用户批准攻大空白区；主树旧7627报告未用，7790报告核准；创建本卡与GLM战斗卡，六组/白名单不重叠。当前仅设计和证据，无正式测试/产品变更，不跑覆盖率。

## 下一位Agent提示词

与TEST-BATTLE-WORKFLOWS-1同一r1并行交GLM/Kimi，各自独立核本卡H1～H6的真实调用链、合法自包含工程、可观测结果、外部IO替身和清理边界。先读AGENTS/CLAUDE/READ-FIRST、本卡、总计划/冻结机账、当前main和shop-trial/保存AST旧回归；不读另一席本轮结论。只改本人build前签字/日志，给premise verified/design agree或带file:line反证的counter，提交推送；不代签、不改共享状态、不开始实现/标done。两卡分别裁决，三席齐由Codex核build。本卡Coding Owner为Codex，GLM不做浏览器/视觉、不代写实现。
