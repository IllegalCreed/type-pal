# Cursor地图六组独立接收与集成

Status: historical
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-17
Template: archive-record-v1 / 1.0.0

本页把 testing archive 材料接入 archive-record-v1。原任务日期、状态、合同、测试数字、失败、counter、机器字段、链接和未执行项在 quote 中保全；本次不授 runtime/E2E/视觉/coverage 信用。

## 历史范围

- 源 revision 226f8cb90880b74c82f3c39b6e09d949f2a16e7b；本轮 R77。此文件属于 testing archive 历史层，不能单独授权当前测试或发布。

## 原始结论

- Cursor地图六组独立接收与集成：原始正文完整保留于下方 quote；本轮只改变文档封套，不改变原始结论。

## 当时证据

- 原始命令、输入、caller/oracle、结果、机器字段、SHA、counter、链接和未执行项保留于 quote。

## 当前有效性

historical。历史测试结论必须带日期和 source revision，并由当前 catalog、contract、fresh receipt 重新核定。

## 继任文档

- 当前入口：对应 testing catalog/domain report、contract、paired evidence 和 fresh receipt。
- 若重新启用：补齐合法输入、真实 caller/oracle、排重、独立 review 和静态零诊断。

## 停止线

- 本页不证明 runtime、E2E、视觉、coverage 或当前产品行为；不得以 archive wrapper 替代执行回执。

## 原文保全

固定 source revision `226f8cb90880b74c82f3c39b6e09d949f2a16e7b`，source SHA `5223e979b8b055d90d6beacb60be58942dff40230bcc01a977cda192ff8a817c`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # Cursor地图六组独立接收与集成
>
> [任务卡](../../../../../ops/archive/tasks/done/TEST-CURSOR-MAP-LOGIC-2-selection-stamps.md) /
> [作者回执](../../batches/cursor-map-logic-r2/receipt.md) / [前轮残项](cursor-map-logic-r2-review.md) /
> [接收机账](cursor-map-integration-evidence.json)。
>
> 2026-09-27，Codex独立接收候选`be9a86366ae94d4dc74cca3ba5d9770ec1332b2e`，
> 集成基点`70d0ae91`。**accept / done：全部counter闭合，统一门禁首次串行通过。**
> Cursor是测试贡献者，不把作者自验当独立第三方证明。
>
> ## 最后残项已核
>
> - M4双组move/delete、M5放置、M6移动入口均先独立克隆实际plan，构造Command后及dispatch后立即比较原plan。
> - 薄fixture的applyPlanPatch保护实际patch及requiredWritableLayerIds，M3两条应用链与M5三通道应用均消费该助手。
>   没有把返回的新map/EditSession推进误判为污染，没有改产品或删既有业务断言。
> - group-command-plan-mutation候选2绿/2 AssertionError，placement-command-plan-mutation候选3绿/1 AssertionError；
>   原实现各4/4绿。对应独立oracle对照5/5、变异分别3红/2红（含候选与oracle），源/测试/fixture hash不变。
> - 原三针继续候选业务红；实际judge拒无缩进/空格/tab混错；真实blank/painted/group map与正式loader manifest通过。
> - 定向/相邻19文件117/117（29新+88既有）；editor TC0诊断；15文件Biome0error/0warning/0info/0截断。
>   作者六正控/六针+17项同判据自测本席复跑通过；docs/diff通过。不重开已接受CM2–CM4。
>
> ## 集成边界
>
> - 保留主线最新看板/任务索引/QUALITY-ZERO后的Codex见证；卡内本席历史counter与Cursor交付块并集保留。
>   解决的是四处文档/审查工具上下文冲突，没有修改候选测试语义；七个新测试/fixture文件与候选逐字一致。
> - 新增6测试+1专属fixture，29项；生产代码/旧测试/官方配置/锁文件/资产无变化。官方baseline仅由ratchet更新。
> - Gitignored原始/提取/PAL资源只在隔离检出复制供本地完整check，不执行迁移写主树、不提交二进制资源。
> - 主树两份暂停中的帧编辑WIP和临时审查工具保持；GLM返工包不合入。Codex主动+5pp扩展仍暂停。
> - 本包纯逻辑，视觉N/A；不冒充浏览器拖拽、E2E、full或Q1/Q2通过。
>
> ## 门禁与证据
>
> 统一串行：完整check → 官方ratchet → 保护70d0ae91的单次strict-fast。
> 完整check已首次通过：七包9741项/978文件（editor3048），docs37/coverage30/quality27工具回归另列，
> 七包TC与严格lint零诊断。官方ratchet与保护70d0ae91的单次strict均9249项/728生产文件通过，指标精确相等。
> 本批净增21分支/19行/27语句/5函数；生产清单、全部分母、其它六包完整baseline对象均不变。
> editor行83.14%、分支72.90%；全仓行81.45%、语句79.31%、函数78.43%、分支72.80%（46067/63283）。
> 新增测试身份恰29项，未包含GLM返工或主树帧编辑WIP。目标暂停不变，只记贡献者实际增量。
> 日志：`/tmp/codex-cursor-map-r3-{directed,tc,mutants,plan,witnesses}.log`；定向/完整Biome JSON同前缀。
> 原针证据`codex-cursor-map-review-KAofiF`、judge/fixture `codex-cursor-map-runner-fpSzen`；
> 计划针`codex-map-r2-plan-G9YYP0`，作者工具`cursor-map-logic-r2-mutants-NZ8WXO`均在本机唯一临时目录。
> 最终集成日志使用`/tmp/codex-map-intake-{check,ratchet,strict}.log`。
>
> 无下一位Agent提示词；本包不再返工，Codex已核done并统一推送、归档。远端CI/full/E2E/Q1/Q2不在本地通过声明内。
>
> 初次清理边界：Cursor后台worker的cwd仍指向贡献者目录，当时保留该worktree及本地分支，不强杀用户进程。
> Codex专用map-intake检出在门禁结束、合并推送和证据备份后可恢复归档；GLM未接收目录不动。
>
> 2026-09-27用户确认已退出Cursor。Codex复核PID82449为PPID1的孤立worker、无子进程；
> 工作树干净、无未跟踪工作、be9a8636已为main祖先，远端分支已不存在。正常TERM结束残留worker后，
> 用Git原生worktree移除（该目录非Codex托管附件）及`branch -d`清理贡献者目录/本地分支。
> 忽略项仅依赖缓存、DS_Store和指向主仓库的生成资产链接；主仓库资产未删。
> 已合代码可从main恢复；GLM/E2E工作树及主仓库WIP保持。
>
<!-- original-source-quote:end -->
