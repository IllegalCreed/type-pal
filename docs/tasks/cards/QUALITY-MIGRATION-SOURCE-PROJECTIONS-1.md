# QUALITY-MIGRATION-SOURCE-PROJECTIONS-1 — 迁移来源投影与专测质量复审

Status: done
Phase: phase2
Owner: Codex
Reviewer: Codex
Last reviewed: 2026-11-20
Template: task-card-v1 / 1.0.0
Visual Verification Timing: N/A

## 目标

逐文件复审迁移来源投影、实际发布和 Content 物品专测，按职责整理文件与有效合同。

## 范围

在 `codex/code-quality-94-102` 从 #71 合并提交 `dc745c12704370975645c0992cf477c4bc8d1da3` 继续逐文件审查。基点账本为 3,771 tracked、1,147 closed、1 review、2,623 pending。Codex 持有本窗口的单一写入权。已交叉核对活跃 E2E 的提交与工作树，内容资产实现、该线所属物品实现和场景资源由其 Owner 继续维护。[资源引用登记诊断](CONTENT-ASSET-RECORD-OWNERSHIP-1.md)按用户裁决等待其合入。

## 前提与证据

采用[工程八维](../../engineering/guides/code-quality.md)和[第二阶段开工规则](../../phase2/READ-FIRST.md)。每个切片记录实际调用者、来源、命名组织、失败与独立 oracle。实际部署和完整剧情 E2E 仍由其本身的合同验收。

### 本窗结论

| 切片 | 完成的原 pending 文件 | 有效合同 |
|---|---:|---|
| 地图与场景来源 | 9 | SDLPal 原始半格布局、碰撞、高度和 Content V4 守卫。回读、UTF-8 报告与固定地图名各归实际入口。 |
| 角色、音效、供给与事务入口 | 34 | 原盘装备、角色头像、物品提示、四条伤亡脚本与作者覆盖分别验收。CLI 的真实未知参数、先验条件、排序和提交字节按职责保留。 |
| 发布与资产专测 | 43 | 区分原盘只读、作者接管、文件物化、真实输入与合成边界。实际引擎资源和占位素材在隔离目录重建，89 个输出文件逐字节与当前冻结资源一致。 |
| Content 物品和奖励 | 12 | 真实物品入口、相同与不同装备识别、携带状态、业务对象归属、两类队伍恢复和隐藏经验。测试路径按实际职责命名。 |

98 个原文件完成逐文件处置。其中旧文件因合并、拆分或退役而退出时，其合同去向可从逐文件证据核对；另退役原度量专测的独立弱断言，其 UTF-8 字节合同转到实际地图审计报告，未重复计入 98 个。当前账本为 3,772 tracked、1,247 closed、8 review、2,517 pending。代码清单新增 33 条路径、退出 32 条，100 条新增关闭登记包含责任明确的后继测试和夹具。

原报告持有的地图零分母、残差、物理坐标及第二逻辑行反控仍在。PAL world 精灵保留 636 个原输入、冻结坏尾集合和全体字节物化证据，战斗精灵保留 172 个原输入及独立 player/enemy 边界。旧合成损坏半像素和原盘生产者不会产生的角色 layout/重复实体案例退出。覆盖率按配对原生 V8 测量，只对 Migrate 分支底线作精确结构重算 1,639/1,799 → 1,614/1,772。行、函数、语句及其它包沿用原门槛。四个现存文件用例减少均有前后身份、确切来源与承接用途。

## 验收

从[单一执行归档](../evidence/QUALITY-MIGRATION-SOURCE-PROJECTIONS-1.tar.gz)查看 `README.md`。按 `file-review.json` 找每个原路径、候选 Git blob 与 A–H 表的实际行。测试去向、必要完整失败、定向与集中门回执由同一归档索引。基点可用 `git show <base>:<path>` 取回旧测试，候选未承诺把旧缺陷升格为已验证。

本地全仓七包 typecheck 与 20,870 项包测试均通过。初轮检查发现四卡模板缺节，补齐后进入全仓测试。全仓命令因唯一的文档登记 JSON 格式诊断退出 1，原件已保留。格式化前后 JSON 值一致。最终文档入口、模型、严格审查与 lint-zero 以归档复验原件为凭。官方 ratchet 正式采集 840 个生产文件和 20,527 项 fast 测试，零诊断。另有账本及受保护基线只读预检。真实远端检查以 PR 的 Documentation 和 protected fast 为凭。

## 状态与交接

| 文件 | 解除条件 |
|---|---|
| `asset-diagnostics.ts` | 活跃 E2E 合入后核 `asset.ts` 所有权，复用 #71 的已有反例。 |
| `project-map-converter.ts`、`project-map-audit.ts` | [源字范围裁决](MIGRATION-MAP-SOURCE-WORD-DOMAIN-1.md)。正式红例保留。 |
| `pal-store-boundary.ts` | [旧商店扫描裁决](MIGRATION-STORE-COMMAND-SCAN-RETIREMENT-1.md)。确认旧计数退役范围。 |
| `pal-world-sprite-semantic-alias.ts` | [发布布局等价裁决](MIGRATION-SPRITE-DEFINITION-OBJECT-ORDER-1.md)。原盘入口正控和单红例已保存。 |
| `pal-item-scheme-labels.ts` | 核以 1 起始的多位编号的孤儿标签是否存在实际漏诊。当前已知源图与现存弱格式问题分别记录。 |
| `scripts/bake-assets.mts` | 需继续明确部分输出后的失败恢复合同。现有逐字节重建证据仅覆盖完整成功。 |
| `__tests__/glm-item-logic-fixtures.ts` | 活跃 E2E 直接导入该夹具。其合入后核真实 caller，再成组整理命名。 |

下一切片先重新核对 E2E 合入和路径所有权。该线仍在执行时，先核 Migrate 的 `pal-current-publication.ts` 和同职责实际发布专测的 Owner 与输入。内容核心的候选专测依赖活跃的校验实现，随该线合入后接续。
