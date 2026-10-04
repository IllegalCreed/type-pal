# CODE-QUALITY-3h - game 资产与启动边界逐文件治理

Status: review
Phase: phase1 game
Capability: ops / code-quality
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Codex（独立验收）
Visual Verification Owner: N/A
Visual Verification Timing: N/A
Contributor: Codex
Branch: codex/code-quality-governance
Base: `5f13c3010`

## 目标与范围

逐文件核验 game 资产/启动窄域的生产源码、直接 caller 与现有合同，先处理有直接证据的边界缺陷，再把无缺陷文件和未决候选写入治理账本。首批白名单：

- `packages/game/src/assets/{loader,tileset-blob,png,rle-decode}.ts`
- `packages/game/src/shell/{fetch-retry,bootstrap-resources}.ts`
- 对应的直接测试与 caller 只读核对；`bootstrap.ts`、save、scene 语义不在本批实现范围，另开高风险卡。

范围外：生成的 `public/extracted`、`projects/pal`、E2E/剧情视觉、schema/save/migration、公共接口与覆盖率 runner 改造。

## 前提真值门

- 一句话前提：运行时资源加载只对真实 HTTP/解码/启动屏障失败做既定传播或降级，不把合法资源转成伪成功，也不改变第一阶段资源格式。
- 真值来源：`packages/game/src/assets/tileset-blob.ts:4-16`（extractor/runtime 共用 sprite chunk 约定）；`packages/game/src/assets/loader.ts:135-190`（真实资源 caller）；`packages/game/src/shell/bootstrap-resources.ts:40-63`（soundfont 与主资源双 barrier）；`CLAUDE.md:31-38`（原始数据与可重生成边界）。
- 当前 before -> 目标 after：`逐文件证据分散 -> 每个白名单生产文件都有 caller、合同、反例/保留理由和独立验证记录`。
- 最强替代解释 / 推翻观察：已有宽容分支可能是 PAL 资源空槽、CDN 已解压或启动降级的已核真值；若真实 raw、现行 caller 或现有测试证明依赖，则保留并登记；若合法输入被吞成空资源、非法参数导致悬空 rejection、或测试删掉 guard 仍全绿，则前提被推翻并进入修复。
- 是否主动偏离已核真值：N/A（纯边界审计；不改变格式或用户可见行为）。

## 上下文锚点

- `AGENTS.md`：单一 Coding Owner、逐文件台账、硬性零诊断、少而精测试与生成物上游规则。
- `docs/ops/audits/code-quality-file-ledger.md`：本卡接手时顶部写 2,962/98；实际 current inventory 2,964、已验证表行 106。已纠正旧顶部漏计（不追溯改历史报告）；本卡不得用包级绿灯代替文件证据。
- `packages/game/src/assets/*` 的 `loader.test.ts`、`tileset-blob.test.ts`、`tileset-load.grok-r1.test.ts`、`png-*.test.ts`；`packages/game/src/shell/fetch-retry*.test.ts`、`bootstrap-resources*.test.ts`。
- 不得重新引入：重复的 game/shared RLE codec、无 URL/status 上下文的 fetch 失败、把 soundfont rejection 伪装成资源成功、为覆盖率而改 runner 或堆恒真断言。

## 验收条件

- 逐段读取白名单生产文件，记录职责、真实 caller、输入域、异常/降级、可疑候选和结论到账本；未知候选保持 `review/待核`，不凭静态行数关闭。
- 若修代码：定向/相邻 game 测试、game typecheck、全仓 `pnpm check`、官方 support-mode coverage ratchet、受保护 fast、Biome 零诊断；若纯审计：同样跑受影响包与全仓质量门并只登记证据。
- 视觉/E2E：N/A；功能启动演出按集中 E2E 规则延后，不用源码推断视觉完成。

## 当前模式推进记录

- Codex 前提核验：verified（范围窄、证据锚点已列；save/bootstrap 主流程留给后续高风险卡）。
- build 准入：Codex build allowed（本批允许在白名单内修复直接证据问题；不得越界修改 bootstrap/save/schema/生成物）。
- Coding Owner / 隔离分支：Codex / `codex/code-quality-governance`。
- 贡献者交付/自验：Codex；candidate 为当前工作树；定向 12 files/77 tests、game 全包 298/3397、typecheck 通过。
- Codex 独立验收：accept（直接重读六个生产文件与真实 caller；negative control 删除 fetch-retry guard 后新合同变红；全仓 `pnpm check` 第二轮通过；support-mode ratchet 与 protected fast 均通过；lint 3198 文件零诊断）。
- 用户产品裁决/体验验收：N/A（纯资源/启动边界审计）。
- done 准入：blocked，待提交推送后再确认工作树、账本计数和任务索引一致；本卡只关闭白名单，不代表 game 或全仓治理完成。

## 交接日志

- 2026-10-05 Codex：用户要求继续推进并明确关注后期偷懒；本卡锁定 6 个生产文件及其直接测试，逐个读取、逐个登记，不把包级绿灯当完成。Next: 完成白名单审计与必要窄修。
- 2026-10-05 Codex：六个生产文件逐文件复核；仅 `fetch-retry.ts` 的非法 retries/backoff 有直接可证伪缺陷，已最小修复并拆出 9 个原子合同。定向 12 files/77 tests；game 全包 298/3397；全仓 check 二轮、ratchet、protected fast、lint 全通过。Next: 提交后独立检查并归档本卡；继续 game 其余模块。

## 下一位 Agent 提示词

```text
接手任务：CODE-QUALITY-3h game 资产与启动边界逐文件治理
任务卡：docs/ops/tasks/CODE-QUALITY-3h-game-assets-shell.md
当前状态：build；只能在列出的 game 资产/shell 白名单内工作。
你的角色：Codex Coding Owner / 独立验收。
先读：AGENTS.md、CLAUDE.md、docs/ops/audits/code-quality-file-ledger.md、本卡，以及白名单源码与直接测试。
请你做：逐文件记录职责/caller/输入域/失败语义；只有有直接证据的问题才修；补最小高判别力反例并做负控；更新账本与本卡证据。
不要做：不得修改 bootstrap.ts/save/schema/生成物/E2E/coverage runner，不得为了覆盖率堆弱断言或降低规则。
输出要求：给出每个白名单文件的 verified/review/blocked 结论、候选与反证；运行定向/相邻、game typecheck、pnpm check、support-mode ratchet、protected fast、lint；通过后提交并推送，未完成项保留待核。
```
