# TEST-GROK-RENDER-HOST-LARGE-1 — 一阶段渲染/资源/有限宿主大包补测

Status: rework
Phase: phase1
Capability: render-host / test-coverage
Coding Owner: Grok（仅新测试/专属fixture/证据）
Generation Owner: N/A（不生成美术）
Reviewer: Codex（独立验收与正式结算）
Visual Verification Owner: Grok提供隔离像素/宿主证据，Codex终审
Visual Verification Timing: mixed（离线像素与功能宿主dev-functional；剧情观感e2e-deferred）
Contributor: Grok
Branch: `codex/grok-render-host-large-r1`

## 目标与范围

十批连续交付：**400合法未重复新合同、40组、40有效反控**。
[共同协议](../../testing/grok-cursor-large/README.md) GC-1及
[精确46源与SHA256](../../testing/grok-cursor-large/targets.json)为硬边界。
历史395未命中臂只是筛选线索，不能保证新合同数量/可达性或正式覆盖收益。

Grok仅拥有game present、assets与表内13个shell叶宿主的后续主合同。
core战斗/事件/菜单状态/装备/存档、shell bootstrap/audio、reforge/pal-extract、
工具/E2E/遮挡产品卡全部只读。现有Q09四个framebuffer合同及全部旧测不得重领。
新测试可真实调用这些只读依赖，但oracle主合同及针目标只能归本表源。
不允许测试反过来改变原版机制、动画真值、剧情、碰撞或产品结构。

隔离工作树：`/Users/zhangxu/.codex/worktrees/grok-render-host-large/type-pal`。
从targets注册提交BASE开分支；生产冻结3ac9a2e2完整值见共同协议。
只写game新 `.grok-r1.test.ts(x)`、`src/__tests__/grok-render-r1/**`、
`docs/testing/grok-cursor-large/grok/**`；完整白名单/停线/门禁见协议。

## 前提真值门

工程前提：现行公开呈现/加载/播放宿主有可直接调用、可观察像素或资源生命周期的合同；
测试增强不等于授权改变玩法或把当前缺陷固化成原版真值。before→after仅证据增加。

| 维度 | 已核直接证据及约束 |
|---|---|
| primary/reference | `reference/sdlpal/scene.c:453` PAL_MakeScene；`uigame.c:1289–1473`物品目标界面；`itemmenu.c:28–310`物品列表；只作sdlpal参考，不冒称大宇原版运行结论 |
| 第一阶段 | `present/present.ts:184,718,793`真实present/flush入口；`assets/loader.ts:135,398,453`loadAll/Palette/SceneAssetsCache；`shell/input.ts:67,137,151`键盘/回放/记录公开类 |
| 当前二阶段 | N/A：本卡不触Reforge/editor产品，不将一阶段调色板/索引坐标带到二阶段 |
| 目标 | synthetic IndexedImage/完整Palette/真实Framebuffer、公开状态和受控外部IO；检像素、资源所有权、完整生命周期，不mock呈现/解码核心 |

最强替代解释：395缺口多数已被间接旧测试证明、不可合法构造或宿主限制。
推翻观察：只能删字段强转、使用未知私有state/世界后门、复制算法算答案或重写业务才能证明，
则该组blocked/existing-proof，不凑数。正式原版机制未知时停受影响合同，不借测试作新裁决。
源条件/caller核验仅证明测试入口；每项机制期望仍需相应一手证据，不能泛签所有400例。

## 上下文与排重锚点

先读AGENTS/CLAUDE、engineering-notes §1.3、§3.7/3.7b/3.8及协议；
机制/战斗显示值才读game-mechanics对应段，不以sdlpal替代原版数据真值。
`present/dialog-box.ts:98,298,507,552,637`文本状态/绘制；
`present/menu/draw-inventory.ts:119`公开输入（完整typed）；
`shell/rng-player.ts:183`playRng真实播放，不用私有测试注入；
`shell/boot-loading.ts`真实DOM宿主，用独占测试DOM而非游戏世界。
旧证明包括 `assets/loader.test.ts:9,79–127` fetch失败/LRU，
`shell/rng-player.test.ts:38–298`播放/跳过/震屏/并发，
`present/dialog-box.test.ts:52–411`控制符/分页/时序；
必须逐断言对照，不能只抄此清单。Q固定候选framebuffer-ports四例同样读断言。
禁止重新引入一阶段遗留L2、旧开发兼容、调色板非法短数组、剧情世界state后门。

## 十个连续批次（每批4组，约40新例/4有效反控）

| 批 | 主范围 / 可观察oracle |
|---|---|
| G01 | 资源loader/SceneAssetsCache/manifest合法组合与失败恢复；真实缓存返回、回收与fetch边界，排旧LRU |
| G02 | png/tileset/dialog资源解析与缓存；真实字节/像素/释放，不复制解码算法、不重新extract |
| G03 | tilemap/sprite/follower呈现；遮罩/裁剪/图层/位置只测已核公开语义，不改碰撞/走位 |
| G04 | presentFrame/flush/调色板与屏幕效果合法路径；像素对照、画面归属及恢复，无透明假绿 |
| G05 | dialog-box/font/text绘制与页面可见结果；旧时序/翻页不重复，剧情仅离线合成输入 |
| G06 | inventory/equip/player-status菜单显示分支；业务数据先合法，精确像素/字形/行选择 |
| G07 | magic/shop/opening/confirm菜单呈现组合；不重领core菜单命令合同或改变布局 |
| G08 | battle背景/精灵/UI/settlement/effect呈现；只读真实battle typed state，不重领Q动作/公式 |
| G09 | Keyboard/Replay/Recording、main-loop与boot/precache叶宿主；输入传播/取消/重复注册资源归属 |
| G10 | rng/avi/fbp/ending与fallback有限播放宿主；合成资源IO/关闭/失败/恢复，整账和末批门 |

每组四轴仅作为扫描：合法正路径；边界守卫；取消/异常；重复/迟到/归属。
不存在的轴写N/A，不能发明产品机制。某源100%但已全证，登记existing-proof转下个合法组。
功能宿主最小实操6条，离线真实像素证据至少6组；Canvas不可用如实blocked，不能源码冒充看图。
剧情/演出真实观感延后集中E2E，只登记可执行入口/预期/时序/证据路径；不跑PAL001/002或抢服务。

## 验收与推进

协议要求contracts最终400合法新例、directed file/fullName/status、40针原始三态与拒收自测、
同分母私有coverage、真实宿主/像素日志及截图hash、缺陷/未完账、完整候选SHA。
每批定向+相邻+game typecheck；末批串行game全包test/typecheck、根lint0/0/0、
docs/diff/verifier。原始PAL资产环境异常不能算全包绿或授权改数据，单列给Codex。

Codex核源码入口/现有断言与46源hash，所有权已落GC-1，**build allowed仅本白名单**。
作者交付pending；Codex独立accept/done blocked；不合main、不跑official ratchet/清树。
原版新真值/产品修复准入未开放；产品体验裁决N/A（纯补测，形态不变）。
缺足够新合同须逐项举证交Codex，不自行把400/40/40调小。

## 下一位Grok提示词

```text
你是TEST-GROK-RENDER-HOST-LARGE-1唯一测试Owner Grok。在本卡指定隔离工作树/分支，从grok-cursor-large/targets.json注册提交完整BASE开工。
先读AGENTS、CLAUDE、engineering-notes相关段、本卡、grok-cursor-large共同协议与targets；核冻结和范围。用git show固定P/Q候选读新测，连同派发树全部旧断言真实排重。
连续G01-G10，400合法未重复新合同/40组/40有效反控，不逐批等继续。首批先落真账和typed宿主小样，每批定向相邻/typecheck，阶段提交推送后继续。
仅新.grok-r1测试/专属grok-render-r1 fixture/grok证据可写；生产/旧测/共享文档/配置/官方baseline/真实数据/其它队列只读。禁止非法fixture、核心mock、强转桥、扩timeout；缺陷或新真值只停受影响组举证。
按协议交真实fullName JSON、逐合同旧断言/精确oracle、完整三态counter原证据与拒收自测、私有覆盖及宿主/像素证据；末批串行game全包test/typecheck、lint0/0/0、docs/diff/verifier。推完整真实候选SHA；不合main、不标done、不跑正式ratchet。
```


## Codex r1 独立验收（2026-10-02，最新）

固定919fc291a6e2b5b8710bac756e6a7d28d99dbae7（测试16db4d1ed9d394a2506293e7b4448f8a0c19ceef），counter/rework。隔离补齐旧测资产后新game3173全绿、40文件400身份对应/typecheck零，lint2969文件0/0/0、docs/diff/716冻结与120分配源/496白名单过。40三态源hash和业务身份对应、38patch可重建；G02-C/G04-A两patch坏但规格hash与独立三态成立，只重生成patch。唯一judge漏完整目标/collection-runtime/实际叶计数，四反例误收；真实raw异常探针拒收关闭。400真账旧63blob与派发一致，样本合法新轴保留；至少六组真实Canvas/六DOM宿主执行已证，最小图像hash未交。3针9相新重放全过，判据登记变而源/身份不变不重采40针。不扩另一大包，先按GROK-R1-01～03闭合后最终排重/正式门；未main/done/正式结算。

[详细审核与交接](../../testing/grok-cursor-large/codex-grok-cursor-r1-review-20261002.md)、[机器证据](../../testing/grok-cursor-large/codex-grok-cursor-r1-review-20261002.json)。不写贡献者树、不自动投递；用户手动转发以下最新提示词。

### 下一位 Grok 提示词（覆盖旧交接）

```text
继续TEST-GROK-RENDER-HOST-LARGE-1，唯一Grok测试Owner，原树/Users/zhangxu/.codex/worktrees/grok-render-host-large/type-pal、分支codex/grok-render-host-large-r1，固定919fc291a6e2b5b8710bac756e6a7d28d99dbae7、测试16db4d1ed9d394a2506293e7b4448f8a0c19ceef。先读审核树/Users/zhangxu/.codex/worktrees/glm-lmn-acceptance/type-pal/docs/testing/grok-cursor-large/codex-grok-cursor-r1-review-20261002.md/json及原卡最新段。只闭GROK-R1-01～03：唯一judge可导入且runner/selftest共用，完整注册file/fullName和多重身份、实际叶非零/顶层计数闭合、collection/runtime/raw/spawn与正常exit/signal政策；补已给错完整标题、单红叠空suite、假执行数/零实际叶拒收和真实Vitest单红叠异常探针。原raw异常拒收/真实Canvas/typed代码/400定向/40组与40不同目标、资产副本全包3173已证保留，不重做或扩大另一包。G02-C/G04-A只修两份可应用patch，from/to重建与旧mutant hash及三态已独立成立，不重采未变日志。按原卡给已有至少六组离线真实canvas及功能宿主补最小图像落盘/hash/读回日志，不跑剧情PAL001/002，不生替代美术。其它未变针可按新judge重判保留，源/最终执行集变化才重采受影响针。400合同账63旧blob与派发一致，保持逐条件真账/排重，不为已证轴造数量；完整收口后交真实40位SHA、docs-only锚与实际门数。派发0704d3de6d3d2a2099475a42f601b654bba08579、冻结3ac9a2e2f6aba8a5cc97640c18fef8549d199380不变，仅原game新.grok-r1测/专属grok-render-r1 fixture/grok证据可写；产品/旧测/配置/官方baseline/真实数据/GLM/Cursor/共享文档只读。末批game全包/typecheck、根lint完整0/0/0、docs/diff/verifier；环境资产单列，不冒称绿。不合main、不done、不正式ratchet/protected、不清贡献者树。
```


## Codex 最新独立复核（2026-10-02，r2）

固定4c86186076215d8f019436dbcce3d1599878e03d，原R1三业务项关闭，只剩GROK-R2-01生成报告格式counter。新3173全绿/400身份对应/typecheck零，40patch/三态hash/40不同目标对应，唯一judge四反例/40重判/真实异常probe过；8真实canvasPNG至少6组hash与读回成立、6host图仅DOM数据编码不是UI截图。自测写judge-selftest.json后根lint真实1format error，不能只提交前format掩盖；只修生成器/收尾，别重采40针或扩400包。docs/diff/冻结/白名单过，仍rework、不main/done/正式结算。

[详细审核与最新交接](../../testing/grok-cursor-large/codex-grok-r2-review-20261002.md)、[机器证据](../../testing/grok-cursor-large/codex-grok-r2-review-20261002.json)。只审固定候选、未写贡献者树、不自动投递。

### 下一位 Grok 提示词（覆盖旧交接；用户手动转发）

```text
继续TEST-GROK-RENDER-HOST-LARGE-1，唯一Grok测试Owner，原树/Users/zhangxu/.codex/worktrees/grok-render-host-large/type-pal、分支codex/grok-render-host-large-r1，固定4c86186076215d8f019436dbcce3d1599878e03d。先读审核树/Users/zhangxu/.codex/worktrees/glm-lmn-acceptance/type-pal/docs/testing/grok-cursor-large/codex-grok-r2-review-20261002.md/json及原卡最新段。原GROK-R1-01～03业务已关闭：唯一judge四反例/40重判/真实异常probe、40可重建patch、400身份、真实canvas至少六组与hash通过，game3173新全包绿/typecheck零。只修GROK-R2-01：judge.selftest.mjs重新写judge-selftest.json时短数组格式回退，selftest后lint真实1个format error；让报告生成或命令收尾正常机械格式化，保留JSON值/raw，不ignore、不降规则，连续自测后立刻lint完整0/0/0。pixels生成器已闭，不重做；六host窄PNG只是DOM数据编码不是UI截图，如实标类别、不增加合同数。不要重采40针、扩大另一包、重跑未变重门；测试/产品/配置字节无变可明确引用本轮全包证据。仅原白名单测试工具/grok证据可写，生产/旧测/配置/baseline/真实数据/其它队列/共享文档只读；派发0704d3de6d3d2a2099475a42f601b654bba08579、冻结3ac9a2e2f6aba8a5cc97640c18fef8549d199380不变。末次静态/docs/diff/verifier、真实完整候选SHA与docs-only锚；不合main、不done、不官方ratchet/protected、不清原树或依赖链接。
```
