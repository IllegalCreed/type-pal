# TEST-GLM-PHASE1-LEAVES-3 — 第三对话一阶段菜单、呈现与工具六批补测

Status: build
Owner: GLM 第三对话（测试贡献者）
Reviewer: Codex（独立验收与集成）
Phase: phase1
Capability: coverage / menu / presentation / tools
Visual Verification Timing: dev-functional（隔离菜单/工具样本，不走剧情）

## 目标与授权

2026-09-28 用户要求第三条 GLM 并行任务队列。本卡 **24 组 / A–F 六批**，与前两条 GLM
及 Kimi 目标文件不重叠；GLM 三对话合计 84 组、21 个交付批次，各自独立工作树、分支、fixture 与证据。
直接准入新增测试，不先交一轮纯审计；每四组固定 SHA 推送后可继续下批，不等固定席位审签。

冻结 `4a9ad67faa07b004f259dcde1e175e864684dbd0`（相对 `29e76fe6` 产品/scripts 零变更），
分支 `codex/glm-phase1-leaves-r1`，已备好工作树
`/Users/zhangxu/.codex/worktrees/glm-phase1-leaves/type-pal`；不借其它对话或 main。
具体新文件/hash/公开入口/旧测试线索见[冻结表](../../testing/glm-phase1-leaves/targets.json)，
逐组合同与验证方式见[工作包](../../testing/glm-phase1-leaves/README.md)。

## 前提真值门

- 工程前提：51 个 game 目标与另外三条贡献者队列源集合零交集；现有正式 fast 文件汇总为
  分支 1,721/2,416（缺 695）、行 3,116/3,539（缺 423）。缺口只是选题线索，不是合法可达/新合同/预计增量。
- 当前代码锚：`core/menu/primitives.ts:50` 等公开状态函数；`in-game-magic-menu.ts:64/109` 的
  建表/阶段变化；`core/inspect/battle-inspect.ts:136/319/384` 的只读投影；
  `dev/state-dump.ts:35` 的 JSON 输出；`present/menu/draw-menu.ts` 的真实菜单栈绘制；
  `shell/precache-client.ts` 的浏览器消息端口，不允许借测试注册真实 SW。
- 第一阶段规则：先读 CLAUDE、[engineering-notes](../../phase1/engineering-notes.md)和相关
  [game-mechanics](../../phase1/game-mechanics.md)。原始数据/已核原版行为优先，sdlpal 只能按来源标注，
  不能把合成 fixture 或 C 注释说成原版实测。用户已确认的一阶段保真规则不重写。
- 旧证据必须去重：Grok 两批正式 25+19 已在 `present/__tests__/grok-present` 与 `grok-composition`；
  不因目标无同名测试就宣称空白。`targets.json` 列同名指针，不覆盖所有跨文件测试。
- before → after：生产行为/资源/玩法不变，只增回归、隔离反控与功能样本。不用测试任务开玩法改造。
- 最强替代解释：空臂属于防御、full-only 或旧断言已证；触达函数不等于证明业务。
  合法路径不得强转假 GameState，绘制着色不得冒称菜单建表/物品效果已执行。
- 停止线：原版机制争议、真正产品缺陷、需要新依赖/接口/配置、只能读私有字段或重建整个剧情链才能测的族，
  留最小反例交 Codex，继续其它族，不擅修产品或放宽预期。

## 白名单与并行边界

- 新测试为 targets.json 的 51 个 `newTest`；无新增合同可登记 existing-proof，不凑文件。
- fixture 限 `packages/game/src/__tests__/glm-phase1-leaves/**`；专属报告/工具/诊断/浏览器宿主限
  `docs/testing/glm-phase1-leaves/**`。冻结表只读；不改任务卡、公共索引或派发规则。
- 产品、旧测试、官方配置/覆盖基线、依赖/锁、正式资源、用户存档不改；不合其它候选、不共享新增fixture。
- 不碰 E2E001/002 的事件/场景/移动/总壳、主绘制/对话管线；battle-system/opcodes/公式/action执行、
  menu-driver/magic-script、真实Save API/IndexedDB均不接。具体排除列表见冻结表。
- **第三阶段地图重建仍只规划**，不借本卡改瓦片模型、构件、迁移或房间脚本；也不做角色换装。
- 默认单 worker、单个测试进程；不杀他人服务/测试。全包、大覆盖、全仓门由 Codex 接收时串行做。
  GLM 第三对话不跑它们，不与前两对话/Kimi争抢重门。

## 验证与交付

1. 每批新/相邻定向、game TC、新文件 Biome error/warning/info 零诊断、docs/diff。
2. 真实公开函数；菜单原地变化按合同断言，读投影/绘制的实际输入做深快照；独立像素哨兵，不空画不报错即绿。
3. 每批约两针代表业务反控（约12–18针），共用一个严判据：对照exit0、指定file/fullName实际执行，
   单点运行命中、恰exit1/候选AssertionError；timeout/混错/skip/exit2/null拒绝；源hash不变。
4. 工作包规定四个短视觉样本，不走剧情、不接正常存档、不联网/注册SW，不以硬件端口测试宣称音质/真实离线已证。
5. counts来自新鲜JSON；每批固定SHA、命令、结果、贡献/已有/防御/未证分栏。局部覆盖只准备可复建配置，
   未执行就写未执行，统计及 check → ratchet → 受保护strict由 Codex 统一，不重复独立增量相加。

## 当前模式推进记录

- Codex 前提/范围：verified；51源/hash、24组、新文件占用及跨三队列零交集已核；排除E2E与高风险核心。
- build 准入：**build allowed（只增本卡测试与证据）**，2026-09-28。
- Coding Owner：GLM 第三对话，A→F 连续实施；第一/第二对话按原卡继续。
- GLM 自验与候选：pending；Codex 独立验收：pending。
- 用户产品取舍：N/A，无行为改动；done 未开放，正式验收/集成由 Codex 完成，不代签。

## 交接日志

- 2026-09-28 Codex：按用户追加并行任务请求派发第三队列。复用 Vitest/pnpm 现行配置和既有 fast
  报告，不为排队重跑覆盖率；原版事实与合成样本、显示与执行分栏。

## 下一位 Agent 提示词

```text
你是 GLM 第三对话，接手 TEST-GLM-PHASE1-LEAVES-3，不接前两条GLM或Kimi的任务。
先读 AGENTS.md、CLAUDE.md、docs/phase1/engineering-notes.md、涉及领域的game-mechanics，
以及 docs/ops/tasks/TEST-GLM-PHASE1-LEAVES-3-menus-presentation-tools.md、
docs/testing/glm-phase1-leaves/README.md 和 targets.json。
本卡build allowed，生产冻结4a9ad67f，分支codex/glm-phase1-leaves-r1，使用自己的隔离工作树。
已备好 /Users/zhangxu/.codex/worktrees/glm-phase1-leaves/type-pal。
按A→F连续做24组，每四组固定SHA提交推送后继续下一批，不必等Codex审完；直接实现，不只写审计。
只新增白名单测试/fixture/专属证据，不改产品、旧测试、官方配置、依赖/锁、基线或他人的文件。
先核Grok两批与现有断言去重；真实公开函数、合法typed输入，显示与执行、原版证据与合成样本分清。
菜单可变状态按真实合同，绘制/只读投影比较实际消费对象；像素断言要有非空正控和反控。
每批定向/相邻、TC/Biome零诊断、docs/diff；单worker，不自行跑全包、大覆盖或全仓门。
按工作包做四项隔离短视觉，不碰用户/E2E服务、真实存档、真实SW或网络遥测。
真bug留正确预期的隔离红诊断，继续其它组；不靠skip/改预期凑绿。
每批交SHA、命令/JSON/反控/截图和剩余项；覆盖配置交Codex统一执行。
不合main、不代签、不标done，Codex独立验收、集成推送与清理。第三阶段地图重建仍不实施。
```
