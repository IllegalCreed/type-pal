# 作者保存恢复：GLM身份基础测试包

父卡：[EDITOR-SAVE-RECOVERY-1](../ops/tasks/EDITOR-SAVE-RECOVERY-1-interrupted-author-save.md)，build/r2，不重签。
工作包：**identity-foundation-r1**，2026-09-12用户要求Codex/GLM双线继续。状态：已准备，待用户转交GLM；不代表已开工。

## 分工与基线

- 产品基线 **b7a56dd4**。Codex自持剩余写侧/旧路径/性能判断、完整覆盖率及最终集成；所有视觉验证仅Codex。
- GLM只做workspace-context与handle-store的代码测试，不改这两个生产模块或任何其它生产文件。
- 从包含本包文档的最新origin/main新建独立worktree，分支`codex/glm-identity-foundation-tests`。
  不复用已交付的open-identity分支，不在main直接改文件，不stash。
- 两个目标生产模块的冻结SHA-256：workspace-context.ts为`9ca9d53ff462ccc154738742ab223040afcca2b33421eea936651851d17e983d`；
  handle-store.ts为`9e25eed37b942f29d593ce2c4eb46bf4ec458dde9738152ae496dbbbffad858f`。
  其他模块变化不自动扩大本包；若影响测试前提，记录实际依赖后交Codex确认。

## 唯一白名单

1. 新增`packages/editor/src/core/workspace-context-boundaries.test.ts`。
2. 新增`packages/editor/src/core/handle-store-capability.test.ts`。
3. 本文末尾“GLM回执”区。

不改旧测试、共享fixture、全局配置、依赖、超时/排除、官方baseline、资产、生成产物或原探针；不操作浏览器，不做截图/录屏/视觉判断。
保持真实被测函数与登记业务守卫，mock只限FS/IDB/HTTP/规范相符的Web Locks宿主边界；不得用Map.set替换业务登记。

## 一批交付的矩阵

| 组 | 业务合同与范围 |
|---|---|
| F1 身份构造 | 公开local/sandbox构造器拒绝非法workspaceId；合法来源/ID保持且对象冻结。以正式构造器取得有效上下文，不伪造私有品牌 |
| F2 标记解析 | 当前sandbox marker/PAL sentinel的非对象、缺/多字段、非法字段与合法对照；负例可故意损坏JSON，不能把旧版本输入做成成功正控；失败不得悄悄补字段/降级 |
| F3 指纹内容 | 通过公开fingerprintJsonFiles验证对象键序不改变指纹、数组顺序/内容变化改变指纹、非有限数/非JSON值拒绝。清楚区分公开readJson回调给坏JS值与真实磁盘JSON，不伪称JSON.parse能生成Infinity/undefined |
| F4 可信PAL证明 | 通过独立可信源和真实构造器得到两份proof；同一内容正控、可由合法输入产生的身份/快照/路径变化拒绝。不得用getter切换或修改冻结对象凑内部末端覆盖；缺scenes/maps的旧/残缺manifest只分类，不冒充合法当前工程 |
| F5 锁生命周期 | 用真实withWorkspaceRegistrationLock拿到active/返回后的expired token；正确workspace内有效，错误workspace及过期后拒绝，登记失败零记录变化。不能用`{} as Lock`冒充真实过期情形 |
| F6 存储与宿主分支 | 新数据库首次创建（无旧store）、loadWorkspaceHandle有/无记录；代码级Web Locks接线验证锁名/模式/回调等待及异常释放。宿主替身不得提前完成、吞错或丢弃锁参数；只声称代码合同，不声称原生浏览器通过 |

参考缺口仅作导航，不是要求硬凑全覆盖：workspace-context当前76/93（17臂），handle-store33/39（6臂）。
旧编号/行号见[已接收open-identity回执](editor-save-recovery-glm-open-identity.md#codex返工接收与r1修复2026-09-1273aa0ea7)及最终LCOV。
遇到重叠前置保护，列准确caller/拒绝层；只读分类可以作为交付，不能称0命中为已有覆盖。

## 证据纪律

- 每个负例配同条件合法对照，断言业务结果和需要保护的数据/记录/IO，不只对错误文案或mock次数断言。
- IDB替身必须区分request success和transaction complete；若测abort/error，事务终结一次，暂存写集abort丢弃。
  只实现本测试需要的宿主协议，不复制一套产品业务规则来验证自己。
- 至少3组独立单点负控，含一个错误接受/错误登记和一个合法行为被破坏；唯一生产替换点，编译/fixture失败不算业务红。
  临时Vite配置的include/root/testNamePattern必须在test内，避免像上轮一样误跑全套件。
- 若发现真实产品缺陷，交最小反例/正控/file:line，按正确合同保留预期红；不skip/test.fails、不改产品迁就测试。
- 从最终提交树计算真实用例数；新增命中必须相对该起点既有正式报告逐臂差分，不能把Codex已有覆盖算自己新增。

## 验证和交接

先读AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、父卡r2签字/最新回执，以及本包两个生产模块和原测试。
执行定向/直接相邻、editor typecheck、改动文件biome；临时V8报告落/tmp且只量两目标模块。
**不跑整仓check/全包coverage**，避免与Codex完整覆盖率争抢CPU；官方ratchet/严格fast由Codex统一执行。
交付逐项矩阵、负控及未覆盖分类，记录全部失败命令/exit/真实原因，不以多数通过放行。
提交推送自己的分支，核本地与远端SHA，再交Codex独立复核。GLM作为测试贡献者须在终审披露；不代签、不标done、不转Kimi。

## GLM回执（仅GLM填写）

待交付。
