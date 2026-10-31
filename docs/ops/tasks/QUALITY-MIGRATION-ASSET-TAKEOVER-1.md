# QUALITY-MIGRATION-ASSET-TAKEOVER-1 — 作者资源接管与三方快捷路径

Status: review
Owner: Codex
Coding Owner: Codex
Reviewer: Codex（单 Agent）
Phase: phase2
Capability: A7
Visual Verification Timing: N/A（纯资源目录规划）
Branch: codex/code-quality-94-102

## 目标与范围

核定 `assets/index.json` 已由作者接管的记录在后续迁移中继续归作者所有。仅拟修三方合并快捷判断，不改资源格式、资源字节、schema、存档或真实工程；发现时等待裁决；本轮已按用户批准修复，统一门待父窗口。

## 前提真值门

| 维度 | 当前证据与范围 |
|---|---|
| primary | `mergeNode` 的 authored 规则与 migrate README 的作者接管策略；真实目录在 `assets/index.json`，最终结果由 `validateAssetCatalog` 校验。 |
| 修复前实现 | `allowsWholeSubtreeFastPath` 排除的是 `content/assets/index.json`。当 ours 与 base 已同为 authored 记录时，根节点直接选择迁移侧，尚未走到单项接管规则。 |
| 复现 | 两份 music 资源目录均通过真实 catalog validator；base/ours 为相同 authored 记录、theirs 为 legacy-migrated，结果变回迁移记录且无冲突。 |
| 边界 | 合法目录与真实合并入口已复现，但尚未证明普通当前工程的基线会包含已接管项。不声称真实文件已被覆盖。 |

最强替代解释：当前发布器的常见基线可能始终只含迁移来源；在该输入域原有测试足够。本卡锁定的是现有接管合同与低层合法输入的分叉，批准前不扩大“所有基线必须保留作者”的产品政策。

## 上下文与证据

[父窗口](QUALITY-PENDING-100-3.md)、[八维质量](../code-quality.md)、[证据入口](../evidence/QUALITY-PENDING-100-3/README.md)。`merge/observe.mts` 与完整执行原件归父窗口；发布生成器仅核读，没有运行真实发布或写生成物。

## 验收与停止线

用户若批准，先补 base 已 authored 的正式失败反例，再改 canonical 路径的快捷判断，核普通 migrated 更新、首轮接管和合法结果。不得用降低 validator、忽略资源检查或新 fallback 过门。行为修复与私有清理分开冻结，重型门留父窗口。

## 获批前交接

2026-10-29：Codex 单 Owner。用户裁决已提请，尚未答复，当前 draft、无 build 授权；实现文件不得因相邻全绿关闭。其它独立质量工作继续。


## 用户裁决与本轮准入

2026-10-29 用户明确裁决：“批准保留作者接管项（推荐）”。Codex build allowed，单一Coding Owner仍为Codex，同一治理分支；54路径WIP检查点逐项匹配，fetch成功、与main为0/0。先补正式业务失败回归，再仅修本卡行为边界；原始只读probe不继承红例信用。另一项获批修复分别冻结，先前纯重构检查点保留，磁盘格式/生成物/存档与公共签名不变。定向/相邻与TC留本片收尾，重型门留父窗口。


## 本轮代码验收

2026-10-29：两项批准共6条正式AssertionError红例，原31条保持绿；红绿spec字节完全一致，纯重构／JSON字段／资源路径三个源码检查点独立保存。本卡代码接受，Status review等父窗口统一门；未执行真实迁移、写生成物或改资源/存档/公共签名。

1条合法catalog红例锁定base已authored的祖先快捷绕过，普通migrated资源更新是同场景正控，防止错误地冻结整份catalog。只将排除路径改为canonical assets/index.json，并改正祖先遍历注释；JSON修复后的剩余单红在此转绿，现有首次接管合同保持。普通当前工程曾否遇到仍未增授证据。

最终主测37绿、16相邻文件215绿、migrate TC0，完整default+json/stdout/stderr见[父窗口原件](../evidence/QUALITY-PENDING-100-3/README.md)的merge-approved命名空间。默认快检保留旧私有重构/反控身份，并逐项核当前获批差异，不重复全文或旧变异；重型check/coverage/protected及提交推送合并仍集中到稳定窗口。
