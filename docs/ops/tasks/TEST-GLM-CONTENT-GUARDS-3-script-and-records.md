# TEST-GLM-CONTENT-GUARDS-3 — 八组同步脚本与记录守卫补测

Status: rework
Owner: GLM
Reviewer / Integration Owner: Codex
Phase: phase2
Visual Verification Timing: N/A（不测视觉/异步宿主，不声明玩法验证）
Production Base: `8add8c66`
Branch: `codex/glm-content-guards-wave3`

## 准入与真值

2026-09-26 Codex核定premise verified / build allowed。用户要求持续覆盖率建设；
上批叶守卫已接收，本批连续八组同步公开校验，不重领上批、不触碰产品schema。
一手证据：`packages/content/src/validate.ts:343/428/560/711/1189/1330`实际加载校验；
`author-script.ts:128`→`runtime-script.ts:213`→`author-script-core.ts:932`现行作者流；
`script.ts:458`递归命令校验；`enemy-script.ts:248/313/366`敌hook/AI/败北指令守卫。
原版/第一阶段机制N/A（仅当前模型校验合同，不决定转换或战斗行为）。
before→after只有测试增量。最强替代解释是旧用例已覆盖或零命中臂在现行调用域不可达；必须先查旧测试、
不能为了LCOV而暴露私有函数、扩大合法输入或假定不存在的字段约束。

## 八组连续实施

所有新测试位于`packages/content/src/`，后缀统一`.guard-residual.test.ts`。

| 组 | 新文件前缀 | 入口与优先合同 |
|---|---|---|
| G1 | author-flow | checkAuthorScriptFlow/checkRuntimeScriptFlow：stage/machine标识、next/cursorHandoff、场景entry的当前允许域；完整合法流先过guard |
| G2 | author-state | checkWorldScriptState：实际公开入口的游标/slot/计数结构，空值与非空合法对照；不测试运行时读档政策 |
| G3 | author-command | checkAuthorCommands/checkRuntimeCommands：命令级引用、扩展回调、嵌套条件、forbidLoadScene传递；不重做上一波条件叶矩阵 |
| G4 | script-command | checkCommands/checkStages/checkEntityPages：当前投影/迁移内存调用域的守卫分支；先证明caller，不复活磁盘旧格式 |
| G5 | enemy-hook | checkEnemyHookFlow/checkEnemyAi/checkEnemyOnDefeatedCommands：随机/结果边、继续图、terminal闭包与options；先去重既有wave2 |
| G6 | record-actors | validateActors：人物/非战斗人物、可选形象/装备/能力合法组合与单字段拒绝 |
| G7 | record-skills-poisons | validateSkills/validatePoisons：效果、范围、动画和可选字段的现行组合；不能推导新玩法 |
| G8 | record-items | validateItems/validateAuthorItemCore/checkThrowSpec：当前作者/运行字段界限、装备/使用/投掷合法组合和精确路径 |

目标四生产模块的冻结未命中分支为author-script-core105、script102、enemy-script23、validate197，
合427；只是选题池，不承诺全部可达或全部应新增测试。公共支路并集只能记一次。
先读对应旧`*.test.ts`（尤其wave2、boundaries、current-characterization、GLM叶守卫与Codex资源批），
逐组列精确旧标题/本次差异。相同输入换名字不算增量；可登记existing-proof并减少新增文件。

## 测试纪律与白名单

- 最多上述八新测试；可新增`__tests__/glm-guard-residual-fixtures.ts`。
- 专属`docs/testing/glm-content-guards-wave3/**`（README、回执、机账、负控工具），本卡只追加本人交付块。
- 禁止修改生产、旧测试、资产、配置/超时/排除、官方baseline、共享README/看板、其它任务文件。
- 合法fixture须typed且先过正在测试的真实公开guard，拒绝从同型合法fixture只破一轴；不以as unknown as伪装合法态。
- 快照必须调用前structuredClone，调用后立即比较**实际同一入参**；精确错误路径或完整结果。选项回调要有真实调用见证。
- 当前未知/历史退役字段若为负例须先注明其合同；不默认给cue行数、字符串长度等增加不存在的上限。
- 6–8代表单点负控，复用上批已验收判据：目标file/fullName唯一失败、恰exit1、候选AssertionError、唯一突变命中、拒timeout/混错/exit2/null、source hash不变。
- 每个新拒绝针配同输入合法正控。不可达臂如实分类，不要求100%，不写平行实现或mock核心。
- 整包一次定向/相邻/全content/TC/改动Biome/docs/diff，`env -u NODE_COMPILE_CACHE`。
  不跑全仓check/ratchet/strict，不逐组跑coverage，不操作用户浏览器。需要增量对照时只整包一次官方fast testSelection、输出独占/tmp。
- 无争议时八组连续做完再交，不逐组等回复。遇产品疑似缺陷单列最小诊断并继续无关组，不篡改预期凑绿。
- 最终数从新鲜Vitest JSON产生；交付每组新增/已有/未达证据及完整候选SHA。Codex独立验收，不代签不标done不合main。

## 隔离与交付

旧checkout `/Users/zhangxu/illegal/type-pal-glm-content-guards-wave2` 于本卡准入时干净，
旧分支09c8ccba已完全进入main、零独有提交。接手重新核验后可原目录复用，
从含本卡的最新origin/main新建`codex/glm-content-guards-wave3`；目录名不用改。
若脏或正在使用，保留现场交Codex，不能stash/强制覆盖。不得checkout主工作树。
冻结生产以8add8c66为准；若新main生产已进架构改动，记录差异并只冻结这四目标，不倒退主线。

## 下一位GLM提示词

### 2026-09-26 Codex 返工复核 `16e647a1`

仍 **counter**，仅R1/R2残项与回执勘误，见[直接反证与可复制提示词](../../testing/guard-wave3-r2-review.md)。
原八个输入合法化与initial污染反例已闭合，不重开；111对照/八针/全content1133/TC/Biome/docs通过。
但“合法gate也拒绝”39/39仍绿、“未知敌转移拒绝时污染输入”7/7仍绿，本席各一独立oracle证实漏检。
未合候选、不计官方统计、不标done。返工只补同型正控、全部拒绝调用快照和真实机账，不扩覆盖池。

### 2026-09-26 Codex 独立接收 a00f12c2

**counter / R1–R3窄返工**，见[直接反证与返工提示](../../testing/guard-wave3-review.md)。
本席复跑110项对照、八针、全content1132项、TC/Biome；白名单及生产零漂移通过。
但8个“修正所测字段后仍非法”的真实实参反证、initial拒绝污染输入候选9/9仍绿，证明正控与快照
合同未闭合。只返上述同型构造/逐次输入保真与回执勘误，不改候选语义、不计入覆盖、不开放done。
原准入提示词保留，返工以接收报告为准；无需其它AI签字。

```text
接手TEST-GLM-CONTENT-GUARDS-3，已build allowed。先读AGENTS/CLAUDE/READ-FIRST、本卡及
docs/testing/coverage-plus5/README.md。核clean并fetch；复用已合入的type-pal-glm-content-guards-wave2
目录，从含本卡origin/main新建codex/glm-content-guards-wave3，不碰主工作树。
按G1–G8连续补同步公开guard的真实剩余合同，先查旧标题去重，合法fixture先过正式guard，
单轴负例+同输入正控、实际入参深快照、精确结果；仅八新测试/可选fixture/专属证据/本卡交付块。
不要改产品、旧测试、配置、baseline或其它卡；不造缺失政策，不追用例数，6–8代表负控。
整包定向/相邻/全content/TC/Biome/docs，统计从最终JSON生成；不跑全仓门和共享coverage。
提交推送实际SHA和回执。作者自验不是独立证明，Codex接收后统一门禁合并；不标done、不合main。
```
