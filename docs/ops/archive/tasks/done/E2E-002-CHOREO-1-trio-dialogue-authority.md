# E2E-002-CHOREO-1 — 三苗人对白期间的显式接管

Status: done
Phase: phase2
Capability: E2E-R4 / 002
Coding Owner: Codex Root
Generation Owner: N/A
Reviewer: Codex（执行器独立验收） / e2e_002_runner（非作者只读复核）
Visual Verification Owner: Codex
Visual Verification Timing: e2e-consolidated
Contributor: Codex
Branch: codex/e2e-002-r1

## 目标与范围

修正 s003/e56 首次演出：三位苗人可以先起步，参与交谈时停下，赏银后的短停顿继续走，
最后一句关闭后继续进房。对白读得慢不能导致仍在交谈的头领已隐藏。

- 唯一作者 Owner 为 Root；白名单仅 `projects/pal/content/scenes/s003.json` 的
  e56 trigger/default 初始 stage，以及新回归 `packages/reforge/src/pal-inn-choreography.test.ts`。
- 隔离树 `/Users/zhangxu/.codex/worktrees/e2e-002/type-pal`；执行器贡献者仍只写
  [002 工具卡](E2E-002-1-inn-route-and-trio.md)白名单，不改这两个文件。
- 不改 schema/runtime/public API、存档格式/版本、移动速度、NPC 路线、对白/奖励/阶段身份；
  不复刻对话冻结全局 NPC，不新增 parallel/join，不恢复转换器，不改大娘 nudge 机器。
- RF 第二轮正式保存屏障超时另定位，不能延长屏障、预等所有背景脚本或放宽断言。

## 前提真值门

### 一句话行为 / 工程前提

既有 takeEntity/releaseEntity 可局部暂停参与者的 auto endpoint，并在归还后续走；
这是显式作者编排，不是给引擎恢复对白与全体 NPC 的隐式耦合。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | L_285 在头领开口前派发三人 auto 并 wait；奖励后短等待，再说53；三人 auto 到终点后隐藏 | `data/extracted/events/all.json:2071` L_285 完整初轮及 L_406/411/420（2871/2911/2987）；原数据不单独证明实际调度停顿 |
| 第一阶段 | 起步在32之前；32→45位置稳定；53前短等待再次位移，三人仍可见；hide均晚于53 | `packages/game/src/core/mode.ts:29–47`；真实 `build/e2e/game-002-2026-09-30T08-54-21-859Z/inn-trace.json`，order62/72/70首次移、95/104对白、130最后句、185/329/336隐藏；Root和非作者贡献者各自读trace |
| 当前二阶段 | 独立auto不受对白全局冻结；旧派发顺序使首领已在谢赏/奖励时入房；take不取消auto move | `projects/pal/content/scenes/s003.json:1062–1288`；RF首轮trace order176隐藏、177谢赏、181奖励；`packages/reforge/src/main.ts:1413/1444/2716`；`motion-runtime-coordinator.test.ts:26` |
| 本任务目标 | 保留起步、短等待和原路线；两段对白显式接管三位参与者，关闭后归还，最终真实进房隐藏 | 本卡设计；002独立命令正常读真实001档，32/53各停读3秒、完整20行/500文、保存恢复合同 |

### 反证与替代解释

- 最强替代解释：take会取消auto endpoint，release后换activation或跳终点，三人永久卡住。
  生产coordinator保留autoSlots，宿主2716明确保留Promise并在release后续走，仍需实跑反证。
- 推翻观察：32/53等输入期间任一参与者继续移动/隐藏；奖励后短等待不续走；正文后不到终点；
  需要提高wait、手工隐藏或删除来源采样才能通过；取消后authority未归还。
- runtime语义：已核targeted authority/独立slot和正常finally/abort归还（`main.ts:4206/4251`）。
- 原版/第一阶段理解：trace推翻“全部末尾才起步”；按上述次序，不硬比坐标/帧数。
- extractor/地图/数据：真实路线/core已达到20行/500文/三人终点，问题位于编排而非地图。
- audit/test model：首轮locale、blocker push、narration观测问题归工具卡，不以该轮failed冒称通过。

### 用户可见偏离

- 主动偏离已核UX：no。修复提前消失，不改变台词、奖励或最终房间状态。
- before → after：头领可在谢赏时已入房 → 三人交谈时局部暂停，按一阶段演出次序继续走。
- 用户裁决：2026-09-30 用户要求“你不是应该参考第一阶段么？”；撤回之前产品选择，
  事实核验由Agent完成。不新增产品取舍，因此不重复询问离场顺序。

## 上下文锚点

- [AGENTS](../../../../../AGENTS.md)、[CLAUDE](../../../../../CLAUDE.md)、[二阶段铁律](../../../../phase2/READ-FIRST.md)
  6/8/10：一阶段是演出参考，显式编排；canonical作者正文不回同步退役转换核。
- [脚本系统](../../../../phase2/specs/script-system.md)、[一阶段知识测绘](../../../../phase2/reference/phase1-knowledge-harvest.md) E6/E7。
- [002回执](../../../../testing/e2e-002.md)、[母卡](../../../tasks/E2E-R4-1-route-and-checkpoint-foundation.md)、[工具卡](E2E-002-1-inn-route-and-trio.md)。
- `packages/content/src/author-script-core.ts:192–193`既有take/release；`main.ts:2296/2299`宿主；
  `motion-runtime-coordinator.ts:64–77`局部权威；`main.ts:4206/4251`正常与取消归还。
- 不得引入：全局对白冻结NPC、原始opcode依赖、估时等待、旧版本兼容、内容生成器复活。

## 设计与风险

保留三人auto选择和wait600；在32前take e59/e60/e61，保持32至51全部对白；
51关闭后release三人，原wait320、转身、wait40提供短演出；53前再次take，关闭后release。
只新增12个现有命令，不改其它正文。非参与者（如大娘）按既定政策继续独立行动。

风险：release遗漏导致auto永久停顿、错指大娘、释放放在dialog前、奖励重复或stage变化。
回归用真实作者内容经正式validator/resolver/compiler/runner，核两段接管、短等待释放、
其它实体无接管、20行/500文/next保持；E2E另证真实走位，现有宿主回归核取消收尾。

## 验收条件与E2E登记

- 单测先红后绿：真实s003作者链的上述关系，而非手写一份“期望脚本”自证。
- 双引擎各从真实001档正常路线触发；32/53 waiting-input各驻留3秒，三人可见且稳定。
- RF正文前起步、赏银后短等待续走、最后句关闭后继续至终点隐藏；房内替身、门精灵、
  20行实际呈现、0→500、stage、正式002保存/新上下文恢复均通过。
- Codex在冻结源码/工具上独立执行，截图/trace保存`build/e2e/*002*`；不重复开发期巡检，
  不宣称完整通关或音轨完成。
- 最终完整pnpm check，error/warning/info零诊断；不改质量规则或覆盖率基线。

## 当前模式推进记录

- Root premise verified：直接读取生产宿主、第一阶段调度和双方实际trace；最强反证如上。
- 非作者证据：e2e_002_runner独立读取trace，报告95→104位置不变/130再次移动且可见，
  与Root核读一致；贡献者不写作者文件，交付后另只读复核新增命令。
- Root design agree / build allowed（2026-09-30）：现有targeted authority足够表达，
  单一Owner/窄白名单明确；贡献者确认无active浏览器，内容冻结后重新运行。
- 实现/单测与非作者复核：已通过，冻结及历史记录见后文。
- 最终冻结E2E与完整全仓门：已通过，Root accept / done allowed。
- 产品验收：已定UX修复，不要求用户补做Agent测试；无新形态取舍。
- 2026-10-01实现冻结`4e340602`；非作者独立核12个命令仅局部take/release三人，真实作者链回归通过。
  `b83faa50`当前SAVE9/content21真001→002实跑：28步正常路线，20行/0→500及起步/两段停读/短续走/入房
  passed；32/53停读3027/3031ms、三人可见同坐标且pausedByAuthority。保存15ms成功，
  整体failed仅晚到恢复快照中的e62循环游标差异，保留原报告，不伪装002通过；最终门/集成pending。
- 2026-10-01最终门：冻结完整check10648项通过、严格lint2703文件零诊断；`fc1d5804`已集成。
  第二轮真实001→002路线/20正文/500文/局部停读与续走再次通过；实际恢复提交点全World严格一致。
  002整体仍failed，独立门frame1→0画面问题见[E2E-002-DOOR-1](E2E-002-DOOR-1-persistent-open-presentation.md)。
  局部编排修复accept；最终画面条件未闭合，保留review，不把源码/剧情局部通过等同002通过。
- 2026-10-01最终RF002 `16-31-19-969Z` passed：真实当前001正常28步，20正文/500文、
  32/53停读3045/3024ms三人可见且同位置，赏银后短等待续走、末句关闭后实际进房隐藏全部通过。
  原始起步/路线/速度不变，三人auto cursor completed；新上下文实际提交点全量World与Canvas均严格同原档。
  Root直接核49源hash/轨迹并看首领、奖励、末句及恢复两图。无全局NPC冻结/parallel/join；
  第一阶段已核UX与最终RF偏序一致。最后完整全仓门随后通过。
- 2026-10-01完整`pnpm check`冻结3feb5a77 exit0，10655包测试全绿、E2E工具57项；
  lint2704文件0 error/warning/info，日志`build/e2e/door-20261001/check-final-v2.log`。
  Root最终accept并done；原counter/failed轮保留。无新产品取舍、无追加用户技术复验。

## 交接日志

- 2026-09-30 Root：建立窄卡，撤回“全部搬末尾”草案，保留起步与短等待。
  贡献者确认无active浏览器，可开始作者修改；工具Owner/白名单不变。

## 下一位Agent提示词

无下一位Agent提示词。局部编排修复与最终002已收口，不追加编排能力；母卡继续后续片段。
