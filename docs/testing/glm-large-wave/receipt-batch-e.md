# TEST-GLM-LARGE-WAVE-4 · E 批回执（当前内容校验与项目读取）

- 候选 SHA（r1 本批完整提交）：`8cb0af0ad2e5952c01e8fa95144b495df4ceaecc`；R2 返工以新的完整候选 SHA 为准（见返工提交）。
- 新增测试文件：0（六组全部 existing-proof，依据见下表；不凑文件）
- 反控：本批无新增断言，按卡精神对覆盖 E01/E05 契约的既有代表套件补 2 枚反控证明其鉴别力
  （共用 judge；临时副本注入恰 exit1、唯一失败、产品 hash 不变）：

| 针 | fullName | 结果 |
|---|---|---|
| 干净 bundle 正控翻红 | content `validate-refs.test.ts > 干净 bundle → 无 issue` | VALID |
| codec round-trip 等值断言取反 | reforge `current-save.current-characterization > round-trips the current envelope…` | VALID |

- 门禁：`node scripts/docs/check.mjs` PASS；`git diff --check` 干净（本批未新增包内测试文件，
  content/reforge 包 typecheck 在 A/C 批已零诊断，未受本批影响）。

## 每组处置（旧测去重结论）

| 组 | 源文件 | 处置 | 依据 |
|---|---|---|---|
| E01 | content/validate.ts | existing-proof | `validate.test.ts` 50 例（actor/sprite/zone 形态恰一、字段边界、合法三字段正控）+ 各域 boundaries 套件；正控与单点拒绝全轴 |
| E01 | content/validate-refs.ts | existing-proof | `validate-refs.test.ts` 68 例 + contracts + data-refs：「干净 bundle → 无 issue」正控、组合模板 tilesetRefs 悬空报 error、levelUp 悬空 warn——精确 issue 语义已证（反控 E1 再证其鉴别力） |
| E02 | content/author-script-core.ts | existing-proof | `author-script-core.test.ts` 17 例 + wave2 + cursor-pure-wave2：复合实体映射、owner-bound cursor、stable 选择、状态机 handoff、canonical 条件拒绝 |
| E02 | content/script.ts | existing-proof | `script-library.test.ts` + guard-residual + resource-boundaries + glm-leaf-wave：checkCommands/checkScriptLibrary/deriveScriptChunk 全轴（C 批 chunk-store 测试亦直接消费） |
| E03 | content/item.ts | existing-proof | 9 个专项套件（含 use/throw/effects/inventory/preflight/ownership 背景）覆盖 kind/引用保真 |
| E03 | content/asset.ts | existing-proof | `asset.test.ts` + asset-catalog.contracts + asset-closure.contracts + resource-boundaries + residual：路径边界、角色切片、闭包校验全轴（D 批 sound audit 测试亦直接消费） |
| E04 | content/actor-condition.ts | existing-proof | 11+2+boundaries 例：StatusId 词表、快照/施加/清除、傀儡与回合边界 |
| E04 | content/validate-runtime.ts | existing-proof | `validate-runtime.test.ts` 3 + wave2：嵌套 flow 生命周期命令、旧 hostile 字段拒绝、zone 朝向拒绝 |
| E05 | reforge/project-loader.ts | existing-proof | `project-loader.test.ts` 12（中断保存拒绝/生成代切换/身份失败/只读 current 不读 sidecar/SceneIndex 惰性路径）+ current-boundaries 8（批量场景、输入保真、确定性、顺序、中间失败整批拒绝） |
| E05 | reforge/save/current-codec.ts | existing-proof | `current-save.current-characterization` 2 例（round-trip 不 mutate + 悬空生命周期拒绝）+ `restore-preflight.chain` 15 例 + `current-structure` 12 例——preflight/normalize 精确结果与失败保真已证（反控 E2 再证） |
| E06 | reforge/file-source.ts | existing-proof | `file-source.test.ts` 8 例（fetch 拼接/绝对路径拒绝/非 200/abort 透传/恢复状态绕缓存 NotFound 区分）+ cancel-windows 专项 |
| E06 | reforge/fsa-source.ts | existing-proof | `fsa-source.test.ts` 6 例（逐段进目录/URL 缓存与 dispose revoke/越界/NotFound 透传/已取消即抛）+ cancel-windows 专项 |

## 交付：五批并集去重清单与局部 coverage 对照配置

[five-batch-union.md](five-batch-union.md) —— 60 源逐个 disposition（20 新增 / 40 existing-proof）、
并集总览、可复建的局部定向与 coverage 对照命令。GLM 未运行官方 ratchet/strict-fast；
正式收益以 main 并集计，不相加隔离分支增量。

## 未证项汇总

- 无本批新增未证项。既有未证项累计见各批回执（A 批 4 条、B 批 2 条、C 批 1 条、D 批 2 条）。

> R2（返工）：E1/E2 针（打在覆盖 E01/E05 契约的代表套件上）已按 R2 严格判据重跑 VALID。
