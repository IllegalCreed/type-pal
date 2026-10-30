# CODE3s 主测试合法输入、收尾与精确 oracle

Status: local technical review; whole pre94 incomplete
Owner: Codex（单 Agent）
Base: 805ae1e31f1d48fce337905d74ac270de41e8e54
Code: 8f6a8499a（测试）／124540175（类型与私有字段整理）

复用[3s全文/primary](../3s-battle-system/README.md)、[GLM29](../glm-foundation/codex-final29.json)与[对话切片](../battle-dialog-quality/README.md)，本次完整核实际差异、变化 helper/case 与真实 caller。两文件八维、输入/来源指纹和限制见 review.json；不冒称重新全文读完所有未变4251行。

- 主测统一从真实 PlayerRoles hydrate runtime、安装队伍并取真实资源。14个超出 maxHP 的输入显式修正，核心 any/unknown/残缺类型强转改为合法工厂。V1 Map用例经过真实 serialize/parse 后按当前 shell restore 接入；没有修改存档格式或 API。
- 原跨场测试实际停在首场选择阶段；补一个完成断言即单红。现在三个 Repeat 用例经过真实 fled 收尾后才换队，共用400步 driver 超限明确失败。HP/MP 以合法持久88/22和战斗70/10构造，真实胜利半恢复断言79/16。
- 自动攻击同一合法夹具、同一 attack→defend 变异：旧宽断言通过，新精确动作断言单业务红。186身份全部保留，未删/新增/改名，未改超时。资源失败的告警精确断言，其余warn作用域断言零调用。
- 学法术统一现行 magic；只有三个旧测试使用无生产写入的 learnedSpells。Map/entries/record/空恢复 JS 保持；21公开出口保持。显式合击缺角色 TypeError 仅改变损坏私有上下文的诊断文字，正常 availability 校验调用不变。109合法输入向量与正文守恒支持此边界，不冒称所有非法扩展对象等价。

必要验证：8文件266例无跳过/无可见运行诊断；随后实际1文件3个合击例与最终game typecheck通过。266采集后Map仅类型变化，JS相同；guard用3例定向刷新。合击命令另一不存在的文件过滤器未匹配，不能算第二个测试文件。首轮TC失败及旧测试单红原件保留。

只读快检：仓库根运行 `node docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/battle-main-quality/verify.mjs`，核原件、身份、counter与后继变化、完整正文守恒和指纹；不写文件、不联网、不运行测试。MATCH证明机械事实，设计判断仍限具体读域。

0新closed；固定83卡67accept/16partial。所有剩余pre94处理完才统一check／official coverage／ratchet／protected／一个PR，本次均未执行。下一接3t等战斗脚本质量余项，94–102不扩展。
