# E2E-006-1 — 回客栈求药与张四出海上仙灵岛

Status: rework
Phase: phase2
Capability: C1 / E2E
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Codex（独立验收）
Visual Verification Owner: Codex
Visual Verification Timing: e2e-deferred
Contributor: Codex
Branch: main

## 目标

从 005 报信结束后的真实状态继续：回客栈房间完成小虎子与洪大夫两段必要对话，洪大夫结束后显式开启码头张四的“出海上船”方案；玩家前往码头与张四交谈，完成上船并抵达仙灵岛入口，完成落地道谢及张四最后叮嘱、恢复控制后停止（2026-10-07用户明确纠正）。

## 范围

- 范围内：s002/e36 小虎子、s002/e35 洪大夫、s005/e123 张四的作者方案后继；上船至 s014 的场景切换；006 E2E 检查点；第一阶段对应段落的关键 NPC 日志/UX 对照。
- 范围外：仙灵岛上岛后水月宫/破阵；洪大夫药铺取药；修改第一阶段产品实现；自动行为重写；parallel/join。

## 前提真值门

### 一句话行为 / 工程前提

原始事件在洪大夫段落结束时才把张四对象安装到上船脚本；当前作者工程已有上船正文但缺少这个显式后继，且小虎子方案残留了会重播003的跨场景回置。

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | `L_1026` 洪大夫对话后，`L_1070` 把对象 124（当前作者 e123 张四）切到 `L_1465`；`L_1465` 完成上船对白，`L_1509` 乘船载入 scene 15。 | `data/extracted/events/all.json:L_6606-L6860,L_9342-L9648` |
| 第一阶段 | 遵循同一事件链：小虎子/洪大夫完成后，码头张四承担上船；本卡不改第一阶段。 | `docs/phase1/game-mechanics.md` 相关剧情状态；原始提取事件 |
| 当前二阶段 | e36/e35 已有房间对白；e123 已有 `legacy-002` 上船正文，但 e35 结束后没有选择它；e36 还会错误重置003的e59/e83。 | `projects/pal/content/scenes/s002.json` e35/e36；`projects/pal/content/scenes/s005.json` e123 `legacy-002` |
| 本任务目标 | e35 结束显式选择 e123 `legacy-002` 并恢复 `state:3`；删除 e36 无关的003回置；上船动作仍归张四/船只交互脚本。 | 用户 006 范围 + 本卡改动 |

### 反证与替代解释

- 最强替代解释：006 只需要小虎子一段对白，不应出现洪大夫；但原版明确只有洪大夫段落后才安装上船脚本，且用户说“回客栈李大娘房间，对话后”未要求跳过该必需剧情。
- 推翻观察：若实际 006 E2E 证明小虎子后可直接触发张四且洪大夫应留到后续，则停止并交用户裁决，不继续扩剧情。

### 用户可见偏离

- 是否主动偏离已核真值：no
- `before -> after`：洪大夫对话后张四仍停在005方案且小虎子会重播003 -> 张四显式切入上船方案并恢复可见，003保持完成态。
- 代表场景：005 报信 → 回 s002 与小虎/洪大夫对话 → s005 交谈张四 → 上船 → s014。
- 用户裁决：范围由用户 2026-10-03 明确；若实跑发现剧情顺序冲突再停线询问。

## 上下文锚点

- [`docs/phase2/READ-FIRST.md`](../../phase2/READ-FIRST.md) 铁律 4/6/10；脚本后继必须显式、内容归属清晰。
- [`docs/lore/timeline.md`](../../lore/timeline.md) 001–005 已核区段；006 后续暂未填实跑结论。
- `projects/pal/content/scenes/s002.json` e36/e35；`projects/pal/content/scenes/s005.json` e123 `legacy-002` 与 e116 上船链。
- `data/extracted/events/all.json` `L_1026/L_1070/L_1465/L_1509`。
- 不得重新引入：把上船放入 e116/e117 的常驻 auto；用 wait 猜测后继；复活/存档/迁移兼容旁路。

## 验收条件

- 功能：洪大夫正文结束后 e123 使用 `legacy-002`；张四上船对白顺序为 532–546 语义；e116 乘船动作结束后进入 s014；完整呈现并确认1886/1888/1889/1890，进场剧情结束、控制返回后才通过；不进入岛上其它剧情。
- 测试：作者 JSON 校验、定向脚本治理与 006 E2E 检查点；质量门零诊断（已知 migrate 存量失败单列）。
- 视觉：集中 E2E 验证房间对话、码头张四上船、黑场切场景和仙灵岛首帧；保持 6012 页面不关闭。
- 文档：实跑后回写 `docs/lore/timeline.md` 与 `projects/pal/e2e-checkpoints/README.md`。

## 当前模式推进记录

- Coding Owner / 白名单：Codex / `projects/pal/content/scenes/s002.json`、本卡、006 E2E 工具/证据、剧情文档；不改 s005 上船正文、不改迁移器。
- 前提核验：verified（原始事件标签与当前作者缺边已直接核对）。
- 设计与范围：agree（用户范围明确；新增 e35→e123 后继、state3 可见恢复，并清理 e36 误回置）。
- build 准入：Codex build allowed。

## 交接日志

- 2026-10-07：用户指出006上岛后尚未完成张四对白，旧首句出现即PASS不足以证明完整结束。已在E2E-CONTINUOUS-001-006卡登记根因及修复范围，补强两轨独立执行和终点门并删除落地对白比较排除；历史收据保留，不扩称新范围通过。

- 2026-10-03 Codex：核清 006 原始链与当前缺口，确认 e123 `legacy-002` 已存在但未被洪大夫后继安装。Next: 补作者后继并做定向验证。
- 2026-10-04 Codex：当前 Reforge 001→005 saves 从 SAVE11/content22 正常重建；006 实跑发现 e36 重播003、张四绑定但不可见、船只需正常走到 e116、仙灵岛首段应作为停止点，均已按真实运行修正。Reforge 船段数学轨迹通过，但用户指出首帧视觉异常；当前卡转 rework，待当前一阶段 001–005/006 关键 NPC 日志与演出对照完成。

## Build / Review 收口

- 修改：`projects/pal/content/scenes/s002.json`、`scripts/e2e/boat-contract.mjs`、`scripts/e2e/boat-journey.mjs`、`scripts/e2e/boat-reforge.mjs`。
- 真实链：当前 SAVE11/content22 的 001、002、003、004 saves、005 saves 全部通过后接 006。
- 006 断言：洪大夫自动触发；小虎子首次对白及两次复读；张四正文；e123 state3/legacy-002；正常走到 e116；载入 s014 后首段 `dlg.1886` 开始即停止。
- 第一阶段对比：原始 `L_1509` 的 0x70 走位、0x15 朝向、0x3F 骑乘和载入 scene15，与当前 `moveParty → setPartyFacing → ride(e116) → loadScene(s014)` 对齐；006 轨迹断言队伍/船相对位移全程为零、骑乘段队伍朝向稳定为 down。
- 三人边界：正式 005 存档当前只有李逍遥一名队员，因此本次不能冒充“三名队员”实跑；Reforge `mountParty` 会对所有后续 party member 绑定同一载具偏移，代码层已覆盖。
- 作者工程检查：`pnpm check:content` 通过（294 场景 / 223 地图 / 1934 资源）。
- Codex 独立验收：rework。现有 006 只证明剧情链与船队数学绑定，尚未完成关键 NPC 状态/位置/朝向日志与第一阶段顺序对比；用户已指出截图中的船体锚点、张四抖动、划桨和李逍遥落船位置问题，不能保留 done。
