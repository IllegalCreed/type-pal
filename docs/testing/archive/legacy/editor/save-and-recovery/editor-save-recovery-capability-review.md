# 保存恢复：写入授权生命周期回归

Status: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-20
Template: test-run-report-v1 / 1.0.0

本页是 EDITOR-SAVE-RECOVERY-1（build/r2）下 Codex 独立推进的写入授权生命周期回归（2026-09-12，基于 693dec71）：workspace-capability-lifecycle.test.ts 新增 13 项，不改生产/GLM 测试/回执/旧测试/配置。

## Scope

13 项用 authorizeFirstSaveTarget/withAuthorizedWorkspaceMutation 实际签发对象（不伪造品牌/不导出私有函数；policy/writer/handle-store 登记业务与锁执行生产函数，只替换内存 FSA/恢复凭据/底层 IDB）：成功/失败后真实 token 失效 2、writer 提交后外层未退出 1、recent 声明生命周期 1、recent 身份不一致 4、恢复私有路径/操作归属 1、封存计划与原基线不符 3、保留恢复 scope 准入 1。十组单点负控（TS AST 定位唯一 throw 替换空块）各业务红：scope:234/private:337/begin:554/paths:511/identity:540/late:542/pending:544/sealing:311/path:346/operation:348。

## Execution and assertions

| step | legal input | caller | machine assertion | business oracle |
|---|---|---|---|---|
| - 定向+相邻+统一门 | 13/13、相邻 7 文件 214/214、typecheck/biome exit0；完整 check exit0 6796 项；官方 ratchet+单次严格 fast exit0 6308 项 | Codex | editor fast 201 文件/2069 项、618 生产文件不变；wp 新增 16 臂 56→40 未覆盖（LCOV 独立逐臂复算 82→66） | 自修正如实保留：typecheck 首跑 exit2（SaveSignature 赋值）、begin 负控首配 0 项、private 负控首触后层文案红改真实 operationId |

## Results

历史结果（原卡时点，本页未复跑）：

13 项全绿+十组负控业务红；GLM open-identity-r1 仍在返工其 hint.source 缺口未被本批覆盖；父卡非 done 不代签。

## Evidence

- 证据路径：本回归正文（quote 保全）；/tmp/codex-capability.NLPLjB/ 全套日志与 reconcile.json 在 quote 提及。

## Revision history

| revision | date | change | result | supersedes |
|---|---|---|---|---|
| 授权生命周期回归 | 2026-09-12 | 13 项+十组负控+统一门 | 完成（父卡仍 build/r2） | 无 |
| 模板接入 | 2026-10-20 | S17 治理封套（quote 保全） | 不改变原结论 | 无 |

## 历史范围

legacy editor/save-and-recovery 的授权生命周期回归；固定来源与 source SHA 见下方保全节。

## 原始结论

13 项全绿+十组负控业务红；GLM open-identity-r1 仍在返工其 hint.source 缺口未被本批覆盖；父卡非 done 不代签。

## 当时证据

用例组表、负控位置表、自修正记录与质量门在 quote 保全。

## 当前有效性

historical。数字为 2026-09-12 时点。

## 继任文档

当前结论归 EDITOR-SAVE-RECOVERY-1 完成卡与 closeout 文档。

## 原文保全

固定源 revision `85c462ffd5a6d8514604d346abd96212340c5dfa`，source SHA `5725ceaf3b519e447f206c5fd2fd8f370d43139c1ceb29aba05ba92aeef4198a`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与原源逐字节相等（不 trim、不替换）。
<!-- original-source-quote:start -->
> # 保存恢复：写入授权生命周期回归
>
> 父卡：[EDITOR-SAVE-RECOVERY-1](../../../../../ops/archive/tasks/done/EDITOR-SAVE-RECOVERY-1-interrupted-author-save.md)，build/r2。
> 执行者Codex，2026-09-12；用户要求GLM返工期间继续独立推进。本批基于693dec71，不改生产代码、GLM测试/回执、旧测试或配置。
>
> ## 范围与直接证据
>
> [workspace-capability-lifecycle.test.ts](../../../../../../packages/editor/src/core/workspace-capability-lifecycle.test.ts)新增13项。
> 它们使用authorizeFirstSaveTarget/withAuthorizedWorkspaceMutation实际签发的对象，不伪造品牌、不导出私有函数。
> policy、writer、handle-store登记业务与锁都执行生产函数；只替换内存FSA、恢复凭据存储及底层IDB。
> IDB替身每次open/transaction/request独立，保存句柄身份，request success后仍未提交，completion才发布写集；abort后不能提交。
> 此处只验证正常IDB调用链与登记守卫，不将替身当作浏览器原生IDB故障验收。
>
> | 用例组 | 项数 | 核心断言 |
> |---|---:|---|
> | 成功/失败后真实token失效 | 2 | 真实writer成功或owner抛错后，旧token不能取目录、准备恢复、写入记账、登记recent或重入；target也不可复用；文件/IO/recent/凭据不变 |
> | writer提交后、外层尚未退出 | 1 | committed已落盘，目录仍可取得且重复finalize合法，但后续写权限和迟到的recent声明拒绝；loader可重开 |
> | 一个recent声明的生命周期 | 1 | 同对象同名称重复声明合法；改名或换等值context对象拒绝；提交前/后均验证，最终真实登记仅一次 |
> | recent身份不一致 | 4 | workspaceId/projectId/source单轴以及合法mode+source组合不一致均在暂存前拒绝；随后原身份真实writer成功并登记 |
> | 恢复私有路径/操作归属 | 1 | 作者路径、坏blob摘要路径、越界plan路径拒绝；本操作三种合法元数据路径通过，第二operation拒绝；原plan仍可封存 |
> | 封存计划与原基线不符 | 3 | operationId、before条目数量、before签名值分别拒绝；相同token随后接受原计划，证明坏计划未占据封存状态 |
> | 保留恢复scope的准入 | 1 | active owner不能重入；结束后可检查恢复就绪，但没有封存计划仍不能推进基线，输入iterator未消费、文件/IO/登记/凭据不变 |
>
> 空目录授权/空步骤计划只用于公开API的准入与封存合同，不冒充完整工程保存；需要提交/登记/重开证明的用例全部使用buildBlankProject和真实writer。
> 最后一项active拒绝先于lock校验，使用曾经真实签发但已释放的lock，不在持锁owner中嵌套获取同一锁造成死锁；
> owner结束后的无计划拒绝则通过withWorkspaceRegistrationLock取得当时有效的lock。没有宣称该项独立证明锁校验。
>
> ## 单点负控
>
> 临时配置`/tmp/codex-capability.NLPLjB/negative.config.mts`通过TS AST定位唯一throw，将该语句替换为空块。
> 只作用于隔离加载，物理生产文件不改。每组打印原源码hash、变换后hash及行号；原wp源码hash均为
> `f4cea61c2ae532945e9d707e73cf9def2ed98bc22a1b17cd19dd95eb0b3553b0`。
> 可重建方式：在下列函数内定位相应拒绝throw，断言恰1处，只替换该语句，加载新测试并按该组测试名过滤。
>
> | CAP_NC | 生产位置（workspace-persistence.ts） | 最终负控结果 |
> |---|---|---|
> | scope | authorizedSaveScope:234 | 1红：已提交仍返回新scope，未抛错 |
> | private | allowAuthorizedSavePrivateFile:337 | 1红：沿用真实committed operationId仍可准备元数据，未抛错 |
> | begin | beginAuthorizedWorkspaceMutation:554 | 1红：已提交后begin resolved，不再拒绝 |
> | paths | planAuthorizedWorkspacePaths:511 | 1红：已提交后路径预检resolved，不再拒绝 |
> | identity | registerAuthorizedWorkspaceMutation:540 | 4红：四组身份错误均暂存成功resolved |
> | late | registerAuthorizedWorkspaceMutation:542 | 1红：内容提交后新增登记声明resolved |
> | pending | registerAuthorizedWorkspaceMutation:544 | 1红：原登记名称可被替换resolved |
> | sealing | sealAuthorizedSavePlan:311 | 3红：三种计划漂移均错误封存，未抛错 |
> | path | allowAuthorizedSavePrivateFile:346 | 1红：作者路径作为恢复元数据被接受 |
> | operation | allowAuthorizedSavePrivateFile:348 | 1红：同token可更换operation |
>
> 最终十组均exit1且是错误放行断言，不将其它错误文案/模块加载失败当有效业务负控。
> 到期token的WeakMap删除和active标记是重叠生命周期保护；未宣称移除其中单条仍必然错误放行。
>
> ### 验证过程中的自修正（不隐去失败）
>
> - 定向首跑13/13通过；首次typecheck exit2为新测试将普通string赋给SaveSignature，改为生产parseSaveSignature验证后赋值，最终typecheck exit0。
> - 首次begin负控因相同错误文案在两处出现而被配置自身拒绝，0项运行；增加所属函数约束，最终仅移除:554，业务1红。
> - 首次private负控触发后层“第二operation”拒绝，只改变错误文案，不算业务红；改用已提交记录中的真实operationId，最终为明确错误放行。
> - 初次查询发现仓库无根.npmrc、editor无vitest.config.ts；使用现行pnpm-workspace及Vite配置，不添加替代配置到仓库。
>
> ## 质量门与后续边界
>
> 最终定向13/13、相邻7文件214/214、editor typecheck和改动文件biome均exit0。
> 完整`pnpm check` exit0，共6,796项包测试（另有docs工具20项、coverage工具17项）；既有lint50 warnings/11 infos，无error。
> 随后以`TYPE_PAL_COVERAGE_BASE_REF=693dec71`顺序运行官方`coverage:ratchet`和**单次**严格`coverage:fast`，均exit0，6,308项。
> 最终editor fast为201文件/2,069项，全部生产文件仍618个，scopeDigest/各指标分母不变；只增加本测试文件及13个用例身份。
> 严格运行与新baseline各包/全仓metrics、测试数一致，没有editor off-by-one或其它回退。
>
> 最终LCOV与693dec71台账独立逐臂复算：wp新增16臂、56→40未覆盖，io26不变，合计82→66；无新增未覆盖臂。
> wp行402/423（95.03%）、函数58/58、分支395/435（90.80%）。详情见[当前台账](../../quality/quality-gates/editor-save-recovery-coverage-pending.md)。
> E3/E4仍计入分母；本批没有修改或新增兼容分支，没有用排除规则凑覆盖率。
>
> 日志在`/tmp/codex-capability.NLPLjB/`：`check.log`、`ratchet.log`、`strict-fast.log`、`adjacent-final.log`、
> `typecheck-final.log`、`final-negative-*.log`、`reconcile.json`（逐臂/分母/回退复算）。严格检查只执行一次，没有取多数通过。
>
> GLM open-identity-r1仍在返工；其hint.source产品缺口未在本批修复，不能以本批通过覆盖掉counter。
> 父卡仍build/r2，设计签字保持，非done候选、不代签、不转Kimi。本批不改UI，不重复既有视觉验证。
> 无下一位Agent提示词；Codex继续自持集成/质量收口，GLM按已给定返工提示词处理自己的文件。
>
<!-- original-source-quote:end -->
