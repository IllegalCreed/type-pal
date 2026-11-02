# TEST-GLM-MIGRATE-ASSET-SUPPLY-1 交付证据

Status: historical
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-20
Template: evidence-receipt-v1 / 1.0.0

本页是 TEST-GLM-MIGRATE-ASSET-SUPPLY-1 的交付证据：基线 origin/main `f4dbd0e3d`、分支 `codex/glm-migrate-asset-supply-r1`；产品/schema/API/旧测/config/baseline/真实数据零改动（diff 仅本卡测试、反控脚本、证据与卡面）；7 文件逐轴排重后 15 条净新合同，唯一新增测试文件 pal-migrate-asset-supply.glm-r1.test.ts。

## 证据身份

- 文件：dedup-ledger.md（7 文件逐轴排重账+unreachable/product-counter 账+13 针表）；counterproof.json（13 针四态回执：runner 自测 11 例全过、每针原始绿/指定业务红/字节恢复绿/rebuilt hash、7 源文件逐针四 sha、mkdtemp 残留扫描前后均 0）；counterproof-raw/（TSV identity artifact 字节流即 identitySha256+红相位默认 reporter 原文）；gates/（定向 15/15、相邻 30 文件 294/294、migrate 全量 738/738、repo typecheck、lint 3449 文件 0/0/0、diff --check 零输出）。

## 来源与输入

- 核心修正：kimi-r1 ledger 判 loadPalEffectSprites「合成不可达」——本卡一手修正：YJ2（shared/src/yj2.ts）无 magic、初始树为 :74-81 文档化固定平衡树，单字面量位流可由 parent(n)=0x141+(n>>1) 确定构造（decompressYj2 实解码验证）；真实语料 happy path 属 .pal/full profile。

## 断言与业务 oracle

- 15 合同摘要：effectSprites 合法位流两合同（EFFECT-CENSUS/EFFECT-GZIP-MAGIC）+其余 13 合同逐轴（quote 详）；红相位硬门：exit≠0、signal/spawnError null、numFailedTests=1、pending/todo=0、无空断言集失败 suite、唯一失败 fullName 精确相等、failureMessages 含指定 AssertionError；绿相位：全 passed 且 identitySha256 集合级一致。

## 结果

- 门禁全绿；docs 门主树 2 红项均来自并行卡在途目录（非本卡文件），本卡分支干净 worktree 复跑全绿；lint 同理（并行卡未跟踪文件引入的红项非本卡）。

## 限制与复核

- 复现：node packages/migrate/scripts/mas1-mutation-counterproof.mjs（约 7 分钟；并行卡同树在途文件按前缀豁免并逐相位披露 concurrentForeignWork）。memory 补充：r1 已推 ad752bd94（15 合同/13 针四态反控）待 Codex 验收。

## 历史范围

- TEST-GLM-MIGRATE-ASSET-SUPPLY-1 r1 交付（15 净新合同+13 针）；固定源 revision 7d609719e234…。

## 原始结论

- YJ2 合法位流一手修正 kimi 不可达判断；toThrow 子串语义/failureMessages 截断判例。

## 当时证据

- 文件清单、修正叙述与门禁在 quote 保全。

## 当前有效性

historical。r1 时点待验收。

## 继任文档

当前结论归任务卡与 Codex 接收记录。

## 原文保全

固定 source revision `7d609719e2347f6367712a54f2f81ccf3830b657`，source SHA `e39b9790ff00e489d3e89ad77c102050c5e18f1e0d69c6d4c9e3a62ee1dff9dd`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与固定原源逐字节相等（不 trim、不替换）。
<!-- original-source-quote:start -->
> # TEST-GLM-MIGRATE-ASSET-SUPPLY-1 交付证据
>
> 上级：[任务专属证据](../../README.md) · 任务卡：[TEST-GLM-MIGRATE-ASSET-SUPPLY-1](../../archive/tasks/done/TEST-GLM-MIGRATE-ASSET-SUPPLY-1.md)
>
> - 基线：`origin/main` `f4dbd0e3d`，分支 `codex/glm-migrate-asset-supply-r1`。
> - 产品/schema/API/旧测/config/baseline/真实数据零改动（diff 仅本卡测试、反控脚本、证据与卡面）。
> - 结论：7 文件逐轴排重后 15 条净新合同（含 kimi-r1 ledger「effectSprites 合成不可达」判断的
>   一手修正——YJ2 单字面量合法位流构造），唯一新增测试文件
>   `packages/migrate/src/pal-migrate-asset-supply.glm-r1.test.ts`。
>
> ## 文件
>
> - [dedup-ledger.md](dedup-ledger.md) — 7 文件逐轴排重账（source:line × caller × 输入 ×
>   oracle × 判定），含 unreachable/product-counter 账与 13 针表。
> - [counterproof.json](counterproof.json) — 13 针反控回执：runner 自测 11 例（9 拒收反例 +
>   2 放行正例）全过；每针四态（原始绿/指定业务红/字节恢复绿/rebuilt hash）、完整 argv/cwd/env
>   摘要、JSON 计数、exit/signal/spawnError、7 个源文件逐针 original/mutant/restored/rebuilt
>   sha256、mkdtemp fixture 残留前后扫描（mas1-supply- 前缀，前后均 0）。
> - [counterproof-raw/](counterproof-raw/) — 每个 phase 的完整 file×fullName×status 执行集
>   TSV artifact（字节流即 identitySha256）+ 红相位默认 reporter console 原文。红相位硬门：
>   exit≠0、signal/spawnError null、numFailedTests=1、pending/todo=0、无空断言集失败 suite、
>   唯一失败 fullName 与目标合同精确相等、failureMessages 含指定 AssertionError；绿相位硬门：
>   全 passed 且 identitySha256 与 baseline 集合级一致。
> - [gates/](gates/) — 定向 15/15；相邻 30 文件 294/294（pal-store-boundary.pal 含真实语料）；
>   migrate 全量（unit+pal 双工程）738/738 exit 0；repo `pnpm -r run typecheck` exit 0；
>   `pnpm lint` PASS 0/0/0（3449 文件）；`git diff --cached --check` 零输出。
>   docs 门：主工作树 `pnpm check:docs` 的 2 个红项均来自并行卡在途目录
>   TEST-GLM-REFORGE-BATTLE-CORE-SESSION-1（未登记导航，非本卡文件）；本卡分支提交的干净
>   worktree 复跑 `node scripts/docs/check.mjs` 全绿（见 gates/docs-worktree.stdout.txt）。
>   lint 门：`pnpm lint` 在交付时点 PASS 0/0/0（gates/lint.stdout.txt，3449 文件）；其后并行卡
>   落盘的未跟踪文件（bcs1 counterproof.json）在主树引入 format 红项，非本卡文件；本卡分支
>   tip 干净 worktree 复跑 biome check 0 诊断（gates/lint-worktree.stdout.txt）。
> - 复现：`node packages/migrate/scripts/mas1-mutation-counterproof.mjs`（约 7 分钟，前置要求
>   工作树对 7 个目标源 clean 且分支为交付分支；并行卡（reforge 侧）同树在途文件按前缀豁免并
>   逐相位披露，见回执 concurrentForeignWork）。
>
> ## 核心修正与 15 合同摘要
>
> kimi-r1 ledger 判 loadPalEffectSprites「合成不可达：合法 YJ2 压缩流只能由 pal-extract 专属
> fixture 产生」。本卡一手修正：YJ2（shared/src/yj2.ts）无 magic，初始树是 :74-81 文档化的固定
> 平衡树（parent(n)=0x141+(n>>1)，偶=左/0 奇=右/1）；单字面量符号的位流可确定性构造（测试内
> `yj2LiteralStream`，9-10 位，LSB-first），经 decompressYj2 实解码验证产出 1 个 320×200 帧。
> 由此 loadPalFrameAnimations 全 12 段以合成输入通过，链路推进至 effect-sprites 分区——该分区
> fast 覆盖 0%，是 pal-assets.ts 唯一整函数级缺口。
>
> 1. EFFECT-CENSUS — 56 个合法 gzip 特效源推进到冻结 census：`assets=56 bytes=56×L frames=56`
>    精确计数拒绝（bytes/frames 闭包；顺序性证明 frameAnimations/sounds/staticImages 阶段先全过）。
> 2. EFFECT-GZIP-MAGIC — 物理特效源 0x1f+非 0x8b 在 magic 门精确拒绝。
> 3. STORE0-SOURCE-TIERS — 源 Store0 九档换序精确拒绝（源所有权冻结）。
> 4. GOURD-POOL-COUNT — item270 双资源池 `数量 2 != 1` 精确拒绝。
> 5. VESSEL-CRAFT-COUNT — item268 craft=2 / recipes=3 两未走方向逐轴拒绝。
> 6. tilesetIdFromSourceNumber(0) 非正整数拒绝（mapId 孪生轴）。
> 7. ENCODE-LAYER0-RANGE — encodeProjectMapWord 三域越界（tile 0x200 / 上层 0x1ff / height 16）。
> 8. convertSourceTilemap 宽/高非正整数逐轴拒绝。
> 9. SOURCE-WORD-LAYERS — sourceWordFromProjectMap 缺 layer-1 拒绝。
> 10. POOL-MESSAGE-MISSING-CURRENT — resource-pool 消息指向 current 缺失物品 fail-loud。
> 11. POOL-MESSAGE-SYNC — 姐妹池仅同步带 message 的对位条目；作者字段保留；current 输入不可变。
> 12. CASUALTY-0x05-OPERANDS — 0x05 参数非空拒绝（附 0x06 门两元 operands 合法轴）。
> 13. CASUALTY-BATTLER-GUARD — 伤亡入口角色缺 battler fail-closed。
> 14. OVERLAY-EVIDENCE-SOURCE — overlay 精灵被场景引用时以 pal-overlay 证据物化中性 id；异布局
>     场景证据建 -f3 变体并进冲突报告。
> 15. PUBLICATION-REFERENCE-GATE — 发布商店引用未知物品时 validateReferences 以精确 where 拒绝
>     （glm-o 只证 assetErrors；referenceErrors 汇总门为本卡净新）。
>
> ## 环境与清理
>
> - 变异/恢复全程字节级写回 + 分支稳定门 + 目标源 index hash 门（并行卡同树交付期间防串线）。
> - 产品源文件最终态与基线逐字节一致（rebuilt hash == original hash），工作树对产品文件 clean。
> - mkdtemp 合成工程 prefix `mas1-supply-`：反控前后 os.tmpdir() 残留扫描均 0；测试内 afterEach
>   强制清理；runner 自身临时树 finally 移除。
>
<!-- original-source-quote:end -->
