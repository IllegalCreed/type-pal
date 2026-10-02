# Wave P：Editor全域残余工作流十倍包

Owner GLM P；[任务卡](../../../ops/tasks/TEST-GLM-WAVE-P-1-editor-residual-tenfold.md)、
[共同协议](../README.md)、[冻结表](../targets.json)。分支 `codex/glm-wave-p-editor-residual-r1`
（派发基点 `8b3ca062953b17a12178f8d1a9e36657971234b1`，production freeze
`3ac9a2e2f6aba8a5cc97640c18fef8549d199380`）。当前 rework（2026-10-01 Codex counter），
仅原白名单可写；不合 main、不标 done。

## r3 二审闭合状态（对 codex-op-r2-review-20261001 P-R2-01…03）

| 项 | 处置 |
|---|---|
| P-R2-01 patch+判据 | counter.mjs 重写：`diff -u` 生成真实 unified diff 并以 `git apply` 实测（应用后逐字节等于变异内容）；judge 抽出 counter-judge.mjs（恰一红+file/fullName 逐字匹配+拒收多红/错目标/skipped/超时/环境红/执行集漂移），自测 counter-judge.test.mjs 10/10；10 枚反控全部重跑，counters.json 直读原始 mutated.json 全部恰一红 |
| P-R2-02 合同账 | G09 三条与 file-system-access.test 重复的分类断言已删（70→67，保留非法 URL 回退轴）；contracts.json 逐合同填真实旧断言锚点（contracts-anchors.mjs） |
| P-R2-03 相位 | F02（created/undo 相位轮询稳定+新地图消失）、F06（像素校验和 9110598→9584477→9110598 + 截图字节差分）、F09（搜索字节差分 + tileId=-3→alert→合法值恢复的真实失败恢复）、F13（物品 0项→1项→0项）、F15（撤销标签 撤销→撤销：编辑战斗模拟器配置→撤销）已补实；**F14（创建战场无撤销条目）与 F18（375px 导航下拉未展开）如实登记未证**——20 条中 18 条完整证明 |
| verifier | lab 运行工程迁出至 /tmp/glm-p-lab-isolated（配方见 browser/lab-project.md），完整 verifier exit 0 |

浏览器流程证据目录：[browser/](browser/README.md)（F01–F20 索引与截图对照）。

## r3.5 预审闭合（对 codex-zcode-pq-preflight-20261001 P-R2-01 未完项）

- **judge 收紧**（counter-judge.mjs）：clean 相逐条 passed（pending/todo/skipped 拒收）、
  完整 file×fullName 身份集合比较（同数量不同身份拒收）、suite 级收集错误
  （failed 且空断言）与 numRuntimeErrorTestSuites 计数拒收、signal/spawn 失败与
  正常退出分开；恢复相调用同一 judgeClean（执行数对齐 mutated、身份集合对齐
  positive），不再只查 exit。Vitest rejects 的 AssertionError 序列化原文保留。
- **自测**：counter-judge.test.mjs 14/14，含预审四个误收反例（零执行 clean、
  同数换身份、单目标红叠加收集错误、pending）与 signal/spawn 拒收；Codex 探针
  原样重放四例全部转为拒收。
- **runner**：隔离树 mkdtemp 独占路径；finally 只回收本次树，删除全局 prune。
- **索引重建**：counters.json 的 patch/三态记录逐条取自最终 per-counter receipt
  （旧索引残留腐坏 patch 已清除），重建时逐项独立验证 git apply + mutant hash。
  业务针位与单红口径未变；判据收紧后 10 针全部重采（30 份三态 JSON 字节/startTime 相对 48ade 已变，身份与状态保持——来源区分见 receipt.threeStateProvenance）。
- 门禁：Editor 全包 516 文件 3853 绿、typecheck 0、根 lint 0/0/0、diff-check 净、
  完整 verifier exit 0（lab 在 /tmp/glm-p-lab-isolated，配方 browser/lab-project.md）。

## r2 已闭合项（保留记录）

| 项 | 处置 |
|---|---|

| 项 | 处置 |
|---|---|
| P-01 强转 | `project-diagnostics.glm-p.test.ts` 三处 as never/双桥全部重建为 typed-legal 值级守卫（空页记录缺 id / 空 battleSprite 的完整 EnemyDef / 空脚本 id 键）；全包 glm-p 文件 cast 审计零命中 |
| P-02 双红 | P01-C03 换针（parse 调用改 void，仅负控合同红）、P02-C10 换针（共享原因段条件改 false，仅共享段合同红）；counters.json 直读原始 mutated.json，10/10 恰一红 |
| P-03 回执 | receipt.json 重写：测试/证据锚点为 `47a3e49a`，其后仅 wave-P 证据与回执 docs/JSON 提交，最终远端候选见 receipt（不引用自身 SHA） |
| P-04 视觉 | 20 条浏览器流程记录（r2 指出多为静态观察；r3 已补 F02/F06/F09/F13/F15 实动相位，F14/F18 如实登记未证，18/20 完整证明） |

## 当前候选（从树生成，2026-10-02 r14 续批）

| 项 | 数量 | 说明 |
|---|---:|---|
| 合法新用例 | **102 / 700**（执行数；r18 续批 +P05 首批 4 例） | 102/102 绿（[directed-vitest.json](directed-vitest.json) 全 12 文件真实实跑；逐合同 [contracts.json](contracts.json) 全臂 oracle+当前行锚） |
| 合同工作组 | 29 / 70 | P01-G01…G11 + P02-G01…G03 + P03-G12…G16 + P04-G01/G02/G04…G07 + P05-G08…G11 |
| 有效反控 | **19 / 50**（r18 +P05-C01 敌方 label、C02 保留目录嵌套臂、C03 fieldId 回退，三个不同目标；P04-C01/P03-C13 退役档不计活跃） | 严格判据采样，逐针恰一红（[counters.json](counters.json)），三态证据 [counters/](counters/) |
| 浏览器流程 | **18 / 20 完整证明** | F14/F18 如实登记未证，另交视觉阶段（[browser/browser-evidence.json](browser/browser-evidence.json)） |
| 私有同分母 coverage | 上轮 +32/+16/+2（分母 28489 不变） | r14 续批未重跑，不计入 |

## r18 续批真实改动（相对 0f588c3e9）

- P05 首批（battle-simulator 域，4 组 4 例）：resolver 敌方/背包 label 两臂（party 臂为旧证）、
  保留路径守卫嵌套上下两臂+近邻放行（精确命中臂为旧证 persistence:288）、emptyTrialPlan
  fieldId 取首项/缺席回退 0、emptyTrialMember 六字段精确形态。共享 simulatorLibrary()
  夹具只读复用。
- +3 枚不同目标反控：P05-C01（library.ts:221 敌方 label）、P05-C02（library.ts:42 保留
  文件位于声明目录之下臂）、P05-C03（state.ts:38 fieldId 回退）。逐针 git apply+hash
  独立验证，恰一红 0→1→0。
- C01 退役档措辞随正常批纠正：四 JSON 对象值与 2cd548a8 相同、字节因 biome format 已变，
  三份 raw 原字节未变（r18 复核口径）。
- 未完成（如实登记，不缩围）：**P02 残余与 P04/P05 余族、P06–P10 未开工（598 例缺口）**、
  反控 31 枚缺口、F14/F18 视觉另阶段。

## r17 返工真实改动（相对 2cd548a8b，历史）

- P-R17-01：P04-C01/C02/C03 十二份 JSON 统一 biome format（值不变）；counter 工具落盘
  JSON 改经 `biome format --stdin-file-path`（后续采样不再产生格式 error）。
- P-R17-02：G01-1 开关臂输入换当前合法 canonical 共享脚本（RuntimeScriptLibrary）；
  G01-2 空 id 轴与 G03-1 chunks where 轴撤回（空 party id 被公开 validateStartWorld 拒收、
  非空 chunks 无当前 producer），P04-C01 退役（原字节保留，不计活跃）；
  G02 换引用目标闭合合法夹具，levelUp 伴随免删轴归旧证（actor-references.test.ts 已证）。
- P-R17-03：G07 整组停测裁决撤回——按公开投影路径补测（buildBlankProject 种子→当前作者
  文件真实 IO→loadCurrentProjectFrom→toEditorState→assertProjectSaveValid），共享脚本与
  敌人 onDefeated identity 立绘引用各一合同，无测试侧强转、无新增接口。
- C02/C03 与七条 enemy/team 纯命令合同保留；spec 文件未变，未重采。

## r14 续批真实改动（相对 691e33ccf，历史）


- 真账修复（r13 复核点名项）：G14 五owner/四fallback/两locator 全臂 oracle 补全；
  G15 截断 oracle 补全+漂移行锚修正；G16-01/03 以 isDefined 之后的真实业务断言入账；
  G16-02 axis 去除 use:command 旧称。全部人工核定，行锚为当前文件真实行。
- P04 首批（actor/enemy 域，5 组 11 例）：actor-references includeScriptCommands 开关臂、
  空 actorId 守卫、detail 标签策略回退五值、blocksDeletion 自援护豁免表、scriptChunks
  分片 where 精确臂；enemy-commands withEnemy 替换/未命中语义、UpdateEnemyCommand
  缺席臂/onDefeated 整键删除撤销/构造期快照、AddEnemyCommand invert。
  排重锚：actor-references.test.ts 16-locator 全集例、C02 barrel+patch 主链例、
  battle-data-delete-commands.test.ts 删除门禁例（旧 fullName 见 contracts.json）。
- 反控 +2（不同目标）：P04-C01（actor-references.ts:48 空 id 守卫）、
  P04-C02（enemy-commands.ts:69 invert 整键删除）。逐针 git apply+hash 独立验证。
- 续批二：+P04-G06 敌队稳定 id 合同与 P04-C03 反控（enemy-team-commands.ts:77，
  三行唯一锚，恰一红 0→1→0）。
- 停组登记（不缩围，待 Codex 裁决）：G07 collectEditorDialoguePortraitReferences
  敌人/共享库 identity 立绘臂——identity 形 dialog cue 仅在作者视图
  （ScriptEditorState）类型合法；EditorState 的 sharedScripts/enemies 为运行时形
  （DialogueCue 无 identity 字段），旧证经 as unknown 强转注入
  （actor-dialogue-commands.test.ts fixture），本波不复制强转。
- 未完成（如实登记，不缩围）：**P02 残余与 P04 余族、P05–P10 未开工（602 例缺口）**、
  反控 33 枚缺口、F14/F18 视觉另阶段。

## r3 rework 轮真实改动（相对 8fb38fcc，历史）

- 测试：仅 `project-diagnostics.glm-p.test.ts` 三条合同重建（typed-legal），总数不变。
- 反控：P01-C03、P02-C10 重打；其余 8 枚三态证据原样保留（本轮未被 accept，
  维持「已提交」口径）。
- 证据：browser/**（20 流程 + 55 截图哈希）、directed/contracts/counters 重生成、
  README/receipt 重写。
- 当时未完成账（历史）：614 例/40 针缺口——当前账见上方「当前候选」。

## 环境事实（复现注意）

- worktree 需复制 gitignored `projects/pal/assets/{migrated,runtime}`。
- 全包 coverage 需排除 4 个静态 adoption 门（插桩超时；vitest 失败时不落报告）。
- `vi.mock` 工厂引用 fixture 必须工厂内动态 import（kit.js 字母序先行 TDZ）。
- IAB 自动化：`⌘Z` 等组合键派发不生效（撤销/重做走编辑菜单验证并如实登记）；
  截图 API 间歇超时（重试包装）；dev 脚本硬编码 `VITE_PROJECT_ID=pal`，
  自有工程需 `exec vite` 显式注入变量并用独立端口，绝不指向真实 PAL。
