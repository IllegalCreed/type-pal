# TEST-GLM-MIGRATE-ASSET-SUPPLY-1 — asset supply, ownership and publication boundaries

Status: done
Phase: phase2
Capability: migrate / asset supply and publication
Coding Owner: GLM
Reviewer: Codex（独立验收）
Contributor: GLM
Branch: `codex/glm-migrate-asset-supply-r1`
Visual Verification Timing: N/A

## 目标

审计 migrate 资产供应链剩余公开合同，覆盖 PAL asset loaders/materialize、authored takeover、retirement、map conversion、store boundary、publication 和 world sprite registry。目标是证明 source ownership、字节/hash/目录闭包、重迁幂等、零写拒绝和 authored 数据不被覆盖；不触真实 `projects/pal` 生产数据。

## 范围

- `packages/migrate/src/pal-assets.ts`、`pal-authored-overlays.ts`、`project-map-converter.ts`、`pal-store-boundary.ts`、`pal-current-publication.ts`、`pal-casualty-scripts.ts`、`pal-world-sprite-registry.ts` 及其公开 loader/materializer/publication caller。
- 优先审计当前 coverage 低且已有合法输入的资产分支：missing/extra/hash/size/type、legacy→authored ownership、retirement path/foreign file、map residual/shape、publication conflict/idempotence、sprite registry identity。
- 先读并排除 coverage85 Kimi extract/migrate、GLM-O asset、source-facts、sprite/runtime-resource 既有 fullName；CLI 真实写盘和已退役源不借测试覆盖。
- 不改产品、旧测、config/baseline、真实 `projects/pal`/`data/raw`，不重启退役迁移器；禁止强转、skip、ignore、扩 timeout、真实目录写入或弱 hash 断言。

## 验收条件

- 逐 source:line × public caller × synthetic legal input × oracle × fullName 建账，existing-proof/unreachable/blocked/product-counter 明确分列。
- 合成工程必须 mkdtemp + finally 清理；合同同时断言 bytes/hash/path/catalog/ownership/zero-write/zero-delete/idempotence 等真实业务结果。
- 反控严格绿→指定业务红→恢复绿，唯一 AssertionError、完整 JSON/raw/exit/signal/spawn、file×fullName identity、源/变异/恢复 hash 和临时树清理。
- 定向/相邻/migrate 全量、typecheck、lint 0/0/0、docs、diff 通过；coverage 只作最终 main 并集统计，不作单卡门槛。


## 交付记录

### r1（2026-10-05，GLM）

- 分支 `codex/glm-migrate-asset-supply-r1`（基线 `origin/main` `f4dbd0e3d`），唯一新增测试文件
  `packages/migrate/src/pal-migrate-asset-supply.glm-r1.test.ts`（15 tests）与反控脚本
  `packages/migrate/scripts/mas1-mutation-counterproof.mjs`；产品/schema/旧测/config/baseline/
  真实数据零改动。
- 排重账：7 文件逐轴（source:line × caller × 输入 × oracle × 判定）见
  [dedup-ledger.md](../../../evidence/TEST-GLM-MIGRATE-ASSET-SUPPLY-1/dedup-ledger.md)；15 净新合同 +
  unreachable/product-counter 账（含 :1154 经 validateAssetCatalog 前缀/路径门证明为防御重复、
  :533 经 sentinel-only 块一手实探）。
- 关键修正：kimi-r1 ledger 判 loadPalEffectSprites 合成不可达（「合法 YJ2 只能由 pal-extract
  fixture 产生」）——本卡以一手推导修正：YJ2 初始平衡树（yj2.ts:74-81）路径可确定性构造单字面量
  合法位流，frameAnimations 12 段合成全过，effect-sprites 分区（fast 0%）首次合成可达并补
  census/magic 两合同。
- 反控：13 针 × 严格四态（绿→指定业务红→字节恢复绿→rebuilt hash）全 PASS；runner 自测 11 例
  （9 拒收反例 + 2 放行正例）；完整 file×fullName×status TSV identity artifact（28 phase，集合
  sha256 级比较）；红相位唯一失败 fullName 精确相等 + AssertionError 片段 + console 旁证；
  mkdtemp 残留前后扫描 0。见
  [counterproof.json](../../../evidence/TEST-GLM-MIGRATE-ASSET-SUPPLY-1/counterproof.json)。
- 门禁：定向 15/15；相邻 30 文件 294/294；migrate 全量 738/738；repo typecheck exit 0；
  lint 0/0/0（3449 文件）；`git diff --cached --check` 零输出；docs 门主树 2 红项均为并行卡
  在途目录（非本卡文件），本卡分支干净 worktree 复跑全绿。
- 并行披露：交付期间另一卡（reforge 侧 bcs1）同工作树在途；反控 runner 加分支稳定门 + 目标源
  index hash 门，外来未跟踪按前缀豁免并逐相位披露（回执 concurrentForeignWork）。
- 覆盖率未按单卡统计（卡面口径：只作最终 main 并集统计）。

## 下一位 Agent 提示词（Codex 独立验收）

```text
你是 TEST-GLM-MIGRATE-ASSET-SUPPLY-1 的独立验收人（Codex）。工作树分支应为
codex/glm-migrate-asset-supply-r1（基线 origin/main f4dbd0e3d）。先读任务卡
docs/ops/tasks/TEST-GLM-MIGRATE-ASSET-SUPPLY-1.md、
docs/ops/evidence/TEST-GLM-MIGRATE-ASSET-SUPPLY-1/{README.md,dedup-ledger.md,counterproof.json}
与测试文件 packages/migrate/src/pal-migrate-asset-supply.glm-r1.test.ts。
验收点：1) 排重账真实性（抽核 existing-proof/unreachable 判定的一手锚，尤其 :1154 防御重复、
:533 sentinel 实探、YJ2 位流推导是否成立）；2) 15 合同的 caller/输入/oracle 是否钉定义点且与
旧 fullName 不重复；3) 反控四态与 identity TSV 是否可复核（node
packages/migrate/scripts/mas1-mutation-counterproof.mjs 约 5 分钟，要求工作树对 7 个目标源
clean）；4) 门禁复跑（定向/相邻/migrate 全量/typecheck/lint/diff --check）；5) 并行卡同树
交付的隔离是否成立（回执 concurrentForeignWork + 分支稳定门）。
不得改实现文件；验收结论（accept/counter + 理由）写回本卡并按当前模式收口或返工。
```

## Codex 独立验收与收口（2026-10-06）

- 独立复跑：定向 15/15；strict asset-supply counterproof 13/13 PASS，identity TSV、四态 hash 和 mkdtemp 清理一致。
- 独立质量门：Migrate typecheck、docs、git diff --check 通过；集成全仓 lint 3459 files、0/0/0。
- 并行卡隔离与 YJ2 合成供应链证据可复核；结论：15 条资产供应合同满足门禁，合入 main，任务归档为 done。

## 历史：r1 开卡提示词（已被上方交付记录的验收提示词取代）

```text
你是 TEST-GLM-MIGRATE-ASSET-SUPPLY-1 的 Coding Owner（GLM）。先读 AGENTS.md、docs/phase2/READ-FIRST.md、docs/phase2/archive/audits/、coverage85-kimi-extract-migrate-r1、GLM-O asset 证据及本卡。
只在 codex/glm-migrate-asset-supply-r1 工作。先对 pal-assets.ts、pal-authored-overlays.ts、project-map-converter.ts、pal-store-boundary.ts、pal-current-publication.ts、pal-casualty-scripts.ts、pal-world-sprite-registry.ts 的公开 caller/合法合成输入/business oracle/fullName 排重。
重点审计 asset bytes/hash/path/catalog 闭包、legacy-authored ownership、retirement、map shape/residual、publication conflict/idempotence、sprite identity；不要重复 Kimi/GLM-O 已闭合合同，不写真实 projects/pal/data/raw。
只写本卡测试、合法 mkdtemp fixture、证据和回执；禁止产品/旧测/config/baseline/真实数据、退役迁移器、强转、skip、ignore、扩 timeout、弱 hash/路径断言。反控必须严格三态、完整 identity/hash/清理证明。
交付定向/相邻 test、typecheck、lint 0/0/0、docs、git diff --check 和完整 SHA。覆盖率/例数不是完成条件，不得标 done，等待 Codex 独立验收。
```
