# QUALITY-MIGRATION-UNMANAGED-AUDIT-RETIREMENT-1 — 无生产调用的非托管哈希接口

Status: review
Owner: Codex
Coding Owner: Codex
Reviewer: Codex（单 Agent）
Phase: phase2
Capability: migration API ownership
Visual Verification Timing: N/A（离线内部接口）
Branch: codex/code-quality-94-102

## 事实与范围

删除前冻结候选中，`migration-project-io.ts` 的 `hashUnmanagedProjectFiles`、`assertHashMapsEqual` 只有三份专测调用。真实 `scripts/migrate-content.mts` 只调用发现、加载、TOCTOU三个出口；包根index不导出这两项。完整模块引用枚举、CLI、write-plan及旧52回执已核，不将grep零命中本身当调用语义证明。

旧52回执D维“两项hash差异接口各有真实plan/执行用途”无当前代码依据；对应实现旧关闭撤review，其它已支撑合同保留，不把主测或整包一概撤回。父窗口先前“实现/主测仍pending”的交接也不准确：两者在live表已关闭，不能计入本窗口新增原pending完成数。

## 授权前方案与停止线

请求退役两项无生产调用的内部named export及其私有递归walker；删除只服务这些接口的排序、排除、空目录、差异消息等六个测试身份。主测混合例中有价值的“只读托管JSON／旧脚本与工作区旁车保持非托管”改用真正的发现/加载入口与全树不变oracle。托管原始字节hash、发现、TOCTOU和写前保护继续保留；不新增业务功能、变更资源/内容格式或运行真实迁移命令。

AGENTS要求接口退役先核授权，本卡在用户裁决前不删除产品出口。三个原pending专测的注释、真实输入、独立oracle与反控可继续；涉及这两出口的删除待本卡，不能靠登记未来候选假关闭源文件。

## 验证与交接

候选基点e94098f949452bc3bf8d028f21bdc0a4e400ea22，同一治理分支，单一Owner Codex。原件/调用和退役身份映射写入[父窗口证据](../evidence/QUALITY-PENDING-100-3/README.md)。批准后先保持其余现用函数语法、签名与行为不变，精确退役映射及相邻回归；正式覆盖率与protected留父窗口集中。

最强替代解释：外部或动态消费者仍需这两函数。若找到实际运行调用、公共包出口或保留需求，本卡须改为保留且纠正调用图，不实施删除。不把“测试调用”当产品需求证明。

## 下一位 Agent 提示词

无下一位Agent提示词；Codex单Agent继续父窗口。下方批准已落实，不再等待本卡裁决；统一门/提交/推送/合并仍留父窗口。

## 2026-10-29 用户批准与build

用户明确批准：“允许退役并迁移有效断言（推荐）”。Codex build allowed：只删两个named export及专属walker/六个专属旧身份，迁移main混合例中的非托管/只读断言；现用discover/load/TOCTOU的签名及函数体保留，旧文件仍由现用发现入口排除。纯接口退役与测试质量整改分别在窗口提交，不改格式、生成物或运行迁移CLI。源码旧关闭先撤review，修复后代码接受与统一门分开。

## 局部验收

两出口、walker及unused fs/path import已移除，保留四个函数（含private路径守卫）签名/正文逐字节相同，剩余语法仅允许删除上述部分；证明与完整原件在父窗口附件。6个旧专属身份精确退休；三种TOCTOU拆开，旧脚本/旁车不托管及读取保留字节迁到现用入口。当前源/主测分别补全A–H，代码接受；两项旧关闭暂review等本窗口门，不重复计原pending主体或新增关闭。

当前相邻11文件73测试与migrate typecheck通过、stdout/stderr完整，未执行全仓/official/protected、真实迁移或发布。此前77是接口退役前检查点，不改写或与73相加。两个测试质量反控仍以各自冻结源/测试身份定位，现用函数未变，旧专测不可直接在删出口的新源上重放。无新产品裁决待办。
