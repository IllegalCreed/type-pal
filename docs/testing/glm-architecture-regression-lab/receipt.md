# ARCH-REGRESSION-LAB-GLM-1 · 简短回执（GLM 十二组，r12 剩余视觉/回执收口批次）

> **Codex收口注（2026-09-26）**：下文为作者候选62142b16的交付快照，分支/main位置和历史状态不代表最终树；现已接收done。Codex补正、独立视觉、正式41项贡献、未证后续归属及统一门禁见[完成回执](../architecture-regression-lab-completion.md)。作者原文和历史标签保留。

> **当前口径以本节为准（r12，2026-09-26）**；r9–r11 批次细节见 Git 历史（分支同下，其描述含当时口径，
> 例如 r11 时的 42/42、57 条与主线检出宿主说明，均为历史快照，不再代表当前）。
> - 候选分支 `codex/glm-architecture-regression-lab-r2`（起点 origin/main f5f166aa，已并入当时 origin/main
>   5ea51631 的产品冻结；当前 merge-base(origin/main, HEAD)=7a18eaa6，`git diff 7a18eaa6..HEAD -- packages/ scripts/` 为空）。
> - worktree `/Users/zhangxu/illegal/type-pal-glm-lab-r2`；**复算 cwd 一律为本 worktree 根**，
>   不要用主线检出（其工作树现被切换到 codex/arch-lab-r11-review，产品含 Codex 补正修复，不属于本候选冻结面）。
> - 候选测试 **42/42** 执行（r12 为纯浏览器取证批次，候选/diagnostics 未改动）；账本 **75 条**
>   = candidate-green **72** / existing-proof **1** / blocked-environment **1**（V04-02 历史环境事实，
>   已被 V04-03..08 解决，见该条注记）/ reproduced-defect **1**（G06-D1，产品修复 ebef3d5a 在 Codex 复核分支）。
> - 浏览器宿主（r12 实测配置）：全部从**本 worktree** 运行（repoRoot=worktree，packages/ 为候选冻结产品）——
>   - 6013：`packages/editor && VITE_PROJECT_ID=pal npx vite --port 6013 --strictPort`；
>     需先为 worktree 建只读 symlink 补 gitignored 生成资源：`data/extracted`、`projects/pal/assets/migrated`、
>     `projects/pal/assets/runtime` → 指向任一含生成资源的检出（只读使用；实测后已删除）。
>   - 6014：`VITE_PROJECT_ID=lab-v4 node docs/testing/glm-architecture-regression-lab/tools/v03-v04-host.mjs 6014 3600`
>     —— **自有隔离内存 origin**（/projects/lab-v4/* 由 lab 前置中间件从内存提供，不落盘、不触用户项目），
>     fixture 由 `tools/fixture/fixture-gen.config.mts` 生成到 /tmp（buildBlankProject + 正式编码器 + 内置最小 PNG 编码器）。
>   - 浏览器 1440×900 CSS / DPR 1（V02 另测 1280×800、720×640）。
> - 键盘投递：V01/V02 本轮用 **Playwright 可信键事件**（press/Tab/Arrow/Enter/Escape）实测；指针用真实 CDP 鼠标；
>   React 监听链另以页面内派发 KeyboardEvent 复核（同判）。r11 的「IAB press 受限」确认为旧自动化路径伪影，
>   不作为产品或平台结论。

任务卡：[ARCH-REGRESSION-LAB-GLM-1](../../ops/archive/tasks/done/ARCH-REGRESSION-LAB-GLM-1-twelve-packs.md)（build）。
账本：[results.json](results.json)（75 条，与执行 JSON 一对一双射）；机械对账器：[tools/verify.mjs](tools/verify.mjs)（v2 全硬判据）。

## r12 批次（回应 r11 counter：V01 剩余矩阵 / V02 / V03 / V04 / 回执校准）

### V01 剩余键盘/焦点矩阵（pal 开发快照，6013；账本 V01-10..15）

| 项 | 合同 | 实测 |
|---|---|---|
| V01-10 搜索 | 过滤/选中/恢复 | 「玉菩提」过滤 234→1；点击选中；清空恢复 234。**如实登记：搜索框 Enter 不产生选中（产品无此行为）** |
| V01-11 Tab | 焦点走查 | 名称(#item-name) →Tab→ 「减少买价」→Tab→ 「增加买价」（activeElement 逐步断言） |
| V01-12 Enter+blur | 提交恰一次 | 观音符→观音符K：Enter 后撤销=「撤销：修改物品」；blur（切换对象）后仍同一步；撤销恰一次复原、撤销禁用 |
| V01-13 Escape | 取消零历史 | 脏值 观音符ZZ +Escape → 值还原 观音符、撤销保持禁用 |
| V01-14 方向键 | spinbutton 步进 | 买价 150 →ArrowUp→ 151 →Enter 提交；变体 ↑↑=152 blur 提交恰一步；撤销复原 |
| V01-15 关闭归焦 | 焦点还原 | 图标对话框（内部搜索框自动聚焦）关闭后 activeElement 还原到打开前锚点（目录搜索框），未丢失 |

截图：v01-undo-redo-toolbar.png、v01-dialog-focus-return.png（完整 SHA 见账本 artifacts）。

### V02 非空工作区分隔条（场景 s000 进场脚本 + 地图工作区；账本 V02-03..05）

- 键盘：左宽 194→210→194→226→Home 194；右宽 290→ArrowRight×2 258（右侧语义：右键收窄）→双击 290；
  脚本高 420→404→420。全部恰 ±16，aria-valuenow 与面板实际盒宽一致。
- 真实拖拽（CDP 鼠标）：1440 下 194→260（+66=拖距）→双击复原；1280/720 视口下 +40 拖距同样精确。
- 三视口：1440×900 / 1280×800 / 720×640（innerWidth/Height 断言真实 CSS viewport，DPR 1）。
- 隐藏/恢复：工具栏「对象列表」切换后 .outliner 与分隔条不可见，恢复后宽度保持 194。
- 内容滚动：脚本抽屉正文 scrollH 866>clientH 380，滚动 0→485.5（**真实进场脚本 1 步骤内容，非空态**）。
- 与 Inspector Tab 分离：调宽不改 Tab 选中（摘要/进场脚本）。地图工作区 map-020 同合同（挂载瞬态后序列 210/226/210/194 精确）。
- 截图：v02-divider-1280.png、v02-divider-720.png、v02-map-workspace.png。

### V03 失败→恢复 与 A/B 乱序（自有内存宿主 lab-v4，6014；账本 V03-02..04）

- 宿主与 fixture：`tools/v03-v04-host.mjs`（lab 前置中间件，内存工程 + `/__lab__` 控制端点：一次性 500/受控迟到/
  内存替换/请求台账）；fixture 生成器 `tools/fixture/gen-v4-fixture.test.ts`（buildBlankProject + 正式编码器）。
- V03-02 正常态：精灵 A→B 切换；页面资源信息 SHA-256 35c00cea…（=生成器目录）、大小 212（=catalog bytes）。
- V03-03 乱序：注入 mirror.rle 迟到 2500ms → 选 mirror（可见 pending「正在解析帧资源…」）→ 选 hero（即时渲染）
  → mirror 2501ms 落地（宿主台账）后标题/AssetId 仍为 hero —— **旧结果不覆盖新对象**。
- V03-04 失败三态：一次性 500 被产品读取器自动重试吸收（台账 1×500+3×200，无错误泄漏，恢复力观察如实登记）；
  持续 500 → 预览区可见业务错误「httpSource … -> 500」+「读取图片…」占位；解除后重选同对象 → 渲染恢复。
- 截图：v03-sprite-mirror-normal.png、v03-sprite-out-of-order.png、v03-image-read-failure.png、v03-image-recovered.png。

### V04 合法媒体与 revision/引用刷新（lab-v4；账本 V04-03..08）

- V04-03 目录正控：正式编码器字节 → 生成器 node 断言目录 sha/bytes → HTTP 字节 sha（页内 fetch 复核）→ 应用解码显示，
  四方一致（蓝图标 d5f16e4c…/102B；镜像精灵 35c00cea…/212）。
- V04-04 缩放矩阵：24×24 图标 fit=800%（渲染 192×192）/ 1:1=100%（=自然尺寸）/ 放大 125%（30×30）/ 适合回填；
  宽图 320×240 fit 重算 256%。slider aria-valuenow 同步。
- V04-05 切对象：蓝↔宽图，标题/AssetId/文件 sha/尺寸/预览五处同步，无串扰。
- V04-06 替换→revision 刷新：同 AssetId 替换（正式 image-import 管线）宽图 153053B→342B、文件 sha→fbecb536…、
  列表条目数不变、预览像素刷新、尺寸行更新；工具栏出现「撤销：导入资源」（替换可撤销）。两次独立页内编码同像素
  得同 sha（编码确定性旁证）。
- V04-07 引用刷新：item-001 绑定蓝图标（items[0].icon，引用 1、删除被「阻断删除」拦截）→ 替换后引用保留、
  物品页三处图标（页眉/侧栏/图标资源预览）同步刷新为新字节，AssetId 不变。
- V04-08 长名称与侧栏滚动：720 高度下 scrollH 695>clientH 527，滚到底 scrollTop=168，长名条目完整可见。
- 截图：v04-image-viewport-clip.png、v04-image-fit-clip.png、v04-image-sidebar-scrolled.png、
  v04-image-replaced-clip.png、v04-icon-blue-replaced-canvas.png、v04-icon-replaced-refs.png、v04-item-icon-refreshed.png。

### r11 前批次已接收部分（不重做；历史表述从 r11 冻结）

- **G01-07 accept**（Codex 独立浏览器三向重放）：复现步骤见下节；宿主当时从含生成资源的主线检出运行（历史说明）。
- **G06/G08 新增合同窄接收**（r11）：七入口 options 透传由 G06-11 证明（错误断言含 `cue.identity.kind`；
  完整精确路径与输入深等由 Codex 复核分支正式 13 项覆盖，本候选不重复计入）；G08-07 输出身份 + 丢输出反控已闭合；
  G06-D1 缺陷诊断保留为冻结树历史红（产品修复 ebef3d5a 属 Codex 复核分支）。Codex 另在复核分支修正了
  G08-07 失败输入 Map 快照（JSON.stringify 丢 Map）——**该反证成立且由 Codex 承担修复，GLM 候选原文不改**。
- **V01 五表单提交/撤销窄接收**（Codex r11 独立复验）：r11 批次两张「reverted」截图经 Codex 目视核对实为**提交后**
  单帧（敌队槽3 仍灯笼、战场名仍未命名战场探），已在账本 V01-07/V01-08 完成阶段更正并引用 Codex 复验证据；
  r12 起键盘矩阵以可信按键重测全通过。

## G01 浏览器证据复现步骤（历史，r10/r11 已 accept）

1. 干净宿主：`cd <含生成资源检出>/packages/editor && VITE_PROJECT_ID=pal npx vite --port 6013 --strictPort`
   （r12 起可改用本 worktree + 只读 symlink 补生成资源，见头部说明）。
2. 浏览器打开 `http://localhost:6013/?module=map&page=workspace`，选「✋ 平移」。
3. 像素读数：`document.querySelector('[data-map-canvas="true"]').toDataURL('image/png')` →
   crypto.subtle SHA-256（先确认两次读数一致，排除异步重绘）。
4. 正控：合成 PointerEvent down(400,300)→move(+40,+30)→move(+80,+60)→up（测试期 setPointerCapture
   替身，用后恢复）→ hash 变化。
5. 取消：同形状 down(450,350)→move(+30,+25)→pointercancel→**真实 CDP 鼠标**移动→up → hash 冻结在取消前。
6. 反控宿主（6014）：`LAB_REPO_ROOT=<含生成资源检出> VITE_PROJECT_ID=pal node
   docs/testing/glm-architecture-regression-lab/tools/g01-pan-cancel-needle.mjs 6014 1200`，
   页面 `__G01_NEEDLE_LIVE__=true` 后重复第 5 步 → hash 漂移即红。
7. 环境：1440×900 CSS / DPR 1 / 画布 956×793 @ 缩放 38%（6013）；Codex 独立复放 29% 缩放同判。

## G06 去重矩阵（author 七递归入口 + 跨模块边；r11 口径）

| 入口 | 锚点 | 既有证据 | 本仓证据 | 状态 |
|---|---|---|---|---|
| branch.then | author-script-core.ts:661 | author-script-core.test:512（branch.then→confirm 链） | G06-11（非空臂+identity 门） | 已证 |
| branch.else | :663 | （官方仅空臂） | G06-11 | 已证 |
| loop.body | :669 | author-script-core.test:131（bounded loops 非空 body） | G06-11 | 已证 |
| startBattle.onLose | :708 | （官方未单测） | G06-11 | 已证 |
| startBattle.onFlee | :710 | （官方未单测） | G06-11 | 已证 |
| teleportOut.onFail | :722 | （官方未单测） | G06-11 | 已证 |
| confirm.onNo | :726 | author-script-core.test:414/512（onNo 链） | G06-11（非空臂） | 已证 |
| startBattle.choreography（跨模块） | :712 | author-script-core.test:249（命令域） | **G06-D1 reproduced-defect**（漏传 options → cue identity 漏检，显式失败诊断交 Codex 修复；修复 ebef3d5a 在 Codex 复核分支） | 缺陷已复现 |

> 范围声明（r11）：G06-11 的错误断言只含 `cue.identity.kind`（子命令深度被拒），不等价于完整精确 path +
> 输入深等；后者由 Codex 复核分支正式 13 项覆盖，**不在本候选重复计入**。

## 负控 v2（tools/red-control.mjs，六针全 detected）

| 针 | 单点破坏 | 红例 |
|---|---|---|
| lab-startup | UpdateProjectMapLayerCommand.apply 早退（commands.ts） | 启动小样业务实变断言红（executed 1 / failed 1 / AssertionError） |
| g05-unmount-cleanup | 删 SceneScriptWorkspace 卸载 cleanup `return () => playback.stop()` | G05-04 同实例 stop 增量断言红：「expected 2 to be greater than 2」 |
| g03-committed | author-save-journal 最终 `publishState(receipt, 'committed')` 降为 `'data-complete'` | G03-03 终态断言红：「expected 'data-complete' to be 'committed'」 |
| g05-immediate-wait | Playback 宿主 wait 的 `timers.push` 改立即 `resolve()` | G05-02 挂起判别断言红：「expected 'right' to be 'up'」——旧等待从未真正挂起即暴露 |
| g08-ignore-roots | 图根从 `[...graphRoots, ...globalRoots]` 改为 `[...graphRoots]` | G08-06 可达图断言红：「expected 1 to be 2」（ownership 退回无根形态） |
| g08-drop-sprite | 0x65 的 `push({setActorSprite})` 置空 | G08-07 输出断言红：「expected [] to deeply equal [setActorSprite]」——成功路径吞命令即暴露 |

每针恰 exit1、目标测试全量执行、失败首行 AssertionError、注入 witness 命中、产品 hash 前后不变；
临时目录在系统 /tmp。

## 机械对账（verify.mjs v2 全硬判据；r12 口径）

- 账本 **75 条** = candidate-green **72** / existing-proof **1** / blocked-environment **1**（V04-02 历史，已被
  V04-03..08 解决）/ reproduced-defect **1**（G06-D1）；
  分包：startup 1 / G01 7 / G02 3 / G03 3 / G04 4 / G05 4 / G06 12 / G07 4 / G08 6 / V01 14 / V02 5 / V03 4 / V04 8。
- 执行 JSON **42/42 全绿**（候选测试 r12 零改动）；candidate-green 且带真实测试文件的条目与执行 JSON 双向一对一。
- 浏览器条目截图全部登记完整 SHA-256（verify 硬校验文件存在+hash 精确匹配）。
- 白名单双栏硬判据、commands exit 台账、负向自测同 v2。

## 未证项（如实保留）

1. G01 平移 view 增量断言 pending-contract（view 状态 jsdom 无公开可观测面；浏览器像素级已由 G01-07 覆盖）。
2. **浏览器级缩放 125%/150%**：IAB 无受控入口设置真实浏览器缩放（CSS viewport/DPR/zoom 均为可设可断言，
   页面级 zoom 已记录）；此轴 pending，属工具能力缺口，不称环境阻断。
3. G08 options 其余差异维度（globalScriptAliases/palSemanticProfile/palReferenceSchema/sceneSemanticSpriteIds）
   维持 pending/既有引用；G08-05 为**预检层**拒绝。
4. V03 覆盖按对象读取失败三态与 A/B 乱序；**boot 级**失败首屏三态未单列。
5. G06-D1 产品修复与 E2 结构解环（ebef3d5a/4cdefcf1）在 Codex 复核分支 `codex/arch-lab-r11-review`，未合入本候选。

## 复算命令

```bash
cd /Users/zhangxu/illegal/type-pal-glm-lab-r2
node docs/testing/glm-architecture-regression-lab/tools/verify.mjs \
  docs/testing/glm-architecture-regression-lab/configs/candidates-exec.json   # 机械对账（v2 硬判据）
npx vitest run --config docs/testing/glm-architecture-regression-lab/configs/candidates.vitest.mts \
  --reporter=json --outputFile=docs/testing/glm-architecture-regression-lab/configs/candidates-exec.json  # 候选 42/42（JSON 提交前 biome format）
node docs/testing/glm-architecture-regression-lab/tools/red-control.mjs       # 负控 v2 六针 verdict=detected
npx vitest run --config docs/testing/glm-architecture-regression-lab/configs/diagnostics.vitest.mts  # G06-D1 缺陷诊断（冻结树 1 failed 为预期）
pnpm exec tsc --project docs/testing/glm-architecture-regression-lab/configs/tsconfig.json --noEmit  # 类型门 exit0
npx biome check docs/testing/glm-architecture-regression-lab                  # 目录 Biome exit0（含提交的 exec JSON）
pnpm run check:docs                                                           # 文档门 PASS
# V03/V04 自有内存宿主（可选复现）：
rm -rf /tmp/type-pal-glm-lab-r2/v4-fixture && npx vitest run --config \
  docs/testing/glm-architecture-regression-lab/tools/fixture/fixture-gen.config.mts   # 生成 lab-v4 fixture（node 端目录正控）
cd packages/editor && VITE_PROJECT_ID=lab-v4 node ../../docs/testing/glm-architecture-regression-lab/tools/v03-v04-host.mjs 6014 3600
```
