# TEST-GLM-MIGRATE-ASSET-SUPPLY-1 — asset supply, ownership and publication boundaries

Status: build
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

## 下一位 Agent 提示词

```text
你是 TEST-GLM-MIGRATE-ASSET-SUPPLY-1 的 Coding Owner（GLM）。先读 AGENTS.md、docs/phase2/READ-FIRST.md、docs/phase2/archive/audits/、coverage85-kimi-extract-migrate-r1、GLM-O asset 证据及本卡。
只在 codex/glm-migrate-asset-supply-r1 工作。先对 pal-assets.ts、pal-authored-overlays.ts、project-map-converter.ts、pal-store-boundary.ts、pal-current-publication.ts、pal-casualty-scripts.ts、pal-world-sprite-registry.ts 的公开 caller/合法合成输入/business oracle/fullName 排重。
重点审计 asset bytes/hash/path/catalog 闭包、legacy-authored ownership、retirement、map shape/residual、publication conflict/idempotence、sprite identity；不要重复 Kimi/GLM-O 已闭合合同，不写真实 projects/pal/data/raw。
只写本卡测试、合法 mkdtemp fixture、证据和回执；禁止产品/旧测/config/baseline/真实数据、退役迁移器、强转、skip、ignore、扩 timeout、弱 hash/路径断言。反控必须严格三态、完整 identity/hash/清理证明。
交付定向/相邻 test、typecheck、lint 0/0/0、docs、git diff --check 和完整 SHA。覆盖率/例数不是完成条件，不得标 done，等待 Codex 独立验收。
```
