# TEST-GLM-RUNTIME-RESOURCE-2 — 第二对话运行时与资源七批补测

Status: build
Owner: GLM 第二对话（受委派测试贡献者）
Reviewer: Codex（独立验收与集成）
Phase: ops（shared/pal-extract 编解码；reforge/migrate 当前二阶段接口）
Capability: coverage / runtime-presentation / resource-leaves
Visual Verification Timing: dev-functional（隔离固定输入绘制，不走剧情）

## 授权与目的

2026-09-28 用户明确要求为 GLM 再开一大批任务，**两个对话同时做，分支和工作树分别隔离**。
本卡是第二对话的 **28 组 / A–G 七批**，每四组固定候选并推送，可继续下批。
第一对话的 [32 组叶层/编辑器包](TEST-GLM-LEAF-WORKFLOWS-1-thirty-two-groups.md)照常继续，
不挪其分支、不读写其进行中的文件；Kimi 的 20 目标也独立。两条 GLM 队列合计 60 组，不互相审签。

生产冻结 `f6878b3cd18d916d3cac8aba3e50dc8c70556a2c`（对 `29e76fe6` 产品/scripts 无变更）。
分支 `codex/glm-runtime-resource-r1`，已备好工作树
`/Users/zhangxu/.codex/worktrees/glm-runtime-resource/type-pal`；不得借 main、GLM 第一对话、Kimi 或 E2E 树。
准确目标/newTest/hash 在[冻结表](../../testing/glm-runtime-resource-wave/targets.json)。

## 前提真值门

- 工程前提：62 个源码目标与 GLM 第一队列、Kimi 主目标集合零交集，且新增测试路径均未占用。
  只增加当前公开合同的回归，不新增产品行为或改兼容政策。
- 统计真值：复用既有正式 fast LCOV（9,746 测试 / 730 文件），未重跑盘点。
  冻结表的 `wholeFileTotals` 是选题文件汇总，**不等于本卡授权/可达/承诺增量**。
  特别是 R28，源码全文件 353 未命中臂不归 GLM 全包；只准入
  `collectSourceEntrySites:545–651`（函数范围现有 0/31 臂、0/39 行）。
- 编解码一手依据：shared `rle.ts/rle-encode.ts`；pal-extract `events/recompile.ts:11` 与
  `disasm.ts:36` 的真实字节接口，`resources/parsers/ball.ts` 的头部/帧处理。
  第一阶段要求保持字节忠实，按 [engineering-notes §1.2/§2.3](../../phase1/engineering-notes.md)
  调真实解码器，不能用自己写的模拟算法充当测试对象。合成小字节样本不是“原版实测”。
- 二阶段一手依据：`menu/item-list.ts` 的 320 逻辑坐标/裁剪合同，`battle/settlement.ts:47/85` 的
  屏幕构造和绘制，`battle-trial-config.ts` 的我方最多三人，`project-map.ts:47/208` 的合法纯构造/编辑，
  各迁移纯函数的当前调用域。旧引擎只用于已存在 UX/资源格式依据，不复制其内部机制。
- before → after：生产、存档、资产与 UI 不变；新增自包含测试、明确范围的绘制证据。
- 最强替代解释：fast 空白可能只是已有 full-only/PAL 测试，或目标是编译防御/旧测试跨文件已覆盖。
  贡献须拆分“新合同”与“已有合同自包含接入 fast”，不假称发现新业务；未定政策不造答案。
- 停止线：新机制/格式、迁移写盘、复杂场景竞态或只能访问私有/ForTest 入口才能完成的族，登记后继续
  其它组。合法业务错误交 Codex 单独修，不在本卡改产品。

## 文件白名单与并行所有权

- 新测试：targets.json 的 62 个 `newTest`；无新合同无需凑文件。
- 辅助：四包各自 `src/__tests__/glm-runtime-resource/**`，只放本卡 fixture/端口替身。
- 本包工具、回执、诊断、最小浏览器宿主：`docs/testing/glm-runtime-resource-wave/**`。
  Codex 冻结表只读；GLM 交 receipt/evidence，不改派发事实。
- 禁改产品、旧测试、官方配置/基线/依赖/锁、AGENTS、任务卡/看板/公共索引、别的对话文件。
- 禁止执行 extract、migrate、bake、publish/commitTransaction；不写正式 `projects/pal`、`data/raw`、
  `data/extracted`、迁移 baseline、存档。测试 FS 仅自己的 mkdtemp，函数名含 materialize 不代表可以执行 CLI。
- 不合另一对话分支，不共享新增 fixture，不替他修复，不能在主工作树切分支。生产被 main 新修复影响时
  只报具体源 hash 差异，由 Codex 排期适配，不自己跨树同步。
- Codex 的 E2E001/002、main 总壳、对话/移动/脚本执行与 battle-core/session 不在本卡；
  不新增角色换装/外观规则，不把当前精灵映射测试解释为换装实施。

## 验证节奏

详见[工作包](../../testing/glm-runtime-resource-wave/README.md)。

1. 每批定向新增 + 相邻、涉及包 typecheck、精确新增文件 Biome error/warning/info 全零、docs/diff。
2. 默认单 worker、单测试进程；只在自己的 checkout 操作，不能终止他人的测试/服务。
3. 每批约两针代表业务反控，工具共用一套严判据；真实业务红、同输入深快照、源 hash 不变。
4. 四项固定输入视觉取证只对已声明的绘制/解析范围，不能冒充游戏通关/战斗计算或音频听感。
5. 本队列**不与两个已有队列争抢全包/覆盖率**：GLM 只交局部对照 config/命令，不自行跑全仓或
   四包大覆盖；包全测、覆盖对照与 check → ratchet → 受保护 strict-fast 由 Codex 独立接收时串行统一。
6. 七批分别交付固定 SHA，不需等前批审完；一族卡住留最小反例继续其它组。
   收口前必须有真实独立验收和统一质量门，候选不得提前计入官方覆盖率。

## 当前模式推进记录

- Codex 前提/范围：verified；62 源 hash、28 组、新测试路径和跨队列零交集已核；R28 窄准入明确。
- build 准入：**build allowed（仅新增测试/专属证据）**，2026-09-28。
- Coding Owner：GLM 第二对话；第一对话继续原卡，两者都由 Codex 独立验收。
- 贡献者交付：pending；A→G 可连续实施。
- Codex 独立接收：pending，分批裁决。
- 用户产品验收：N/A，本卡不改产品；需新产品取舍时另提。
- done 准入：未开放；验收后 Codex 合并提交推送并清理，不要求用户重复提醒。

## 交接日志

- 2026-09-28 Codex：按用户“两对话并行”授权建立第二队列，不迁走已有 GLM/Kimi 新提交。
  基于当前 Vitest/pnpm 配置冻结目标，不为排任务重跑覆盖；纯渲染与业务执行、合成样本与原版证据分栏。

## 下一位 Agent 提示词

```text
你是 GLM 第二对话，接手 TEST-GLM-RUNTIME-RESOURCE-2，不接第一对话的叶层编辑器卡。
先读 AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md，编解码部分另读
docs/phase1/engineering-notes.md 的 §1.2/§2.3，再读
docs/ops/tasks/TEST-GLM-RUNTIME-RESOURCE-2-parallel-wave.md、
docs/testing/glm-runtime-resource-wave/README.md 与 targets.json。
本卡 build allowed，分支 codex/glm-runtime-resource-r1，生产冻结 f6878b3c。
工作树 /Users/zhangxu/.codex/worktrees/glm-runtime-resource/type-pal 已备好。
只在自己的隔离工作树按 A→G 连续实施28组，每四组固定SHA、提交推送后继续下批。
不挪第一对话/Kimi/E2E 的树，不合它们的分支，不共享或改它们的fixture。
先核旧断言去重，使用真实公开函数、合法自包含样本；已有full-only合同转fast须单列贡献。
实际输入深快照/非空业务结果/代表反控必须真实；R28仅collectSourceEntrySites，
其它大文件也按工作包限定入口，不扩全文件或复杂竞态。真bug交隔离红诊断后继续其它组。
默认单worker；跑定向/相邻、TC、Biome零诊断、docs/diff；本队列不自行跑大覆盖或全包/全仓门，
对照config与命令交Codex统一排。四条视觉仅自己的临时宿主，不动用户/其他Agent服务或资产。
只改白名单新增测试/fixture/证据，不改产品/旧测试/配置/基线/依赖；不执行迁移、烘焙或提取写盘。
每批交候选SHA、精确合同增量与去重、JSON/反控/截图、命令和未证项。
Codex独立验收、集成推送和清理；不合main、不代签、不标done。
```
