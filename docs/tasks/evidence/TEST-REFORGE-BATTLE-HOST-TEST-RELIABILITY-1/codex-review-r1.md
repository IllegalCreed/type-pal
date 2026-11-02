# 战斗宿主终局测试独立验收

Status: historical
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-20
Template: audit-report-v1 / 1.0.0

本页是 Codex 2026-10-07 对 TEST-REFORGE-BATTLE-HOST-TEST-RELIABILITY-1 的独立验收：候选 `b28ba0d81`、测试提交 `9e902846d`；Codex 只读固定候选并在独占副本复跑，贡献者树未写。

## 审计问题

- 代码与 R1–R8 合同的接受裁定；BF-09 拆分与四条关闭路径真实性；CI 红根因归因边界（U-1 调度放大机制）。

## 范围与证据

- 4/4 产品冻结 hash 一致；白名单外零改动；独立重跑回执 hash 6d18cea7…7b61、原候选回执 hash 7b49b63c…d73c（不同时间/隔离路径真实运行不混称）；定向 instrumentation 三文件 31/31；Reforge typecheck 0。

## 发现

- BF-08/10 旧业务 oracle 保留，BF-09 两输入拆开；默认期限 vi.waitFor 替代轮数预算合理，CI 红已位于准备期，调度放大机制仍是 U-1 不把本地对照推成每个替代根因已穷尽。
- 独立重跑 formal：22 判据自测、3 真实污染探针、N1-N5 单目标红与恢复/重放通过；N6 四条 harness 恢复合同家族红不计恰一业务针；N3 跨层四红仅级联披露。
- 探针六个相对路径漏 counterproof 前缀，Codex 集成时仅修路径及 runner 生成规则，不重写业务原件。

## 结论

- 代码与 R1–R8 合同接受，本地串行集成门全部通过（全仓 check 退出 0 七包全过 Reforge8786/Editor4906、根 lint 3607 文件 0/0/0、官方 ratchet 与保护 fast 退出 0 指标完全相同、并集分支 50113/60209=83.23%），本卡 done；不是 GitHub CI 通过声明。仅 A/C 合入、B counter 不夹带。

## 整改与复核

- 暂存区全量 diff 检查补发现五份非反控日志表格尾随空格/EOF 空行，只移除排版空白前后 SHA 逐份登记；另修 identity 八个缺后缀/缺失路径（基点单文件 3/3 无独立原件改为相邻 26/26 内三条旧身份，不虚构原件）；均为 Codex 证据整理不替换业务复跑。
- 新 CI 与主树小修：0a9cb833 CI 文档/typecheck/lint 过、A 终局 8/8，整门因旧 main.frame-animation-owner.test.ts:216 一例红失败——Codex 维护仅该旧测试三个 20 轮 IO 等待改 vi.waitFor+真实精确首帧条件（未改产品/扩 timeout/增例/降 oracle），正常旧 8/8、隔离真读 IO 延迟 80ms 旧 7/8（恰同 []→[17,29] 红）、修后 8/8、主树相邻 31/31。

## 历史范围

- 2026-10-07 Codex 独立验收记录；固定源 revision abcaee1db6c8…。

## 原始结论

- R1-R8 合同接受本卡 done；N6 家族红/N3 级联披露/U-1 边界如实分列。

## 当时证据

- 复跑细节、hash 与集成门在 quote 保全。

## 当前有效性

historical。验收按候选时点；CI 另核。

## 继任文档

当前结论归任务卡完成记录。

## 原文保全

固定 source revision `abcaee1db6c80a04048d4a60636fdd8211c9fce2`，source SHA `eaf86522e6bfaac793398167e82079ac0e53fce28438595dd7db114c3bd29b78`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与固定原源逐字节相等（不 trim、不替换）。
<!-- original-source-quote:start -->
> # 战斗宿主终局测试独立验收
>
> 候选：`b28ba0d81b21f6e5e17599b4b2efd8e6ed40d8b2`；测试提交：`9e902846df6a850d3fde9c32cbfd56277a0c981a`。Codex于2026-10-07只读固定候选并在独占副本复跑；贡献者树未写。
>
> 结论：代码与R1–R8合同接受，本地串行集成门全部通过，本卡done；不是GitHub CI通过声明。
>
> - 4/4产品冻结hash一致；白名单外零改动。BF-08/10旧业务oracle保留，BF-09两输入拆开；四条关闭路径实际消费start、释放持定IO并恢复宿主。
> - 默认期限vi.waitFor替代轮数预算合理。CI红已位于准备期；调度放大机制仍是U-1，不把本地对照推成每个替代根因均已穷尽。
> - 独立重跑formal：22判据自测、3真实污染探针、N1–N5单目标红与恢复/重放通过。N6是四条harness恢复合同的家族红，不计成恰一业务针；N3跨层四红仅作级联披露。
> - 原作者48个raw/JSON引用的字节hash、六个重建mutant与恢复hash复核一致。探针的六个相对路径漏了counterproof前缀，Codex集成时仅修路径及runner生成规则；不重写业务原件。
> - 定向instrumentation三文件31/31；Reforge typecheck退出0、零诊断。全仓check、official ratchet、受保护fast以最终集成记录为准。
>
> 独立重跑回执hash为`6d18cea7dd81f7d81876ca8f66beb39dfaf69bc577e93f0c4785403cd1c79b61`；原候选回执hash为`7b49b63c2e43ea31066d5d710a06e0df063752851c2d83c3aac2cfe33639d73c`。两者为不同时间/隔离路径的真实运行，不混称同一字节。
>
> ## 串行集成收口
>
> 全仓check退出0：七包全部test/typecheck通过（其中Reforge8786、Editor4906）；根lint完整3607文件0/0/0，docs/格式/diff通过。随后官方ratchet、以派发d84b3db236c35d2f7e2671741f4320b904f5c58c为保护基点的fast均退出0，指标完全相同。主树并集分支50113/60209=83.23%，726个生产源，分母与冻结未缩；包含此前main尚未结算的已接收合同，不能把总增益全归本卡。详见[唯一集成门回执](codex-integration-gates.json)。仅A/C合入，B counter不夹带；远端新CI状态另核。
>
> 暂存区全量diff检查补发现五份非反控日志的表格尾随空格/EOF空行；只移除这些排版空白，完整诊断与有效内容不删，前后SHA逐份登记于集成回执，原始字节保留在作者固定提交。48份反控raw/JSON原件未改变。另修identity八个缺后缀/缺失路径：基点单文件3/3只有作者自述、无独立原件，改为有原件的相邻26/26内三条旧身份通过，不虚构单文件原件。上述均为Codex证据整理，不替换业务复跑。
>
> ## 新CI与主树小修（不扩大GLM卡）
>
> [0a9cb833的CI](https://github.com/IllegalCreed/type-pal/actions/runs/37600496568)文档、typecheck/lint通过，A终局8/8通过；整门仍因旧main.frame-animation-owner.test.ts:216一例红而失败。Codex维护仅该旧测试的三个20轮IO等待：原生解压没有完成即开始替代请求，未进入声明的首帧淡入相位；使用默认vi.waitFor+真实精确首帧条件，未改产品、扩timeout、增例或降低oracle。正常旧8/8、隔离真读IO延迟80ms旧7/8（恰同[]→[17,29]红）、同身份修后8/8、主树相邻31/31，完整Reforge8786与typecheck全过；生产覆盖9909/12166与已接收baseline完全一致。完整原件/hash见[帧动画IO同步对照](ci-frame-animation-io-sync.json)。这是Codex主树维护，不重开A/C，不让B越界修；新 hosted CI结果另核。
>
<!-- original-source-quote:end -->
