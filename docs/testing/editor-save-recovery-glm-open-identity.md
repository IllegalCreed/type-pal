# 作者保存恢复：GLM打开身份测试包

父卡：[EDITOR-SAVE-RECOVERY-1](../ops/tasks/EDITOR-SAVE-RECOVERY-1-interrupted-author-save.md)，build，r2设计签字有效，不重签。
工作包：**open-identity-r1**。2026-09-12用户要求给GLM可并行工作，并明确视觉测试只能由Codex执行。

## 分工与基线

- Codex仍是生产Coding Owner，负责project-io剩余分支、性能/权限遗留、集成及最终质量门。
- **GLM只做代码级测试和文本回执。不得分派浏览器操作、截图/录屏判断、布局/观感或任何视觉验收。**
  下文finishOpen是函数调用测试，不是让GLM实际打开界面。已有视觉证据由Codex负责，不要求GLM看图判断。
- GLM属于测试贡献者，不作为本包的独立第三方自证；终审必须披露。
- 从包含本工作包的最新origin/main建立新worktree及`codex/glm-open-identity-tests`分支，不复用旧返工分支。
- 生产基线1ba88755；后续主树只有测试/文档/生成coverage baseline变化。若核心生产源码已变化，先交Codex确认。
- 主树已有`workspace-save-admission.test.ts`20项，属于Codex首存写侧，GLM不得修改。

## 唯一写入白名单

1. 新增`packages/editor/src/core/workspace-open-identity.test.ts`。
2. 本附件下方“GLM回执”区域。

不改生产、旧测试、共享fixture、全局配置、依赖/超时/排除、scripts、官方覆盖率基线、PAL产物、data或原审计探针。
不stash、不在main直接实现或合并，不追踪资产/软链接；优先用自产blank fixture，不依赖PAL版权资源物化。

## 先读

AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、父卡r2签字/范围及最新回执；
[逐臂台账](editor-save-recovery-coverage-pending.md)；
[workspace-persistence.ts](../../packages/editor/src/core/workspace-persistence.ts)的resolveOpenedWorkspaceContext及调用链；
[open-actions.ts](../../packages/editor/src/core/open-actions.ts)的finishOpen；
[workspace-context.ts](../../packages/editor/src/core/workspace-context.ts)的真实身份/证明构造器；
已有open-actions/open-local/pal-save-identity/workspace-save-admission回归，避免只换名称重复证据。

## 一批完成的矩阵

核心合同：打开后的身份不能与目录、最近记录或当前操作矛盾，不能把受限工作区降级。
预期从现行合同核定，不预填“所有组合都拒绝”，也不能因实现接受就把疑似漏洞写成正确正控。

| 组 | 输入与业务结果 |
|---|---|
| OI-L 普通本地 | 合法无marker目录/最近记录；projectId漂移；无marker却带受限hint；hint项目ID与manifest冲突；合法hint/记录对照 |
| OI-S 沙盒 | 合法marker与三种支持source；marker和manifest项目ID冲突；hint的mode/workspaceId/source不一致；既有记录的handle/mode/project/source冲突；合法对应对照 |
| OI-P PAL | 从独立可信FileSource经真实构造器产生proof；普通hint不能借sentinel取得PAL权限；既有绑定换目录或mode/project/source冲突；合法PAL函数入口；forceSandbox检视不能返回原目录写权限 |
| OI-E 最近入口预期 | expectedIdentity按workspaceId/projectId/mode/source逐维不符与全匹配；冲突时不返回可编辑会话、不登记新绑定，原目录/记录保留 |

主要落点wp182–208附近的**代码路径**。不要为contextFromRecord等私有分支造getter切换mode、伪造私有品牌、
导出私有函数或篡改内建对象。被前置守卫挡住，给直接调用链证据交Codex分类，不堆畸形fixture。

## 证据要求

- 复用buildBlankProject、memoryAuthorDirectory、memoryAuthorSaveStore及真实身份构造器；fixture先经正式loader成功。
- 可直接测公开resolver，但每种工作区至少有一对finishOpen函数的合法/冲突入口，核正式读取与登记顺序。
  PAL可信源不得用被篡改目标临时自授权；这些全部在Vitest里执行，不使用浏览器。
- mock只限FSA/IDB/必要HTTP边界；保留真实锁或已验证锁合同，不mock被测resolver/loader/validator。
- 每个拒绝用例只改变它声称核验的身份轴；配合法对照，核文件快照、创建/写入/删除轨迹与原绑定不变。
  0次循环不是“全部通过”；零凭据须直接断言数量。
- 异步变化用实际阶段内entered/deferred，不用睡眠猜时间。
- 至少两组单点负控，必须出现错误放行/错误会话/错误登记等业务红；只换报错文字、加载失败或fixture自己报错不算。
- 发现产品缺陷，只保留最小反例、file:line、正控/影响/替代解释，明确区分预期红与测试失败，交Codex，不改生产。

## 验证与交付

跑本包及直接相邻测试、editor typecheck、新文件biome；覆盖报告放临时目录，逐branchId/arm与台账对账。
分开记录新命中/既有证据/待Codex核定；报告0命中不能写已有覆盖，不能凭函数级百分比宣称逐臂完成。
完整check/官方ratchet/单次严格fast由Codex集成后统一执行，GLM不改基线、不做视觉测试。

所有计数来自最终提交树，记录每次失败命令/exit/原因。完成后提交推送自己的分支并核远端SHA，
给白名单diff、测试名/矩阵映射、负控唯一替换点与重建方式、剩余问题。
不代签、不改父卡状态、不标done、不转Kimi；交Codex独立复核与集成。

## GLM回执（仅GLM填写）

待实现。
