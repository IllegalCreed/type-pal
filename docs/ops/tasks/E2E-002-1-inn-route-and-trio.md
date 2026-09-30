# E2E-002-1 — 正常出房路线、e56 演出与脚本编排审查

Status: build
Phase: ops
Capability: E2E-R4 / 002
Coding Owner: Codex 受委派执行器贡献者 e2e_002_runner
Generation Owner: N/A
Reviewer: Codex（独立验收）
Visual Verification Owner: Codex
Visual Verification Timing: e2e-consolidated
Contributor: Codex 受委派执行器贡献者
Branch: codex/e2e-002-r1

## 目标

从两引擎各自真实 001 结束档，经正式输入走出李逍遥房间并到达 `s003/e56` 靠近触发区，
独立执行首次演出，证明完整对白、实际 500 文奖励、三苗人分别进房/消失与控制权恢复，
导出真实 002 结束档并在新浏览器上下文正式读回。同时交付这一段的脚本编排审查。
用户 2026-09-30 明确：e56 长脚本是 002 核心，001 房间到 e56 的正常路线是另一个待解决问题。

## 范围

- 执行器实现白名单：`scripts/e2e/**`、根 `package.json` 新增 002 命令；不新增依赖、不改锁。
- Codex 单独维护本卡、母卡、看板、任务索引及 `docs/testing` 回执。
- 不改 `packages/**` 产品代码、`projects/**` 作者内容、schema/save、质量规则或覆盖率基线。
  实际缺陷须先定位、另核文件 Owner/白名单；不能放宽断言掩盖失败。
- 不造档、不跨引擎喂档、不 debug 跳场景、不修改运行世界，不靠固定次数确认键/在线 AI 运行。
- 不占用或重启用户/GLM 编辑器 6012/6010；每次执行自有端口、浏览器上下文并只清理自身资源。
- 不重跑已收口 001 视觉流程，不涉及 003 边界或 capture 音轨，不宣称完整 Q1/Q2 完成。

## 前提真值门

### 一句话行为 / 工程前提

002 包含独立的正常路线准入与 e56 首次触发演出；只出现奖励文字或最终 NPC 隐藏不足以通过。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | L_285 首次正文 20 行，含实际加钱 500；L_406/411/420 是三人分别进房后隐藏 | `data/extracted/events/all.json:2071/2871/2911/2987`；L_285 至首个 advance end 完整指令链已由 Codex 与贡献者各自读取 |
| 第一阶段 | 001 真档 scene2 房间、party(1344,288)、cash0；正常门出口，接近触发使用原版加权距离；正式存档导入和标题槽位恢复 | `build/e2e/game-001-2026-09-28T04-14-33-487Z/report.json`、`001.end.save.json`；`packages/game/src/core/scene-system.ts:218`；`scripts/e2e/game-opening.mjs:341` |
| 当前二阶段 | 001 真档 s001(60,-24,0)、money0；e3 touch 出口 loadScene s003；e56 touch range2；首 stage 20 正文/500 文，三个独立 auto 进房并隐藏 | `projects/pal/content/scenes/s001.json:299/332`；`s003.json:835/1242/6312/7681/9181`；`packages/reforge/src/main.ts:4269/5399`；对应真实 001 report/save |
| 本任务目标 | 两引擎各自验证路线与核心，完整正文/说话人，NPC 真实移动后隐藏及房内替身状态、实际加钱、阶段提交、真实档读回 | 本卡目标及验收条件；`projects/pal/e2e-checkpoints/README.md` 已定 002 边界 |

前驱 game 档 SHA256 `54a515a2352a2495570a27201ae0c8c87210f2006b026b124eaddf4c35030cf1`；
Reforge 档 SHA256 `c14a252153eacf412a33b56048cf46f8ec79bcc4dbf98022436eea7baccfda6d`。
两 report 均为 passed、原产物 revision `0a8c998f8c3d6196e0a1924e160c51c7694d30f2`。
Codex 已复核现行原始场景/视频和 game 插桩源码 hash 一致；锁文件随后随供给退役变更，须记录
为已解释的版本演进，不冒称旧 report 全部 hash 与当前相同。002 记录本次自己的完整来源摘要。

### 反证与替代解释

- 最强替代解释：恢复失败回落新局、只撞门未切场景、绕过正常路线、只 cue51 没加钱、
  三人直接隐藏未实际行走、房内替身未出现，均可能伪装成通过；必须失败关闭。
- `dlg.54` 是 e56 下次激活，不是本轮 20 行的一部分；额外触发/漏行/重复奖励均失败。
- 两引擎内部坐标和距离不同，不能硬比格距/步数。原版进大厅定位与 RF entry 一致，
  game 像素 `(1568,1504)` 对应 grid `(143,45)`；路线使用各自生产碰撞和触发语义。
- 四类替代根因：先核实际 runtime 提交/碰撞；再核原始对白/auto 解释器；再核提取地图/坐标；
  最后核采集器/断言。001 collector 限定 s000/s001，不能直接套用作 002 证据。

### 用户可见偏离

- no：本卡只建立验证和审查，不主动改剧情、移动语义或节拍。
- 新能力或主动演出偏离须另交 before→after 和代表场景，不能借本卡自动引入 parallel/join。

## 上下文锚点

- [AGENTS](../../../AGENTS.md)、[CLAUDE](../../../CLAUDE.md)、[二阶段铁律](../../phase2/READ-FIRST.md)。
- [母卡](E2E-R4-1-route-and-checkpoint-foundation.md)、[E2E 合同](../../testing/e2e.md)、
  [001 回执](../../testing/e2e-001.md)、[检查点边界](../../../projects/pal/e2e-checkpoints/README.md)。
- [002 执行与编排回执](../../testing/e2e-002.md) 当前只登记源码结论和待证项，不代表实际验收通过。
- [一阶段知识测绘](../../phase2/reference/phase1-knowledge-harvest.md) E6/E7：auto/trigger 双解释器，
  真 tick 证据优先于手工模拟；touch 重入不可造成死锁。
- `packages/content/src/author-script-core.ts:188` target/to/speed；
  `packages/reforge/src/main.ts:2416/2431/2678/2716/4233` 完成等待、像素增量、前台接管、独立 auto、取消收尾。
- 原始完整脚本转换与动作审计已退役；作者内容是 canonical，不能复活转换核或重生成覆盖作者正文。

## 验收条件

- 可执行独立 002 / 单引擎 / 双引擎命令，输入引用真实 passed 001 产物并核 hash/身份/预期世界。
- 正式恢复成功后 normal input：房间 → 正常门 → s003 默认入口 → e56 靠近触发；路线步进有界、
  障碍/无进展失败，采样不能冒充实际位置写入；路线与核心分别报告。
- 首次 20 行正文及说话人全部实际呈现；奖励前后 cash 0→500、cue51、cue53 顺序正确。
- 在 `dlg.32`、`dlg.53` 正常等待输入各驻留 3 秒，三个参与者可见且位置不变；
  原起步及赏银后短等待仍可移动，正文关闭后各自续走，不能为过断言缩短读对白时间。
- e59/e60/e61 各自实际走位至进房终点后隐藏；s001/e24/e25/e26 出现；保存阶段和控制权闭合。
- 真实 002 快存导出 → 新页/新 IndexedDB → 正式导入/读回；持久世界、场景位置与同引擎结束画面核对。
- 采集有界、有序、溢出/丢失/无来源移动 fail closed；增加反控工具测试，保留 001 原合同。
- 剧情集中 E2E：由贡献者调试，Codex 对冻结交付独立运行/复核截图；输出 `build/e2e/*002*`。
- 回执包含编排证据、保留/改进理由、建议表达与收益、下一步归属；不以指令减少等同观感改善。
- 最终完整 `pnpm check`，硬性静态门 error/warning/info 全零；本卡不增加覆盖率达标声明。

## 当前模式推进记录

- 前提 verified：Codex 直接读取完整 L_285、三 NPC 原始进房链、现行脚本/宿主/真实档；
  贡献者独立只读核证上述锚点及伪通过反例（2026-09-30）。
- 范围/设计 agree：独立 002 采集，保留 001 默认和 AST 锚 census；路线与核心分开断言。
- Codex build allowed（2026-09-30）：唯一执行器 Owner `e2e_002_runner`，
  工作树 `/Users/zhangxu/.codex/worktrees/e2e-002/type-pal`，仅上述实现白名单。
- 贡献者交付/自验：pending。
- Codex 独立验收：pending；done blocked。
- 用户体验/产品裁决：执行范围已批准，未引入新产品取舍；实际演出/编排结果待交付。

## 交接日志

- 2026-09-30 Codex：建立隔离分支，核定真实前驱和 e56 主链，批准工具实现；当前 main 产品/作者内容不变。
  下一步贡献者实现，Codex 独立脚本审查与验收；不等待固定 AI 席位签字。
- 2026-09-30 Codex：独立读取首轮双引擎失败产物并看 RF 首领/奖励截图；头领在谢赏/钱到帐时已入房，
  game 则在对白结束后入房。工具须补 locale key、blocker push 提交与 narration 实绘采集，
  不改产品来迁就观测。
- 2026-09-30 Codex：用户指出应先参考一阶段；撤回离场顺序产品选择。
  双方各自直接核第一阶段 trace：起步已发生，32→45 交谈停步，53 前短等待又有位移且全可见，
  hide 均在53之后。以[独立作者卡](E2E-002-CHOREO-1-trio-dialogue-authority.md)修三人显式接管，
  本卡工具 Owner/白名单不变；第二轮 game 自验通过、RF 正式保存屏障超时待定位，未冒称通过。
- 2026-10-01 Codex：completion内容21/SAVE9切换后，执行器当前版本合同冻结9d60efff，
  正常重跑RF001产生真实SHA4104d7c3…；RF002 `15-07-24-839Z`route/core/choreography通过、
  checkpoint15ms成功且fresh-context loaded，但报告整体failed。唯一差异是背景e62自动循环游标。
  Root/贡献者各自直接核`main.ts:4629–4709`成功restore提交无await、auto启前，
  `captureCurrentSavePayload:4521–4528`→`currentWorldSnapshot:842`→`save/ops:34–39`为纯读真实World；
  e62实际读回后第二barrier前legacy-003，553ms后initial，符合wait400循环。
  新准入：工具Owner仅改inn-trace-plugin/observer/journey/contract及其test，
  在成功restorePayload唯一startAutoRunners前只读捕获提交payload，有界深克隆；核提交语句顺序/无await。
  该实际持久态全量严格openingSaveView比原始结束档；错钱/游标/completed、缺/重复/前移锚均失败。
  晚到post-resume完整快照另存，不删背景游标、不暂停世界、不取p/candidate/原档冒充观测，
  不改产品/作者/版本或质量配置。独立premise verified/design agree，Root build allowed。
  增工具反控并零诊断后冻结，再用本次真001重跑002；旧failed原样保留，母卡不关闭。

## 下一位 Agent 提示词

```text
接手 E2E-002-1，状态 build；你是隔离执行器唯一 Coding Owner。
先读本卡及其上下文锚点/相关 pnpm、Vite、Vitest 技能。
build allowed 范围仅 scripts/e2e/** 和根 package.json 新命令；Root 维护文档。
继承真实 passed 001 档，正常输入走至 s003/e56，再验证 20 行/500 文/三人进房消失。
不改产品、作者内容、schema/save/依赖/锁/质量规则；不操作 6010/6012，不造档或 debug 跳场景。
保留 001 观测与 31 现有工具测试；002 用独立合同与只读实际提交采集，未知/超限失败关闭。
交付 SHA、文件清单、工具/实际双引擎结果、反例及未完成项；不得自行合 main 或标 done。
```
