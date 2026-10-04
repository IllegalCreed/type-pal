# 跨阶段文档真值矩阵

机器版见 [`cross-phase-matrix.json`](cross-phase-matrix.json)。本矩阵不是把所有文档强行揉成一个“当前真值”，而是把边界、继承关系和未决冲突写清楚。

| 关系 | 结论 | 状态 | 停止线 |
|---|---|---|---|
| Phase1 ↔ Phase2 架构 | Phase1 是忠实还原参考；Phase2 是全新 Reforge 架构 | resolved | 不得把 Phase1 模块结构当 Phase2 实现合同 |
| Phase1 ↔ Phase2 schema/save | 可迁移知识，但 Phase2 schema/save 独立定 canonical | guarded | 没有当前代码/字段证据不得宣称等价或兼容 |
| Phase1 历史 ↔ Ops 当前 | 旧计划/快照不关闭当前 Ops 任务 | resolved | 历史完成线不替代当前验收 |
| Lore ↔ Phase2 内容 | 只消费确认项，保留 ⚠/❓ 和版本边界 | guarded | 草案、粉丝来源、版本分歧不得升格为 canon |
| Guijie lore ↔ Phase3 | 都是未来/草案，不授权当前实现 | resolved | 需用户裁决和独立任务后才可升格 |
| Ops 证据 ↔ runtime/test | 文档记录不等于当前运行验证 | guarded | 历史回执、截图、覆盖率不得单独证明通过 |
| 类型 ↔ 模板 | 563 份材料均已绑定稳定类型；新文档必须按模板 | resolved | 禁止新增未注册类型或独立格式 |

`guarded` 不是“没治理”，而是已经定位了冲突和证据缺口，并明确禁止把它外推成当前真值。
