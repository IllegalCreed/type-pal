# TEST-GLM-REFORGE-HOST-LIFECYCLE-1 证据

分支 `codex/glm-reforge-host-lifecycle-r2`(r2 返工);base `origin/main` `12247f7e3`
(r1 曾基于 e2e 在途分支 `70a56f6bc`,按 Codex 返工令换基剔除混入的 `scripts/e2e/*`
外来改动)。范围:reforge host lifecycle
六轴合同(启动/取消、promise 单次结算面、场景替换、存档入口、continuation cursor、signal、
host capability 缺席、后台错误恢复),不做覆盖率百分比承诺。

## 交付物

- 4 个专属测试文件,29 条合同(全部公开 caller,零 unsafe cast、零 `@ts-expect-error`、
  零 skip、零 timeout 扩大):
  - `packages/reforge/src/main.host-lifecycle-1.test.ts`(8):标题读档入口全链、入口/启动
    视频序列、播放中/解析中取消窗口、战败读最近档、无档重开、场景 BGM 缺席曲臂。
  - `packages/reforge/src/script-runner.host-lifecycle-1.test.ts`(7):12 个从未派发的
    author 命令 kind 分组分发、setEntityPos 能力缺席、setSceneOnEnter 既有槽、
    callScript 内 returnScript 边界、jumpScript 取消窗口。
  - `packages/reforge/src/script-runner-core.host-lifecycle-1.test.ts`(8):confirm/
    startBattle/teleportOut 续跑控制帧、自动单步检查点(settle/迟到回执/发布窗口吞没)、
    setCheckpointReady wait/stop 门、帧深 256 熔断。
  - `packages/reforge/src/script-host-adapter.host-lifecycle-1.test.ts`(6):adapter 生命
    周期/全队/队伍镜头命令、runEntityTrigger 直派拒绝、vanishEntity 目标三态。

## 四账(包内 `packages/reforge/src/__tests__/host-lifecycle-1/`)

- `hl1-identity-status.json`:29 条 file×fullName×status(重建:
  `node packages/reforge/scripts/hl1-identity-status.mjs`)。
- `hl1-family-ledger.json`:逐合同 name→源行→caller→输入→oracle,与身份账双向唯一匹配
  (重建:`node packages/reforge/scripts/hl1-family-ledger.mjs`,仓库 biome 定稿,再生成零 diff)。
- `hl1-mutation-counterproof.json` + `counterproof-raw/`:三态反控 4/4 PASS
  (重建:`node packages/reforge/scripts/hl1-mutation-counterproof.mjs`,clean-tree 前置,
  original/mutant/restored/rebuilt 四 sha256,console+json 原文全量落盘,executed/failed/skipped
  分账,mkdtemp+finally 清理)。注入点:core confirm 续跑臂(`script-runner-core.ts:474`)、
  runner wait 派发参数(`script-runner.ts:534`)、adapter vanish self 回落
  (`script-host-adapter.ts:58`)、main 场景曲写(`main.ts:916`)。
- `hl1-branch-delta.json`:全量 fast 基线(排除本卡 `*.host-lifecycle-1.test.ts`)vs 终态
  (含本卡)的逐文件臂账(重建命令见 `packages/reforge/scripts/hl1-branch-delta.mjs` 头注)。

## 不可达臂账(U 账,一手锚点)

| # | 臂 | 证据 |
|---|---|---|
| U1 | core L305 finishStep 目标 stage 不存在 | author 校验前置拒绝:`packages/content/src/author-script-core.ts:737-745`(next.stage 必须 hit stageIds)+ `:935`(checkBaseScriptFlow 传全量 stageIds) |
| U2 | core L442 returnScript outside script root | `author-script-core.ts:752-756`:flow 正文禁止 returnScript |
| U3 | core L445 finishStep outside owner flow | `author-script-core.ts:737-739`:仅 flow 正文允许 |
| U4 | core L448 breakLoop outside lexical loop | `author-script-core.ts:757-760` |
| U5 | core L451 continueLoop 目标非词法祖先 | `author-script-core.ts:762-767` |
| U6 | core L175/L595 compilerVersion 过期 | `packages/reforge/src/script-compiler-core.ts:15`(literal 3)+ `:94`(executable 类型钉死当前版本);合法 typed 值无法携带过期版本,构造需 unsafe cast(本卡禁) |
| U7 | core L553 forever 不能在 test 相位续跑 | `packages/reforge/src/script-continuation.ts:59-60` 拒绝;合法快照只产 body 相位(`script-runner-core.ts:574`) |
| U8 | core L573/575 循环控制帧类型不匹配 | `script-continuation.ts:43-44`(control.kind 必须 === command.kind) |
| U9 | core L328 指令不存在 | 编译产物为稠密集(`script-compiler-core.ts` compileBaseScriptFlowUncheckedAfterValidation 逐项 map);越界 index 被 `script-continuation.ts:40/76` 拒 |
| U10 | core L366/L540 缺少执行帧 | runCommand/runLoopCommand 只从 runCommands 调用链进入,帧先压栈(`script-runner-core.ts:321-322`);防御不变量 |
| U11 | core L370 B43#1 motionKind 非对象臂 | BaseRuntimeLeafCommand 联合全为带 kind 对象;typeof 防御 |
| U12 | main L937/L2116 活动世界已替换 | `main.ts:552` world 为 const 绑定;replaceWorld 原地变更(`main.ts:607-616`),worldView 恒 === world |
| U13 | main L520 DEV observe 臂 | `import.meta.env.DEV` 在 vitest 恒真(环境不可达) |
| U14 | main L533 菜单返回未知入口 | decision.entryId 只能来自注入 items(`opening-menu.ts:97,144-150`) |
| U15 | main L535#1 intro 播放假臂 | `shouldPlayEntryIntro('menu-entry')` 字面量调用恒真(`startup-entry.ts:61-63`) |
| U16 | main L478 入口 abort 臂 | 派发前每个 await 窗口各自带 abort 检查(`script-runner-core.ts:248/329/637`);防御纵深 |
| U17 | main L2092 `??` 臂 | host.wait 全部调用方显式传 signal(`script-runner.ts:373/534`、`script-host-adapter.ts:69`) |
| U18 | runner L579 `?? 0` 默认臂 | GridPos.height 必填(`packages/content/src/grid.ts:23-27`)+ `author-script-core.ts` checkGridPos 三键齐验 |
| U19 | runner L504#81 / adapter L30#73 default 臂 | switch 对 Command 联合穷尽,`unhandled: never`;命中需伪造非法 kind |

## 排重与既有证明

- bootGame 级标题菜单**入口**选择已由 H1(`main.boot-flows.test.ts`)覆盖;本卡新增的是
  标题**读档**入口(bootLoadSlot 全链,此前零测试)。
- 存档/场景竞态族(H5/H6)、F5/F9 剧情取消(auto-save 波)、读档浏览器(H2,runOpeningMenu
  直测)、gate/settlement 门族(glm-q)不重复;本卡视频取消走 auto 行为实体 + 存档游标重放轴。
- setEntityPos 显式 height 合同与既有『0x13 缺省臂』(c85,用 0/2 显式值)同 caller/输入
  形状/oracle——按排重纪律删除,只保留能力缺席新轴;L579 `?? 0` 默认臂按 U18 登记。
- 场景 BGM 有声资产臂已由既有读档/换景测试覆盖(play 臂在 c85 终态已 hit);本卡只闭
  null 停曲臂与 world 写键。
- awaitRunner 单次结算面由 H5『delayed old IDB read』既有证明覆盖(晚到读取不得翻转新
  请求),不重复建合同。

## 分支账(全量 fast 双跑,正确拓扑)

- 基线(排除本卡 `*.host-lifecycle-1.test.ts`):325 文件 / 8687 绿。
- 终态(含本卡):329 文件 / 8716 绿。
- **净闭合 +49 臂,0 丢失**:`main.ts` +12(L477/478/480/482 视频三窗、L530 菜单读档、
  L2078/5818/5829 读档链、L2730 playVideo host、L4101/4794/5094)、`script-runner.ts`
  +4(L392/459/504/791)、`script-runner-core.ts` +9(L227/229/320/382/387/396/474/508/
  520)、`script-host-adapter.ts` +3(L30/58/59)。r1 口径 +51 中的 L488/L500 两臂已被
  main 侧演进自行闭合,故 r2 为 +49。
- r1 的 `pal-meal-author` 基线红与对称排除在 origin/main 已不存在(该测试已修),
  r2 双跑全绿无需排除。
- 工作树事故(r1 期间并行 Agent 提交串线)详见任务卡 r2 回执;r2 换基后外来
  `scripts/e2e/*` 不存在,根 lint 的 e2E 诊断随基线消失。

## 验证

- 定向 29/29 绿;相邻 unit 12 文件 181 绿 + main/menu 邻域 13 文件 87 绿;
  `pnpm --filter @type-pal/reforge run typecheck` 0 错误;全仓 `pnpm lint` 零诊断;
  `pnpm check:docs` PASS;`git diff --check` 干净。
