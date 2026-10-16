# E1 迁移阶段所有权候选

Status: historical
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-17
Template: archive-record-v1 / 1.0.0

本页把 testing archive 材料接入 archive-record-v1。原任务日期、状态、合同、测试数字、失败、counter、机器字段、链接和未执行项在 quote 中保全；本次不授 runtime/E2E/视觉/coverage 信用。

## 历史范围

- 源 revision e0ddc80b28ab45394aa560855d51de65ecd568e1；本轮 R80。此文件属于 testing archive 历史层，不能单独授权当前测试或发布。

## 原始结论

- E1 迁移阶段所有权候选：原始正文完整保留于下方 quote；本轮只改变文档封套，不改变原始结论。

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

固定 source revision `e0ddc80b28ab45394aa560855d51de65ecd568e1`，source SHA `ad635c1b9ed13dc030b68bc319e2dd45293f1acdd767212219497a7b14020959`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # E1 迁移阶段所有权候选
>
> 后续统一门与当前集成状态见[统一回执](../../ops/testing-records/architecture-continuation-integration.md)；下文为分项候选时的验证快照，
> 其中“不合 main/未跑统一门”不代表后续集成状态。
>
> Owner：Codex；基点 `9013cf86`（分支共同基点 `origin/main@9fe9ea11`）；实现头 `0589af91`；所属
> [连续治理卡](../../../../../ops/archive/tasks/done/ARCH-CONTINUATION-1-remaining-queue.md)。本候选不合 main、不运行共享全仓
> coverage 门；待原接收对话同步当前 main 后统一集成。结构化计数与未证项见
> [机账](migration-phase-owners-refactor-evidence.json)。
>
> ## 所有权边界
>
> - `translate-event-motion.ts` 单独拥有大世界移动、队形、骑乘、相对位移、逐步动画与追逐的纯 opcode 映射。
>   输入仅有 opcode、operands、owner，输出仅有 commands、terminal、gap 或已核 no-op；不接收整个
>   `TranslateCtx`，不拥有 dialogue flush、source audit、report、registry 或 cursor。`walkBody` 继续同步处理这些
>   上下文职责，并在同一指令内消费 owner 结果。速度枚举、1-based 对象号、0/FFFF self、0xA1 detached global
>   no-op、0x6C 命令顺序和 0x4C 段终保持。
> - `scene-migration-source-plan.ts` 单独拥有场景/事件源确定排序、`setPartyPos`→`loadScene` 落点配对、
>   all.json 地址校验与缺省 label 补全、逐数组地址、实体 owner→scene 和 scene graph roots。它只接收
>   `SourceScene[]` 与只读事件 Map，并一次返回纯内存索引；不读写磁盘，不生成 canonical 文件。
>   `mapScenesStatic` 继续拥有布局注册、entry/entity 生成、translator session、patch/fold/externalize 和最终结果。
> - 现有 `SourceEventObject`/`SourceScene` 由 planner 定义，`migrate-content` 原路径继续 type re-export；这是同一当前
>   canonical 接口，不是旧版本兼容层。`migrate-content` 3314→3202 行，`translate-events` 2472→2385 行；新 owner
>   分别 174/165 行。行数只作边界证据。
>
> ## 回归、输出与反控
>
> - 移动族定向/相邻 5 文件 103 项；场景 planner 与相邻场景链 8 文件 63 项。planner 直接反例固定乱序输入、
>   正场景→shared→all→其它负源优先级、gap=4、连续 load 清 last、indexed arrival 不计正式入口、首见 label、
>   all 显式地址拒绝、地址递增、owner 与 roots。
> - Migrate 全包借主工作树 `data/extracted`、`data/baked` 与缺失 raw 顶层项的临时只读式 symlink：93 文件/
>   735 项全部通过。覆盖纯迁移重复调用 deep-equal/输入保真、当前 PAL publication replay 零写、场景/脚本输出、
>   merge/plan 幂等、transaction 恢复及 write guard；链接由 trap 全部解除，没有执行迁移 CLI 或发布写盘。
> - `origin/main` 后续前进到 `2838df42`，仅新增测试/文档与 coverage 基线、未改候选生产文件。候选临时展开其中
>   6 组 `translate-events` 测试并通过 59 项，随后逐文件清理；不把远端测试提交复制进候选。
> - [十一针反控](../../../../domains/migration/supply-and-import/tools/migration-phase-owners-mutants.mjs)固定速度、角色槽、global trail、对象身份、0x6C 顺序、
>   chase 段终、事件源优先级、gap=4、load 后释放、indexed 隔离和 all label 地址门。control 10/10、十一针
>   全检出；精确 absolute file/fullName、唯一 loader marker、恰一个 `AssertionError`、exit 1、无环境/timeout 异常，
>   四个产品文件前后 hash 不变。临时摘要：
>   `/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/type-pal-migration-phase-owners-mutants-VUk6zV/summary.json`。
> - Migrate TypeScript 与 7 个候选实现/测试/反控文件 Biome 均通过。
>
> ## 保持项与未证项
>
> 本批只有所有权重构，没有夹带迁移真 bug 修复。content20/SAVE8、source schema、角色/对象身份、opcode 行为、
> 场景布局、资产格式、生成工程、正常存档和 UI 零改；没有复制状态 owner，也没有手改生成产物或官方基线。
>
> 未运行全仓 check、官方 coverage ratchet、受保护 strict、full/Q1/Q2 或远端 CI；没有执行真实迁移发布，因此
> “写保护保真”由临时 fixture、全包回归和既有 publication replay 证明，不宣称完成一次生产写盘。没有浏览器
> 视觉核验：本批无用户可见 UI 变化，剧情观感仍归冻结后的集中 E2E。E1 只报候选边界齐；须原接收对话在当前
> main 上合并并执行统一门后才可正式完成。
>
<!-- original-source-quote:end -->
