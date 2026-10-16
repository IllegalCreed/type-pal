# 跨阶段文档真值矩阵

Status: current
Last reviewed: 2026-10-16
Owner: Codex
Template: governance-index-v1 / 1.0.0

## 目的

按 ops ↔ lore ↔ phase1 ↔ phase2 ↔ phase3 ↔ testing 的关系定位可继承知识、事实权和停止线。机器来源是[cross-phase-matrix.json](cross-phase-matrix.json)，本页只提供导航，不将各域揉成同一个当前真值。

## 范围

现行规则、历史计划、创意、执行回执和文档迁移分别按其阶段与来源读取。`resolved` 表示边界已说明，`guarded` 表示缺口明确且禁止外推，`blocked` 表示需要一手证据或用户裁决；这些状态都不等于产品运行通过。

## 当前状态

全 docs 治理仍进行中。旧表的“563 份均已绑定”只属于原有限范围，不能覆盖 1838 必审基线和新增候选。实际迁移由[进度工具](../../scripts/docs/report-governance-progress.mjs)从 review、SHA 与正文合同投影，最终还要通过 require-complete 与独立语义复核。

## 入口与责任

| 关系 | 已说明的边界 | 状态 | 停止线 |
|---|---|---|---|
| Phase1 ↔ Phase2 架构 | 一阶段保真参考，二阶段新架构 | resolved | 不继承旧模块耦合或偶然调度 |
| Phase1 ↔ Phase2 schema/save | 知识可迁移，canonical 独立 | guarded | 没有当前字段/代码证据不宣称兼容 |
| Phase1 历史 ↔ Ops | 旧完成横幅不关闭今天的任务 | resolved | 不从历史计划恢复待办或旧 handler 结构 |
| Lore ↔ Phase2 内容 | 已定红线、资料冲突、明确后继与创意导航分轴 | guarded | 入口/投影后继有源；版本珠项与官说待核，导航不授制作 |
| Guijie ↔ Phase3 | 均是未承诺候选/参考 | resolved | 需独立范围和产品裁决才能开 build |
| Ops 证据 ↔ runtime/testing | 文档记录与实际执行各有范围 | guarded | 截图、计数、任务状态不单独证明通过 |
| 文档类型 ↔ 全量模板 | 17 类合同，逐篇真实迁移；捕获索引自身最多增量1 | guarded | 原1838候选绑定仍是历史索引，不代替逐篇审读或全量验收 |
| 旧协作协议 ↔ 当前 Ops | 原文留存，现行流程控制准入 | resolved | 不恢复固定三签或历史交接授权 |
| onEnter 下界探针 ↔ 测试信用 | 无 goto/BFS 的线性扫描只给下界 | guarded | 不推出全库不可达或据此撤销业务合同 |
| Phase3 美术参考 ↔ 当前 build | 仅阶段边界当前有效，旧技术/法律断语未重核 | guarded | 不把旧“现在/推荐/合法”当实施或发行授权 |
| Testing 出版／002–005历史 ↔ SAVE12 | 合法前驱、分case与分轮；保004具体认可，不扩大为其它验收 | guarded | 保失败／警告／撤信与后继；005补跑不等wrapper全程成功，006另核 |
| 历史静态诊断 ↔ 当前零诊断 | E-06 原 0/50/11 保留，现行规则约束今天的检查 | guarded | 不倒改旧计数、不用历史 exit0 或旧例外放行 |
| Testing source出版 ↔ 测试质量准入 | readiness fixture强转仅记录已见来源，质量判断待独立审计 | guarded | 不把source-backed/旧全绿/模板通过当测试质量accept |
| 正文锚点 ↔ 当前sourceRefs | 6处已读源码后校正行号，原映射/Git blob留存 | resolved | 只关闭这些导航漂移，不推断全库锚点或运行通过 |
| Testing发布状态 ↔ execution状态 | catalog唯一id决定发布投影，执行回执有独立词表 | resolved | current/verified发布不授予本次实跑信用；伪Status不放行 |
| 历史UI/质量报告 ↔ 当前验收 | 09-28UI与10-03审计保留各次候选/计数/首次失败 | guarded | 机器筛选不自动删测试，旧截图/绿数不证明当前动态通过 |
| Legacy分类／Testing与Phase2导航 ↔ 语义深审 | 内容决定类型；历史集合入口current不升格目标；保原成员与路由 | guarded | 旧reviewStatus／签字不续期，107目标与HTML另验；L双SSOT约束保留 |
| Phase3导航 ↔ 实施成熟度 | 两个current索引只导航，议题/地图设计draft，已拍板归属仍有效 | guarded | 48e旧源码/估期/MMO愿景不变成当前build或二阶段预留 |
| Phase3入口 ↔ 候选正文事实权 | 14原块重组，长篇目标移入原议题池，原路径/标题继续导航 | resolved | 原块保真还须语义/链接/模板复核，不等运行或全量完成 |
| F2贡献/集成 ↔ 历史独立验收 | 作者与真实生产加载针、额外登记、最终接收各有身份；09-25/26状态不倒写 | guarded | 不把原生confirm替身或旧截图/绿数外推为当前通过 |
| A3段落/对照/CI ↔ 当前信用 | 内部枚举不加用例，cb1失败/ad16驱动成功/fdad候选分开 | guarded | 朝向不等位移；loader不等SFX/Canvas；旧47/6不等今天零诊断 |
| A7音乐角色 ↔ 后继勘误 | 四→五角色与1326/13→1327/12分时点，G5错误归因不恢复 | guarded | binding/网络链不等走场/听觉；O2缺口保留 |
| A7静态图像 ↔ raw face后继 | 6/10392旧stub被5/10324及absence取代，portrait保留 | guarded | 旧accept不等当前真值；本轮不重解码raw或运行 |
| A7过场旧设计/审计 ↔ C1–C5 | skip旧accept撤回，后继默认不可跳；共享两源已明确撤回旧信用并保留原文 | guarded | s059邻域不等s066全路，OPFS不等原生OS UI |
| A7瓦片许可失败 ↔ 字节修复 | 原222/1/1保留，后继恢复OFL字节；两种合法RLE容器均接受 | guarded | 不回填零、不添来源拒绝、不授今天法律/动态信用 |
| 历史codec合法域 ↔ 严格guard | 空槽/尾部/early-EOS/optional输入各有边界；CLI只读不算修复 | guarded | 不加任意上限、数字键或来源拒绝，不授当前caller/运行信用 |
| 历史质量计数 ↔ 共享摘要 | YJ2的131/129未解释；wave live摘要已纠3过1败，原错稿保留 | guarded | 不择数造轮次、不继承3fail、不冒充raw重跑 |
| coverage后继证据 ↔ runner猜测 | 十月Workbench与九月reorder是两事件，fast/full/probe分母分开 | guarded | 不为历史计数降低门，不以单包绿灯代全仓 |
| catalog自有label ↔ 继承属性 | own-property修继承误认，自有原型同名label仍合法 | guarded | 不添黑名单，不从旧done补push或当前代码质量信用 |
| battle既定裁决 ↔ 机制旧摘要 | >=抗性关与敌吉运已定；旧90cap矛盾显式登记 | guarded | 不回改产品，不从单门推出整招100%或全canon认证 |
| 状态/清理排重 ↔ 历史计数 | u新增5、w新增3，复用测试不重复，旧4/7/215并列 | guarded | 不造执行先后，不重复关账，旧全门沿用不算新跑 |
| 质量账本记录完整性 ↔ 源码语义 | 唯一live表/汇总，旧状态保留、新库存只加pending | resolved | 机器PASS不自动关闭源码/旧测试/运行验收 |
| 角色/入口基线 ↔ condition生命周期 | owner分层、undefined首次播种、restore与战后不同 | guarded | 保留query变化和历史失败，不把状态塞入ActorDef/setParty |
| current-only版本轴 ↔ PAL作者维护权 | 只退完整脚本转换，资源等窄供应链继续 | guarded | 不混PB4与重建失败，不复活退休核或删整个migrate |
| 架构准备包 ↔ 正式接入信用 | 42候选/41正式/75账/109针与拆分组数各自排重 | guarded | 材料accept不授产品build，未证视觉与非零诊断保留 |
| Lab逐轮counter ↔ 后继接收 | r9窄候选、r10整批counter、completion正式41分时点 | guarded | 不倒写反证，不把42/41/75或共享门重复计本包 |
| 历史原生复核 ↔ 本轮文档审计 | 原九字段不变，固定来源与currentAudit=false | guarded | 不补造出版schema/status，不以exit0或模板通过授运行信用 |
| 历史集成口径 ↔ 当前文档治理 | 三原生JSON与三配对历史MD分格式接收；9573/9081、共享8707/8215与wave2各守时点 | guarded | 109未重跑、原诊断/raw/视觉/CI边界保留，不把coverage总量或路径fingerprint当测试/rawhash |
| 域导航 ↔ 出版与历史工具 | 49页可达、36历史层；22/11出版与源12分轴，112工具只归属旧账 | guarded | 不倒填原Owner、不续期、不把路径/SHA或regex caller当工具/运行验收 |

维护 Owner 为 Codex；每次实际变更回写相关 canonical、review、catalog 与矩阵，不把索引作为第二份状态源。

## 证据与下一步

机器行逐项保存来源、未知和停止线；只说明已登记关系，不代表全 docs 关系已穷尽。相关入口：[文档模型](../ops/guides/documentation-model.md)、[现行协作](../ops/agent-workflow.md)、[测试治理](../testing/governance.md)、[SAVE12 合同](../phase2/specs/save-system.md)、[DLC 创意](../lore/dlc-ideas.md)、[第三阶段参考](../phase3/reference/art-pipeline.md)。

当源证据推翻前提时先停受影响批次，更新关系和用户产品裁决，不将 guarded 擅改 resolved；全量审查仍由[任务卡](../ops/tasks/DOCS-FULL-TEMPLATE-1.md)推进。
