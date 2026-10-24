---
testingSchema: 2
id: phase1-dependency-ownership
evidence: domains/phase1-runtime/dependencies/dependency-ownership/evidence.json
---

<!-- testing-meta
{"schemaVersion":2,"id":"phase1-dependency-ownership","sourceRefs":[{"path":"packages/game/src/core/script-catalog.ts","lines":"16","anchor":"export function setGlobalEvents","role":"owner","sha256":"ec8f3713ed670a0af5efdf0d9e1bc940b6a5048a794b344bcd171d99b0617cc1"},{"path":"packages/game/src/core/inventory-state.ts","lines":"10-23","anchor":"export function addItemToInventory","role":"owner","sha256":"61bedc73a9a72cd587b7bb202162528b4c2ad5e1bd5dfd9c6d0eea35ec0d8d25"},{"path":"packages/game/src/core/equipment-state.ts","lines":"6-13","anchor":"export const MAX_PLAYER_EQUIPMENTS","role":"owner","sha256":"2bb82b9b422fb8113a84adb35ec4f5224719e493f09024c2ea34cecb055accad"},{"path":"packages/game/src/core/player-poison-state.ts","lines":"12-19","anchor":"export function setObjectPoisons","role":"owner","sha256":"e8600b608a451f684e17d596d9640cdd6a7bdc15a58b13a340f74ec814b61756"},{"path":"packages/game/src/core/scene-identity.ts","lines":"6","anchor":"export function getCurrentMapNum","role":"owner","sha256":"f27108fbf432c30d52b93481b8dfb253eda4cb142304a9f8898d99c4a9018ca0"},{"path":"packages/game/src/core/menu/menu-stack.ts","lines":"12-19","anchor":"export function resumeAfterMenusClosed","role":"owner","sha256":"7f18301a0ada526074c619586001fb40c3e28e52ea3377eef099d276a6e55c46"},{"path":"packages/game/src/core/dependency-ownership.test.ts","lines":"26","anchor":"describe('D1 shared-state ownership","role":"oracle","sha256":"47d2389dd91bb6b7d80a1206b6a4acf6f4d832035ad09b85c65fa1225baba72f"},{"path":"packages/game/src/core/cross-module-boundaries.test.ts","lines":"25","anchor":"describe('G07","role":"oracle","sha256":"18349e6552d9b5bf181d60db94a207b9a055bf4c2d76bbb72337e4d5575887c4"},{"path":"packages/content/src/character.ts","lines":"168-170","anchor":"export const CONTENT_VERSION =","role":"version","sha256":"8d3d592d75e78c9559986b5747e7b2395aaac010bf8dde9d6ea5f164bba29a93"}],"publicCallers":["game event/scene/equipment/battle/menu consumers → single lower owner modules","dependency-ownership and cross-module boundary tests"],"legalInputs":["current GameState","current event/battle/menu typed commands","PAL runtime data and synchronous scene identity"],"businessOracle":{"type":"phase1-dependency-ownership","assertions":["static runtime SCC is zero","old exports and function bodies retain contracts","inventory/poison/equipment/scene/menu state has one owner"]},"dedupe":{"result":"source-review-no-new-test-credit","against":["docs/testing/archive/legacy/ops/testing-records/architecture-continuation-integration.md","domains/phase1-runtime/dependencies/dependency-ownership/history/report.md"],"notes":"D1 report/evidence is a phase1 architecture audit; its audit/mutant scripts remain legacy tools with explicit package-relative imports. It does not close gameplay/E2E or coverage."},"revision":{"currentSha":"2aed1f0dbbbed8ce01cb3511315745ab1ccdf159","contentVersion":22,"minimumSaveVersion":11,"history":[{"date":"2026-10-20","revision":"615622b4ccf443d9d2b59704b52485bb5b083015","action":"menu-stack comment binding only","sourceRef":"packages/game/src/core/menu/menu-stack.ts","previousSourceSha256":"1a9681b2b26ccb5524486f25083659a0ab0fa4e4d765147e3b2702d0d0e5a7e2","sourceSha256":"7f18301a0ada526074c619586001fb40c3e28e52ea3377eef099d276a6e55c46","scope":"Only correct closeTopMenu timing prose. Emitted JavaScript identical;resumeAfterMenusClosed owner/signature/body unchanged. No new D1 SCC/token/mutant/browser execution;historical status/candidate/versions/dates retained.","evidence":"docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/menu-core-closeout.json","notRun":["historical D1 audit/needles","new browser/story E2E"]},{"revision":"b9bf6f7760d4d8b59e7dbc83b0f9aa0b74d9d9ce","date":"2026-10-20","action":"five-card poison-comment binding only","sourceRef":"packages/game/src/core/player-poison-state.ts","sourceSha256":"98a08d77f9a738a7f5945278624e87033569f927914d6ddbd0e3194d980a5ad8","scope":"Only correct separate cure/heal prose;helper emitted JavaScript and owner signature identical to prior CODE53 proof. No new D1 SCC/token/needles/browser/execution credit;historical publication/versions/candidate/dates retained.","evidence":"docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/five-cards/review.json","notRun":["historical D1 audit/needles","browser/story E2E"],"previousSourceSha256":"3c7ed5879374144001595a6bc1c6d1ef1a71ab63a6407c55fd94bd89ec7bfa5a"},{"date":"2026-10-20","revision":"9cc550306226f4109615afe0ec2270f8cfd598bb","action":"GLM29 equipment comment source binding only","sourceRef":"packages/game/src/core/equipment-state.ts","previousSourceSha256":"5ebe8ee7d1c0ad76f6867253aaaa9875ea473a776afb27a00edca9c21999ed5c","sourceSha256":"ab572e2c6f238f2f90d1e3835dbd3c03265aadc67884ac7dda17ef8798ac5081","scope":"e0b332b90 removed stale claims that DualAttack/poison cleanup was unimplemented; f263ded94 corrected level>=99 poison commentary and its explicit compression limit. removeComments printed TypeScript bytes identical; owner export/caller contract unchanged. No new D1 SCC/token/mutant/browser/architecture acceptance. Historical versions, runtimeExecution, catalog status and execution dates retained.","evidence":"docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/glm-foundation/gate-closeout.json","notRun":["D1 historical audit and needles","browser","E2E route execution"]},{"revision":"27358f9d9e3ab65d777b7864fcc936638ed9373a","date":"2026-10-18","action":"poison-comment-sourceRef-binding-only","sourceRef":"packages/game/src/core/player-poison-state.ts","previousSourceSha256":"da880e6fd6a4c6dad2ac689fd6d940ede92010474b725bf68559dcb6c103d10c","sourceSha256":"3c7ed5879374144001595a6bc1c6d1ef1a71ab63a6407c55fd94bd89ec7bfa5a","scope":"Only comments changed; removeComments JavaScript bytes identical. Existing setObjectPoisons signature/owner binding unchanged. Preserve catalog status/lastVerified/reviewBy, historical candidate/versions/runtimeExecution; no rerun of old D1 SCC/token/browser/needles or new architecture acceptance. Current11 ownership tests are only finite regression at the linked slice.","evidence":"docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/core-comment-audit/poison-progression-comments/README.md","notRun":["original D1 audit/needles","whole-repository check","official coverage ratchet","protected fast","browser visual","E2E"]},{"revision":"2aed1f0dbbbed8ce01cb3511315745ab1ccdf159","date":"2026-10-04","action":"source-and-publication-audit","notRun":["runtime","E2E","coverage"]},{"date":"2026-10-22","action":"script-correction-ownership-delta","scope":"Treasure repair moved from runtime catalog into versioned extraction. setGlobalEvents now publishes the supplied corrected array without mutating operands. Finite catalog ownership test updated; historical D1 SCC/token/browser results are not rerun or promoted.","previousSourceRefs":[{"path":"packages/game/src/core/script-catalog.ts","lines":"33-40","anchor":"export function patchGiveItemZeroBugs","role":"owner","sha256":"f58bbfb50322211cb3d7e149cf4ee5ea3db32a3ec6a8c3abb2aa3bdea5038bf0"},{"path":"packages/game/src/core/dependency-ownership.test.ts","lines":"26-45","anchor":"describe('D1 shared-state ownership","role":"oracle","sha256":"d483cc817fa920d93c453fef65dd1c6a5dcc59615667ceeeca7b10bafdd186c9"}],"evidence":"docs/ops/tasks/GAME-SCRIPT-CORRECTIONS-1.md"},{"date":"2026-10-24","base":"3609b4d23339bae1f23e6492d9c11cd4a955351e","action":"approved catalog internal API and typed test delta","previousSourceRefs":[{"path":"packages/game/src/core/script-catalog.ts","lines":"17","anchor":"export function setGlobalEvents","role":"owner","sha256":"d55d22f0fe6106eea3a20ef7180f78a874aa12ef394af04808284a5bf6deeecd"},{"path":"packages/game/src/core/scene-identity.ts","lines":"6-13","anchor":"export function getCurrentMapNum","role":"owner","sha256":"8e47a8b7ff7e1d3b360f5984f819b207e480581b4c2042f98ef1abe0681b89ef"},{"path":"packages/game/src/core/dependency-ownership.test.ts","lines":"26","anchor":"describe('D1 shared-state ownership","role":"oracle","sha256":"101d1e8c64d066345bd2a9d51f5e712d689d4fdb01d0ef49e919eb1ec7324b1a"},{"path":"packages/game/src/core/cross-module-boundaries.test.ts","lines":"45-64","anchor":"describe('G07","role":"oracle","sha256":"9359f945fb2d77563326ccaca7f140250d747a0972aef46e15e91c2106a077e4"}],"scope":"Only unused GameState parameter/obsolete return types and six real callsites removed under user approval. Scene identity comments only. Typed fixtures and exact ownership assertions replace invalid casts; G07-01 duplicate transfers to retained D1 two-entry history case. Other emitted product JS and single-owner storage unchanged. Existing31 E2E instrumentation cases ran; historical D1 SCC/161-token/needles/browser claims and all publication status/dates/versions remain unchanged. Whole-pre94 unified gates deferred.","evidence":"docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/battle-core-fade-quality/README.md"},
{
  "date": "2026-10-24",
  "base": "016b6b8f5d58d91f9a1fe04f292cfa310220d4fd",
  "action": "approved-wear-lifecycle-source-binding",
  "previousSourceRefs": [
    {
      "path": "packages/game/src/core/equipment-state.ts",
      "lines": "6-13",
      "anchor": "export const MAX_PLAYER_EQUIPMENTS",
      "role": "owner",
      "sha256": "ab572e2c6f238f2f90d1e3835dbd3c03265aadc67884ac7dda17ef8798ac5081"
    },
    {
      "path": "packages/game/src/core/player-poison-state.ts",
      "lines": "12-19",
      "anchor": "export function setObjectPoisons",
      "role": "owner",
      "sha256": "98a08d77f9a738a7f5945278624e87033569f927914d6ddbd0e3194d980a5ad8"
    },
    {
      "path": "packages/game/src/core/dependency-ownership.test.ts",
      "lines": "26",
      "anchor": "describe('D1 shared-state ownership",
      "role": "oracle",
      "sha256": "231f97b5936451ddc703629a38f076d1c88b1e5159225c1dbcf5f290c7209f99"
    }
  ],
  "scope": "Only three current sourceRefs and the Wear slot oracle change. User approved stable16-slot compaction, preserve poison continuation/after-hole survivors/global dedup. Historical D1 candidate/version/status/publication dates/SCC/token/browser credit unchanged; whole-pre94 gates deferred.",
  "evidence": "docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/mode-player-quality/README.md"
}]},"evidence":"domains/phase1-runtime/dependencies/dependency-ownership/evidence.json"}
-->

# 第一阶段依赖所有权拆分

Owner: Codex
Status: current（source/publication scope；无新运行验收）
Last reviewed: 2026-10-15
Template: test-domain-report-v1 / 1.1.0

## Domain scope

本报告范围为 phase1/game。Game event/scene/equipment/battle/menu → lower owner；一阶段所有权审计不成为二阶段模块合同。
本次按实际正文与 caller 核类型；catalog已纠正阶段/引擎分类，原候选、版本、日期和执行结论不改。

### 复核范围与结论

Historical D1 receipt records 161 function token checks, 8 ownership tests, 3 needles and a minimum browser check. Current source audit does not rerun PAL or reclassify the old warnings.

本轮结论为当前源码接线与历史出版记录已核读。没有重跑运行时、旧反控、浏览器或覆盖率；历史证据不可因文档治理升级为当前动态验证。

2026-10-11 E2E 合入核读：sourceRefs 绑定当前 content22 / minimumSave12 源文件；candidateSha、versions、history、runtimeExecution 和历史计数保持原批次含义，不晋升为 SAVE12 运行时或 E2E 通过。

## Claim matrix

下表是待由相应业务执行验证的合同义务，原配对 evidence 的 source-backed 不因本次排版变为 runtime-backed。

| 合同义务 | 原证据范围 | 本次停止线 |
|---|---|---|
| 静态 runtime SCC 为零是原结构义务 | 原 sourceRefs / 历史报告和配对 evidence | 本次未重新执行 |
| 旧 exports/functions 合同保持，不能复制共享状态 | 原 sourceRefs / 历史报告和配对 evidence | 本次未重新执行 |
| inventory/poison/equipment/scene/menu 各有单一 owner | 原 sourceRefs / 历史报告和配对 evidence | 本次未重新执行 |

## Inputs and fixtures

合法输入为 当前 GameState、event/battle/menu typed commands、PAL 数据与同步 scene identity。损坏记录或内部突变反控不冒充产品合法输入；报告不新造fixture或测试数量。

### 真实 caller、输入与业务 oracle

- `packages/game/src/core/script-catalog.ts:16`（owner；anchor `export function setGlobalEvents`）
- `packages/game/src/core/inventory-state.ts:10-23`（owner；anchor `export function addItemToInventory`）
- `packages/game/src/core/equipment-state.ts:6-13`（owner；anchor `export const MAX_PLAYER_EQUIPMENTS`）
- `packages/game/src/core/player-poison-state.ts:12-19`（owner；anchor `export function setObjectPoisons`）
- `packages/game/src/core/scene-identity.ts:6`（owner；anchor `export function getCurrentMapNum`）
- `packages/game/src/core/menu/menu-stack.ts:12-19`（owner；anchor `export function resumeAfterMenusClosed`）
- `packages/game/src/core/dependency-ownership.test.ts:26`（oracle；anchor `describe('D1 shared-state ownership`）
- `packages/game/src/core/cross-module-boundaries.test.ts:25`（oracle；anchor `describe('G07`）

公开调用链：game event/scene/equipment/battle/menu consumers → single lower owner modules；dependency-ownership and cross-module boundary tests。合法输入：current GameState；current event/battle/menu typed commands；PAL runtime data and synchronous scene identity。

业务判据：static runtime SCC is zero；old exports and function bodies retain contracts；inventory/poison/equipment/scene/menu state has one owner。这里是对既有测试合同的核读，不是新增测试或历史运行真实性再认证。

## Results and gaps

161 token checks、8旧测试、3 needles、最小浏览器及旧 warnings 均为原D1历史；content/SAVE轴元数据不把Game报告改成SAVE12运行证明。
下方原“当前内容22/保存11”描述2026-10-04出版审计revision；现行二阶段源常量为content22/minimumSave12，
不因此更新旧candidate/versions或授予新通过。D1的一阶段合同另有其GameState/原版轴，不从该出版元数据推导存档兼容。
原工具“remain legacy”说明按其审计日期读取，今天的位置/清理状态须查迁移账与实际caller，不能从旧叙述自动继承。

### 排重和处理理由

D1 report/evidence is a phase1 architecture audit; its audit/mutant scripts remain legacy tools with explicit package-relative imports. It does not close gameplay/E2E or coverage.

工具逐项核对见 [wave2 tool audit](/docs/testing/archive/migrations/testing-domains-20261004-wave2-tool-audit.json)：audit/mutants 的 root 参数、Git/source 读取、cwd、runner 与 TypeScript import 已核；工具保留 legacy，不将 phase1 旧反控当当前产品 caller。

保留唯一历史 report/evidence；当前索引与报告 supersede 原平面材料的导航和当前状态口径，原失败、warnings、计数和候选 SHA 均由 [历史报告](history/report.md) 和 [原始机账](history/evidence.json) 保留。


### 证据与 revision

[配对文档核读证据](evidence.json)记录 source hashes。原始材料迁移前 hash 在 [迁移计划](/docs/testing/archive/migrations/testing-domains-20261004-wave2.json)；当前内容22/保存11，历史内容20/保存8不升级。

2026-10-04：基线 2aed1f0dbbbed8ce01cb3511315745ab1ccdf159，迁移+source audit；未重新执行产品，原作者验收与历史 counter 按旧记录保留。

## Quality gate

本次仅运行文档结构、链接、配对 publication consumer、source/after SHA 与全仓静态门；不改产品、旧测试或coverage。
缺当前runtime/UI/E2E/视觉/覆盖证据继续保留为限制，不以静态绿色关闭原历史counter或提升catalog状态。

2026-10-18 窄维护：仅player-poison-state注释改动的sourceRef绑定；移除注释后的JS字节与27358基点一致，setObjectPoisons出口/共享Map owner未变。catalog出版日期/状态、历史candidate/versions、SCC/token/三针/浏览器结论均保留原范围，未据此重验。当前11条ownership回归见[pre94有限切片](../../../../../ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/core-comment-audit/poison-progression-comments/README.md)，其中slot1低毒断言只证明当前TS稀疏ownership，不能当SDL压缩等价或完整D1验收。

### 2026-10-20 equipment 注释绑定增量

e0b332b90移除DualAttack/清毒尚未实现的过时声明；f263ded94更正装备卸下清毒等级及扫描/压缩未决边界；本轮实比removeComments正文一致，现行owner出口不变，sourceRef仅换至当前字节。原D1 SCC/token/反控/浏览器记录未重验，catalog状态、lastVerified/reviewBy与历史版本不变。[本轮门回执](../../../../../ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/glm-foundation/gate-closeout.json)保存前后SHA与限制。

### 2026-10-20 menu-stack注释绑定增量

仅纠正closeTopMenu“下帧回explore”的误称，当前tickMenu可在同一dispatch后恢复battle/event/explore；owner出口与执行体未变，sourceRefs只匹配当前字节。[菜单模块记录](../../../../../ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/menu-core-closeout.json)给编译不变证明。历史D1审计/三针/浏览器未重跑，出版状态、日期和版本不变。

### 2026-10-22 纠错层所有权变更

三宝箱纠正已迁入版本化提取管线；script-catalog 只发布调用方提供的脚本，相关所有权测试同步使用已纠正输入。旧 patchGiveItemZeroBugs 出口随唯一调用退休，不保留第二套运行时补丁。新行为与测试见[两阶段纠错报告](../../../cross-phase/script-corrections/report.md)。本次更新当前源码锚点，不将原 D1 SCC、161函数、旧反控与浏览器记录重标为当前通过。

### 2026-10-24 catalog接口与测试质量增量

本轮用户批准移除目录查询未用的GameState参数及伪返回字段；六真实caller和E2E追踪器同步，实际源码插桩31例通过。typed公开工厂替代残缺强转，G07-01重复历史合同由D1两入口/两图号的真实event history保留；目录返回用精确对象断言承接旧“不内嵌commands”合同。[当前八维与完整原件](../../../../../ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/battle-core-fade-quality/README.md)给有限JS迁移证明与结果。只回绑四项当前sourceRefs/行锚；原D1全域SCC/161-token/三针/浏览器未重跑，catalog状态/日期/历史版本不升级，统一门等全部pre94收尾。

### 2026-10-24 Wear生命周期绑定增量

用户批准稳定前移全部幸存毒并保留洞后有效项/全槽去重，D1的slot1旧位置oracle相应迁移为slot0普通毒、slot1清尾，ID与续点同时断言。只回绑三个sourceRefs；原SCC/token/浏览器与出版状态不升级。完整原件见[当前有限质量片](../../../../../ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/mode-player-quality/README.md)。
