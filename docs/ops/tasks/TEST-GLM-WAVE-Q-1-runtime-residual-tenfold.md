# TEST-GLM-WAVE-Q-1 — 两阶段runtime与解码残余合同十倍测试包

Status: build
Phase: mixed（Reforge phase2；game/pal-extract phase1，严格分段）
Capability: runtime-residual / test-coverage
Coding Owner: GLM Q（仅新测试与专属证据）
Reviewer: Codex（独立验收、集成和正式结算）
Visual Verification Timing: dev-functional（仅非剧情菜单/有限trial）
Branch: `codex/glm-wave-q-runtime-residual-r1`（新独立worktree）

## 目标、冻结与停线

目标 **700合法未重复用例、50合同工作组、40有效反控、10条实际非剧情功能流程**。
[共同协议](../../testing/glm-tenfold-triple/README.md)及
[冻结表](../../testing/glm-tenfold-triple/targets.json)为准：Reforge149+game136+pal-extract38=
323源/SHA256，6136未命中臂仅是池。冻结 `3ac9a2e2f6aba8a5cc97640c18fef8549d199380`。
派发含N53例，以及F–K和旧runtime测试，逐fullName/断言去重，不重跑原卡交付。

不启动PAL001/002剧情、改checkpoint、save/NPC/移动碰撞语义或接管他人E2E窗口。
main.ts大量剧情分支必须记out-of-scope；不能给全局状态开后门/快捷跳关刷覆盖。
GLM对机制新真值无决策权；需要新增原版公式/opcode/碰撞解释时先交primary证据，
由Codex补四向真值矩阵后才开放该子组。其它已核公开生命周期/IO合同可连续实施。

## 前提真值门与上下文

工程前提：两阶段现行公开runtime/资产解码入口可在合法自包含输入上观察最终结果与释放；
测试证据增强不改变玩法、产品或资产格式。不能用第二阶段自由架构论替第一阶段改行为。

| 维度 | 锚点与边界 |
|---|---|
| primary | phase1遵循CLAUDE忠实纪律、对应reference/sdlpal/真实提取字节；未核机制是停线项，不能从源码推断原版 |
| 一阶段 | 既有game/mechanics与相邻测试是去重和证据索引，不把可能bug固化为原版行为；pal-extract解码用合法小字节/roundtrip |
| 二阶段 | `reforge/project-loader.ts:324`公开加载；`script-runner.ts:220`evalCondition；N已核公开Canvas/菜单/launch边界 |
| 目标 | 仅公开IO/生命周期/已证当前合同补测；新机制、剧情/移动真值、产品修复均未授权 |

最强替代解释：缺口是完整剧情路线、真实PAL资源、宿主限制、已证旧合同或产品缺陷。
推翻观察：没有合法调用方、靠unsafe cast/私有字段/timeout/mock核心才绿，停止该组并登记。
先读CLAUDE、phase2 READ-FIRST、game-mechanics/engineering-notes相关段、harvest相应领域，
两阶段分批记录primary/caller锚点；Q不新建一份彼此混用的“双引擎真值”。

## 十里程碑（每域五轴，共50工作组）

| 批 | 范围 |
|---|---|
| Q01 | Reforge非剧情boot/menu/gallery/trial公开残余，main剧情缺口明确排除、N排重 |
| Q02 | project loader/manifest/catalog/map/image/sprite缓存、哈希/缺失/过期/释放 |
| Q03 | bgm/midi/sfx/video浏览器IO与取消重试，真实外部边界而非mock调度核心 |
| Q04 | Reforge script-host/runner/event-lifecycle公开请求与最终提交；不走PAL路线或改语义 |
| Q05 | Reforge有限battle trial/session/assets/UI/animation资源归属和终结，不裁决新战斗数值 |
| Q06 | game输入/menu/status/inventory/save宿主边界，当前版本与相邻已核事实；不跑真实存档 |
| Q07 | game已证事件/opcode生命周期与错误/取消边界；新公式/移动真值停线待核 |
| Q08 | game战斗已证状态/回调/呈现/资源释放；原版机制争议交Codex，不冻bug |
| Q09 | game壳层/音频/视频/计时/隐私选择与dev工具纯输入边界；不接真实用户服务 |
| Q10 | pal-extract当前解码/recompile/slice/CLI小输入、确定性/故障/资源释放；整账门禁 |

每域五轴：正常有限流程；边界守卫；失败恢复；乱序/取消/资源归属；最终状态/重放不变。
非异步函数没有取消轴就记N/A，不假造能力。每批约70例/至少4有效反控，十批连续推进。
十条浏览器流程严格非剧情：菜单选中/取消、空档返回、合法小trial配置失败恢复/退出资源、
媒体autoplay/取消等公开功能；真实相位差分与前后截图hash/console，不能挂__rfWorld跳开局。

## 写入、验证与收口

仅Reforge/game/pal-extract `src/**/*.glm-q.test.ts(x)`、各自 `src/__tests__/glm-q/**`与
`docs/testing/glm-tenfold-triple/wave-Q/**`可写。复用公共fixture只读；O/P包/产品/旧测/
共享配置/依赖/官方baseline/原版资产/PAL工程/存档/E2E文档/任务卡只读。
所有CLI/extract只用mkdtemp小输入，不写根data/raw/extracted或运行主工程生成。

按共同协议交700最终fullName JSON、逐合同排重、40枚原变恢复完整反控/业务AssertionError/
执行数/三态hash/patch、十条实际非剧情浏览器证据、同源同分母私有覆盖、receipt/未证/缺陷。
三个Owner包末批串行test/typecheck、根lint完整0/0/0、docs、区间diff、verifier；
官方ratchet/protected fast与main集成仅Codex。若无真实2D/资产宿主，诚实blocked，
不能将测试宿主透明像素限制写成产品unreachable。

## 当前模式推进记录

- Codex：包目录独占、冻结库存与N纳入派发已核，**build allowed仅上述测试**。
- GLM Q唯一Owner；实现文件无人获准修改；阶段真值/产品取舍未定的组不在build授权内。
- 贡献者交付/独立验收pending；done blocked，700不足交可复核排重/可达性账申请调整。
- 纯测试用户产品验收N/A；视觉由Codex复核；不恢复固定三签。

## 下一位GLM Q提示词

```text
你是 TEST-GLM-WAVE-Q-1 唯一测试Owner。从本轮派发40位SHA新建 codex/glm-wave-q-runtime-residual-r1 与独立worktree。
先读AGENTS、CLAUDE、READ-FIRST、本卡、相关mechanics/engineering/harvest、GLM自检、glm-tenfold-triple协议/targets和N及旧断言，跑verifier。
连续十批Q01–Q10：700合法未重复合同/50组/40有效反控/10条真实非剧情菜单或有限trial功能流程。
Reforge与game/pal-extract阶段分开；新原版机制/移动碰撞真值先停线交primary证据，不固化产品bug或启动PAL001/002。
仅本卡Q新测试/专属fixture/证据可写，交最终fullName JSON、排重账、原变恢复日志/hash/patch、浏览器相位/截图/console和私有同分母覆盖。
三个Owner包串行全包test/typecheck、根lint0/0/0、docs/diff/verifier后推送完整候选SHA；产品/旧测/配置/baseline/O/P/真实工程/E2E只读，不合main、不标done。
```
