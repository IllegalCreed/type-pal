# E2E-002-DOOR-1 — 开门呈现的持久语义

Status: draft
Phase: phase2
Capability: E2E-R4 / 002 / X1
Coding Owner: Unassigned
Generation Owner: N/A
Reviewer: Codex（独立验收）
Visual Verification Owner: Codex
Visual Verification Timing: e2e-deferred
Contributor: TBD
Branch: TBD

## 目标与范围

登记正式002恢复暴露的独立缺陷：三苗人进房后已打开的e73/e74门，正式读档后变成关闭帧。
修复应让持久门状态导出同一呈现意图，而不是把演出期间所有瞬态定帧自动持久化。
本卡仅登记证据与后续准入要求，尚未批准产品实现或schema/save变更。

- 范围待核：s003门的页面/状态/动作表达与其全部调用方，必要的窄runtime呈现绑定。
- 不恢复转换器、不重生成作者正文、不改一阶段、资产字节、NPC速度/路线或剧情奖励。
- 不过滤门区域、放宽Canvas hash/等待阈值，不把原档或candidate当实际恢复观测。
- 6012保持运行；不重跑同一失败视觉流程，先以现有证据与单测核修复层。

## 前提真值门

### 一句话前提

当前成功恢复的全量持久World相同，但开门仅依赖被恢复事务清除的瞬态frame override，
所以相同World不足以还原已打开的门画面。

| 维度 | 真值 / 边界 | 直接证据 |
|---|---|---|
| 原版 / primary source | 原版字节码不决定现代frame Map是否持久；本卡不据低层frame命令直接新增保存字段 | 当前实际作者开门链`s003.json:7806–7853`与正式002字节/trace为直接缺陷来源；原版调用域在实现准入前另核 |
| 第一阶段 | 已有正式002保存/新上下文恢复passed，具体门帧映射不能由这一标签单独推断 | 隔离证据`build/e2e/game-002-2026-09-30T09-06-32-906Z/report.json`；build前须直接核其门状态/帧来源，不重复跑剧情 |
| 当前二阶段 | end e73/e74 state1/visible/frame1；restore相同state/pos/sprite但frame0；frame仅在呈现Map，abortScript清除 | 正式`build/e2e/reforge-002-2026-09-30T15-29-25-294Z/{inn-trace.json,002-restored-trace.json,report.json}`；`main.ts:2200/4287/4683`；`world-scene-presentation.ts:72/88/104/120–151` |
| 本任务目标 | 已核持久开门意图在新上下文恢复后生成相同门画面；临时演出定帧仍不默认入SAVE | 当前SAVE9全量提交点严格相等；现行entity page animation/sprite action合同为候选，修复层尚未准入 |

### 反证与替代解释

- 最强替代解释：只是摄像机/资产差异、动画相位或过晚采样，并非缺少持久门意图。
  实际restore提交点全量World严格相同；两trace的门pos/state/sprite相同但frame1→0，
  Root已实际看结束图与失败图，且生产host只写瞬态Map、恢复调用abortScript确会清Map。
- runtime语义：区分World与WorldScenePresentation；`commitSceneSwitch`中的cinematic重置
  不是此门Map清除的直接锚，真正路径是restorePayload→abortScript→clearEntityFrames。
- 原版/第一阶段：不把一阶段保存帧实现搬成二阶段通用持久字段；调用域/门状态含义需build前核齐。
- extractor/地图/数据：同scene/pos/sprite与同asset源恢复，不能因画面差异重迁地图。
- audit模型：9d15218b已核唯一成功tail、无await和真实提交只读取证；晚到e62正常循环另存，
  不影响门frame反例，不允许删游标或过滤画面。
- 推翻：门trace恢复仍frame1且同资源但画面关闭；或已有持久page/pose绑定被错误忽略。
  若出现这些观察须修正归因，不能坚持改作者页。

### 用户可见偏离

- 不主动偏离剧情：before→after为“读档后门关闭→保持已打开状态”。
- 代表s003/e73/e74；002既定结束画面恢复要求，不新增产品能力取舍。
- 如果需要新增通用schema/save能力或改变其它frame调用语义，另核风险/范围及用户裁决。

## 上下文锚点与待核设计

- [二阶段铁律](../../phase2/READ-FIRST.md)、[脚本系统](../../phase2/specs/script-system.md)、
  [存档系统](../../phase2/specs/save-system.md)、[002回执](../../testing/e2e-002.md)、
  [工具卡](E2E-002-1-inn-route-and-trio.md)。
- `author-script-core.ts:370` page animation与`sprite.ts:51` SpriteActionBinding；
  `projects/pal/content/sprites.json` sprite53/54为static、尚无open pose。
- `s003.json:11346/11435`两门当前default页，交互正文重复设置state/facing/frame；
  `:7822/7846`三人进房链设置frame1。需核全部跨场景引用、关门路径与state1/2含义。
- 优先评估现有page/action能否声明持久closed/open意图；这是候选，不是批准实施方案。
- completion改动未修改setEntityFrame/呈现Map/abort清除路径，两门触发flow不是443fold目标；
  不把本缺陷回填成completed cursor失败，也不借修门改SAVE安全点。

## 验收条件与E2E登记

- build前读完门所有实际调用域/第一阶段对应行为，明确唯一Owner/修复白名单并补设计反控。
- 真实主壳回归：开门后保存→清瞬态→正式恢复，门保持开；未开门仍关，必要关门路径可恢复；
  普通人物临时定帧不因此永久化，不重跑奖励/触发/已完成auto。
- 执行入口：当前passed RF001 `15-05-01-983Z` → 正常路线002 → 正式生产barrier dumpSave →
  fresh IndexedDB restore。继续全量实际提交点相等及原Canvas断言，20正文/500文/三人时序保持。
- 证据保留`build/e2e/*002*`，剧情视觉只在冻结修复后的最终集中验收再跑一次。
- 硬性静态门零诊断，相关回归与完整检查；002通过前母卡不关闭。

## 当前模式推进记录

- 2026-10-01 Root：直接核实际门trace、原始档、成功restore调用域与两图；独立缺陷登记。
- 来源冻结9d15218b；实际结束Canvas SHA
  `90e49d7cc22b1a454d250a54ca7447fde8cefc3452c239e2b5320bcd72612400`，恢复末帧SHA
  `001bf25a53146cd9d53045d555de19ad98839a08c96bdf87825b6b992c13179c`。
- 独立审查、第一阶段具体门映射、修复层/设计/唯一Owner尚未核定；无build allowed，不得开始实现。

## 下一位Agent提示词

无下一位Agent提示词。后续由Codex先核定修复层与准入；当前仅draft登记，不自动授权任何贡献者写产品。
