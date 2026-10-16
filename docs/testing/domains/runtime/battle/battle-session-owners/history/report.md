# C1 BattleSession 状态所有权候选

Status: historical
Owner: Codex（文档治理；原报告 Owner/贡献者保留于原文）
Last reviewed: 2026-10-17
Template: archive-record-v1 / 1.0.0

本页把 testing domain 历史候选报告接入 `archive-record-v1`。原候选状态、owner、source refs、测试计数、warnings、counter、未执行项和交接在 quote 中保全；历史材料不授当前 runtime、E2E、视觉或 coverage 信用。

## 历史范围

- 源文档固定于 `01bd03367050801bd2317719f498807ca2f66200`；本轮 R61 只做历史归档结构迁移。

## 原始结论

- C1 BattleSession 状态所有权候选：原始候选报告的结论、计数、失败和限制按日期范围保留，不升格为当前事实。

## 当时证据

- 原 source:line、caller、合法输入、oracle、测试结果和 paired evidence 由下方 quote 与同目录 history/evidence 保留。

## 当前有效性

historical。当前 catalog、canonical report、paired evidence 和 fresh receipt 拥有现行事实权；本次不重跑。

## 继任文档

- 当前 canonical 文档：同目录的 current report、testing catalog、task card 和 fresh evidence。
- supersedes / superseded-by：替代未分层的历史呈现；不删除原始报告。
- 若重新启用的复核条件：补齐当前 catalog identity、合法输入、business oracle、独立 review 和动态证据。

## 原文保全

固定 source revision `01bd03367050801bd2317719f498807ca2f66200`，source SHA `0fd6b29eec0783fdf4238862712392b162004d2b1b9faffb331efbb29dccc01e`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # C1 BattleSession 状态所有权候选
>
> 后续统一门与当前集成状态见[统一回执](/docs/testing/archive/legacy/ops/testing-records/architecture-continuation-integration.md)；下文为分项候选时的验证快照，
> 其中“不合 main/未跑统一门”不代表后续集成状态。
>
> Owner：Codex；基点 `099a615b`；实现 `aab78c82`、`450df20d`、`f68d4e89`、`afef3cd3`；所属
> [连续治理卡](/docs/ops/archive/tasks/done/ARCH-CONTINUATION-1-remaining-queue.md)。本候选不合 main、不运行共享全仓
> coverage 门；待原接收对话统一集成并执行 check/ratchet/strict。完整命令、计数和未证项见
> [机账](evidence.json)。
>
> ## 所有权边界
>
> - `BattleTurnReadinessGate` 独占 prepare token、阶段、原始错误、错误分类和 cancel 后迟到结果失效。快照冻结
>   `actions` Map 并深拷毒进度；会话只给“当前 token 仍可提交”和“同步进入行动”两个窄端口。无 prepare、同步
>   throw、异步 settle、资源降级和 fatal 停留的采样时点不变。
> - `BattleSettlementPresentation` 独占核定终态、结算屏列表/游标/计时。总会话仍先通过行动动画、败北 narration
>   与死亡淡出外层门；owner 保持胜利屏只构建一次、每屏 300ms、防连按、胜败无屏 1200ms，以及逃跑/
>   `enemyFled`/`terminated` 同拍完成。
> - `BattleCommandSelection` 独占菜单 phase、五类游标、待选目标、F/R/A、上一轮动作和 LIFO 提交顺序。每拍只收
>   当前队员投影、存活敌槽、技能/物品/金钱与三个窄提交端口；不接收 `BattleState` 或 `BattleSession`。core
>   `pendingActions` 仍是正式动作 owner，脚本自动战斗仍由会话/core 协调。
> - `BattleActionPresentationScheduler` 独占 240ms 行动节拍、`AnimPlayer` 与 scripted 标志。`start()` 仍同步
>   `tick(0)` 派发首帧；script consume 清 player+scripted，普通/终态 playback 只清 player，未把三种语义错误
>   合并。会话继续拥有 `stepBattle`、timeline 构建、hook/choreography 政策、视觉落地和 render。
> - `battle-session.ts` 3022→2593 行；四 owner 分别 129/80/468/54 行。没有把整个 runtime context 交给新类，
>   没有复制已有正式状态 owner，也没有把大 render 函数平移成伪边界。
>
> ## 回归、反控与隔离功能核验
>
> - 四 owner 新增 35 项；C1 定向/相邻 11 文件 124 项、Reforge 182 文件 1682 项、TypeScript、候选 Biome 与
>   production build 均通过。build 仅保留既有大 chunk 提示。
> - [十一针反控](/docs/testing/domains/runtime/battle/tools/battle-session-owners-mutants.mjs)覆盖同步进入、迟到失效、fatal 分类、300ms、terminated 同拍、
>   LIFO、跨轮快捷键、重复动作修复、240ms、首帧采样和 script 清理。control 35/35；11 个坏实现全部由指定
>   候选测试的单一 `AssertionError` 检出。工具要求精确 absolute test/fullName、唯一 loader marker、exit 1、
>   无 timeout/环境异常且产品 hash 不变；判据 1 正/9 反自测。最终临时机账：
>   `/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/type-pal-battle-session-owners-mutants-TTmPVg/summary.json`。
> - Codex 在 6057、`VITE_PROJECT_ID=pal` 的隔离编辑器启动“三人成型”独立试打。新窗口明确声明不读取或写入
>   正常游戏存档、不运行场景战后剧情；实际战场/三人/三敌画面显示，空格/回车令命令和目标指示同步变化。
>   没有修改方案字段或保存；临时页面与服务均已关闭。控制台只见 in-app browser 的 Electron sandbox bootstrap
>   错误，页面未显示应用错误。本次不把最小交互冒称全战斗结算或剧情视觉验收。
>
> ## 保持项与未证项
>
> content20/SAVE8、战斗公式、玩法、奖励/写回、UI 文案/布局、资产约定和终态协议零改；没有兼容 fallback、
> 旧版本分支或生成资产手改。本批是所有权重构，没有夹带真 bug 修复。
>
> 未运行全仓 check、官方 coverage ratchet、受保护 strict、full/Q1/Q2 或远端 CI，未更新官方 coverage 基线，
> 未执行正常存档持久化。隔离功能只证明现有 PAL 预制方案能启动、渲染并接收命令/目标输入；完整胜败/逃跑、
> 资源故障和剧情观感分别由现行回归、反控与后续集中 E2E 覆盖。C1 只在候选树四 owner 边界齐，须由原接收
> 对话完成统一门并合 main 后才能正式标完成。
>
<!-- original-source-quote:end -->
