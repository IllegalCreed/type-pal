# TEST-GLM-WAVE-O-1 — 当前供应链、内容守卫与migrate门十倍测试包

Status: build
Phase: phase2
Capability: supply-validation / test-coverage
Coding Owner: GLM O（仅新测试与专属证据）
Reviewer: Codex（独立验收、集成和正式覆盖结算）
Visual Verification Timing: N/A（CLI/纯校验；不改UI）
Branch: `codex/glm-wave-o-supply-validation-r1`（新独立worktree）

## 目标、冻结与排重

用户2026-09-30要求三张至少十倍规模的独立卡。O目标 **700合法未重复用例、60合同
工作组、40有效反控**；十里程碑连续做，先解migrate比率门，再做内容/共享守卫残余。
[共同协议](../../testing/glm-tenfold-triple/README.md)为本卡硬验收条件，
[冻结表](../../testing/glm-tenfold-triple/targets.json)给105个源、SHA256与825候选未命中臂。
生产冻结 `3ac9a2e2f6aba8a5cc97640c18fef8549d199380`，派发树已有L/M/N，禁止重造旧断言。
这是剩余合同扩围，不是恢复旧转换卡或改官方分母；700不允许机械换参数凑数。

## 前提真值门与上下文

工程前提：已退休原版脚本转换不再是消费者；当前窄供应、三方合并/事务、内容校验仍在使用。
before→after仅测试证据增强，产品/格式/发布行为保持冻结；用户可见取舍N/A。

| 真值维度 | 锚点与边界 |
|---|---|
| primary | `packages/migrate/README.md:27-48`当前入口及dry-run先恢复事务；`migration-transaction.ts:264,277`真实恢复/提交入口 |
| 一阶段 | 不裁决玩法/原版脚本；原始静态资源仅窄供应输入，禁止恢复旧translator |
| 二阶段 | `pal-current-publication.ts:111`现行publication；`migration-transaction.ts:27-31`项目旧hash合同；content现行guard以真实公开caller为准 |
| 目标 | 仅typed临时工程与公开入口补证；[退役卡](../archive/tasks/done/ARCH-PAL-SUPPLY-1-author-publication-and-import-retirement.md)r6与97文件退休边界保持 |

最强替代解释：缺口属于fast不测真实PAL的范围、CLI/原版输入依赖或旧测试已有断言。
推翻观察：需要假造内部索引/生产强转、复活无消费者旧模块、主工程写盘或新产品裁决才能测，
该组停止并记blocked/不可合法构造，不按覆盖数字硬补。第二阶段先读READ-FIRST铁律10/11。

## 十里程碑（每域六轴，共60工作组）

| 批 | 领域及先读源 |
|---|---|
| O01 | migrate门优先：pal-current-publication、pal-assets、migration-transaction；statement/line缺口先核公开路径 |
| O02 | 临时工程三方merge/plan、ownership、删除/新增/冲突及输入不可变 |
| O03 | journal恢复/manifest最后提交、TOCTOU、符号链接/路径、partial failure；只在mkdtemp |
| O04 | catalog/资源hash、bake-indexed-rgba、PNG/RLE边界与供应IO；不写真实资产 |
| O05 | 静态角色/商店/地图/窄物品消息、sprite registry/alias显式引用；不翻译剧情 |
| O06 | content项目/scene/map/asset引用、诊断路径与混合错误优先级 |
| O07 | author/runtime script、嵌套分支/脚本库与当前单版本guard；不改schema |
| O08 | actor/enemy/team/skill/item/poison字段、跨引用与生命周期guard残余 |
| O09 | locale/rich-text/frame-sequence/sprite/stamp/tileset公开数据合同 |
| O10 | shared输入/资源/排序小边界及CLI临时工程入口残余；全账去重与门禁 |

每域六轴：正常输入/结果；边界拒绝与精确诊断；字段维护权/引用不丢；失败资源释放；
重放幂等与输入不变；caller组合/先后顺序。没有相应异步/释放合同就记N/A，不造假能力。
每批约70用例目标与至少4枚有效反控。O01先交可复核门缺口证据，但不等待用户才继续后九批。
旧比率同分母下至少需142 statements、5 branches、156 lines；不是官方放行承诺。

## 写入、证据与验收

只写migrate/content/shared `src/**/*.glm-o.test.ts(x)`、各自
`src/__tests__/glm-o/**`、`docs/testing/glm-tenfold-triple/wave-O/**`。
脚本源测试置src，用公开入口/独立临时cwd；不跑主项目migrate CLI（含dry-run）。
P/Q包、旧测试、产品、配置、锁、真实PAL/存档、官方baseline、共享导航/任务卡/看板只读。

按共同协议交十批contracts账、最终定向JSON全fullName/status、40枚正/变/恢复完整日志/
执行数/退出码/业务AssertionError/三态hash/可重建patch、同源同分母覆盖对照、准确receipt。
末批串行三个Owner包全量test/typecheck、根lint完整0/0/0、docs、区间diff、verifier。
合法坏数据只进入公开unknown/IO校验拒绝合同，不强作合法运行时值。
不得改官方include/exclude/provider/baseline；Codex独立复核后才串行统一check/ratchet/protected fast。

## 当前模式推进记录

- Codex：生产库存/当前消费者/目录独占与退役边界已核，**build allowed仅测试**。
- Coding Owner：GLM O；独立分支/worktree，不与P/Q共享可写fixture。
- 原版机制或产品修复准入：未开放；发现缺陷交最小红诊断，不冻结bug或越界修复。
- 贡献者交付/独立验收：pending；done准入blocked，700合法合同不足时交证据申请调整。
- 用户产品验收N/A：纯测试；官方门由Codex，不恢复固定三签。

## 下一位GLM O提示词

```text
你是 TEST-GLM-WAVE-O-1 唯一测试Owner。任务卡 docs/ops/tasks/TEST-GLM-WAVE-O-1-supply-validation-tenfold.md，当前build allowed仅新测试。
从本轮已推送派发提交（转发消息给40位SHA）新建 codex/glm-wave-o-supply-validation-r1 与独立worktree；基点包含L/M/N。
先读AGENTS、READ-FIRST、退役卡r6、GLM自检、glm-tenfold-triple共同协议/targets/本卡，跑verify-targets。
连续十批做O01–O10，700合法未重复合同/60组/40有效反控；先补当前migrate比率门，禁止恢复旧translator。
仅写本卡O白名单，公开真实入口+typed临时工程；按协议交最终JSON、逐合同去重、正变恢复日志/hash/patch与同分母私有覆盖。
串行migrate/content/shared全包test/typecheck、根lint0/0/0、docs/diff/verifier，提交推送完整候选SHA。
产品/旧测/配置/官方baseline/真实项目/P/Q/共享文档只读；不合main、不标done。缺合法新合同或真缺陷时交证据停该组，不凑数。
```
