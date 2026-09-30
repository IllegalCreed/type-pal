# Wave Q：两阶段runtime与解码残余合同十倍包 — GLM Q 交付总账

Coding Owner: GLM Q；[任务卡](../../../ops/tasks/TEST-GLM-WAVE-Q-1-runtime-residual-tenfold.md)、
[共同协议](../README.md)、[冻结表](../targets.json)。分支 `codex/glm-wave-q-runtime-residual-r1`（独立 worktree），
派发提交 `8b3ca062953b17a12178f8d1a9e36657971234b1`，生产冻结
`3ac9a2e2f6aba8a5cc97640c18fef8549d199380`（开工与收口各跑
`verify-targets.mjs --wave Q --base 8b3ca062…`：frozenHashesValid=true、三 Owner 交集 0）。
不合 main、不标 done，待 Codex 独立验收与正式覆盖结算。

## 交付规模（诚实申报：未达 700）

**113 个新用例 / 7 个新测试文件 + 1 个专属 fixture / 34 枚有效反控 / 10 条非剧情浏览器流程 /
1 个产品缺陷红诊断。**

| 批 | 域 | 文件 | 用例 | 反控 |
|---|---|---|---:|---:|
| Q01 | reforge 非剧情 boot/menu/gallery/trial | 7 | 40 | 5 |
| Q02 | loader/manifest/catalog/map/缓存 | 3 | 24 | 5 |
| Q03 | bgm/midi/sfx/video IO 与取消重试 | 2 | 15 | 5 |
| Q04 | script-runner 光标/callScript 门族 | 1 | 13 | 5 |
| Q05 | battle 敌方可达闭包 | 1 | 6 | 5 |
| Q06 | game status 毒槽/装备派生值 | 1 | 11 | 5 |
| Q07 | game 事件/opcode 生命周期 | — | 0 | — |
| Q08 | game 战斗状态/回调/呈现 | — | 0 | — |
| Q09 | game framebuffer 呈现端口 | 1 | 4 | 4 |
| Q10 | pal-extract 解码/CLI | — | 0 | — |
| 合计 | | 15 文件（含 fixture） | **113** | **34** |

`directed-vitest.json` 从最终提交树 `vitest list --json` 生成（reforge 98 + game 15，
逐 file/fullName）；`contracts.json` 逐合同入账；`counters.json` + `counters/` 为 34 枚反控
完整正/变/恢复三态 SHA256、正反控 Vitest raw 输出、目标 AssertionError 原文与可重建
patch（old/new 串）。逐文件用例数与最终树一致。

## 700 缺口申报与可达性账（请 Codex 裁量调范围）

按共同协议「找不到足够合法新合同时，交逐项账并停受影响组；不得凑数」，本包如实短交。
逐批停线/受限理由（均有一手锚点）：

1. **Q07/Q08（game 事件/战斗，pool 内 event-system 540 + battle 系 ~700 未命中臂）**：
   逐函数 dupcheck 显示 event-system/battle-core/battle-session 的公开入口已被此前 waves
   以 opcode 级矩阵覆盖（corpus 检索例：`0x29 apply-player`、`PAL_UpdateEquipments` 开战
   重建、`commandOutcome`、`onFlee` 等每函数命中 5–40 条旧测）；残余未命中臂集中在需要
   真实剧情/战斗长流程或整帧呈现的集成路径（本卡禁启动 PAL001/002、E2E-002 占用）。未找到
   能以合法自包含输入到达、且不与旧断言同形的新合同，按停线纪律不开组。
2. **Q10（pal-extract）**：`cli.ts`(93 臂) 的 RAW/OUT 是仓库根常量（`cli.ts:75-76`），
   按卡「不写根 data/raw/extracted、不跑主工程生成」不可测，登记 blocked；
   其余源分支覆盖已满（io/mkf、msg、rle、sss、word、yj2、tables、gbk 等均 0 缺失），
   `events/slice.ts`(21) 经 dupcheck 确认 R06 boundaries + 16 条旧测已覆盖其公开入口臂。
3. **game/reforge 其余小源**（word-lookup、inventory-state、scene-identity、dialog-history、
   audio-volume、reward-gain、browser-state 等）：逐函数 dupcheck 命中既有直测（例：
   `getWord` 5 条、`addItemToInventory` 6 条、`browserConfirm` 状态机 6 条），属 existing-proof。
4. **reforge 真实 AudioContext 臂**（bgm 25 / midi-preview 部分缺失）：沿 Wave N 先例
   登记 blocked（jsdom 无 WebAudio；typed 替身仅覆盖外部 IO 边界，已用于 Q03 spessa 装配层）。
5. **defensive-unreachable 登记**：`ScriptRunnerCore` compilerVersion/boundaryPolicy tamper 臂
   （executable 字段为字面量类型，合法构造不可达；compiler/chunk-store 落盘校验锚）；
   `commandOutcome 运行时缺失`臂（作者校验把 commandId 锚定同 state 顶层 confirm，
   `author-script-core.ts:881-883`）；`BaseSharedScriptResolver` timing/boundary 过期臂
   （resolver 按调用方参数现编）。

## 排重账（逐文件写前 dupcheck basis）

- `script-confirm-modal`：旧 4 例（FIFO/默认否两帧门/Esc=No/abort/会话替换）之外的生命周期臂。
- `boot-page-shell`：H1 boot-flows 已证管线外，页壳自身合同（工程 id 透传/错误画屏/无画布容错）。
- `opening-menu`：H2 flows/observation 之外的按键臂与缩略图 IO 时序（ArrowDown 环绕、
  未处理键 passthrough、← 首页钳制、thumb 逐槽恰读一次）。
- `shop-trial`：旧 6 例（严格拒绝矩阵/双 scope/缺商店/空库存/draw 失败）之外的白名单接受臂、
  resize 钳制、blur 清键、Escape 终态 DOM。
- `main.boot-shell` / `main.battle-preview`：H1/N01 之外的 `?battle-trial|?skill` 入口拒绝、
  音频偏好解析四态、手势恢复接线、gallery 解码容错、field 0/abc/-5 回退与 enemies 缺省/空臂。
- `assets-decode-gates`：G03/battle-bg/presentation residual 之外的 battle-sprite 六门、
  battle 缓存 label/origin.ref 失效与保护裁剪、effect-sprite record 门、tiles 标签、
  gzip 透传/偏移视图/缺流。
- `runnable-project-loader`：corpus 0 命中，全源新覆盖（版本门三态 + httpSource 接线）。
- `project-map-stamp-resize`：N01 之外的 stamp placements 写读/守卫、resize 增缩与组合保护、
  图层操作 stamp 联动、重复 id/未知 id/越界钳制。
- `audio-spessa-runtime`：midi-preview 适配器层旧测之外的初始化门族与浏览器 runtime 装配
  （外部合成库 typed 替身；真实最小 MIDI 字节解析）。
- `video-sfx-ports`：N03/sfx staged-failures 之外的 muted 臂、pause 异常容忍、maxDecoded
  校验、无适配器告警。
- `script-runner-core.gates`：旧 21 例之外的非法光标组合、callScript 门族（无 resolver/
  深度 128/错 id/digest 过期/self 模式）、host 缺 revealSceneEntry、while 前置条件序。
- `enemy-closure`：corpus 0 命中，全源新覆盖。
- `status-poison-equip`：opcode 层旧测之外的毒槽函数直测（ByKind/伪毒/cure/runner 契约）
  与 fleeRate/poisonResistance 读取器钳制。
- `framebuffer-ports`：`createFramebuffer` 本体 0 直测命中，四合同新覆盖。

## 业务反控（34 枚）

每批 5 枚（Q09 4 枚）单轴合法输入变异：正控 exit0 全绿；变异 exit1 且恰目标 fullName 红
（AssertionError，无 skip/timeout/收集错误/零执行/额外红）；断言不动；三态 SHA256
original===restored===最终候选文件。汇总见 `counters.json`，原始输出与 patch 见 `counters/`。
反控在 `mkdtemp` 隔离副本树（含 node_modules 完整拷贝）上执行，候选树产品源零改动。

## 产品缺陷登记（不修，停组待 Codex 裁决）

- **D-Q01-1**：`opening-menu.ts:138` `void enterLoad()` 无拒绝处理 —— 任一已存槽缩略图
  不可解码（损坏 Blob / IO 错误）时，进入读档相位触发**未处理 Promise rejection**
  （`opening-menu.ts:118` createImageBitmap），菜单相位卡在非 load 态。
  红诊断：`defects/D-Q01-1-opening-menu-enterLoad-unhandled-rejection.txt`
  （Unhandled Rejection 栈直指 enterLoad）。该组未落任何固化缺陷行为的测试。

## 浏览器实际操作取证（10 条，`browser-evidence/`）

真实 Chrome headless 1440×900 → `dev:pal`（真 pal 工程）。全程**无 `__rfWorld`、
未选择开局项、未进入 PAL 001/002 叙事路线**（F1–F5 脚本硬断言）：

- F1 媒体 autoplay 恢复与跳过取消链：`?menu` 真实播放 001/002 视频（autoplay 被拒→
  overlay 点击恢复），Space 跳过两段落入标题菜单。
- F2–F5 标题菜单键盘矩阵：ArrowDown 选中移动（观察口 cursor=1 + 像素差分）、Enter 进
  读取进度（phase=load，差分 0.73）、空档 ← 钳制、Escape 退回 + ArrowDown 环绕回首项、
  未处理键 `a` passthrough（光标不动、闪烁幅度内无相位变化）。
- F6 `?gallery` / F7 `?battle-preview=24` 直返（console 标记 + 非零画布 + 无 `__rfWorld`）。
- F8 shop-trial 非法参数失败恢复（`[reforge]` console.error + reforge ERR 画屏）。
- F9 `?shop-trial=1&money=88` 开店渲染 → Escape 退出资源（role=status 终态 + canvas 隐藏）。
- F10 shop-trial resize 重钳制（视口 1440→800 画布尺寸变化）。

11 张截图 SHA256 与逐页 console/失败请求分类见 `browser-evidence/browser-evidence.json`。

## 门禁结果

- 三包串行全测（`env -u NODE_COMPILE_CACHE pnpm --filter … test`）：
  reforge **2150/2150**、game **2788/2788**、pal-extract **357/357** 全绿。
- 三包 `typecheck`：0 error。
- 根 `pnpm lint`：**PASS — 2802 files; 0 errors / 0 warnings / 0 infos**。
- `node scripts/docs/check.mjs`：PASS（814 Markdown / 4276 local links / 245 tasks，0 issues）。
- `git diff --check 8b3ca062…HEAD`：干净。
- `verify-targets.mjs --wave Q --base 8b3ca062…`：frozenHashesValid=true、ownerOverlap=0
  （原始输出 `receipt/verifier-final.txt`）。
- 覆盖对照（隔离 v8，同分母）：reforge 池 branches 8510/11460 → **8592/11460（+82，14 源）**；
  game 8260/11260 → **8264/11260（+4，1 源）**；pal-extract 插桩超时未测（Q10 零新测）。
- 全部 34 枚反控在**最终格式化候选文件**上重采集（三态 SHA256 与最终提交一致）。

## 覆盖对照（隔离，不更新官方 ratchet）

见 `coverage-delta.json`：三包全测 v8 覆盖 after 值 vs `targets.json` 派发基点逐源 before 值
（同源同分母对照）。历史：本包未重跑或改写任何官方/历史数值。
