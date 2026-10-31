# pre-94 独立审计：证据簿记返工

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: audit-report-v1 / 1.0.0

## 审计问题

pre-94 完整独立审计遗留六项证据簿记问题:42 SHA/行数混代、battle.c 短 SHA、49/51 README 行数、55 缺 boundary、3j pause caller 归属、3v 逃跑决策锚;另发现两处 EOF 超卖。本批只做簿记/caller 修正,不改产品/测试/规则/基线,0 新增关闭。原时点 Status 为 review;Codex 单 Agent,自身修正与机器核对,不冒充第三方。Date=2026-10-18,Base=770f9168e…,Branch=codex/code-quality-3y;父卡 [QUALITY-PRE94-RETROSPECTIVE-1.md](../../../tasks/QUALITY-PRE94-RETROSPECTIVE-1.md)。三机制先红后修已在 770f9168e 推送,十项产品注释与两 UI 差异另列。

## 范围与证据

逐项结果:其一,42 SHA/行数混代——同一已记录 SHA 的 dialog-box 为 961 行、glm 测试为 96 行,修掉 958/84;只纠正与字节对应的计数,不重签产品/测试。其二,battle.c 短 SHA——实际 5 份均 63 位且等于当前 64 位 SHA 前缀,补末位 f(3m positions、3l settlement、3k dither、3l sprites、3l primitives);其余 source 条目不批量刷新。其三,49/51 README 行数——49 为 390/95/405/316,51 为 70/83/76/177,与原 boundary 同 SHA 一致;原 native 测试、环境诊断、partial 结论保留。其四,55 缺 boundary——新建后补清单,实际全文补读 448 行实现、89/153 行两专测、33 行 menu-mode 和 32 行 menu-stack,caller 单列;基点为 770,不冒充 f544 当时原件(见 [read-boundaries.json](../55-draw-menu/read-boundaries.json))。其五,3j pause caller——F8→setupSpeedrunHotkeys→toggleSpeedrunPause;面板计时器页不调 pause;不认领整 tools-panel 语义。其六,3v 逃跑决策锚——当前 game-mechanics:933-945,绑定 770 和源 SHA;931-943 是新增 0x66 进展前的范围,原 808-855 是错节,不改变机制或历史用户裁决。另两处 EOF 超卖:3m positions 的 battle-state.test 范围 210-390 超过实际 383 行;旧入口抽查 battle.c:1810-1865 超过实际 1858 行;尾段实际重读后改为 210-383、1810-1858,不将旧 36 结构/8 全文抽查升为当前 83 卡成果。[corrections.json](corrections.json) 列出修改目标、旧附件和 SHA/范围;既有文件修改前的完整字节作为本目录 *.before.gz 保留;原独立 worktree 未提交时消失,已在原路径恢复同一 3y 分支;附件从 Git 770 的精确原字节恢复,验证逐一比较相等,不是从摘要重建;未提交 metadata 由保留的 producer 脚本重建,不声称保住了首次未提交执行日志;55 是新产生的后补记录,originalRecovered=false。

## 发现

verify.py.gz、verification.json、verification.raw.gz 只验证指定修正字段、来源 SHA/行数/EOF、五短 SHA 和附件可逆性,不验证未读产品、测试判别力或 SDL 广域语义;生产/测试文件本批字节均未改变,没有新增低信息单测。实际文档 consumer、lint-zero、ledger、diff 见 gates.json 及各自原始 gzip:docs 五 consumer PASS(复用同一窗口已通过的 125 文档工具测试,代码/测试/配置/命令入口未变,没有把本批称作重新执行完整 pnpm check:docs);纯证据修正的定向验证就是机器 consumer/原件核对;产品和相邻包测试、typecheck 本批 N/A。

## 结论

0 新增 closed:3314 tracked/284 closed/55 review/2975 pending;83 卡 50 partial/33 pending/0 accept。十项注释、formulas 表达式风险、两 UI 差异继续 pending;全仓 check、官方 ratchet、protected fast 留大任务收尾,未合 main。

## 整改与复核

保留事项:53-wave-gates 完整 raw 和精确历史 act/环境计数仍缺,继续 rework;执行片段不是完整原件,C10 的 624/243 不能冒充该波次计数;六退役的真实指令来源与 Codex 执行责任、两 SDL 锚界见既有勘误 [README.md](../53-wave-gates/receipt-audit/README.md)。未重跑任何命令;历史结论保持原时点;候选待 Owner 非作者接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 3676B / SHA-256 9bf789a24d689630603a67235f7383be02445b26d097a72733f38bd3ed3d01f7；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# pre-94 独立审计：证据簿记返工

Status: review
Owner: Codex（单 Agent；自身修正与机器核对，不冒充第三方）
Date: 2026-10-18
Base: `770f9168e3422aea1d98bac2a3bd447a1c6f2216`
Branch: `codex/code-quality-3y`

父卡：[QUALITY-PRE94-RETROSPECTIVE-1](../../../tasks/QUALITY-PRE94-RETROSPECTIVE-1.md)。本批处理完整独立审计的剩余六项簿记；三机制先红后修已在770f9168e推送，十项产品注释与两UI差异另列。

## 逐项结果

| 项 | 实际修正 | 信用边界 |
|---|---|---|
| 42 SHA/行数混代 | 同一已记录SHA的dialog-box为961行、glm测试为96行，修掉958/84 | 只纠正与字节对应的计数，不重签产品/测试 |
| battle.c短SHA | 实际5份均63位且等于当前64位SHA前缀；补末位f | 3m positions、3l settlement、3k dither、3l sprites、3l primitives；其余source条目不批量刷新 |
| 49/51 README行数 | 49为390/95/405/316；51为70/83/76/177，与原boundary同SHA一致 | 原native测试、环境诊断、partial结论保留 |
| 55缺boundary | 新建[当前后补清单](../55-draw-menu/read-boundaries.json) | 实际全文补读448行实现、89/153行两专测、33行menu-mode和32行menu-stack，caller单列；基点为770，不冒充f544当时原件 |
| 3j pause caller | F8→setupSpeedrunHotkeys→toggleSpeedrunPause；面板计时器页不调pause | speedrun/index全文、面板imports/计时器操作/快捷键行已核；不认领整tools-panel语义 |
| 3v逃跑决策锚 | 当前game-mechanics:933–945，绑定770和源SHA | 931–943是新增0x66进展前的范围；原808–855是错节，不改变机制或历史用户裁决 |

另发现两处EOF超卖：3m positions的battle-state.test范围210–390超过实际383行；旧入口抽查snapshot的battle.c:1810–1865超过实际1858行。尾段实际重读后改为210–383、1810–1858，不将旧36结构/8全文抽查升为当前83卡成果。

## 原件、恢复与验证

[corrections.json](corrections.json)列出修改目标、旧附件和SHA/范围。既有文件修改前的完整字节作为本目录`*.before.gz`保留；原独立worktree在本批未提交时消失，已在原路径恢复同一3y分支。附件从Git770的精确原字节恢复，验证逐一比较相等，不是从摘要重建。未提交metadata由保留的producer脚本重建，不声称保住了首次未提交执行日志。55是新产生的后补记录，originalRecovered=false。

`verify.py.gz`、`verification.json`、`verification.raw.gz`只验证指定修正字段、来源SHA/行数/EOF、五短SHA和附件可逆性，不验证未读产品、测试判别力或SDL广域语义。生产/测试文件本批字节均未改变，没有新增低信息单测。

实际文档consumer、lint-zero、ledger、diff见`gates.json`及各自原始gzip。沿用同一窗口已通过的125文档工具测试（代码/测试/配置/命令入口未变），没有把本批称作重新执行完整pnpm check:docs。纯证据修正的定向验证就是机器consumer/原件核对；产品和相邻包测试、typecheck本批N/A，未改TS/产品合同。

## 保留事项

53-wave-gates完整raw和精确历史act/环境计数仍缺，继续rework；执行片段不是完整原件，C10的624/243不能冒充该波次计数。六退役的真实指令来源与Codex执行责任、两SDL锚界见[既有勘误](../53-wave-gates/receipt-audit/README.md)。

0新增closed：3314 tracked / 284 closed / 55 review / 2975 pending；83卡50partial/33pending/0accept。十项注释、formulas表达式风险、两UI差异继续pending；全仓check、官方ratchet、protected fast留大任务收尾，未合main。
```
<!-- incremental-original-source:end -->
