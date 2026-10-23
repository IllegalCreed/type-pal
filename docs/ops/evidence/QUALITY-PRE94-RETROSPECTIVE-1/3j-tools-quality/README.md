# CODE3j tools／speedrun 质量窗口

2026-10-23，Codex 单 Owner，同一 `codex/code-quality-3y`，基点 `1880db84a18aa40574d768621dd3ae6ddc7c9df9`。原卡七个生产文件及必要专测；不扩展 94–102，不改节点、坐标、PB、默认时间、游戏机制或公共接口。当前统一门与文件裁定以 [逐文件记录](review.json) 的 `integration` 为准，历史定向通过不代替当前全仓门。

## 复验入口

仓库根执行 `node docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/3j-tools-quality/verify.mjs`。默认只读，不运行产品、测试、覆盖率或网络；核当前源码／caller 指纹、八维记录、同版复用、完整原件及原生测试身份。指纹变化返回 `STALE` 和具体路径，不能继续继承本结论。`MATCH` 表示证据身份和结果一致，不是自动证明代码设计合格。

[完整字节原件](receipts.json.gz) 是 JSON 映射的 gzip；每项含 bytes、sha256、base64。解码 base64 可恢复原始 stdout、stderr、执行 command/cwd/exit/signal 和 Vitest native JSON。失败反控、失败网络读取均保留，不计成功门；打包本身不重跑测试。没有追加游戏路线、产品视觉或剧情 E2E 实跑；统一工具门包含真实 Chrome 回收合同。首轮全仓门该工具测试 45s 超时，经父子链确认后只清理其独占 Chrome，原测试隔离 8/8 通过；失败原件保留，完整重跑以实际回执为准。

## 四个相关切片与八维

`review.json.files` 对七个生产源、两份改动专测和六份同版专测逐文件列 A–H。A 正确性／生命周期、B 注释、C 职责与 Owner、D 复用边界、E 测试质量、F 表达力、G 无多余部分、H 可测试性均有具体陈述。display-scale/FPS 复用当前移动端逐文件证据；countdown/time-format/checkpoints 专测复用既有 CODE67–69 正式记录及当前哈希，不重复全文审查有效轴。宽文件 caller 只接受记录的核读范围。

- toast：生产不变。统一真实 DOM 与受控时钟 fixture，失败时也释放本例资源；主文件 4 例加 leaf 2 例归并为 4 例。消息／三种图标、2000ms 淡出与 220ms 移除边界、多条资源的独立释放都有明确去向。删除实际重复测试文件，未增加测试退役豁免或改变 scope 保护判据。
- map-names：只修过时中文回退注释，实际 tools-panel/dev-panel caller 取代旧记录中的 minimap 直调说法。三例保持三例，用真实语言状态与 literal oracle 核中文／英文、零号、缺名洞 104、未知 9999 及 authored 成员关系，还原原语言和 html 属性。
- time-format／countdown：前者仅移除私有 pad 死宽度参数，六个真实调用均使用固定二位；其余正文守恒、四个公开签名不变。后者仅说明 rAF 相同文案 guard 的必要性和不持有时钟。现有有效有限性／MutationObserver／DOM 合同复用。AST 复杂度初筛 31 函数，仅 parseHms 为 11；扁平校验清楚，不为数值拆 helper。
- checkpoints：只收窄未冻结 PalTimer 行号、历史坐标记录和实跑承诺；数据正文不变。五坐标点、学功夫 BGM86、锁妖塔入口 164/165/147 仍缺当前运行校准。**旧关闭撤回 review，3j 保持 partial**。静态 21 节点、单调默认值与香蕉合同不能填补路线未知。

两项新判别力各有旧绿／新单红／恢复绿完整原件：toast 将淡出 opacity 改为 1；map 将英文未知名改为中文。红例均是指定业务 AssertionError，非加载或类型失败。`transfers` 列全部旧／新测试身份及合同迁移；`body` 列三份仅注释正文守恒和私有参数精简证明。设计可改善候选与关键未知分开，不因发现候选强改接口。

## 门与收口边界

前提 main 合并后 Documentation `39900260968`、Coverage `39900261034` 均成功：完整 raw 零项目／平台诊断，原生两个 check 的 annotation 计数 0。此为本窗启动前提，不冒称本窗门。原覆盖率 20,172 例／774 源。

本窗定向 8 文件／28 例、相邻 15 文件／92 例，stderr 均空；game 首次 typecheck 通过在私有参数精简前，最终当前类型门由统一 check 覆盖。全仓与 official ratchet 集中到四片冻结后；protected fast 复核同一完成报告，不再次采集。实际执行、计数、零诊断扫描及 ledger 状态写入 `integration`，未完成前不预授文件关闭。

固定 83 卡起点 64 accept／19 partial／0 pending；本窗保留 3j partial。下一必要证据是上述节点的真实运行校准，不是重复静态测试；其它 pre94 余项另开有限窗口。本窗口不新增产品取舍、存档、资产管线或生成物变化。

## 统一门实际结果

完整 `env VITEST_MAX_WORKERS=1 pnpm check`：20599 包测试 + 692 工具测试，七包类型检查及 lint 全通过，error/warning/info 和测试 stderr 均为 0。原始两次失败不改写：首轮独占 Chrome 超时；次轮默认文件并发下五个 CLI 子进程超时。为恢复失败未改超时、规则、断言或产品实现；最后全量原命令以单 worker 通过。

单次官方报告采集（原 ratchet 因一项结构计数拒绝）：20170 例／774 源；加入精确 -1/-1 默认分支结构协调后，同报告官方策略重放与 strict/protected fast 零回退，完整 stdout 与前窗业务日志逐块核对：只有 author baseline 的 elapsedMs 自然变化（IO 计数全相同），已全文核该 console.info 来源。最终策略重放/protected 的 stderr 空；原 ratchet 的 166 字节拒绝 stderr 原样保留，不记首跑通过。只移除实际已删的 toast 两例文件；旧文件内退役表与保护判据不变，仅私有默认参数已覆盖分支 -1/-1 的精确结构协调。最终基线采用本次原生投影。

三文件新关闭：time-format.ts、toast.test.ts、map-names.test.ts；checkpoints.ts 旧关闭撤回 review，其余 11 个同版接受刷新。当前 3403 tracked／407 closed／104 review／2892 pending；固定 83 卡仍 64 accept／19 partial／0 pending。checkpoints 五坐标、BGM86、三入口仍待真实校准，不把包绿当路线完成。
