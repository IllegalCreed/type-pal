# TEST-EDITOR-SCRIPT-INTERACTION-1 证据目录

> 这是 2026-10-08 的贡献候选及原始回执，未经修正的例数、合同和反控不代表当前验收。最终裁决和当前重放入口见[Codex独立验收](../TEST-CONTRACT-BATCH-20261008/codex-review.md)。旧 JSON/raw 不改写。

贡献者：GLM 新对话A（唯一测试写入者）。工作树 `/private/tmp/type-pal-editor-script-interaction.fgkhat/type-pal`，分支 `codex/glm-editor-script-interaction-r1`。派发 `91aac75c54c2afa82e7ccb6ee295485b73a14aa7`，产品冻结 `797a46a097640206a12b8f61dc014c8db277e457`（冻结源三件 sha256 与 targets.json 一致并在隔离树逐针复验）。

## 固定候选与清单终态

新增测试文件恰一个：`packages/editor/src/ui/ScriptEditor.interaction-boundaries.test.tsx`（7 条原子合同 + 文件内专属 harness）。白名单中的 `author-command-edit.interaction-boundaries.test.ts` 与 `__tests__/script-interaction-boundaries/` 真实无缺口/未使用，不建空文件（后者曾放 harness.tsx，因 design-system adoption 门按非 test 的 .tsx 计数使旧门 pin 101→102 漂移，折叠回 .test.tsx 内并删除，未改任何旧测或共享门）。

| 轴 | 裁决 | 一句话 |
|---|---|---|
| A1 拒绝协议 | existing-proof | BodyEditor throw↔FlowEditor boolean 协议区分 + helper 全量旧合同登记，不另测 |
| A2 定位帧淘汰 | new-contract | 双 revision 双 RAF 帧，旧帧被守卫淘汰不 focus/scroll 旧行 |
| A3 编辑草稿撤销 | existing-proof | script-draft G04-04 已证外部替换丢草稿零写回（同位置不同命令走同一机制行 3501） |
| A4 插入面板撤销 | new-contract ×2 | 真变化撤销面板不向过期 path 提交；同值新引用面板存活且仍可用 |
| A5 被拒复制 | new-contract | 不选虚假副本/不动正文/精确 onError；重试成功 |
| A6 被拒删除 | new-contract | 选择+编辑草稿+正文三不误消失；重试成功收口 |
| A7 被拒重排 | new-contract（成功/undo existing-proof） | 嵌套 scope 真实 Ds 下移钮：选择不重映射、行序不变、key 不动、公告可观察 |
| A8 键盘事件域 | new-contract | 行自身 Enter/Space 选择；子按钮 Enter 冒泡不误选 |
| A9 嵌套 identity | existing-proof | 改变清/无关保留/同值不清/本地接受映射，四臂各有旧证；消失分支无独立可判别 oracle |
| A10 终止与清理 | registration + 自身卫生 | 关闭路径零提交旧证登记；新测试 RAF/spy/DOM/root 全恢复 |

逐合同锚点、旧 fullName 与断言、oracle 与针位见 [contract-ledger.json](contract-ledger.json)。

## 反控（counter-receipt.json + counters/）

- 判据只读复用 [TEST-REFORGE-CURRENT-SAVE-TEST-PRECISION-1 判据库](../TEST-REFORGE-CURRENT-SAVE-TEST-PRECISION-1/lib-isolated-tree.mjs)：judgeSelfTest 20 例自洽；真实 Vitest 探针 3 例（纯业务单红受、afterAll hook 错误拒、异步 uncaught 拒）。
- 7 针（A2/A4a/A4b/A5/A6/A7/A8）× 四相位全部 accepted：每针独立 mkdtemp /tmp 树（冻结源逐文件校验、node_modules 只读软链、树内 wrapper vite.config 仅追加 fs.allow——判例见 runner 注释），原始绿→恰一指定业务 AssertionError 红（执行身份多重集与绿态逐字一致）→恢复字节==冻结字节→末次重放绿；finally 整树删除留清理证明；源/测试/mutant/restored sha256 逐针记录且全针测试字节一致。
- A7 干跑判例：变异 CommandRows 包装层 `if (changed) reorderKeys.move` 无效（useDsReorderKeys 每渲染按对象身份调和，body 未变时内部 key 自动复位）——判据诚实拒收后换为"拒绝路径仍重映射选择"有效针；"key 不移动"断言保留，由调和机制结构性保证。

## 门结果（gates.json）

- 定向+相邻：60/60（卡面定向命令；`author-command-edit.interaction-boundaries.test.ts` 未创建按"零新增文件不强行跑不存在的名字"剔除）+ 扩展相邻 44/44（script-draft/cov85/unified-steps/coverage-workflows-2）。新 UI 定向零 act 警告/零 console.error/零未处理异常。
- 本包：typecheck 双段零错；test 全包 4913/4913（旧 4906 + 新 7）。
- 根：`pnpm lint` PASS（3723 文件 0/0/0 完整报告）；`pnpm check:docs` PASS（含 testing-docs/phase-lore/content-review 全链）。
- 共享登记缺口（如实单列，Codex 集成时维护）：先 stage 全部新增代码文件后 `node scripts/quality/code-quality-ledger.mjs` FAIL——inventory 3,086 vs 台账 declared 3,085；归因恰为新增的 1 个 tracked test 文件，精确修复建议见 gates.json `qualityLedger.diagnosisForCodex`。贡献者按共同协议不改共享台账。

## 当前/历史口径

- 2026-10-08 干跑轮（已作废）：A7 首选针无效被判据拒收、harness 独立文件使 adoption 门 pin 漂移；两者修复后以最终测试字节全量重采本目录全部反控与定向证据，历史轮产物已删除不冒充最终证据。
- 基点托管 CI 状态未在本树复跑（Documentation 通过/游戏旧测超时失败为派发文档既录，白名单外）。

## 未完成项与停止点

- 无本卡未完成轴。产品缺陷：无（A2 守卫、拒绝协议、身份 effect 均按当前实现合同成立）。
- 贡献者交付止于本目录 + 分支推送；不合 main、不改 Status、不 done，待 Codex 独立验收（含台账登记、官方 ratchet、受保护 fast 与共享导航集成）。
