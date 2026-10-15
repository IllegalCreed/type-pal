# CODE3g：CLI IO、输出所有权与测试证据复审

归属[94前全部83卡](../../../tasks/QUALITY-PRE94-RETROSPECTIVE-1.md)，原[3g卡](../../../archive/tasks/done/CODE-QUALITY-3g-pal-extract-cli-io.md)的done保留为历史。基点c2fee5a9e、唯一codex/code-quality-3y、main=f98d0ddd8；本轮3g仅partial，0新关闭。

## 已实际读取与职责

[读取边界](read-boundaries.json)登记CLI901行、五CLI测试、两输入fixture、BDF parser与asset-manifest等十二份全文；extract-videos/root scripts/docs renderer仅所列局部，不冒充整文件验收。顶层pnpm extract调用包内tsx src/cli.ts，所有路径从模块位置推导；原盘只读，输出先清理，逐文件同步写出，最终才写asset-manifest。

真实生产链是解析/roundtrip/注记/切分→各表与资源写盘→manifest，子模块沿已核公共出口复用。当前writeFileSync不是整个提取过程的原子提交，失败可能保留部分输出；本片只记录事实，不据“写盘原子性”标题擅自引入新事务设计。旧头的PNG目录/历史阶段说明与当前gzip输出也不全一致，产品注释与实现本片冻结。

## 直接反证：字符串guard不能证明输出所有权

当前治理树data/extracted链接主树产物；所有实验都在自建TemporaryDirectory，未在真实工作树执行提取。未改CLI副本的[four-run原件](output-boundary.json)和各stdout/stderr.gz记录实际命令、cwd、exit/signal/spawn、原始SHA、两侧marker与videos字节。

| 输入目录形态 | 实际结果 |
|---|---|
| 自有普通OUT | 清除旧marker、保留videos，随后缺SSS退出1；吻合既有策略。 |
| OUT本身链接另一临时树 | suffix guard通过，删除链接目标marker、保留videos，随后缺SSS退出1。 |
| data父目录链接另一临时树 | 同样删除另一树extracted中的marker。 |
| 自有OUT中的子项链接 | 只unlink该子项，目标marker保留；不能泛化为所有rm都递归跟随链接。 |

因此旧CLI整文件关闭撤回rework，开[输出边界高风险卡](../../../tasks/QUALITY-EXTRACT-OUTPUT-BOUNDARY-1.md)draft；按用户资产管线停止线，先交可审阅的拒绝共享输出方案，产品修复等裁决。Node官方[realpath](https://nodejs.org/api/fs.html#fsrealpathpath-options-callback)/[lstat](https://nodejs.org/api/fs.html#fslstatpath-options-callback)解释路径与链接区分；本次删除事实由真实临时CLI观察证明，不能只靠文档推断。

首个探针在macOS /var与/private/var别名的自有路径校验处失败，尚未启动CLI；[失败回执](probe-setup-failure.json)及原脚本字节保留。归一化探针自己的路径后才执行四次观察，不把setup失败记为产品反控。临时树全部精确移除、正式CLI SHA保持。

## 四目标逐文件与测试质量

| 文件 | 已证事实/本片处理 | 未闭合范围 |
|---|---|---|
| cli.ts | 全文及真实命令入口已读；输出root/data父链接穿过suffix guard有直接counter。 | 输出策略待裁决；其它资源降级/原子性/manifest与整文件统一门仍待，旧关闭→rework。 |
| cli-error-exits.kimi-r1.test.ts | 七例真实复制源码到临时树，精确exit/诊断/事件未落盘与videos双侧oracle；清理例明确观察加载输入前清理。 | 没有共享输出反例，不能证明guard confinement；临时树注册时机、spawn/signal/失败收尾待后续宿主切片。 |
| cli-isolated.glm-q.test.ts | 六例实际CLI运行，按缺失文件分段停止/全管线到底，部分表有直接内容oracle。 | full-pipeline的fileCount>10不证明manifest完整内容；多处分段合同/宿主重复、未知oracle判别力待反控；仅review。 |
| cli-font-lookup.glm-q.test.ts | 两例直接BDF/lookup落盘，glyph完整内容有独立expected。唯一更正：19970是丂/U+4E02，中是20013/U+4E2D。 | 只改注释，fixture/body/身份不变；复用宿主与全文件合同未闭合，仅review。 |

其它已读context不自动登记接受：battle-assets核gzip字节/manifest与PNG签名尺寸，尚未逐像素核CLI正向FBP；global-entries十四例对独立hook/alias有明确完整输出oracle，不能因body相似删不同caller轴。其fixture头“1-based敌id”与当前直接下标表述需单独校准。五份测试复制宿主、四份runCli缺spawn error handler，存在明确可复用候选；当前未擅自抽取或重写它们，也不把缺少反控说成用例无效。共享fixture的WAV/MIDI/OGG是字节透传样本，不冒充完整音频格式验证。

本片无行为修复/退役，没有新增业务AssertionError针；四次IO观察是高风险前提反证，不冒充测试判别力针。字形注释差异见[精确delta](font-comment-delta.json)，无业务body变化。

## 回归与下一片

[本候选实际回执](regressions.json)：五CLI+三BDF文件共41通过，0失败/跳过/stderr/act/环境诊断，extract typecheck通过。旧完整extract72/432结果来自[同源3d检查点](../3d/gates.md)，本片没有重新跑完整包，不改写成新执行。docs/lint/ledger等见[gates.md](gates.md)；原件由[只读核验](verify.py)另进程重建，不冒充第三方审查。

上述零诊断范围是Vitest外层原始输出。CLI子进程的stdout/stderr由既有测试捕获，错误/缺字库等输出属于所测合同，多处仅有局部contain断言；本片没有逐条保存并核清这些测试中的全部子进程诊断，仍为review。四次独立输出边界probe的完整stdout/stderr另行保存，不用外层绿色替代子进程输出审核。

资产输出修复只等该裁决，其他83卡与94–102/editor范围可继续。当前83卡12partial/71pending/0整卡accept；下一片3h assets/shell，或用户批准后先修输出guard。完整check/official ratchet/protected fast等待稳定窗口，editor运行时诊断未清，不合main。
