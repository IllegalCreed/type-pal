# QUALITY-EXTRACT-RAW-TABLE-TESTS-1 — 原盘表专测与散落守卫归属

Status: done
Owner: Codex
Reviewer: Codex（单 Agent，自审与执行事实分开）
Phase: ops
Capability: extract-tests
Visual Verification Timing: N/A（测试质量，不改变游戏或生成物）
Branch: codex/code-quality-94-102

## 目标

接续[约百文件窗口](QUALITY-PENDING-100-1.md)，全文核清tables.test.ts与misc-guards.kimi-r1.test.ts的八维、真实CLI caller与逐例合同，不按旧覆盖率或文件长度授信用。

## 范围

主体为上述两专测；测试共有的资源/基础库实现复用既有证据并核当前依赖。允许补强独立原盘oracle、迁移或合并已证重复。misc-guards横跨无关parser，独有合同迁回map/palette/word/font/manifest/enemies/items/rgm/stores/battle-fields/data-misc/enemy-teams各已有专测，保留逐身份映射与必要补强后退役该聚合文件；旧接受目标只作版本桥，不计新增主体。原盘、生产算法、接口、schema/save与资产输出不写；英文/SLF/script-corrections活跃实现不写。

## 前提真值门

已全文读取两专测。tables混合原盘和合成测试，存在类型/字段存在/至少一条等弱断言；各parser专测已承担多数合成合同。misc-guards的覆盖率选点不证明排重，须逐条定位承接或保留依据。原盘字段以SSS/DATA/WORD字节与global.h结构为源；TS既定解释与C机制不混为一手原版行为。

## 上下文锚点

[长期八维](../code-quality.md)、[测试验收](../agent-workflow.md)、[共同证据](../evidence/QUALITY-TOOLS-CONTRACT-TESTS-1/README.md)。main同步到72db417255d8ca4227522420e9185ef468462aa7，旧69主体原件保留，变更的caller/依赖仅定向桥接。保护备份和精确stash身份在本窗sync回执，不触碰主树。

## 验证

先采旧两文件default+JSON，再整改并跑必要相邻/TC/局部静态；逐身份映射，重要判别力弱点用单点旧绿/新唯一业务AssertionError验证。独立oracle脚本与原盘SHA保留，可重建常量；不从当前TS输出复制金标。全仓/official/提交留约100实际主体窗口。

## 当前模式推进记录

Codex build allowed：两专测八维与测试质量整改，单一Owner；纯测试与证据，不改变产品机制/格式/规则，不调用子Agent，不增加强转、ignore或超时。

## 交接

无下一位Agent提示词。完成才计新增主体，未核重要问题保持pending；本片不会把69直接凑成100。

## 代码验收（2026-10-27）

tables完整89旧例→13当前例，原盘13组完整投影由Python直接读SSS/DATA/WORD和SDL结构，非当前TS/提取JSON快照；保留两条独有signed/unknown-type边界。misc-guards15合同全部迁移/排重后退役；15个旧接受目标仅增量桥接，tables作为1新主体计数，累计70，不按改动文件数凑100。

104旧身份逐条有当前精确file×fullName去向；两声音字段单点变异旧89绿、新恰一指定AssertionError，恢复通过。18文件91例回执后，删除地图重复例并增强原例，补空槽伪名拒绝；最后map3/team5分别实跑，其它未变例复用，不冒称一次最终91运行。extract TC零诊断，统一静态/门和发布分别记录。

首次4红属本次迁移的LE/消息参数/原盘首队预期错误，原件保留，不授产品红例信用。未改生产实现/接口/生成物；不恢复旧代码或放宽规则。全仓check、official/ratchet/protected和提交留约100冻结。无下一位Agent提示词。

## 本窗口本地验收收口

2026-10-28（JST）：100主体八维及本地统一门接受；本次提交时远端PR/CI/合并尚待，发布以受保护PR实际结果为准。 20536包测试＋732工具测试全部通过、七包typecheck和whole lint error/warning/info为0；唯一official20,188fast/809src，有限计数调整后原报告ratchet/protected0。文件关闭只来自本卡既有逐文件证据，未扩大到其它pending。见[统一原件与只读复验](../evidence/QUALITY-TOOLS-CONTRACT-TESTS-1/uniform/README.md)。本卡done指本地审查/整改/验收，远端发布不是预先完成声明。
