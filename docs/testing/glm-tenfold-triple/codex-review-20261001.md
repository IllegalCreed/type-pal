# O/P/Q 十倍测试包：Codex 独立复核（2026-10-01）

结论：**三卡均 counter → rework，属于部分交付，不是整卡完成**。
保留现有测试和证据；不合 main、不标 done、不清理活动分支/worktree。
700 合法未重复用例、50 有效反控及原里程碑要求不自动缩减，也不允许凑数。
本次没有正式并集覆盖率结算，不能据此宣称全仓 85% 或 L/M/N 全局门已解。

## 固定候选与实测边界

派发基点 `8b3ca062953b17a12178f8d1a9e36657971234b1`；生产冻结
`3ac9a2e2f6aba8a5cc97640c18fef8549d199380`。三条远端分支与本地 HEAD 逐一相同。
审查落盘于 `codex/glm-lmn-acceptance-r1`，不修改候选。读取时 main 已到
`3a99eacb2868553a42e8f1e8831cc397b845b0c1`；候选冻结复核不等于最新 main 源已重冻。

| 卡/候选 | 新例实跑 / 目标 | 提交反控 / 有效反控目标 | 浏览器 | 裁决 |
|---|---:|---:|---|---|
| [O](../../ops/tasks/TEST-GLM-WAVE-O-1-supply-validation-tenfold.md) `214643a2379c263f86a74ee0b78f5473af5354f7` | 274 / 700 | 30 / 50 | N/A | rework |
| [P](../../ops/tasks/TEST-GLM-WAVE-P-1-editor-residual-tenfold.md) `8fb38fcc3b3f4f2d277260148c66488c979caa49` | 70 / 700 | 10 / 50；其中两枚明确不合格 | 0 / 20 | rework |
| [Q](../../ops/tasks/TEST-GLM-WAVE-Q-1-runtime-residual-tenfold.md) `626ddffe41cca4e3755dfafea1645c695c158b0f` | 113 / 700 | 34 / 50 | 报 10 流程；11 张 hash 相符，尚未视觉 accept | rework |

“提交反控”不是“已接受有效反控”。本次读取正/变日志、复算原/变/恢复 SHA256，
未重新执行变异；恢复 hash 相等不能替代恢复执行全绿。
详细命令、7 包 typecheck 原始输出、5 份新实跑报告的 SHA256，及 457 条
`file × fullName × status` 保存在 [机器证据](codex-review-20261001.json)。原始新报告
临时保存在 `/tmp/codex-opq-review.KfAB0k/`；机器证据中的逐用例结果随本审查提交保留。

独立确认：

- 三候选 verifier 均 716/716 冻结源匹配、Owner 交集 0、写入白名单通过；
  O/P/Q 区间分别 199/85/241 路径变化，不含产品/旧测/官方基线改动。
- `env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/<pkg> exec vitest run glm-<o|p|q>`
  JSON reporter：O migrate 255 + content 19；P editor 70；Q reforge 98 + game 15。
  **457/457 passed**；只证明新例能运行，不代表合法新合同/去重已全部接受。
- 串行复跑 migrate/content/shared/editor/reforge/game/pal-extract typecheck，均零诊断。
- 三候选 docs 均零问题。P 根 lint 2799 文件、Q 2802 文件均完整 0/0/0；
  P/Q 的 `git diff --check <派发基点>...HEAD` 也通过。
- O/P 保存的 directed JSON 与新实跑的 file/fullName 集合一致，均有 status。
- 反控原/恢复源 hash 与最终候选匹配；按存档 find/replace 或 old/new 重建变异，
  O 30/30、P 10/10、Q 34/34 mutated hash 相同。此项只 accept 字节对应关系。

尚未执行/完成：候选全包 suites、逐合同穷尽排重/合法 caller 验收、完整视觉复核、
main 并集覆盖率、全仓 check、官方 ratchet、受保护 strict-fast。已有硬性 counter，
因此不在本轮把上述未验项写成通过；作者自验的全包数量与覆盖收益仍仅为作者报告。

## O：返工清单

1. **O-01 静态门不为零。** 最终 `pnpm lint` exit 1，有 4 个格式诊断：本波
   `counters.json`、`coverage-delta.json`、`directed-vitest.json`、`receipt.json`。
   区间 diff exit 2；`counters/{O01-CC3,O01-CC5,O02-CC1,O02-CC3,O04-CC3,O05-CC3}/mutation.patch`
   有尾随空白或 EOF 空行。不得用 ignore 或追溯改写历史报告消除；也不得直接 trim
   有意义的 unified patch 上下文。可重新产生合法零上下文 patch，或编码成可重建 JSON，
   保持变异内容/hash和历史原证据可追溯，最终再复核字节。
2. **O-02 非法类型桥。** 例如 `packages/migrate/src/migration-plan.glm-o.test.ts:25,36`
   的双强转/as never；`migration-write-plan.glm-o.test.ts:47,265,268,294`；
   `migration-transaction.glm-o.test.ts:98,313`；`pal-supply-guards.glm-o.test.ts:77,89`；
   `pal-world-sprites.glm-o.test.ts:352,379,461,488,535`；
   `pal-current-publication.glm-o.test.ts:531,551`。禁止以 tsc 绿豁免卡面禁令。
   需实际 typed 合法 fixture；坏数据仅通过真实公开 unknown/IO 拒绝入口，不把缺字段、
   退休 effect 或错误 precondition 强作合法业务值；确无合法入口时登记停该轴。
3. **O-03 合同与恢复证据不足。** 未交 `contracts.json`。30 枚只有 control/injected
   执行 JSON，没有恢复后实跑；`run-counter.mjs:126` 将从未变更的候选源 hash 记为
   restored，不是恢复变异树并复跑。补协议规定的三态 JSON/raw、exitCode、执行数、
   精确目标 AssertionError/fullName，正控/恢复全绿、变异恰一业务红。
4. **COMMON-01 尚未完成十批。** O01–O05 与 O06 部分共274例；O06补齐，O07–O10
   尚未开展。“会话内未建模完”不是不可合法构造证明。按原范围连续补；如申请缩围，
   逐合同给 caller/旧断言/可达性证据，等待 Codex 裁决，不自行改目标。

O 的稀疏 pages merge 报告保留为疑似 generic JSON 问题：报告示例缺 canonical
stable id/cue entry，尚未证明合法当前作者文档会走该路径。不能据此修产品或把错误
固化为合法正控；需补 canonical guard/真实 caller 的最小证据后另行裁决。

## P：返工清单

1. **P-01 禁止的输入强转。** `packages/editor/src/core/project-diagnostics.glm-p.test.ts:57,73,87`
   用 as never/双桥向 typed `EditorState` 入口送缺字段 entity/enemy 或错误 self。
   文件头自行宣称 as never 可用于拒绝合同，与共同协议冲突。按合法 typed fixture
   或公开 unknown/IO 拒绝入口重建；不能靠强转、规则排除或弱断言掩盖。
2. **P-02 两枚额外红。** `counters/P01-C03/mutated.json` 及
   `counters/P02-C10/mutated.json` 原始 `numFailedTests` 均为 2，不满足恰一目标红。
   C03 同时红“合法 battle-simulator JSON/坏 kind 拒绝”和“非 JSON 语法错误传播”；
   C10 同时红“新增禁用原因”和“add/delete 同因只一段原因”。README 仅承认 C03，
   漏 C10。替换成真正区分单一合同的变异，保留代表组相邻用例并完整记账；不得只过滤掉
   额外红或截断 raw 输出来改成 valid。其它8枚本轮不作完整有效性 accept。
3. **P-03 回执候选区间不实。** `receipt.json.head` 为 `0c1a1b8ce4ac9aced5bfdcdb78d385f8b1cd6a44`，
   headNote 称后续仅回执维护；实际该 SHA 到最终 HEAD 仍有 5 个测试文件及反控、合同、
   覆盖证据改动，含 `e4467740`；只有最后 `8fb38fcc` 是回执维护。改为准确的测试/证据
   锚点、后续 docs-only 区间与最终远端候选，不要求回执引用自身提交 SHA。
4. **P-04 范围与视觉缺交。** 仅 P01 与 P02 部分、14/70工作组；P03–P10未做，
   0/20浏览器流程。按卡用自有小工程实际走功能、宽/窄窗、键盘、错误恢复/undo并给
   相位/截图 hash/console；不接管他人服务器、E2E或真实工程。

## Q：返工清单

1. **Q-01 类型桥。** `packages/reforge/src/audio-spessa-runtime.glm-q.test.ts:162,239`
   有 as unknown as，反射 worklet/sequencer probe 的 self 被伪造。外部 Spessa 边界
   mock 仍可用，但必须以真实签名的 typed port/probe 记录观测值，不使用 unknown 跳板。
2. **Q-02 最终 JSON 不是执行证据。** `directed-vitest.json` 明确来自
   `vitest list --json`，113条没有 status；34条嵌套名字采用 ` > ` 分隔，与实际 runner
   fullName 的空格不同。这是枚举格式差异，不是34例消失。改为最终实跑 JSON，含
   全部 file/fullName/status 与执行/失败数。
3. **Q-03 反控只有两态运行。** 34枚原/变 hash 可重建，positive/mutant txt有实跑输出，
   但无恢复后的执行日志/JSON。各三态均补完整定向 JSON/raw、exitCode/执行数/目标
   AssertionError/fullName；不可把 `.orig` 及 restoredSha 相等当恢复跑绿。
4. **Q-04 数量与视觉表述。** 实际 15 个新 `.glm-q.test.ts`（reforge13、game2）+1fixture，
   README头写7+1、表写15含fixture、receipt写8，需统一并区分历史。
   11张截图hash全部相符，但 F1 `browser-evidence.json.autoplayOverlayClicked=false`，
   与 README“autoplay被拒→点overlay恢复”的表述矛盾。补真实自有宿主恢复操作与相位
   证据，或如实撤回该已完成表述；本轮不授予10流程视觉accept。
5. **COMMON-01 缺组与停线依据。** Q07/Q08/Q10未做，其它组也只是小包。函数名命中
   很多旧测试不是逐合同 existing-proof。`pal-extract/src/cli.ts:73-77` 根路径从模块
   所在位置派生，单凭硬编码目录不能证明不能隔离；先核 mkdtemp 复制源树+合法小输入
   是否能覆盖公开CLI，绝不写真实 data/raw/extracted 或改产品配置。真正阻塞交执行
   证据；涉及新原版机制/剧情/碰撞真值的轴仍停线，不为700扩权。

Q 的 D-Q01-1 enterLoad rejection 报告保留待 primary/caller 独立裁决，不夹带产品修复。

## 下一步与所有权

三位 GLM 各留原分支/worktree，在原测试/专属证据白名单内修证据、输入合法性并继续
未完里程碑。下一位提示词分别落在三张卡的新返工段；旧派发段仅作历史。
不 cherry-pick 本次 Codex 共享卡/看板审查提交到贡献者分支，避免违反贡献者白名单；
直接读审查树文件即可。派发基点与冻结仍用原值，main漂移由Codex另行复核/重冻。
提交最终候选后 Codex 再验；只有独立合法性与质量门闭合后才进入选择性集成，
串行 check → 官方 ratchet → 受保护 strict-fast，正式覆盖率只认 main 并集实测。

本次审查落盘自身的门：docs工具37/37、815 Markdown/4290本地链接/245任务零问题；
根lint2746文件完整0 error/0 warning/0 info；暂存区diff零诊断。
这仅验审查文档，不替代三个候选的全包验收或正式集成门。
