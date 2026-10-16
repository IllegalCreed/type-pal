# E2E-001-CLOSE-1 — 开场完整对白与演出角色验证

Status: done
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-17
Template: task-card-v1 / 1.0.0

本页把已关闭 ops 任务卡接入 `task-card-v1`，并追加 `archive-record-v1` 历史边界。原始状态、日期、证据、counter、链接和未决项在 quote 中保全；历史 done 不自动授权当前 build、runtime、E2E、视觉或 coverage。

## 目标
- 保留原任务的目标、完成边界、历史结论和用户可见适用范围。

## 范围
- 当前包含：原卡声明的实现/测试/证据范围及其历史限制。
- 明确不包含：本次迁移不修改产品源码、旧测试、真实数据或历史结论。

## 前提与证据
- primary source：固定 source revision `cddbd73c682e3264e5d981ba84affab894986be4` 与原卡全文。
- 合法输入、caller、证据和 counter：按原文 quote 解释；本次不重跑原执行。
- 事实权：当前 task card、代码、consumer 和新 receipt；历史卡不单独证明当前行为。

## 验收
- 原卡历史验收、失败、blocked、rework 和未执行边界保持原样。
- 本次迁移验收：source/after SHA、quote inverse、模板章节、链接和历史 overlay 通过。
- runtime/E2E/视觉/coverage：本次均未执行，信用为 0。

## 状态与交接
- `status`: done（历史快照）；当前工作不得从 quote 中自动获得 build 授权。
- Owner/provenance：原卡保留于 quote；当前文档治理 owner 为 Codex。
- 下一步：若需重新启用，创建当前 task card，重新核 primary source、合法输入、business oracle 和独立验收。

## 历史范围
- 原始日期、版本、阶段：源文档固定于 `cddbd73c682e3264e5d981ba84affab894986be4`；本轮为 2026-10-17 R43。
- 归档原因：已关闭任务记录只作为时点事实保留，避免历史状态冒充当前事实。

## 原始结论
- `Status: done`；原始任务语义完整保留于下方 quote。

## 当时证据
- 原始命令、产物、SHA、签字、counter、链接和状态保留于 quote。

## 当前有效性
historical。do not promote historical task card to current runtime/E2E/visual/coverage acceptance
- 历史冲突/未决：需由当前 task card、consumer 和新证据重新复核。

## 继任文档
- 当前 canonical 文档：当前任务卡、当前代码/consumer 和 fresh receipt。
- supersedes / superseded-by：替代 governed-legacy 的未分层呈现；原卡内容不删除。
- 若重新启用的复核条件：合法输入重跑、业务 oracle 可证伪、独立 review 和全量静态门通过。

## 原文保全
固定源 revision `cddbd73c682e3264e5d981ba84affab894986be4`，source SHA `79bc9b7f63cacac59155cd4380302349744c5b963d7c383fb6d227f20b0e1eb9`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # E2E-001-CLOSE-1 — 开场完整对白与演出角色验证
>
> Status: done
> Owner: Codex
> Phase: ops
> Visual Verification Timing: e2e-consolidated（正常新局与真实检查点）
>
> ## 收口（2026-09-28）
>
> Codex核定001 **verify done**：候选0a8c998f，两独立引擎均正常新局、3.mp4自然结束、
> 55正文/24对白块及说话人、5个参与角色/对象、两段站定对白/离场偏序、真实导出/新页正式恢复通过。
> 各自结束/恢复的持久域及Canvas RGBA SHA256严格相同；10幅节点/终点/读回截图核查通过。
> 一阶段两项实际缺陷（翻页跳行、自动淡入终值变暗）先红后绿；新增16游戏回归，工具31项。
> 七包完整check10,207、官方ratchet与保护90d977d5的单次严格fast9,746/730生产文件串行通过，
> 全包TC及lint2,398文件error/warning/info均0；其余六包完整基线对象不变，B47,678/63,398=75.20%。
> 最终日志`/tmp/codex-001-final-{complete,check,ratchet,strict}.log`，并复制至主树`build/e2e/001-close-20260928/`。
> [执行回执与差异说明](../../../../testing/e2e/stages/001-opening/report.md)记录所有失败/更正、存档散列和证据路径。
> 母卡继续002/前十段；capture/音轨/全Q1-Q2未通过，不随本卡关闭。无下一位Agent提示词。
>
> ## 准入（2026-09-28）
>
> 用户要求001收口；Codex在90d977d5上继续既有隔离执行器，不重问001范围。
> 本卡关闭001的verify缺口：全对白实际显示、开场重要角色/道具的显隐/动作/提交位移，
> 菜单控制权、各引擎真实结束档与新上下文正式读回、清晰差异报告。002另排。
> 同引擎静态终点Canvas像素读回校验与三剧情节点截图一并验收；目视工具重复图近黑的误判已按PNG散列撤回，
> 不把它算作游戏缺陷或修改运行时的理由。原始排查过程见001说明。
> 母卡E2E-R4-1仍承担前十段；capture/音轨/宣传素材按既定“验证后另跑录制”归属，不冒充已验。
>
> ## 已证产品缺陷与真值
>
> 原版提取`events/all.json`3571–3576包含message1327–1332；001中1331和1338在一阶段实际显示记录缺失。
> sdlpal `text.c:1649-1658`四行后等键/清页，然后仍显示当前传入文本；`script.c:3463-3464`
> 只在显示返回后推进一次。该参考明确“不跳下一页首行”；未宣称已运行原版二进制。
> 一阶段`event-system.ts:2054`未消费showDialog就挂起，`:1773`确认后却无条件按非preOp推进，
> 正是TS异步化自造跳行；二阶段当前全部cue包含该两句，无此游标问题，本卡不改其内容编排。
> 目标是保留未消费showDialog，样式切换/显式清框已完成的opcode仍推进，隐式pre-op仍重入。
> 最强替代解释“只是日志遗漏/迁移缺句”已由真实tickEventSystem可见行+history双断言和双方源数据推翻。
> 已有`event-dialogue-pagination.test.ts`原红先保留复跑；补多页/换样式/显隐清框与后续副作用一次性回归。
>
> ### 像素回验追加发现（同轮准入）
>
> 新增严格像素回验拒绝game读回：形状/非黑像素数53003完全相同，但全部非黑颜色变为原色×60/64取整。
> 不是前述图像展示工具误判。`present.ts:211-217`无人等待的fade到时只清状态，未调finalize；
> `palette-fade.ts:263-280/305-317`循环最高60/64、最终补满由finalize负责，
> sdlpal `palette.c:257-259` FadeIn循环后明确VIDEO_SetPalette(palette)。
> 二阶段同引擎RGBA一致；不改变其产品。Codex核定补presentFrame的唯一收尾调用与真实present回归：
> 无人等待淡入补满，等待者仍由事件系统收尾，SceneFade仍保留63/64语义，不改存档格式或资产。
> 失败回执`both-001-2026-09-28T04-06-55-249Z`保留，禁止放宽像素门通过。
>
> ## 范围与验收
>
> 允许game事件游标窄修与dialog-box注释更正、对应回归、scripts/e2e工具/合同/只读隔离插桩、
> 任务/看板/说明/基线。不改提取数据、PAL工程、存档格式，不跳视频/剧情、不造档。
> 每角色仅状态改变/实际提交时记录，画面点用于漏钩审计；不每帧dump世界，溢出/缺角色/漏行失败。
> 对白期望来自冻结源脚本且验证真实已显示正文，不能以“请求了该cue”充数；两引擎对内容事件而非内部数值。
> 归因修复后定向/相邻/反控与有窗口双引擎完整实跑，再统一check→ratchet→保护90d977d5的strict。
> 静态诊断全零，已批准的单Owner模式，Codex独立实施验收；无下一位Agent提示词。
<!-- original-source-quote:end -->
