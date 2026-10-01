# TEST-GROK-RENDER-HOST-LARGE-1 — 一阶段渲染/资源/有限宿主大包补测

Status: build
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
