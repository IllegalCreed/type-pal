# QUALITY-CONTENT-ASSET-CONTRACTS-1 — 内容资产登记与引用闭包专测

Status: done
Phase: phase2
Owner: Codex
Coding Owner: Codex
Reviewer: Codex
Last reviewed: 2026-11-19
Template: task-card-v1 / 1.0.0
Branch: codex/code-quality-94-102
Visual Verification Timing: N/A

## 目标

逐文件核验当前工程资产登记、引用定位及文件闭包的测试合同。合法作者输入走现行守卫，错误结果按资产和来源精确断言，重复测试按合同合并。

## 范围

起点是 `701b34334dd4b07d72c2d88180c67cb693f076fa`。机器账本为 3,795 tracked、1,062 closed、0 review、2,733 pending。Content 共 50 条 pending。比较 `codex/q2-content-coverage` 在 `9cc119d771b0670b395d5b454dabd8cd1fce7afe` 的提交差异与工作树现况后，14 条有直接写入重叠。

第一切片的独占写入范围为 `packages/content/src/` 下的 `asset-catalog.contracts.test.ts`、`asset-closure.contracts.test.ts`、`asset.test.ts`。其它三条资产候选为 `asset.resource-boundaries.test.ts`、`asset.cursor-pure-wave2.test.ts`、`asset.residual.test.ts`，待按实际职责划下一切片。新文件只承接明确的有效合同。

## 前提与证据

现行 [内容格式](../../phase2/specs/content-schema.md) 和 [工程生命周期](../../phase2/specs/project-lifecycle.md) 约束角色和稳定 AssetId。已全文读 `asset.ts` 与六个原资产测试。真实加载方 `reforge/src/project-loader.ts` 的 `assembleCurrentProject` 先验证目录再核 manifest 角色。编辑器 `core/editor-asset-references.ts` 持有作者视图并生成引用，`core/asset-diagnostics.ts` 负责诊断。文件闭包的读取器与摘要回调由宿主提供，Reforge 测试装配有具体消费者。

活跃 E2E 在 `asset.ts` 加入战斗召唤音及传送到达音效引用。此片覆盖现有路径、角色、场景音乐引用和独立的物理文件诊断。行为、接口、内容格式、生成物和 E2E 归现有 Owner。

脚本库预读确认当前 loader 明确拒绝磁盘 `content.scripts`，现行 runtime 通过作者库编译并仍有内存 `ScriptRef`。旧分片出口的退役需逐消费者定界，未纳入本片写入。

## 验收

按 [八维规范](../../engineering/guides/code-quality.md) 与 [测试质量验收](../../engineering/guides/agent-workflow.md#测试质量验收用户-2026-10-03-固化) 记录每个原主体。旧原件按候选、输入与现行合同复用。首次基线的十个资产与脚本库相邻专测共 131 项，Vitest 4.1.7 默认及 JSON reporter，退出 0、stderr 空。

逐片执行定向、必要相邻测试、类型及静态验证。重型全仓与覆盖率放在累计窗口收尾。已验 #69 合并后在 main 的文档和保护覆盖率实跑。覆盖率通过 20,592 项，文档无问题，两份完整作业日志诊断为零。 [文档 CI](https://github.com/IllegalCreed/type-pal/actions/runs/44468724298) · [覆盖率 CI](https://github.com/IllegalCreed/type-pal/actions/runs/44468724330)

## 状态与交接

2026-11-19，Codex build allowed。使用既有治理分支和隔离工作树。首片仅测试结构、合法夹具与判别力整改。Coding Owner 按原始身份计数。相邻依赖补读和包级通过各有证据边界。

下一片先核剩余资产测试的生产入口、夹具真实消费及活跃 Owner，再确定合并和拆分位置。

2026-11-19 用户同意先做 Content，再沿同职责的生产消费者累计约百个主体。先接 Editor 资产诊断，再核 Reforge 文件与资源读取，后续按实际 Owner 及适用资产供应链排期。E2E 已占用的写入范围留在原任务。

## 逐文件审核

六个 pending 原主体全部读完。测试原路径、后继和全部 78 旧执行身份见执行归档内 `asset-transfer.json`。现有目录夹具的窄增量单列，代码读取和相邻验证不计入原主体。

| 原主体 | A 正确性 | B 注释 | C 职责 | D 复用 | E 测试 | F 命名 | G 简洁 | H 可测试 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `asset-catalog.contracts.test.ts` | 项目相对路径原样保留，12 类拒绝走相同来源字段；目录与 manifest 分别捕获记录、角色和资源类型错误 | 移除批次编号和错误的空格说明 | 目录、路径和角色准入归目录专测，引用闭包迁到闭包专测 | `audioProjectAssetFixture` 生成实测合法角色配置，`deepSnapshot` 核实际传入对象 | 记录路径、角色路径和不变量按完整错因断言，合并同轴路径测试 | 三组标题按实际校验职责 | 移除不必要的 `as never` 和自比；保留每类真实错误，以及仅缺最后一个必填音乐角色 | 纯 JSON 数据，无 IO 或时钟 |
| `asset-closure.contracts.test.ts` | 合法作者入场与真正重复引用，缺失、类型冲突和未引用并存，读取失败后继续校验 | 注明 Node 摘要作为独立 oracle，去掉历史任务编号 | 以引用与文件闭包的输出为中心，物理读与摘要作为明确注入端口 | 共享合法二进制记录与同模块的已引用键 | 保留缺失文件、长度、真实 SHA256、非 Error、重试及原错误传播，指定反控旧全绿、后继单红 | 标题体现闭包与诊断 | 合并三份测试中的物理故障合同，分别观察按 path 读和按字节算摘要 | IO seam 可用独立字节和 Promise 控制，无真实文件写入 |
| `asset.test.ts` | 全文核过原 29 项，原缺字段角色、敌人、物品和强转作者场景改为当前 guard 与投影验收 | 去掉过时的持久分片组和混装标题 | 目录与物理闭包分别迁移，项目图收敛到 `asset-project-references.test.ts`，映射函数测试归 PAL 资产键 | 复用当前项目夹具和两处真实作者验证；场景入口用同一合法最小工厂 | 精确来源、位置和存在性；旧同错强转、只验错误种类和重复的路径行有后继 | 新名字说明工程级引用图 | 29 个原测试身份全部映射，去掉重复目录和闭包判断 | 同步采集，真实类型守卫和作者运行投影在同一 Node 测试入口 |
| `asset.resource-boundaries.test.ts` | public unknown 合法防御、单命令与整树责任、物理闭包三类输入分开 | 标记坏输入只用于 unknown 边界 | 元数据到目录、命令到命令专测、共享与 IO 到闭包专测 | 共用 `deepSnapshot` 和真正的当前作者库 | 13 个旧身份保留诊断、非 Error、所有权和精确嵌套路径，正控改当前公开 guard | 去掉泛化的 resource-boundaries 文件，按调用职责落位 | 原路径退役；同一 valid 目录重复自证合入显式正例 | 正确 digest 仍由 Node 产生；独立读失败与重新读取 |
| `asset.residual.test.ts` | unbound 头像用合法 cue；缺头像与坏类型分开；PAL player 0、enemy 1 区分 | 删除已经过时的批次与 caller 行号 | 头像属脚本节点扫描，PAL 号码属资源身份映射 | 复用作者树 guard 和共用快照 | 精确定位 `cue.identity.portrait.asset`，坏数值精确拒绝并展示 scanner 防御；保全三条旧身份 | 原文件和标题不以残项命名 | 既有动作非资产字段检查合入命令专测 | 纯 guard 与带字段输出，无外部资源 |
| `asset.cursor-pure-wave2.test.ts` | 合法 TilesetDef.id 只定位定义，实际二进制 AssetId 来自 `asset` | 移除作者标签和过时覆盖范围 | 瓦片集边与项目级数据边同职责 | 共用项目扫描器和 `deepSnapshot` | 同文件路由实际 guard，精确 kind、作者位置和数据原样 | 搬到按工程引用命名的后继 | 无重复路径，无外部旧夹具依赖 | 同步最小目录输入 |

新增路径分别核对了适用边界：

- `asset-command-references.test.ts` 的 A/E 由合法 `AuthorCommand` 与完整位置单列非业务草稿。B/F 用标题表达单节点、整树和直接头像。C/D 保持遍历责任的真实分界，复用守卫和快照。G 将静默、负输入和嵌套归同一职责，H 可直接观察输出和输入所有权。
- `asset-project-references.test.ts` 的 A/E 验证当前作者场景、项目角色、场景战斗臂、物品、敌人运行投影、瓦片集、持久角色引用及确切位置。B/F 去掉旧分片与粗粒度遍历表述。C/D 保留项目汇聚职责并复用验证者、类型和合法夹具。G 去掉重复校验和强转，H 不需要加载正式地图或实际 E2E。
- `pal-asset-ids.test.ts` 的 A/E 借实际 PAL 供应与读取键合同固定名称空间和最低值，分表断言。B/F 用当前资源类型命名。C/D 只承接现有映射，不与文件读取混合。G 号码夹具按类型表共用，H 直接验证确定性返回和异常。
- `__tests__/asset-catalog-fixtures.ts` 的窄改仅新增两个实际调用方共用的七项记录。A 保留各来源前缀，B 明确是元数据假设，C 组件私有，D 两个真实测试消费者复用，E 由正式 catalog 和角色 guard 观察，F 按角色 fixture 命名，G 排除未消费的旧记录，H 每次生成新 JSON 对象。旧单精灵 fixture 函数未改。

## 验证与复验

[资产切片的单一执行归档](../evidence/QUALITY-CONTENT-ASSET-CONTRACTS-1.tar.gz)保存同一基点的 131 项初次定向、原 78 项资产用例身份、最终 86 项及其全映射。按失败降级反控，旧资产用例 78 全过，最终候选恰一项业务断言失败，指定缺失项为 `unused-asset`。未变的产品文件 `asset.ts` 为 Git blob `9a34886f816d7d52b91b15140834e37c2acc7623`。反控由隔离的 Vitest 配置在内存内加载单一变体，不写产品路径。初版夹具的导入、作者类型与预期排序错误，以及一次导入顺序诊断原样保留。最终普通定向 86 项、Editor 14 项、Reforge 21 项、Content 类型与六路径静态检查均通过，stderr 为空。

快速核对先看归档 `asset-transfer.json` 的实际路径、源指纹和完整用例名，再对照归档 `runs/content-asset-final-directed/` 的原生结果。配置与候选文件身份一致时，按各 `execution.json` 复跑必要定向。实际生产公开合同、E2E 的资产文件或作者生成形状改变时，复验受影响目录、命令或引用结果。复验 scope 中的历史工具接收固定旧候选，原日志/策目不重写。本片未启动全仓检查或覆盖率。

2026-11-19 Editor 切片 build allowed。核对活动 E2E 与治理卡，限 `packages/editor/src/core/` 中的 `asset-diagnostics.test.ts`、`asset-diagnostics.glm-leaf-wave.test.ts`、`video-metadata.test.ts`、`video-metadata.boxes.test.ts` 的现行夹具、小范围测试重组。生产目录标题、诊断和预览逻辑只读。两份混装测试的原有效断言分别进入真实诊断入口与视频盒解析专测。

### Editor 诊断与视频元数据专测

| 原主体 | A 正确性 | B 注释 | C 职责 | D 复用 | E 测试 | F 命名 | G 简洁 | H 可测试 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `asset-diagnostics.test.ts` | 所有目录元数据按当前 guard 验证。提升合法作者路径碰撞例，完整核 owner、kind 及诊断 code | 测试标题写真实合同，不冒称完整枚举覆盖 | 目录标题与作者诊断保留真实 UI 消费；视频字节解析另归专测 | 同一标准入口承接三个已有诊断变体 | 把库外路径与合成所有权替换成合法来源与当前访问器；独立核未命名资源和缺头像回退 | 文件以诊断职责归组 | 合并手拼冲突与真实作者冲突，保留两种期望 kind | 同一 locator 与投影可用合法最小输入同步复验 |
| `asset-diagnostics.glm-leaf-wave.test.ts` | 目录标签、资源诊断与视频字段三类分别核，错误的旧路径和短摘要换为合法 fixture | 移除旧批次与“未知 box 使扫描停止”的标题 | 诊断与视频盒无共享业务规则，分别承接 | 既有标签表保持类型穷尽；视频盒 fixture 按解析职责共用 | 七个身份完整映射，断言根据合法调用更新 | 作者/批次路径退役 | 合并重复的标题和诊断正控，保留无标签、原作者与两种 handler 域 | 节点与字节各自测试，无浏览器媒体加载 |
| `video-metadata.test.ts` | 走解析器的普通、无音和无法识别三态；构造有效盒头，明确不含可播放媒体样本 | 说明 metadata-only 输入，非法头放在单独测试 | 一个入口验证盒长度、容器子树和指定字段 | 使用同文件 `box`、`handler` 与 `fileType` | 有意负输入以确切三态断言，零长度后带真实音轨可拒变体 | 按 MP4 元数据实际职责排序和命名 | 合并两份重复构造与图谱，移除未证的旧标题 | 确定性 byte array，可精确替换字段 |
| `video-metadata.boxes.test.ts` | 扩长头、到尾、短头、父边界、meta 标志区和深层容器均按公开入口 | 旧的“非安全数”未曾实测，现有断言只记录真实越界 | 合入相同解析器的主专测 | 不再依赖同时承载其它 codec 的老 fixture | 六个原身份按独立业务轴配对，原例无后继的情况为零 | 原路径退役，测试分组使用实际能力名 | 同一 hdlr 位移的重复负例合一；丢弃对 fixture 长度的旁证 | 欠缺与零长度的变体均由真实原始字节观察 |

普通定向 25 项（诊断 5、视频 17、相邻资产来源 3），Editor typecheck 与局部静态通过且 stderr 空。相同诊断归档中的 `editor-asset-transfer.json` 有 18 原身份到 22 后继身份的完整映射。零长度文件类型盒的新负例放置了可识别的尾随音轨。只改内存中的一个尺寸分支，旧 14 项仍全绿，现行视频定向指定一项红，其余 16 项通过。普通产品路径字节未改。

实现留项由实际作者 `music` 引用和真实诊断入口复现。不存在的同名资产仍会阻止保存或检查，但当前会报告为实际类型未知；合法登记后正常解析。该改动需与活跃 E2E 写入的 Content 资产源合并检查，Editor 实现维持 review。切片证据归档的 `editor-diagnostic-own-record-observation` 留有精确结果。

2026-11-19 Reforge 资源解析切片 build allowed，唯一写入者 Codex。白名单为 `asset-resolver.ts` 与三份专测。已比对活跃 E2E 提交与工作树，无同名写入。正式 Loader 先验证目录和角色，`AssetResolver.record` 本就要求实际登记的资源，错误类型另走类型分支。基于相同已定资产身份合同，先留未登记同名项的失败回归，保留明确登记的同名合法 AssetId，并验证 Loader、缓存和异常传播。Content 与 Editor 的[诊断留项](CONTENT-ASSET-RECORD-OWNERSHIP-1.md)继续等原 Owner。

### Reforge 资源解析

| 原主体 | A 正确性 | B 注释 | C 职责 | D 复用 | E 测试 | F 命名 | G 简洁 | H 可测试 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `asset-resolver.ts` | 正式装配持有 catalog 与 FileSource。实际登记缺失在 kind 验证和 IO 前失败，明确登记的同名键正常读取 | 现有方法表达职责，无误称完整解码或取消 | 本模块只解析真实 path、kind 和角色。Session/源负责资源生命周期，resolver 无缓存和异步写状态 | 同一区分用于直接、角色和缓存调用，三种 transport 各保留适合的返回类型与同一包装 | 真实登记 guard 与生产 `record/readBytes`，红例只在未登记断言失败 | 定界为 AssetResolver 的资产解析 | 两行修复，无新增导出或陈旧 fallback；保留 optional source.dispose 的已证语义 | 以合法目录与真实 FileSource seam 直接验证 |
| `asset-resolver.test.ts` | 旧夹具虽有 typed 角色，路径读和退役混装可从真实业务返回重验 | 以类型与测试名注明输入是媒体传输，不是解码 | 目录、角色与读取流程在同一 class 专测内分组 | 合法目录与源共用，小输入每例重建 | 断言返回实际缓冲和文本、IO 的必要路径与真实释放；对内置同名候选先红后绿 | 主测试名保持类职责 | 将分散的合法读取与读取错误合并，无无意义的泛型 JSON 正控 | 独立 Map、受控失败和原样输出 |
| `asset-resolver.failure-causes.test.ts` | Error 与非 Error 原样包装，HTTP 无可选 dispose 的合法生命周期 | 移除过时行号与覆盖宣称 | 同一 transport 与 source 生命周期合入主专测 | 复用现行文件读取架构 | 旧强断为 Error 的测试换成精确 `rejects`，同源真实返回恢复；两身份明文映射 | 按读取失败语义并入 | 删除无意义 throwRaw 标记和只核非空字节的 oracle | 无 sleep 或外部读写 |
| `asset-resolver.io-boundaries.test.ts` | 修复原 typed 伪型输入和不合法音乐角色 fixture；错 kind 反例以真实 manifest 先拒绝 | 淘汰交付编号和针对旧实现的玄学防御 | 先解析，再读取、URL、失败处理 | 借同一已验目录和源，不再依赖跨职责 GLM 夹具 | 六个旧身份保留。替换条件状态、宽松 matcher 和未验证 `as never`，确切失败、返回和恢复 | 按行为归组到类的唯一专测 | 退役重复测试文件，缺角色用真实可选角色而非非法主线正控 | 真返回字节与文本，失败可控且重试同路径 |

`reforge-resolver-transfer.json` 对照原 11 个身份、一个新增合同与候选 12 个身份。第一次仅加回归时一项失败，随后同组及两个 Loader 邻接共 21 项通过；组织整改后同一范围 21 项无诊断，最终候选回换旧实现仍恰好一项失败。Reforge typecheck 与两路径 Biome 零诊断。行为变更的精确中间候选已固定，按用户约定在统一提交窗口把行为修复与测试重组分提交。

2026-11-19 浏览器资源源切片 build allowed。Reforge 的 HTTP/FSA 生产者、实际打开工程的调用和相关测试已读。首先整理 `file-source.test.ts` 和 `file-source.cancel-windows.test.ts` 的同合同，随后核 `fsa-source.test.ts` 与 `fsa-source.cancel-windows.test.ts`。资源 URL、关闭时的 IO 状态和工程保存路径如有新取舍，分别记录真实反例和准入。无活跃 E2E 同路径写入。

### Content 目录进入点的校验专测

2026-11-19，Codex build allowed。先于后续相邻模块处理 Content；原主体 `data-guards.glm-o.test.ts`，独占范围仅该混合专测及 `stamp.test.ts`、`world-variable.boundaries.test.ts`、`map-index.contracts.test.ts`、`migration-diagnostic.test.ts` 四处承接用例。瓦片集已有同输入合同，不改其现有专测。未更改产品 guard、目录格式或活跃测试调用。相邻 E2E 分支在 `4ad644b7aae107275315336d23048665e49a38a6` 的改动与工作树未占用这些路径。旧脚本分片涉及正被 E2E 改写的 Editor 指令表单，先保留原状。

2026-11-19，Codex build allowed（Content 测试夹具）。独占原主体 `__tests__/cursor-pure-wave2-fixtures.ts`、`glm-foundation-fixtures.ts`、`glm-content-residual-fixtures.ts`、`codex-resource-contract-fixtures.ts` 和这四个模块的直接测试导入，比较活跃分支及本地改动无直接交叉。旧脚本分片专测属于只改引入的相邻项，主实现及其用例仍在原候选范围。已知与 E2E 物品测试共用的 `glm-item-logic-fixtures.ts` 保持原状。

| 原始主体或保留出口 | A 正确性与边界 | B 注释 | C 内聚与耦合 | D 复用 | E 测试质量 | F 表达与命名 | G 无多余部分 | H 可测性 |
|---|---|---|---|---|---|---|---|---|
| `data-guards.glm-o.test.ts` | 全文 196 行，核图章、瓦片集、作者变量、地图库与诊断表的合法/非法入参；对应真实入口 `loadCurrentProject`、图章保存、Editor 变量与地图命令 | 移除旧波次及目录级“残臂”宣称；保留来源、坐标单位及字段语义 | 文件混装五个独立数据所有者，逐条迁回，不新增共享异常基类 | 复用承接专测的合法模板、变量定义、目录和诊断夹具；旧瓦片集全部有同合同 | 12 原身份逐条映射，8 个必要边界保留或加强，规范化路径冲突在已有精确专测中承接；唯一负控由业务错误位置断言失败 | 留存文件和用例均按数据语义，去除执行者命名 | 移除混合文件并减少 4 个净重复用例；既有 54 个相邻身份全保留 | guard 为确定性纯逻辑；对合法输入只改所测字段，用 TypeScript 和精确路径定位，无 IO 替身 |
| `__tests__/cursor-pure-wave2-fixtures.ts` → `actor-fixtures.ts` 和专测内数据 | 演员输入覆盖真实角色守卫与场景引用；目录记录只测形状；商店每次新建记录避免改写污染 | 删除按交付命名的头注；不称测试元数据验证实际物理字节 | 演员数据由专用辅助供角色、引用、奖励测试；价格表与 tileset 记录分别归唯一测试主体 | 同形角色输入共享；仅单处目录元数据局部化；快照直用已有同合同实现 | 全导入用例生效，保留商店交易 oracle、角色真实装配、脚本和物品的实参快照 | `actorWithPortraitsAndBattler`、`pricedShopItems` 命名声明用途 | 原额外的快照转发、拷贝式命名、无调用的目录 origin 参数退出 | 数据工厂独立、无全局状态；保持既有返回值与参数约束 |
| `__tests__/glm-foundation-fixtures.ts` | 实际只用于技能和毒守卫；技能最小样本补齐 `SkillData` 必需描述与场外可用项，毒仍允许故意在单轴负例传非法 id | 删除对无人调用的“合法计划/物品”的主张 | 技能和毒各自测试拥有构造，不引入生产包反向依赖 | 只有同一测试文件消费各自工厂，域内共享充足 | 守卫、合法项目技能样本和原字段拒绝断言仍全部执行 | 就近 `minimalSkill`、`minimalPoison` | 退役三个无引用数据工厂及多用途文件 | 两个工厂类型约束保持靶点清楚，每次建新值 |
| `__tests__/glm-content-residual-fixtures.ts` | 唯一当前消费者 `author-dialogue.field-guards.test.ts` 对合法 narrator cue 的标量和数组快照 | 不再承诺无消费者的 Map/Set 支持 | 只共享已验同一对象前后比较，不引入对话逻辑依赖 | `value-snapshot` 覆盖真实输入；没有同名又不同合同的共享入口 | 快照仍比较真实调用前后的同一 cue；测试身份和所有原断言未动 | 由快照职责命名 | 删除重复递归转换和一层导入 | 纯函数，无系统状态 |
| `__tests__/codex-resource-contract-fixtures.ts` | 唯一消费方旧分片边界专测时用普通 JSON 值，不改旧加载路径 | 注释承诺只留在快照公共实现；不宣称分片是当前格式 | 不从分片模块抽一个通用 clone；快照归测试公用部分 | 现有快照覆盖真实数据；未把 Map/Set、非 JSON 值串进分片输入 | 所有旧专测身份保持，实际输入不变的 oracle 继续执行；该测试文件的其它合同未升格 | 删除按执行者命名的包装 | 删除四行、未增替代包装 | 只读确定性快照，无临时目录或副作用 |

`content-data-guards-transfer.json` 保留 12 原身份的可定位索引、读域和差异；唯一运行时替换见 `content-registry-path-witness.mjs` 及原件。正常范围 66 → 62 均零诊断，反控仅空键定位业务断言 1 红、其它 10 绿。夹具范围 114 → 114 同文件同名称全绿。相邻 Editor 13 与 Reforge 项目装配 13 零诊断，Content typecheck 和 16 文件的 Biome 信息级扫描同样为零。5 个原始主体完成，承接的既有测试和只改导入的相邻专测不重复累计。本次产品文件无写入，无 schema、save、迁移输出或实际资源变化。暂缓的本地资源源切片继续独立冻结。

### Content 小型跨域校验拆片

2026-11-19，Codex build allowed。原主体 `small-guards.glm-o.test.ts`；相邻承接按图像帧、敌队、运行场景、投掷规格、对白、引用和新档装配各自的现行专测。只迁有效断言并保留每条旧身份去向，不写产品文件。当前 E2E `validate.ts` 改动只与技能、毒及物品用效字段相关；本片读取场景空间与投掷明确独立的合同，不改前述范围、资产或 E2E。`record-items.guard-residual.test.ts` 若仅承接投掷断言，仍不据此关闭其它部分。

| 原始主体 | A 正确性与边界 | B 注释 | C 内聚与耦合 | D 复用 | E 测试质量 | F 表达与命名 | G 无多余部分 | H 可测性 |
|---|---|---|---|---|---|---|---|---|
| `small-guards.glm-o.test.ts` | 全文 185 行。核 Loader 的敌队和场景校验、Editor 帧数与引用，`buildWorld`、`resolveAuthorDialogueCue`、正式投掷 guard。合格输入与非法叶相互独立。 | 删除波次标签，厘清 facing 是非法方位、头像须声明。帧集合明确是索引而非个数。 | 跨七个所有者分回对应产品消费者，分别守住投掷和一般物品职责。 | 复用角色实例夹具、当前场景和现有 frame 组合；不统一无关 guard 的失败合同。 | 10 条旧身份逐条映射；保留非数组具体异常、四向边界、显式空效果、叙述输出和命名落点定位。 | 文件和用例按业务对象及实际行为命名。 | 退役混装文件，旧 111 个相邻天然身份仍在，重复净减 5 个。 | 新反控删除一条敌队槽位守卫；旧弱 `toThrow()` 误绿，新专测仅指定业务断言红。纯 guard 保证新样本可重复。 |

`content-small-guards-transfer.json` 记录完整转移和原件路径，标准范围 121 → 116、Content typecheck 与 7 文件 Biome 零诊断。源文件未改。另通过迁移诊断生产 guard 发现 `target.capability: ["use"]` 会被强制转作枚举字符串而放行，先挂 [迁移诊断字段类型](CONTENT-MIGRATION-DIAGNOSTIC-CAPABILITY-1.md)；没有改动 schema 或发布器。

### Reforge HTTP 与本地工程读取

2026-11-19，Codex build allowed，活动 E2E 无同文件写入；只改 HTTP 的过时注释及两种来源的测试组织。生产依据是工程生命周期的 FileSource 合同、`loadCurrentProjectFrom` 的读取和错误传播、`readProjectSaveState` 的 NotFoundError 分流、`AssetResolver` 与 Editor 本地打开和试玩的资源所有权。

| 原主体 | A 正确性与边界 | B 注释 | C 内聚与耦合 | D 复用 | E 测试质量 | F 表达与命名 | G 无多余部分 | H 可测试性 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `file-source.ts` | 普通 HTTP 只在真实 404 记为缺失，保存状态单独绕过缓存；原信号和响应体原生错误传递；`urlFor` 不做 IO | 删除 P3 落地占位，区分路径规范、上层闭包和 URL 存在性 | 传输仅归此入口；不承担资产类型和内容解析校验 | 多个读取共用同目录 fetch，HTTP 不复用本地句柄的逐步门 | 正常真实 `Response` 三种消费、取消原因身份、404 与权限或服务错误分别验证 | `joinUrl` 明确只构 URL；不扩大名字对应的合同 | 三个外部读取入口均有生产调用；HTTP 不存可释放资源 | fetch 替身只替换运输边界，响应解析不模拟 |
| `file-source.test.ts` | 普通相对路径、非法绝对路径、.type-pal 元数据和各状态码检查 | 移除假定「除 200 外一律失败」的说法 | 同宿主的读与错误在一起，目录 IO 另列 | 复用真实 `Response`，不泛化成错误较宽的任意传输 mock | 原 8 个合同和专项 3 个映射；精确字节、URL、错误名和 signal，清理全局 stub | 分为 HTTP 读取与保存状态错误，标题表述输出 | 合并重复的网络零调用与主体读取；独立句法错误 | `unstubAllGlobals` 确实还原；不靠计时器 |
| `file-source.cancel-windows.test.ts` | 原三项各核 signal 接收、URL 纯拼接、原生响应消费 | B8 历史来源保留在旧对象，不进入标题 | 并入同一个 HTTP 契约 | 与主体复用同错误码、响应与全局清理，和 FSA 不共享 | JSON 原生错误改为 `SyntaxError`，字节数改为逐字节，信号相同实例 | 旧名字实际并非分阶段取消；退役后行为分别定位 | 删除重复文件与三段单用的同类替身 | 同最终 HTTP 专测直接观察请求和响应 |
| `fsa-source.ts` | 逐段检查信号和路径，真实缺失透传；并发和释放窗口漏回收已复现，保持 review | 头注把撤销交给调用方，与源负责 `dispose` 的接口有冲突，随风险卡纠正 | 目录遍历和每源缓存的责任边界清楚；待补并发中的归属 | 文本与 JSON 共用目录查询；不把浏览器文件抽象成 HTTP | 串行本地对象原件可读、释放后不可读；额外两红只作为未修证据 | `fileOf` 独立于 URL, `urls` 明确是源内 cache | 未查到本地释放后的正常再利用合同，不能据此删除或修改 | 可控挂起能观察句柄时序和实际对象注册表，无需修改生产 |
| `fsa-source.test.ts` | 合法项目路径及原生 File 响应、真缺失与非法 JSON 区分 | 删除行号纪要；标明损坏 JSON 只为区分取消与解析 | 测试只保留该宿主的职责；可读 blob 由宿主验证 | 同一 typed 夹具服务读取、真实路径、取消和 URL 两种用途 | 原 6 条及专项 3 条合同迁入；等待各 IO 台阶再释放，正例实际读回字节 | 命名按文件读取、取消、URL 生命周期 | 不再伪造稳定 string URL，不以 spy 当释放证明；独立进阶门保留 | 没有全局 stub、宽类型断言或任意延迟；每例创建新源 |
| `fsa-source.cancel-windows.test.ts` | 目录挂起、预取消、非法 JSON 与原契约对照 | 删除 B9 方位命名 | 并入同一目录宿主 | 用受控 IO 夹具消除原三个实现层 mock | 原阶段承接到目录取消；新增文件句柄、取文件、正文与字节完成边界，断言后续 IO 未开始 | 文件以宿主的真实职责命名 | 删旧仅一段可重放的专测及重复预取消 | 通过进入信号同步，不用手数 microtask；断言异常和读取轨迹 |

旧两宿主 20 项，后继 19 项；同次实际运行包含保存状态、Loader IO 与解析器，一共 61/61。Reforge typecheck 与 3 文件信息级 Biome 均零诊断，HTTP 产品变化只有注释。`browser-file-sources-transfer.json` 有原身份、最终路径和看门证据。接受五个原文件，本地来源产品因为 [URL 所有权](REFORGE-FSA-URL-OWNERSHIP-1.md) 留 review，不算已关闭。下一步继续确认 Content 的旧脚本库与活跃 E2E 所有权，选同职责当前模块。没有运行全仓、coverage 或 protected。

### Content 现行脚本投影专测

2026-11-19，Codex build allowed。限定三份旧专测与其职责后继。E2E 在 `script.ts` 维护传送附加参数和 reveal 扩充，Reforge 在维护场景交接；不写这些实现，不改 E2E。核 [脚本合同](../../phase2/specs/script-system.md)、`validate.ts` 的实体页守卫、`ScenePreparer` 的入场选段、`ScriptRunner.runStages` 的转移和 Editor 预览的空状态。形状校验在运行时投影层测，禁止将磁盘旧分片称为当前格式。

| 原主体 | A 正确性与边界 | B 注释 | C 内聚与耦合 | D 复用 | E 测试质量 | F 表达与命名 | G 无多余部分 | H 可测试性 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `script-command.guard-residual.test.ts` | 全部命令数组、对白、换场、演出资源、动作、三种递归臂和页定义，区分结构与项目引用 | 删除过时 G4 与间接覆盖宣称；不把旧字段误写成合法参数 | `projected-script-validation` 保持输入守卫；入场能力和游标分归实际消费者 | 用现成输入不变断言，保持阶段、命令、页的实际路径名，不造统一运行器 | 同合法命令只破一个字段（如 `playEntityAction.loop` 必需）；保留原 21 身份对应的精确业务诊断、递归路径、不写入和合法正控 | 去掉 guard-residual，命令、入场与游标职责可直接定位 | 去掉重复的四投影辅助和每个命令共用的异类 wait 正控 | 对典型节点实跑公开 guard，无运行器或磁盘替身 |
| `script.cursor-pure-wave2.test.ts` | 正式 `checkStages` 接受数值 next，在 `applyStageNext` 写入负数时 `stageIndexFor` 读回第一段；只陈述存在输入域，不当作普通剧情可达 | 删除波次及重复证明历史 | 合入 `projected-script-stages`，专测运行投影读写，不写真实 WorldState | 复用成对有职责的触发阶段和 `expectAcceptsUnchanged` | 原负索引及上界正对照分入两个独立例，不用当前实现计算 oracle | 文件按阶段职责；用例写明储存游标和第一段 | 无重复的上界观测，保留唯一负值路径 | 世界与阶段每例独立，不依赖活动场景或模拟时钟 |
| `script.glm-o.test.ts` | 安全表转由真实 `checkStages` 走 prepare；游标和世界初态独立于合法命令输入 | 删除标题未实际断言的 mountParty，去掉历史分组和误称生产调用的包装器 | 入场与游标按系统职责各一个文件；不退役公开辅助 | typed `Command` 与现有 `ScriptStage`，无强转，不把各时序合成可配置万能 fixture | 原 7 身份完整映射。初态变为对所有 4 键及创建隔离断言；未指定 next 的观测在非零位置；旧包装表无法检测启用不安全开店，新 guard 例能 | 命名准确区分展示前命令和世界投影。目录没有执行者名 | 合并 wait、站位和重复游标证明；阻断命令仍各可定位 | 内存单点反控的原因是真实拒绝边界失效，前后无产品写入 |

归档 `content-projected-script-transfer.json` 记录 29 个旧身份、三个后继的逐行落点及源码版本。相同范围 84 → 85（保留的 55 项相邻用例全同名）。反控令开店绕开实际入场守卫：旧 7 项继续绿，新 7 项恰一条指定断言红；Reforge 场景预备、脚本运行和项目接入 71/71。修复第一次 typecheck 指出的非空元组声明后，stage 四项、Content typecheck、三路径信息级 Biome 零诊断。产品和 E2E 没有写入。结束本片新增 3 个原主体；旧磁盘分片五文件、E2E 消费的战斗、装备和清单测试仍按各自依赖暂停，未升格。

### 工程试玩来源与保存读取护栏

2026-11-19，Codex build allowed，两个读入口与两份专测；生产文件均与基点逐字节相同。试玩经 `play.ts` 的实际 HTTP／本地登记入口，后者沿 `withProjectDirectoryReadLock` 调用 `loadCurrentProjectFrom`。加载器消费稳定性前后检查；工程复制和编辑器保存 journal 也读该状态，写入权仍由编辑器单独管理。按[工程保存生命周期](../../phase2/specs/project-lifecycle.md)仅核一次读取是否可接纳，范围不覆盖后续惰性 IO 一致性。

| 原主体 | A 正确性与边界 | B 注释 | C 内聚与耦合 | D 复用 | E 测试质量 | F 表达与命名 | G 无多余部分 | H 可测试性 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `editor/src/core/load-play-project.ts` | 真调用走现行加载器；本地持锁，失败释放本地源、保留错误，成功将读句柄留给后续读取 | 注释的无 IO 构造、锁内检查和懒读所有权与实际一致 | 选择数据源并限定清理时机；不解析版本或持有写权 | 复用目录锁与当前加载器，不复制 HTTP 或解析规则 | HTTP、目录成功及失败用真实加载器重验，E2E 没改 | 文件和入口明确用于试玩，没有历史编号 | 两条来源都有 `play.ts` 消费；无旧版本分派 | 已有浏览器传输与目录入口可注入，测试只在清理处观察 |
| `editor/src/core/load-play-project.test.ts` | 用合法空工程经原生 Response 与目录读，成功可继续读；失败保留原生错误 | 去掉以 mock 透传冒称 canonical 验证的旧标题 | 只核试玩接线、错误与资源释放；锁竞争仍在真实宿主专测 | 共用实用空工程和当下保存夹具，不建另外的假项目类型 | 三条旧身份精确对应；查实际工程 ID、传输路径、懒读取和权限失败，释放观测不代替错误传播 | 按来源选择与资源时机命名 | 移除替代加载器与强转假句柄，每条有不同消费者边界 | 每例独立目录或 fetch，真实逻辑可执行，清理全局 stub |
| `reforge/src/project-save-state.ts` | 只把原生 NotFound 视为缺失；拒绝不合法记录和 pending；两个读端保证操作期间 token 相同，后续资源读取无此保证 | read-only、HTTP HTML 与操作级边界声明符合实现和生命周期 | 聚焦保存状态的解析与读准入，不复用编辑器写日志的职责 | 加载、复制、编辑状态共享状态读取／令牌；保存写入与读侧错误保持不同职责 | 格式每个独立字段、原始原因及状态变化由实际公共入口验证；plan hash 反控单红 | 状态、读取、令牌、准入用术语一致 | 现行常量与查询均有 loader、复制或 journal 消费；无旧版兼容分支 | FileSource 和读操作是窄端口；纯字段测试与受控读阶段分别可复现 |
| `reforge/src/project-save-state.test.ts` | 空数组作为一个实际输入；合法的两个阶段、原生异常、同操作换摘要均分辨 | 删除泛化的格式/失败描述，用具体情形区分错误 | 格式、仅副文件读取、单次操作准入独立分组 | 同一合法记录工厂及文本来源端口，失败不共享可变状态 | 24 个旧身份映射至 28 项；固定合法副文件场景，精确不同异常及内容前后读取顺序；去掉 hash 正好导致混合数据被返回 | 名称直接指向文件边界或状态变化 | 拆无关的成功/失败合测，保留不同原因；无重复大全套 | 变化由内容回调写入本地夹具，无真实公网或计时 |

见归档 `preview-source-admission-transfer.json`：27 个旧主体用例至 31 项的去向、两份原样产品指纹及 27 绿配指定一红反控。Editor 46/46 与 Reforge 43/43（含相邻读取与装配）、两包 typecheck、两文件信息级 Biome 零诊断。四个原主体定向接受，未碰保存协议、E2E 或现行业务行为；未启动集中门。

### Content 工程载入专测按职责拆分

2026-11-19，Codex build allowed。仅拆 `validate.glm-o.test.ts` 的现行合同；退役旧测试路径，不退役公开 API。E2E 占用的 `validate.ts`、`validate.test.ts` 原样，旧测试仍有明确覆盖的合同不在别处再造一个。复用[内容格式](../../phase2/specs/content-schema.md)对开局状态的约束以及此前通过的地图、图章、词表和保存诊断；定向查看加载器、编辑器保存前校验和迁移发布的实际入口。

| 原主体 | A 正确性与边界 | B 注释 | C 内聚与耦合 | D 复用 | E 测试质量 | F 表达与命名 | G 无多余部分 | H 可测试性 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `content/src/validate.glm-o.test.ts` | 全文 382 行；初始资源、开局、启动 manifest、场景空间、精灵字段、文本、图章、地图与变量按真实入口核；不用旧 `validateScenes` 当现行作者准入 | 删除批次名与从未断言“缺锚点”的过度声明，精确说明保留哪个错因 | 两个新专测只持 manifest 形状／精灵登记；开局、场景空间、文本和变量归已有宿主 | 开局与工程使用现有合法输入；场景沿共享空间守卫，无另造校验器；真实精灵记录及音频目录供前置准入 | 原 19 个身份全部映射。保存版本独立于内容版本；场景从实际 `validateAuthorScenes` 进入；保留原始数据与指定路径失败；命名落点反控单红 | 文件按当前职责，标题写验证字段、错误和路径 | 地图、图章、副文件及软换行已有同合同；无同条件堆叠；可转型数字字符串改成独立反例 | 纯数据可直接运行，目录记录先过正式 guard，不接浏览器全局或 E2E |

`project-startup-validation.test.ts` 的 A/B/F 核现行 manifest 的入口及独立存档版本，使用按字段失败的标题。C/D 只持文件级开局声明，复用正式守卫和合法目录；E/H 直接观测入口及指定诊断，不混异步装配；G 不复制已有空入口等合同。`sprite-definition-validation.test.ts` 的 A/B/F 区分世界精灵格式、动作字段、音频 cue 与目录引用；C/D 使用生产目录解析和确定性测试数据；E/H 错类型是一个**合法**音乐资源被用于精灵，正例独立核方向布局和声音；G 保留不同错误轴，不重测帧计数或图像 IO。既有开局、作者场景、语言表和变量专测仅承接独有断言，不重新计入原主体。

执行归档 `content-loading-guards-transfer.json` 保有旧身份、每个后继、固定源与原生结果。原范围 123 项通过；合并后的扩大范围 245/245，Editor 32/32、Reforge 28/28，内容类型和实际编辑的六路径静态检查零诊断。反控在正式作者入口下去掉命名落点空键判断，17 项中只有一条业务断言失败；未写产品。该原主体定向接受，集中门仍未开始。旧分片方案及与 E2E 相连的战斗与用物专测不占用这些写入范围。

### Reforge 静态图片缓存

2026-11-19，Codex build allowed 限三份普通专测的组织与判别力。核工程 Loader 按目录装配 `ProjectImageCache`、菜单和试玩消费者、浏览器解码任务、缓存状态与释放。产品和在途专测仅取证；当前 E2E 未占用这三个路径。

| 原主体 | A 正确性与边界 | B 注释 | C 内聚与耦合 | D 复用 | E 测试质量 | F 表达与命名 | G 无多余部分 | H 可测试性 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `project-image-cache.test.ts` | 同一已登记 face 错请求 portrait，pending 和 decoded 都拒绝；保持正常首次及复用 | 删除阶段标记，说明真实字节与解码器端口范围 | 单一缓存宿主测试，解析与读取使用实际 AssetResolver | 四个真实目录角色共用夹具，不借用 game 调色板 | 精确 kind/path 和位图身份，确认读取轨迹；解码前后显式边界 | 入口、所有权和路径用实际名字 | 去重全局手动替换和强转 | 受控端口无固定等待，结束时还原全局、清理已完成位图 |
| `project-image-cache.lifecycle.test.ts` | 不支持类别零 IO；同键共享请求；存储失败可重读；完成态可清理重载；实例互不关闭 | 去掉旧告警章和与实现不符的 resolver 调用数量宣称 | 合并到实际生命周期宿主；不固定在途行为 | 原生 DOMException、真实 resolver 和两个实例，同一夹具 | 六项全映射，拆存储和解码错因，期望具体返回和实际离线 IO | 结果以阶段和资源归属命名 | 冷/热类别拒绝合并，避免直接赋值全局与冗余双 restore | 独立目录及源，await 解码进入信号，不用 timer |
| `project-image-cache.decode-lifecycle.test.ts` | 真目录四种登记输入和 PNG/GIF 字节路径；解码错因与存储错因区分 | 删除固定行号和“真解码”的过度陈述 | 只核 Blob 交界、重试和四类登记准入；不加载真实场景 | 沿同一 Resolver，实际 Blob，平台边界保留替身 | 旧 13 项在 MIME 写死 PNG 时全绿；现在 MIME 一条失败、11 条正对照。字节和原始数据单列验证 | 文件归统一缓存专测，测试名反映故障位置 | 去掉自建位图编号、弱 cast 和依赖顺序的错误拼接 | 两个固定图像可用系统工具独立核尺寸，可控失败与解码，不调用真实浏览器 |
| `project-image-cache.ts` | **review**：跨释放两张图只关闭最后一张，重复释放仍可晚回填 | “同键”注释符合校验；待定生命周期未记录为承诺 | 真实缓存和释放由同一实例持有，但旧异步任务仍有写入权 | 复用 resolver 的实际目录，资源所有权不可与 FileSource 对象 URL 合并 | 普通专测有效；保留可复现的资源反例，不用绿测试覆盖缺口 | load/dispose 语义需要补明，文件按职责 | 简化相同键删除前先定任务拥有关系 | 真实 IO 和受控 decoder 能重现；实际试玩终止顺序待证 |
| `project-image-cache.inflight-dispose.test.ts` | **review**：它记录当前观察，不满足旧图应由谁释放的合同 | 注释“现行政策”尚未批准 | 归图像生命周期，待明确可返回的值后并入同宿主 | 不提前与串行 dispose 共享预期 | 两项实测通过只证明问题存在，不能当准入。单独 witness 有实际资源关闭结果 | 文件名语义有用，无需单纯改名 | 现有 timer 与强转等到合同明确，一起迁移 | 观察换成进入信号可独立复现，无需变更产品 |

归档 `project-image-cache-transfer.json` 含三份原专测 10 条映射至 12 条；Reforge 扩大范围 31/31，包 typecheck、静态检查零诊断。首轮类型诊断原件保留，定稿去掉 Node 类型依赖并为缺失 Blob 单列失败。两份在途旧用例仍原样，[释放任务](REFORGE-IMAGE-CACHE-DISPOSAL-1.md)单独记录。未跑全仓、coverage 或 protected。

### Reforge 启动准入与内置对白光标

2026-11-19，Codex build allowed。核目前 E2E 快照 `aee2d69c439378a5be98b154c2b788fbfed0a594` 以及工作树，独占写入仅限三处光标注释／专测、独立入口专测替换。现行 `boot.ts`、`main.ts`、试玩 chrome 及 `DialogBox` 为实际消费者；游戏的第一阶段头像加载和现行工程的导入规则均不在片内。

| 原主体 | A 正确性与边界 | B 注释 | C 内聚与耦合 | D 复用 | E 测试质量 | F 表达与命名 | G 无多余部分 | H 可测试性 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `dialog/dialog-assets.ts` | 现行内置 DATA chunk 12 的长度、帧数组、HTTP 状态及 Canvas 无上下文失败；颜色索引 0 和透明掩码是不同数据。入口为固定资源读取，启动/试玩的资源回收在宿主，不承诺这里独立中止 | 改正只负责光标而非头像，说明实际 mask 不变量 | 内置光标加载与像素着色共同服务同一资产，周期及缓存属 DialogBox | 复用共享 RLE 解析；RLE 调色板值与实际着色不共用判断 | 真资源和平台边界的区别见后继专测，资源 provenance 保持字节原值 | 路径、函数按光标合同；三色元组 alpha 固定，不改变现有调用签名 | 来源字段来自 JSON，当前诊断使用加载 URL；不顺手更改输入接口 | 纯解码与 Canvas 端口可隔离，平台行为交启动相邻测试 |
| `dialog/dialog-assets.test.ts` | 282 bytes 与三个实际掩码计数保留；长度、空帧、非 OK 和合法 RGBA 像素分别验证 | 注明零槽数据的由来，不承诺真实浏览器绘制 | 聚合加载和映射同一资源，不迁入大对话 UI 宿主 | 真 registry URL、原始字节、原生 Response；Canvas 只替换实际端口 | 原 2 身份覆盖 3 个后继，另加两条；专门反控恰一深比较失败，透明与不透明零值可区别 | 核结果的用例名取代并列混测 | 取掉弱类型断言和与 HTTP 无关的合并分支；保留一个真实资源 oracle | 每例隔离平台全局，着色见输出字节，无时钟或竞态 |
| `runnable-project-loader.ts` | 当前 epoch 固定；过期由独立入口拒绝，成功交正式读取器按开始/终止写入标记验证；匿名提示只标源，不假定所有畸形 JSON 同一错误 | 简短头注与现行格式一致 | 独立入口负责版本提示，正式 schema 和读取一致性仍由现有 Loader | 走真实 HTTP FileSource 及现行装配，不为测试接管 import | 定向覆真实启动场景和网络路由；不重复断言同一完整工程装配 | 文件区分工程可运行准入和装配本体 | 版本 probe 后的 manifest 重读属于不同职责，未合并失败优先级；无新增兼容路径 | 可注入 FileSource，拒绝分支不读任何场景数据 |
| `runnable-project-loader.glm-q.test.ts` → `runnable-project-loader.test.ts` | 非当前和同 epoch 缺启动场景均拒绝；真实启动入口成功；HTTP 使用项目目录 | 去掉交付人、覆盖率推断和不真实的全宿主说明 | 无 DOM 宿主，不装配无关 input/audio | 承接实际当前工程内存夹具，HTTP 用原生 Response | 4 原身份均映射；新增当前 epoch 缺文件防绕过；精确区分版本提前拒绝与正式载入错误 | 根据独立 Loader 边界命名 | 去掉 jsdom 和重复假 FileSource，保留合法 id 与非法 id 区别 | 无全局资源遗留，HTTP 只开放一个合法路径，独立定位 |

执行归档 `reforge-boot-resource-transfer.json`、`reforge-boot-resource/` 保留完整映射、4 条原文件指纹和执行原件。原范围 18/18；交付扩大范围 50/50；Reforge typecheck 与四路径 Biome 零诊断。颜色反控只替换一处 mask 判定，另外 4 条通过，精确失去索引 0 的不透明像素。未运行重型门。原主体累计 40。

### Content 旧磁盘脚本分片

五个原主体有完整读取和可复验观察，见[分片与现行引用的分界](CONTENT-SHARD-RETIREMENT-BOUNDARY-1.md)。它们由 pending 转 review，不计已完成；没有恢复旧磁盘格式、改变生产出口或接管 E2E 指令表单。

### Editor 资产命令与复制源快照

2026-11-19，Codex build allowed。音频、图像和过场面板将目录更新交给编辑会话；复制来源观察由工程另存为、沙盒克隆和无目录首存调用。编辑命令产品文件和保存写入器只读，核实际传给生产命令的作者脚本、字节和重做状态。持久化准入、文件清单与已观察字节各有独立责任。未接管 E2E，未修改数据格式、公共接口或资产生产路径。

| 原主体 | A 正确性与边界 | B 注释 | C 内聚与耦合 | D 复用 | E 测试质量 | F 表达与命名 | G 无多余部分 | H 可测试性 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `asset-label-command.test.ts` | 当前合法目录记录的显示名可清除；AssetId 与现有磁盘字节保留，历史可撤销和重做 | 过去的任务标签与导出声明移除 | 名称和引用命令按目录生命周期同置 | 使用正式装配的合法工程与编辑会话 | 将原名清空保真迁入并精确检查源记录和历史 | 后继 `asset-catalog-commands.test.ts` 反映用户编辑事实 | 删除只验证同名导出身份的断言，产品导出未动 | 实际状态变更可确定验证，平台 I/O 使用工程夹具 |
| `asset-reference-commands.test.ts` | 无目标、引用提供者抛错、实时引用阻拦提交、增加引用阻拦重做；分别核历史和目标 | 无需陈述旧临时状态形状 | 按目录稳定 ID 与现行作者内容分工；会话负责历史 | 复用当前作者目录和真实统一引用扫描，不自造扫描结果 | 原两条迁三条；删除重做入口重新核引用时恰有一条红，另四条绿 | 标题说明请求阶段、效果及历史结局 | 去掉不完整 EditorState 强转，用真实 unbound dialogue 引用 | 每例独立打开；注入引用来源，无等待计时 |
| `commands-wave2.asset.test.ts` | 同模块导出和 Error 继承只证明符号；实际替换必须能还原此前仅落盘的资源 | 按目录行为说明，移除治理来源标记 | `AssetInUseError` 改由真实删除路径核类型和状态，多余源文件退出 | 与资产引用测试共用同一工程端口 | 真实异常、记录及替换前后的具体 bytes，未将 barrel 别名算作业务 | 后继按目录命令组织 | 纯 identity/继承 smoke 退役，保留真实错误合同 | 合法 PNG 值在当前 loader 和复制测试独立消费 |
| `project-copy-source.ts` | 所有读取汇总同一路径摘要与缺失，读取改变时拒绝；核取证开始与封存前 epoch；禁止观察源绕成不受监视 URL | 注释明确只验证已观察路径及观察到的缺失，非全盘快照 | 目录清单变化归 FSA，源内容稳定归此，目标事务归保存器 | 共享 FileSource 与稳定比较，不将目录枚举夹进源字节逻辑 | 加可选文件出现的可证伪负例；生产语句未变 | `observeProjectCopySource` 对应读痕、非全盘清单 | 分开 byte/inventory/epoch 原因，无新增接口 | FileSource 注入，读、发生变化和封存验证可独立驱动 |
| `project-copy.test.ts` | 17 项原行为覆盖复制合法素材、目标授权、暂存、源变化和重新打开；新增合法 script-preview 从缺失变出现 | 改正“HTTP首存”，识别本体是无目录 FileSource；不冒声明浏览器传输 | 仅测试复制和保存配合，目录遍历仍有独立专测 | 复用有效 PNG 和原有工程写入/读取夹具 | 无效 PNG 换真实 bytes；三种拒绝分别核具体原因，删除缺失签名时一红十七绿 | 用失败类型与原因命名，保留原有生产功能分组 | 不再靠全部脚本变化抛同一宽泛错误 | 暂存和 IDB 以可控数据端口驱动；载入、工序与错误均为生产入口 |

`editor-catalog-copy-transfer.json` 列出五个原主体及后继的指纹、逐条迁移和原件。合同与相邻测试 188/188（含 5 条目录命令、18 条工程复制）；四路径 Biome 和 Editor typecheck 零诊断。两次单点反控分别 1 红 4 绿、1 红 17 绿。早期夹具与类型错误、最终执行及反控均保留；不为相邻通过记账。原主体累计 45。

### Editor 本地目录清单与 PAL 克隆

2026-11-19，Codex build allowed。E2E 最新本地 `c67629fa40f54a3e4926b75db204a7167c056b69` 未写入四个主体。`saveProjectAs` 持有源清单及读取证据，再把独立复验交给 journal；`ProjectPicker` 经 `open-actions` 取得合法空目标并从 PAL 资源地址克隆。对照现行工程生命周期的目标授权、源无写入、私有保留空间和前置复验，保持说法限于非原子文件系统。主体四个完整读取。

| 原主体 | A 正确性与边界 | B 注释 | C 内聚与耦合 | D 复用 | E 测试质量 | F 表达与命名 | G 无多余部分 | H 可测试性 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `fsa-copy.ts` | 寻址用实际 FileSystem 句柄，私有路径在递归前剔除；源枚举或读取失败向 journal 调用方传播；路径漂移和内容漂移各自处理 | 单处 DOM 异步迭代声明缺口、惰性边界 | 只持清单，不持字节、锁、URL 或写入 | `isWorkspaceIdentityPath` 是统一命名空间合同，字节交 `FileSource` 而非另设来源 | 路径独立 oracle 与按顺序注入移除/添加目录见专测 | `readDirectoryCopy` 返回可验证传输入口，本地来源与 Save As 主流程仍隔离 | 去掉 handle discriminant 已完成的重复强转与重复模块头；保留 DOM 互操作原适配 | 可控 native shape 模拟句柄和文件读取，确定性目录漂移 |
| `fsa-copy.test.ts` | 原十项含嵌套、空目录、私有别名、四种漂移、字节漂移、三种等待与目标再查 | 底层存储边界才替换，实际目标/权限检查、写入和日记保持现行调用 | 区分纯清单和从开始到目标落盘 | 复用生成的合法工程及统一保存夹具，预期不调用生产路径过滤 | 插入私有文件之前记录合法清单，明确检查私有目录及别名；反控恰一指定业务红 | 保留各实际生命周期名称 | 删除用同一判定生成预期的自证；独立数量和目标结果保留 | 内存 I/O 的闩锁配套释放、全局 stub 还原；不靠固定时长 |
| `clone.ts` | catalog 字节长度、摘要、规范 gzip 头、战斗帧结构依原顺序验证；可选文档由各自正式载入器验证；异常发生前不许报 100% | 去掉已不实的改写路径宣称，说明由 writer 掌管完成进度 | 源收集及准备进度归克隆，封存、写入和复核由授权 writer 协调 | 合并确实同合同的两个已读文档包装和三处准备进度更新；不合并文件的验证策略 | 原完整复制、字节、失败恢复；并跑实际 writer 和导出邻居，但不以邻居授信 | `readSeedBytes` 说明读取与校验，即时文档和惰性源写清 | 移除同值双 return 和私有分支的样板，保留外部签名及追加顺序 | 输入、目标授权、进度为可控入口，无全局时钟 |
| `clone.test.ts` | 合法目录镜像、未引用地图、错读和从封存恢复均核具体结果；改用真实 PNG 与字节比较 | 本地夹具的异常称源读取失败，不冒称网络浏览器 | 克隆链路与写入场景同置，流式目录清单仍独立 | 复用同一个合法 PNG 字节 fixture；复用 FSA/journal fixture | 七身份不变，断言合法资源实际写入和私有 marker 排除；tileset 正控用于本链路，异常校验另见 transfer 专测 | 标题仍按实际克隆行为 | 删除仅断言 PNG 路径存在的较弱重复 | 可控源故障、目标断流、身份交易恢复；实际 loader 验证，替换持久存储端口 |

`editor-directory-copy-clone.json` 与同名目录记录固定输入和原件。51/51，Editor typecheck 与四路径 Biome 统计无诊断；清单别名反控 1 红、4 对照绿、其余 5 未选择。两处实现重构均不改变输入、输出或资源归属，未运行重型门。原主体累计 49。

### Editor RLE 命令记录与实际资源读取

2026-11-19，Codex build allowed。最新活动 E2E `0cf78e75702313a15d675006d398c4352f09a02d` 无本片主体。实际添加/替换入口为 `tileset-commands`、`sprite-commands`、`battle-sprite-commands`，各自保有定义及影响域校验。读取调用来自 `App` 的当前会话接线，以及编辑器图像、过场及音频；MIDI Soundfont 按 manifest role 由 Reforge 浏览器端读取。改动仅是同合同的私有校验提取、专测重组以及证明真实字节。未改变资产格式、错误消息或公共接口。

| 原主体 | A 正确性与边界 | B 注释 | C 内聚与耦合 | D 复用 | E 测试质量 | F 表达与命名 | G 无多余部分 | H 可测试性 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `command-asset-record.ts` | 三种 RLE 入口守卫顺序、路径、大小、摘要语法和压缩标识不变；记录同一性包括来源 ref；实际摘要仍由保存路径核 | 明确摘要语法与流的字节验签不等价 | 命令共同的记录验证归一个私有函数，具体帧/地图及引用仍归各外部命令 | 三套代码共享同输入、失败策略和生命周期，传预期类型和稳定原错误标签 | 合法 seed 和同长度错头、仅变来源说明反控；验证真实三类调用测试 | 对外继续按资产命名，内部明确仅守 RLE 记录 | 净移除三套重复断言，保留各实际生产入口 | 无 I/O，使用合法原字节和精确诊断可独立确认 |
| `command-asset-record.glm-leaf-wave.test.ts` | 清除假 gzip 前缀冒充合法整资源；技能引用定位、错误负例和完整原生字节均保留 | 不再承诺旧编号、没有测试的展示扩展字段或假的领域过滤 | 资产验证与技能引用拆开，真实删除命令负责抛错结构 | 取消 core 对 UI test fixture 的反向依赖，用现行 loader 与 blank seed | 原六身份逐一迁移；两条 `.every` 空结果和人工制错误对象不再单测依赖实现；保留真实拒绝引用对象、领域正例及坐标 | 后继 `command-asset-record.test.ts` 和引用原宿主均按业务命名 | 删交叠边和 mock 自证 | 样本不写盘，产出经过当前输入守卫；origin.ref 单点反控一红三绿 |
| `editor-asset-reader.test.ts` | 合法资源记录和真磁盘字节；原读、未保存覆盖、复制隔离、撤销与真实文件回读；无效 kind/未登记记录不发 I/O | 避免用伪 manifest、假角色和三字节视频暗示实际格式验证 | 读取器使用 App 现行 getter 及编辑会话，媒体预览与资源格式仍属各入口 | 重用合法头像、正式工程读与角色配置，测试不 mock 被测读取器 | 原组合用例三条后继；将 ArrayBuffer 换成按字节比较后，绕过副本的反控由误绿变一红二绿 | 以操作和结果命名，不按提交者 | 删除双强转、万能读值和原句结构；相邻四份专测的字节断言同步复核 | 预览端以可控会话和实际 FileSource 驱动，作用域 mock 与源显式释放 |

执行归档 `editor-command-reader-transfer.json` 与同名目录保留三个主体、旧映射和所有相应执行。RLE 与引用定向 33/33，真实瓦片集处理邻居 9/9；四路径 Biome 和包 typecheck 零诊断。Reader、项目复制和克隆定稿同现行图像、视频、音频 UI 共 81/81，五路径静态和包 typecheck 无诊断。保留首轮类型错误、错误未分辨的反控与定稿反控。读本体的无生产调用 URL 和兼容别名待进一步裁定，未改产品、未计入。原主体累计 52。

### Editor 过场帧动画 Worker 传输

2026-11-19，Codex build allowed。活动 E2E `0cf78e75702313a15d675006d398c4352f09a02d` 无本片主体。过场创建与帧动画编辑委派编码和调色，纯 codec 为无 Worker 时的后备，也是 Worker 入口的实际计算程序。按现行 [编辑器设计](../../phase2/specs/editor-architecture.md) 固定完整 RGBA8 和惰性编辑的既有帧语义；只改专测，无产品改动。

| 原主体 | A 正确性与边界 | B 注释 | C 内聚与耦合 | D 复用 | E 测试质量 | F 表达与命名 | G 无多余部分 | H 可测试性 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `frame-animation-worker-client.boundaries.test.ts` | 原六身份保留到实际两个入口；原字节、传输后空壳、结果、错误与 worker 释放用不同可见量核对 | 删除批次前缀及只写 mock 就等价宿主的暗示 | 客户端协议留一个专测，codec 计算及 UI 另跑 | 两类请求的宿主错误共享同输入合同，输出字节保留各自 oracle | 原版 `structuredClone` 根据实际 transfer 分离内存，两帧检查具体字节及次序；无 Worker 真解码 | 后继按进程通信职责，名字不按作者及任务卡 | 移除和旧同名专测重叠的六个路径；正确分辨失败来源 | 局部替换 Worker 并在测试后恢复；不依靠定时顺序或浏览器支持的推测 |
| `frame-animation-worker-client.c07-g04.cursor-r1.test.ts` | 仅引用旧帧时的转移合同与两次并发应答排他保留 | 去掉编号和 `Uint8Array` 类型替代实际字节的含混描述 | 把 codec 降级与通讯合同分开 | 共用平台 testrig；真实旧容器由现有编码器建合法数据，不复刻计算公式 | 原十身份映射；删除错误 id 守卫仅“外来回复不得完成并发请求”一红，11 项相邻通过 | 按仅来源帧、跨请求、新帧等命名 | 不再以硬编码连续编号或 mock 次数独立代替业务结论 | 用可控应答和原生缓冲区转移，不引入生产测试缝 |

执行归档 `editor-frame-worker-transfer.json` 记录两份全文、16 项旧身份映射、真实 caller、相邻实现和复验入口；修正此前归档中过场组件路径简写。两份旧专测加 Worker 内核 29/29；新专测、内核与真实过场编辑 UI 33/33；类型与静态门零诊断。内存反控只让指定用例失败。产品本身的同步发送拒绝不释放已在 [宿主失败卡](EDITOR-FRAME-WORKER-POST-CLEANUP-1.md) 单列 review；普通浏览器可达性未知，未改。累计原主体 54；未运行重型门。

### Editor 音频试听所有权

2026-11-19，Codex build allowed。活动 E2E 同点 `0cf78e75702313a15d675006d398c4352f09a02d` 未占三份主体。实际 MIDI、WAV、MusicPicker、SoundPicker 和资源工作台拥有各自 transport、加载世代与失败；此模块只接管共用的活动请求身份。项目切换两处显式停止；不把异步设备销毁职责并入协调器。此片只改注释及测试组织。

| 原主体 | A 正确性与边界 | B 注释 | C 内聚与耦合 | D 复用 | E 测试质量 | F 表达与命名 | G 无多余部分 | H 可测试性 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `audio-preview-session.ts` | 四个真实入口使用同一协调器；先清旧身份再停止，旧结果不能接管；全局撤销先清再停。检查生产 stop 不会同步启动第三个试听，不扩写未知重入合同 | 记录为什么先撤旧身份、何时交接和各入口保有的释放责任 | 单一编辑器所有权，媒体 IO、播放游标和设备断开均归调用方 | 复用的是单活动身份合同，MIDI 和 WAV 底层不合并 | 19 项真实入口组合及 stale-release 反控，未靠静态检查推认 | `claim/release/stop/isOwner` 与外部动作及观察对应 | 四出口均有生产调用，不增加索引、计时器或全局配置 | 小 `stop` 端口、不依赖 DOM 和时间；真实 UI 邻居保留各自 transport 行为 |
| `audio-preview-session.test.ts` | 同身份重入、停止前可见的身份、异步旧 owner 的迟到释放、停止后新请求均单独检查 | 删宽泛的幂等标题，写明各精确边界 | 控制器仅测活动试听，不 mock 媒体解码再证明控制器 | 同合同转移至一个文件，使用稳定的活动接口，无共享 UI rig | 原组合轴逐项迁到四入口；用停止回调中观察的身份来防止提前交接 | 文件和用例写实际所有权合同 | 清理组合互证与重复计数 | `afterEach` 走真实停止归零；不等定时器 |
| `audio-preview-session.c09-g02.cursor-r1.test.ts` | 初始/重复接管、三次交接、活跃/非活跃释放、无身份再次停止全部承接 | 去任务编号及“逐轴”等流程叙述 | 专测按单一生命周期归档，播放器故障仍属邻接模块 | 新后继复用相同 owner 定义，无多余 helper | 十条独立映射；去掉 guard 只让迟到释放失败；无断言的重复空停并入可观察幂等 | 淘汰模型/任务命名，后继为 `audio-preview-session.test.ts` | 十例与混装用例收成四合同 | 全局只在测试内释放，回调和现行真实 caller 的作用分开 |

`editor-audio-session-transfer.json` 记录原主体与新版本指纹、身份映射、实际 caller 与原件。旧 11/11；定稿加四真实入口 19/19，退出 0 且 stderr 空；静态及 Editor 类型零诊断；反控为 1 红 3 绿。原主体累计 57；未运行重型门。

### Editor 帧编码 Worker 处理器

2026-11-19，Codex build allowed。仅接手两专测。已核活动 E2E 同点及真实 Client 发消息与 TPFS decode；产品入口装载专用 Worker 时注册 handler。为 Worker 自身发送失败另留退出边界预读，产品本身不计入。

| 原主体 | A 正确性与边界 | B 注释 | C 内聚与耦合 | D 复用 | E 测试质量 | F 表达与命名 | G 无多余部分 | H 可测试性 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `frame-animation-codec.worker.test.ts` | 真实生产模块注册 handler，合法双帧及同号错误；真实压缩与退回字节，不代替浏览器端验收 | 删旧 C7 过程叙述；断言直接说明回帖内容 | Worker 专测只负责外壳，codec 仍有独立解压缓存、像素处理合同组 | 使用真实请求类型及同一个隔离的 host；不合并前端 client 和 worker protocol 测试 | 原三例均映射；每次 `structuredClone` 只做一次生产传输模拟，比较原缓冲和实际 clone，真实帧字节与尺寸、缺旧源、空色表各独立 | 标题写具体请求/结果 | 删重复模块加载样板与共享全局待答队列 | 每个用例重建本地 scope，afterEach 恢复 global；同步 quantize 不通过等待掩盖 |
| `frame-animation-codec.worker.c07-g05.cursor-r1.test.ts` | 两项 ID 使用不同且非连续数字，结合各自像素证明没有错配；成功回帖带真实帧时间，错误不传输 | 取消“补覆盖”的成因、假设单像素能判抖动的声称 | 两份同一 Worker 请求聚合，调用方取消或序号策略由上一切片维护 | native transfer peer 统一，取样模式与真正像素区别取一例 | 原 10 身份归 5 合同。以两个中灰像素构造实际误差扩散，忽略量化模式仅目标一红；其它 4 绿 | 退役模型和批次名，后继指真实 Worker handler | 去重复 magic/header、只量 transfer 项数及失败后只核 undefined 的低辨例 | 小的请求数据夹具，无 UI 模拟与实际游戏时钟依赖 |

执行归档 `editor-worker-handler-transfer.json` 保存旧 13 身份映射（复用已存基线）与定稿、内存反控、类型和静态原件。定稿邻接真实过场 UI、帧草稿、核与 Worker client 32/32，无诊断；反控只因真实像素错误一红四绿。累计 59；未运行重型门。

### Editor 帧容器编解码缓存

2026-11-19，Codex build allowed。活动 E2E 同点无主体；过场创建、帧编辑保存、Worker 与无 Worker 的真实调用均核。Content `encodeFrameSequenceFromProvider` 按帧逐次等待，当前私有缓存不需要未完成 Promise、并行重试或 catch 清理。仅保存成功解码的块，以同一插入顺序保留最新两个；文件格式、输入拒绝、像素、缓存命中和外部接口不变。

| 原主体 | A 正确性与边界 | B 注释 | C 内聚与耦合 | D 复用 | E 测试质量 | F 表达与命名 | G 无多余部分 | H 可测试性 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `frame-animation-codec.ts` | 上游一次等待一个完整帧；同尺寸与时长由 Content 序列及 Editor draft 校验；旧索引缺失、越界、浏览器解压失败透传；UI 世代守卫仍负责过期结果 | 修正“只恢复两块”：多块可按需解压，最多保留最近完成的两个旧块，命中不改插入顺序 | 壳只组装帧 provider 与按需解码，Content 持有 TPFS 边界，UI 持有项目提交 | Worker 和无 Worker 共用一份真实核，两个 stream 方向同为 deflate 字节转换 | 4 次与 3 次的两条缓存轨迹、实际像素及变体；一次只换成三槽便只红目标测试 | 缓存项直接显示为已解码字节而非 Promise；清楚的失败消息不变 | 移除同一串行帧不能重试的 catch 和复制键列表的循环 | 数据输入与输出可单独确认，无 DOM、文件或 Worker 前置 |
| `frame-animation-codec.test.ts` | 原最近色完整输出和重排、替换、默认时间、局部 override 保留 | 标题明确已核表面，不把 `roundtrip` 当独立算法证明 | 纯核数据组，Worker 专测仅核边界传输 | 合法 seed 用 Content 的批量编码器，待测产品使用流式 provider | 比每帧明文来源，不用“输出同另一输出”的弱比较作唯一 oracle | 统一后继按活跃生产职责命名 | 重复构造与首帧仅一像素 smoke 并入可区别的多帧 | Native stream 可隔离计数，恢复后再解码定稿 |
| `frame-animation-codec.tpfs.test.ts` | 源缺失、负数、等于长度、合法区间内小数分别判断；缓存末块未驱逐中间块独立核 | 去 C5 过程字样，说明两条解压序列的必要性 | 对量化的 alpha 与非法请求只核此层入口，实际抖动模式见 Worker 同波证据 | 还原 oracle 用实际有效帧常量，独立准备源 | 六原例完整映射；最早的模式 smoke 被能实际反控的模式用例承接 | 删除以容器扩展名重复命名的专测，主名已表示 codec | 原重复混排和空 palette 合并；不同驱逐决策保留两轨迹 | 兼容 TS 的 host 原始值通过 `Reflect.apply` 单测拒绝，不新增断言强转 |
| `frame-animation-codec.c07-g03.cursor-r1.test.ts` | 同输入产出确定，真实 caller 用字节摘要命名；多帧写入顺序与透明值、外部输入隔离 | 删除“SHA 级”无比较及 C07 进度；说明字节和稳定摘要的业务关系 | 保留单一纯核文件；真实 UI 提交流只作相邻回归 | 重用同源真 RGBA 的合法 typed fixture | 十原例身份映射；较弱 `>= 1 <= 2` 换为实际命中与驱逐两策略的精确 oracle | 退役模型名，重排与量化按当前职责精准命名 | 不再重复首帧魔数、只验少数像素和两份解压工厂 | stream 计数不是唯一 oracle，同时比较重开每帧的字节 |

`editor-frame-codec-transfer.json` 保存 18 个旧身份。独立的读域与原件同归档。首轮 Node 专用导入触发 Editor tsconfig 类型门失败，改回该项目已支持的原生 stream；定稿连帧导入、两个 Worker 层与真实过场 UI 61/61，Biome、类型门无诊断。缓存反控 1 红 9 绿。原主体累计 63。

### Editor 帧图片导入

2026-11-19，Codex build allowed，三个待审原专测，无 E2E Owner 重叠。现行 [过场规范](../../phase2/specs/editor-architecture.md) 有 PNG/JPEG/WebP 导入、自然排序与导入前手排。真实 `CutsceneTab` 已预排序再允许用户移动，`FrameAnimationEditor` 默认自然顺序且以 operation 世代守住过期提交。这次只整合测试；产品尚待核媒体类型 guard 的公开性和大批解码的资源合同，不计入。

| 原主体 | A 正确性与边界 | B 注释 | C 内聚与耦合 | D 复用 | E 测试质量 | F 表达与命名 | G 无多余部分 | H 可测试性 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `frame-animation-images.test.ts` | 真实 `File`，初始自然数排序与从 picker 传入的同对象不变同时核对 | 原短标题主体保留，补排序只处理选择顺序的语义 | 文件统一承接帧图载入合同，具体拖拽行为仍由 UI 接入口 | 保持生产排序函数，而不是测试内重建排序方式 | 原独立排序例变为对象与原序对照，分开审核批量解码顺序 | 后继沿同名，明确序列导入而非泛 PNG | 不再通过双强转假 File 或只验排序结果 | Node-canvas port 提供实际像素，DOM 缺失模式可直接构造 |
| `frame-animation-images.boundaries.test.ts` | 空选择、拒绝类别、尺寸错、解码失败释放及不读取其后帧 | 明确 File MIME/后缀路由不等于文件签名验证 | 单像素复制、一次释放与完整序列错误分别测 | 复用真实 PNG 生成和原生解码 port；保留已存在的只读跨测试目录依赖，未增加生产耦合 | 六原身份归入同名后继；损坏 PNG 真失败、最后一帧不进端口、原句精确报错；合法媒体路由和真实数据解码没有混为一谈 | 去 C4 边界文件及标题中的卡号 | 移除伪 document、手写 Bitmap 尺寸适配器，真实画布只观测 | 不把 jsdom 工作环境当 Chrome；宿主可重新创建，afterEach 还原 spy/global |
| `frame-animation-images.c07-g02.cursor-r1.test.ts` | 大写无 MIME PNG 像素完整、尺寸稳定，损坏 PNG 缺路由仍在 | 修正“二次解码证明副本”的过强说法 | 正常及失败生命周期跟同源 UI/Content 留在同一模块专测 | 使用真实 canvas 端口，只截获本次读源，非靠重解码生成独立内存 | 十原身份有映射；指定像素断言反控一红八绿；逐个完成/close 次数清晰 | 退役交付者名，只保留 `frame-animation-images.test.ts` | 合并空图、顺序、损坏专测；不保留 `.toBeGreaterThanOrEqual` 弱断言 | 通过真实 canvas 实例的 `getImageData` 读取时取证，不假设 jsdom 暴露浏览器 constructor |

`editor-frame-images-transfer.json` 固定 17 项旧身份、定稿与反控、类型、静态原件。jsdom 缺全局 CanvasRenderingContext2D 的初次失败保留，真实 canvas 上挂观察后达到 61/61 无诊断，副本反控指定一红八绿。三产品相邻 UI 继续由原卡持有。原主体累计 66；仍未运行重型门。

### Editor 帧草稿历史与像素量化

2026-11-19，Codex build allowed。活动 E2E 未占三份原专测与后继。真实 `FrameAnimationEditor` 在打开资源时以内容目录配置初始化草稿，维护选择及单次 move 提交；文件读由 caller 异步归属，`frame-animation-draft` 只维护帧来源、草稿与时间线，不解压容器或直接写工程。`draftFrameMetadata` 无生产 caller，局部像素量化另有用户导入和 Worker 两真实调用。其接口退役及产品职责切分待单独评估；本体不计入。

| 原主体 | A 正确性与边界 | B 注释 | C 内聚与耦合 | D 复用 | E 测试质量 | F 表达与命名 | G 无多余部分 | H 可测试性 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `frame-animation-draft.test.ts` | 旧尺寸、重复 ID、删空、合法帧重排、局部回读和真实时序对齐 | 把“能保存”分为本地不发 I/O 与真实编解码两合同；解压原版空转换不作保存证据 | 草稿结构与时间归同名；量化归像素；实际 TPFS 由其专测负责 | 稳定一套真实工厂；不仿实现重新排序作为 oracle | 合并结构共享、文字草稿重排 undo，真容器用既有 codec 证据；新量化例逐像素而非只断言一个 alpha | 产物按草稿/像素职责，旧原测试名无需批次号 | 测试专用 metadata 投影不维持永久回归；用户时序及新容器的实际断言保留 | 可注入 Reader；跨行量化原始像素固定、透明像素和 alpha independently 观察 |
| `frame-animation-draft.c04.cursor-r1.test.ts` | 保留头中尾插入、单/多删、替换复制、重排、默认/单帧时间恢复；结果对照实际元数据 | 去掉 G07/V1 流程注释，读名即可判断输入和输出 | 避免把已有历史分支合同复制到时长组 | 真实 typed 工厂只建合法草稿，失败输入单独传给被测入口 | 十旧身份保全；用显式顺序/有效 ms/共享未改帧及逐帧 bytes，区分错误帧的时间不能跟索引一起换 | 按整体时间线和不同行为清理批次名 | 不再锁定无生产调用元数据映射函数；总和与实际 timing 列保留 | 无真实时间、DOM 和网络，UI 邻居验证页面动作 |
| `frame-animation-draft.wave2.test.ts` | 有效的带 offset RGBA 视图、延迟加载、不发布旧错误、负索引以及历史分支精确承接 | 将“真实 reader”收窄为生产函数上的可控读端；错误与等待分例 | 读端履约、草稿结构、历史与选择用例职责分开 | 复用局部不变的测试输入，不把时长、来源和错误归一个万能夹具 | 十二旧身份一一对应，保留以非空 future 证明分支；保留负索引、空动作，失败保全原 draft | 删除交付波次名并把标题改为产品合同 | 不再锁定没有生产 caller 的旧元数据投影；保留重复操作无副作用 | 显式等待受控 reader；微任务内验结果而非延时；反控分别落到历史 future 和实际像素 |

`editor-frame-draft-transfer.json` 固定 27 项旧身份、真实 UI 读域和后继。定稿与过场保存、结构编辑、重排及异步归属 53/53，类型及静态零诊断。最初把两处内存反控合跑得两红，随后按 `editor-frame-draft-counter-replay.json` 各自单独运行：历史与量化各指定一红、十八绿；旧记录保留作探索过程。定稿无产品改动。原主体累计 69。

### Reforge 过场帧呈现所有权

2026-11-19，Codex build allowed。排除 E2E 提交与未提交路径后，核实 `main.ts` 的启动、逐帧呈现、等待结束和跳过实际生命周期；独立宿主测试按原样运行。`AsyncIntent` 判别本轮所有权，播放态另挡同一轮结束后的写入。

| 原主体 | A 正确性与边界 | B 注释 | C 内聚与耦合 | D 复用 | E 测试质量 | F 表达与命名 | G 无多余部分 | H 可测试性 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `frame-animation-presentation.ts` | 当前持有令牌可清除已持有帧，但结束后的回调不能再写；新令牌使旧退出失效 | 补了令牌为何保留及令牌和播放门的区别 | 单类处理播放所有权、终帧与对话重叠；宿主持资源和网络 | 引用既有 `AsyncIntent`，保留本地播放状态两合同 | 真实 `main` 测试及本类同令牌晚回调反控 | begin/present/finish/clearOwnership 的动词对应生命周期 | 无额外 token、布尔模式或无消费者的通路 | 内部时钟无依赖，帧输入和取消姿态可单步独立观察 |
| `frame-animation-presentation.test.ts` | 缓冲、对话框、保留/恢复、旧轮和同轮晚到分别覆盖 | 新例说明被接纳令牌与实际写入门不是同义词 | 本地状态归本类，网络取消与宿主提交归邻居 | 沿用现有 ImageData 建造，未造第二套宿主 | 原五身份全部保留，补同令牌晚成功、晚失败及显式释放的合法状态序列；旁路播放门独立一红五绿 | 路径按产品名，标题明确帧 hold 和 abort | 不重复相邻异步网络测试，新增测试确会捕获旧用例未观察的分支 | 不 mock 实现或真实时钟，逐步验证可见帧及结束状态 |

`reforge-frame-presentation-receipt.json` 记录指纹和反控。基线 5/5，真实相邻入口合计 32/32、标准错误为空，类型及静态零诊断。未改可见行为或 E2E；原主体累计 71。

### Reforge 场景资源缓存

2026-11-19，Codex build allowed。场景与地图读法由 `main.ts` 构造注入，启动先建索引；正常切换与读档复用同一容器。场景批量预载走真实 `loadAllScenes`，地图按现行 `MapIndex` 与素材稳定 id 解析。

| 原主体 | A 正确性与边界 | B 注释 | C 内聚与耦合 | D 复用 | E 测试质量 | F 表达与命名 | G 无多余部分 | H 可测试性 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `scene-resources.ts` | 场景、地图与色盘成功后才缓存；拒绝可重试；地图命中更新 LRU | 解释一次成功写入最多多一个键，单次淘汰充分 | 状态容器独占成功结果；网络、格式校验和可见切换归 ports/宿主 | 分开三种生命周期；无泛用缓存抽象 | 接受 17 个合法不同 mapId 的反控，仍用当前产品调用模式 | 移除不可达保护，命名容量 | 删除 `while` 与新键不可能是淘汰对象的分支 | 注入加载端让重试可控；缓存可用返回身份/读量检测，无窥私 |
| `scene-resources.test.ts` | 礼貌失败后的场景/地图按稳定身份恢复，色盘一实例一次；成功排序确定 | 以具体最旧 key 和第十七个 completed 对应本地容量 | 只测从端口返回的数据、读序和缓存归属，地图实际格式由下一片 | 保持现有夹具端口，点名合法变体 | 原 11 身份保留；用有效场景 id/地图尺寸和帧表替代“有东西”；改容量为 17 时该用例唯一红 | 字段名说清按 id 重试与命中 | 无多余 mock 数量替代数据合同；读取次数只用于区分缓存命中和淘汰 | 同步控制输入，并在错误与成功路径观察可公开读取的结果 |

`reforge-scene-resources-receipt.json` 固定读域、运行身份、LRU 反控与原件。基线和相邻 27/27，定稿 33/33、标准错误为空，类型及静态零诊断。仅内部等价整理，无资产格式或行为改动。原主体累计 73。

### Reforge 地图与瓦片装配

2026-11-19，Codex build allowed。真实 `main.ts` 把 `loadSceneMap` 注入 `SceneResources`，主地图校验使用当前 `ProjectMap` v4，多来源格子按 `sources` 指向有序 `tilesetRefs`。无写入或 E2E 路径重叠。

| 原主体 | A 正确性与边界 | B 注释 | C 内聚与耦合 | D 复用 | E 测试质量 | F 表达与命名 | G 无多余部分 | H 可测试性 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `scene-map.ts` | map id 缺失时无读；合法 map 只取登记路径；未注册瓦片明确拒绝；并行读取没有资源句柄需要回收 | 稳定 id 与同组各自 0 号帧的含义由旧注释准确表达 | 只装配地图与瓦片表，不持缓存、不决定何时提交 | 复用内容 map/tileset 索引与通用校验解码，未造备用路径 | 实际加载器、catalog 摘要及现行 RLE 和三条边界均有观察 | `mapIndex`、`tilesetRefs` 与 `tilesets` 分层明确 | 每个步骤都有生产调用，没有冗余分支；实现保留 | 注入 `FileSource`，可观察真正读到的登记和字节，无需 mock 数据校验 |
| `scene-map.test.ts` | 真实校验的现行地图及二进制；两条有意缺引用分开核无读/只有 map 读 | 不宣称虚构地图符合合同；标题明确失败在第几级 | 测文件装配，不锁定 cache 或 scene 状态 | 正式校验器与 gzip/RLE 工具 + 测试自有存储 | 旧两项映射到三项；最小合法 1×1 逻辑地图含两子格，两源使用同一个 index 0；真实交换仍读两文件，但指定像素一红两绿 | 同名专测，区分 map id、AssetId、路径 | 删模拟真实加载的模块 mock 与无效 `as never` | 端口自有集合，无全局与异步泄漏；读文件和结果像素各是独立 oracle |

`reforge-scene-map-receipt.json` 固定旧身份与代际。真实相邻 28/28 无诊断、类型和最终静态零诊断；保留初次生成路径不合法及后续格式原始回执。产品文件保留不改。原主体累计 75。

### Reforge 场景提交前准备

2026-11-19，Codex build allowed。实读外部 `main.ts` 的初始装配、脚本跨场、读档候选和调试入口。真正 commit 由宿主在 I/O 与过场结束后再次核验 token 和依赖；本类只交付可验证的计划，不接管生命周期。编辑前对两个 E2E 路径差异集核过独占写入。

| 原主体 | A 正确性与边界 | B 注释 | C 内聚与耦合 | D 复用 | E 测试质量 | F 表达与命名 | G 无多余部分 | H 可测试性 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `scene-preparer.ts` | 可变 world/script/换装定义在首 await 前复制；等地图、色盘、精灵与声音；异常传播，宿主持取消与提交。落点由宿主提供并在确认场景后解析 | 注释只承诺明确拥有的三个快照；无入场元数据的直接脚本引用有解释 | 没有同步提交或释放宿主资源；预检返回领域完整计划 | 复用现行世界投影、依赖比较、资源端口、规范落点和动作解析 | 项目加载后的真实宿主/皮肤路径，影子变体不克隆时唯一红 | 保留现有 public 名称；资产与返回帧原键绑定 | 减少临时包装、合成单段、重复条件与数组按序回填；独有资产读序与等待不变 | 可注入合法资源端，控制 await；断言当前场景与资源计划而非内部数组 |
| `scene-preparer.test.ts` | 拷贝、重试拒绝、声音关卡、无副作用、无关金钱以及精确落点仍覆盖 | 更正未测 flags 的标题；相邻宿主保持 flags 对照 | 各例归当前快照、待命和结果合同；保持跨场提交独立 | 复用真实工程夹具，不换掉资产 guard | 14 身份一一映射；真实不同外观资产选择替代共用映射断言；外部修改造成旧值被引用变体一红十三绿 | 独立测试可从名称定位时序和外观 | 无重复人造异步队列；已通过的 flags 不在本例重复 | 测试门受控、失败仍释放；有正常选择、禁用覆盖和后到修改对照 |
| `__tests__/scene-preparation-fixture.ts` | 实际加载作者数据及解析器字节；完整项目与样本相等检查捕获输入污染 | 注释指明只观测端口，样本经真实 guard | 同时服务缓存、活动场景、准备和真实宿主链，角色与资源构造归共同场景环境 | 保留共享 `shellProject` 和唯一 catalog，第二笔真实独有资源保持相同合法几何 | 以现行注册规则建立资产，SHA 与字节匹配；Domain 的不同 asset id 不再假别名；副本归属反控与所有消费者同跑 | 文件指名场景准备，控制端 `deferredScene` 出口被两个测试文件消费 | 不复制另一份小工程建造器；新增只针对无法区分外观的原弱点 | 端口与 fixture 每次独立，真实用例可自由截断各个异步接口 |

`reforge-scene-preparation-receipt.json` 保存 caller 锚点、三文件全读指纹与 14 项映射；旧 baseline 按完整原件复用。五专测共 45/45 标准错误为空，类型与静态零诊断，真实 E2E 线路未改未跑。无公共协议、持久状态或可见行为变化；原主体累计 78。

### Reforge 帧读取与播放专测

2026-11-19，Codex build allowed，仅测试写入。编辑器切换素材版本复用 reader，Reforge 独有过场控制器把帧提交到呈现层。两份旧混装测试按读缓存与输出播放分工。产品保留 review，确切原因见 [过场素材换版](REFORGE-FRAME-SEQUENCE-INVALIDATION-1.md)。

| 原主体 | A 正确性与边界 | B 注释 | C 内聚与耦合 | D 复用 | E 测试质量 | F 表达与命名 | G 无多余部分 | H 可测试性 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `frame-animation-player.ts` | 两级读与播放进度依赖宿主；现行 invalidate 允许旧异步写回，真实像素失败；无产品改动 | 两层 Promise 缓存说明正确；不将失效表述为取消 | 资源 reader 和效果调度已有可区分出口；停止线前不移公开导出 | 沿用 Content 正式 TPFS 校验与时间模型；宿主对 AbortSignal 的取消另有职责 | 已复现竞态；稳定输入 18 原用例没有该交错 | 读/播描述准确；区分 in-flight 与 completed | invalidate 清容器引用不清旧回调，这是未闭合问题；不先做大拆分 | 注入独立 I/O、inflate、等待、画布回调，可分别复现异常；构造器本身不读字节 |
| `frame-animation-player.test.ts` | 首帧后等待揭示、精确区间、单帧时长、越界、缺登记文件、默认/显式键与独立 abort | 描述含用户可见时序，移除“二次播放即证明监听恢复”类结论 | 播放专测由显示和键盘持有；读侧缓存移 `frame-sequence-reader.test.ts` | 两专测共用真实容器、catalog 记录和小控制门 | 两个 reader 身份迁移；播放六身份有具体承接；故意断开清理时唯一错误为原 Space 仍被阻止 | 按职责，不按批次命名 | 一条模拟挂起等待去重到三个实际时机之一；保持业务负例 | 局部 EventTarget 模拟浏览器布尔 capture，仍验证事件传播；真实 owner 宿主和 Editor 异步用例相邻 |
| `frame-animation-player.boundaries.test.ts` | 集中核元数据、并行块、失败重试、淘汰、选择清除及实际取消；新增竞态只作 review 原件 | 去 D1–D7 任务流程头；将完成后失效与在途失效分开 | 播放与读取按业务输出和内存域归适当后继 | 真 deflate 默认、可控端口只在所需路径暂停；新帮助只创建合法 1 像素文件 | 原十身份映射，九个业务身份有承接；删测试夹具自造失败自检，其实际释放逻辑由相关用例 finally 执行 | 退役 `.boundaries` 混装，保留解码与播放具名后继 | 删恒等压缩和过宽 `toBeDefined`，给不同帧/时长/精确全局清理 | 不依赖真实时间长短，尚未释放的真实端口与总任务兑现明确独立 |

`reforge-frame-playback-receipt.json` 固定十八原身份和两个后继文件；单独的合法素材 fixture 是承接证据，不追加原文件额度。31/31 Reforge 定向、14/14 Editor，最终静态/类型无诊断。Node 22 `EventTarget` 的布尔 capture 删除差异与首跑监听环境与类型诊断保存，复验实际 dispatch 和反控，未修改产品。原主体累计 80，另一个产品留 review。

### Reforge 异步提交令牌

2026-11-19，Codex build allowed。真实主程序为同一世界读档、场景接管、当前脚本和战斗启动分别拥有代次。该对象只判定当前代，调用方在帧呈现、切场和战斗准备的真实 await 后核验，底层取消各自负责。

| 原主体 | A 正确性与边界 | B 注释 | C 内聚与耦合 | D 复用 | E 测试质量 | F 表达与命名 | G 无多余部分 | H 可测试性 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `async-intent.ts` | capture 同代只读，begin/invalidate 使旧结果失效；令牌仅用于签发实例 | 明确不自动取消，副作用前复查，不跨令牌实例使用 | 身份门不碰世界对象、I/O 或 signal；场景/战斗有独立实例 | 多个真实消费者共用，无第二套 abort 错误构造器 | capture 变为换代确切一红，真实主程序与战斗启动补足 caller 语义 | 命名对齐读代、抢占、显式失效 | 不引入缓存、全局或额外身份字段 | 单例可同步变代，微任务晚到可复验，无真实计时 |
| `async-intent.test.ts` | 最新接管和显式失效、错误信息及正向提交都覆盖 | 删除重复“两个伪战斗 await 就证明完整会话”的讲法 | 本地只验令牌；战斗宿主验证实际启动时仍不发布 | 捕获与开始用同 fixture 无额外投影 | 原三身份映射两本地合同及既有真实 battle host；精确 old/new 看发布内容，不只检查 false | 按产品命名，逐条标题指实际生命周期 | 移除虚构战斗及自造 deferred 逻辑 | Promise 微任务可及时兑现，新旧分别观察 |
| `async-intent.world-lifecycle-1.test.ts` | 特有只读 capture 仍有多次捕获和实际接管结果 | 旧阶段号和过时行号移证据 | 退役按任务卡命名的同入口复测，归 `async-intent.test.ts` | 同产品单位合并，无跨行为抽象 | 旧身份映射 capture 相关正反；误调用 begin 仅该用例红 | 取消以任务卡分组 | 合并重复 latest begin/error | 直接比较生成令牌及原错误，隔离和可证伪 |

`reforge-async-intent-receipt.json` 保存完整映射、原件与锚点。旧 4/4，最终含真实相邻 38/38，标准错误为空，静态零诊断，类型与下一片同批。产品仅改校准注释，原主体累计 83。

### Reforge 活动场景与过场分派

2026-11-19，Codex build allowed。场景提交连到主程序的切换/换图，波浪渲染按场景惰性创建；过场调度器由主程序唯一构造，负责依序把演出意图送给实际宿主。未写活动 E2E 负责的入场会话和世界呈现。

| 原主体 | A 正确性与边界 | B 注释 | C 内聚与耦合 | D 复用 | E 测试质量 | F 表达与命名 | G 无多余部分 | H 可测试性 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `active-scene.ts`（本轮待接续） | 提交发布地图/瓦片、角色与原始基础状态；换图清波浪且保留场景和动作；边界呈现早于房间更新 | 明确先提交、后读一组资源；删迁移过程用词 | 供持有当前场景的主程序编排，不把读档或绘图塞回资源发布 | 复用 ScenePreparer 的类型，呈现侧按需调用波浪工厂 | 换图保留旧瓦片单点反控，读写顺序有可观测入口 | 活动场景与准备态界限清楚，各字段与渲染调用对应 | 未改 getter 或对外命名 | 相同场景/不同地图以真实预检资源构造，工厂失败可隔离验证 |
| `active-scene.test.ts`（本轮待接续） | 候选曾保留六合同，准备态明确有两套地图与瓦片真实引用 | 写明原旧 fixture 复用了同一 map，撤回虚假的更换判别力 | 只核资源提交和动作寿命，异步预检归专测 | 沿用现行场景准备夹具 | 指定反控唯一红；顺序、异常重试和旧动作消费均断言可观测输出 | 不按任务号写用例；更换结果具体 | 保留六个不同合同，未靠 mock 调用数证明资源已换 | 让正式准备链产出不同瓦片对象，副作用都隔离 |
| `cutscene-controller.ts` | 串行侧检查同 signal，passive wait 不占锁，finally 释放相应活动；执行失败向调用者传播 | 步骤说明与实际委托一致、无未来版承诺 | 调度不实现 HTML、调色板、渲染等 host 机制；reset 由调用者触发 | 已有 PresentationIntent 和端口按职责共用 | 显式 false 丢失反控与原异常业务测试；主程序装配邻测 | run、waitPassive、cancelAll 对应三种入口 | 不引入一个通用 effect helper 或任意吞错 | 类型化端口可阻塞一个节点，精确测试取消和忙状态 |
| `cutscene-controller.test.ts` | 独立控制队列、两个运行 signal 和错误对象，保留参数缺省与显式零/false | 标题指观测事实，省泛化的回放主张 | 只测调度及端口交接，不把具体视频和精灵调度重做 | 共用局部 fixture 与 effect gate，避免依赖帧容器工厂 | 10 旧身份迁到八条实际合同；负对照只失败于覆盖的 hold 值 | 产品名，不带任务号 | 删重复顺序用例和非空断言/双重强转的夹具 | 使用真实 DTO，两在途阶段都有释放，不依赖系统时间 |
| `cutscene-controller.dispatch-boundaries.test.ts` | 原地址、零值、失败和待完成端口范围由后继保留 | 过期复审号与实现对账移到原件 | 同生产入口的专测统一到 `cutscene-controller.test.ts` | 共享新夹具，端口时序仍各自测试 | 四身份逐条承接，包括异常对象原身和未执行后续 | 退役按审计标签混装的后缀 | 不保留重复的单 await 调度样本 | 同正式 DTO 使每个用例可单独判别 |
| `presentation-intent.ts` | 全部 union 变体对过场调度，帧/视频用已解析资产 ID，参数缺省由专测观察 | 去掉对未实现可视化编排的承诺 | 类型单向来自 Content，执行跟宿主分层 | 仅有当前唯一调度器消费，不为类似命令类型合并 | 类型枢纽配合过场端口测试校对每个分支；不新增形式化测试 | 类型和参数沿用协议语义 | 不复制已由 Content 定义的 DialogueCue/AssetId | 纯类型，运行期合同在调度及主程序入口验证 |

`reforge-scene-presentation-receipt.json` 索引全部十六个旧测试与十四个后继合同、读取指纹及可回放反控。该早期候选和主程序相邻共 25/25，stderr 为空。最终保留过场分派四个已核原主体，累计 87；活动场景两个路径仅留独立读域与反控，不授最终范围信用。

### Reforge 视频播放专测

2026-11-19，Codex build allowed，仅播放专测。实际 `playVideoAsset` 走工程资产 resolver 和剧情 runner，启动路径没有 runner。`ScriptWorkWait` 不代替媒体模块自身释放浏览器监听。已复现的用户可见重试边界见[视频重试卡](REFORGE-VIDEO-PLAY-RETRY-1.md)。

| 原主体 | A 正确性与边界 | B 注释 | C 内聚与耦合 | D 复用 | E 测试质量 | F 表达与命名 | G 无多余部分 | H 可测试性 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `video-player.ts` | 播放、解码失败和生命周期清理已核；失效的重试提示为确定问题，留 review | 模块头一阶段素材号不等于当前入口范围；待随实际重试修复修订 | 浏览器媒体及全局冒泡在播放模块持有，读目录和剧情顺序在宿主 | 不把 Phase 1 播放器直接混用，挂起与 runner 沿用当前等待工具 | 两拒绝后第三次未尝试，七原例仍绿；真实浏览器复验待准入 | 命名区分资源 URL 与 DOM 媒体，但未清理旧阶段注释 | 多个跳过事件可能排多个同义 timeout、清理后回调由 settled 拦截，登记待核 | 可用实 DOM 只替换原生播放端口；不把反控当设备真实回执 |
| `video-player.glm-n.test.ts` | 合法 URL 下以真实 DOM 验证按键与可见元素；分别验预取消、在途取消、解码失败和成功重试 | 移除无断言的“已释放按键”主张，改为事件消费实断言 | 测试拥有 abort、局部容器和挂在同 signal 的观察者；命名按播放合同 | 默认与自定义共用输入窗口合同，两种负控分别验证 | 七身份映射；精确 499/500ms、自然结束后迟到 error、点击提示层高于视频；独立核对全局键与媒体错误监听的释放 | 重命名为 `video-player.test.ts`，不用模型名 | 删除不能证明释放的裸 dispatch 与不关闭的监听；合并重复迟到 error 轴 | fake timer 单独推进，DOM 查询不靠 play 记录伪造元素，finally 释放 |

`reforge-video-receipt.json` 绑定旧 7 个身份和新 7 个；宿主/邻测最终 18/18、基准 7/7、定向反控唯一红。首跑对预取消 `pause()` 作了过强假设，其失败保留，最终只要求不挂载、不调用播放。独立复核要求保留自然结束后迟到错误的负例，窄修回执见 `reforge-video-ended-followup.json`，同时按相对顺序而非硬编码核对点击层。产品未改；一个原专测完成，累计 88。

### Reforge 黑屏、切场和渐变交接

2026-11-19，Codex build allowed。切场预检只生产方案，宿主在两个异步边界核身份，当前世界的关联可视所有者负责清屏。编辑器预览也用同一个落点解析器；当前未核准的异常分支见[命名落点卡](REFORGE-SCENE-NAMED-ENTRY-OWNERSHIP-1.md)。此次只整理测试、校准注释、移除内部元组强转。

| 原主体 | A 正确性与边界 | B 注释 | C 内聚与耦合 | D 复用 | E 测试质量 | F 表达与命名 | G 无多余部分 | H 可测试性 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `screen-hold-transaction.ts` | token 消费与 owner 清理分开，主程序切场、脚本终止和渲染失败归各自入口；原异常重抛成立于收尾成功 | 明确同一字符串仍可能是不同 owner，收尾异常不被隐藏 | 不持世界、绘制或存档；同步异常适配与浏览器资源无耦合 | 主程序从渲染/脚本模块消费，不并入 fade 内部进度 | 比较 token 替代 owner 唯一业务红 | 业务 token / owner 具体 | 现有只读 active 用作专测观察；需退役公开合同另核，不改接口 | 无真实定时，能用原生对象区分同字面两个事务 |
| `screen-hold-transaction.test.ts` | 检查释放具体句柄、同 token 接管、异常先收尾，重复 cleanup 维持幂等 | 删不能证明读档或切场已经接线的表格标题 | 单元专测只观察事务，实际宿主含切场相邻对照 | 相同身份轴只保留同 token 反例 | 原七个身份对应实际条件；取消从状态观测提升到后续 reveal 真拒绝 | 测试名说明谁拥有与何时清理 | 同一个 cancel 的三份复制合一 | 不重新造定时、世界态或静音夹具 |
| `screen-hold-transaction.boundaries.test.ts` | 同 token 接管、空 token 留原状态、正常返回和错误对象保留都归统一专测 | 删除旧批次号及行号 | 按产品合同单文件承接 | 真正同入口，只共享 hold 实例的构造方式 | 原两条复合用例拆轴进六个后继；空 token 在已有事务上执行 | 退役动态边界与卡号命名 | 删重复 renderer 错误路径 | 原错误 identity 与下一次 reveal 均可判别 |
| `scene-switch-transaction.ts` | 只冻结场景预检消费的数据，先确认身份再 commit，清理须仍归同一世界或画面 | 不宣称切场只有一个 await；说明两个验身份时点 | 捕获可比数据与异步控制分明；世界更换由宿主 | 复用现有行为投影和 AbortError 来源 | 集成旧世界被接管与预检失败各独立；删后置检查准确破坏失败回归 | 结构字段明确区分 map、actor 和真正行为 | 元组由泛型构造，不在类型系统外强转；未引入通用序列化 helper | 预检/呈现/提交端口可分别控制时序，生产宿主仍是接线证据 |
| `scene-switch-transaction.test.ts` | 预检失败、后置校验、入场接管、旧清理归属均观察确定的提交与画面 | 删五个人工失败名冒充五个真实 I/O；过时 auto 假宿主由真实相邻用例承接 | 生命周期留本文件，输入依赖分到 `scene-switch-dependencies.test.ts` | 同一事务 fixture 不将 palette/map loader 的各合同假装共享 | 原 23 项逐一映射；实际失败对象、旧/新提交及画面值，原要点保留，去掉四个同义 rejection | 两后继按切换所有权/依赖命名 | 删没有产品调用的手写 async 回归，保留真正 setSceneMapOverride host 的失效对照 | 用明确 reveal 进入门代替轮询；事务路径以真实 fade/dither 端口观测 |
| `scene-preflight.chain.test.ts` | 主程序包装调用真正 ScenePreparer，作者 hook、地图、实体页和覆盖定义各有冻结边界 | 标题指预检职责，区分源码 helper 到真引擎 | 读取源码实际组装函数，不假装启动整个浏览器 | 复用现有场景和 runtime，局部 base hook 只驱动真实 checkpoint | 11 身份保持，复核 before/after 两个真实 reveal 值；不再双转类型 | chain 指从真实 host 到 reader，不按批次编号 | 删除通用类型强转，不把不同测试控制门抽象为万能工具 | 资源门在失败路径也放开；静态类型和现有最小宿主都可复验 |
| `scene-transition.ts` | 小对象的坐标与方向正确；公开入口把继承键误当登记，正式一红一绿，留 review | 当前注释的“已校验”不能替代缺失边界；在风险卡记录 | 纯落点计算，两生产 caller 同合同 | 合法共享，Editor 不另算朝向优先顺序 | 同名真正登记有正控，缺登记不应返回默认，用实际出口复现 | 位置与方向语言清楚，优先级在真入口表现 | 仅测试单独消费 `resolveSceneFacing`；后续改公共边界时再核独立出口 | 纯数据、错误和返回值，无浏览器或保存依赖 |
| `scene-transition.test.ts` | 真入口覆盖默认、临时、两种命名、命令朝向和相互排斥；结果不借用坐标 | 注明 Reflect 只对解码无效组合绕过类型 | 只测入口落点，不复制主程序或预览代码 | 共用真实有两个不同命名坐标的 DTO | 原 7 身份映射到 7 个入口用例，朝向不再借内部 helper 自证 | 名称适用真入口和可观测落点 | 合并单测 helper 和入口的同一决策轴 | 合法样本由类型保全，错误信息准确，不依赖 canvas |
| `fade-driver.ts` | 显式 tick 计算快照；接管旧 Promise，signal 只取消当前 effect；完成后 owner 仍可复位，审批外不改 | 明确保留的是上次呈现写入者，导入归文件头 | 只持幕布数值、渐变时钟与 abort；调用者选色和归属 | 开场、场景、过场和战后真实宿主可同用纯驱动，互相独立实例 | 原六项不同边界和世界切场/帧监测；检查了现有 caller 提供有限时间/数值 | 名称说明旧过渡被后续接管，opacity 仍由呈现消费 | 不为类似 dither 操作抽象一个所有权总管 | 用单调 tick 精确核 0.4、0.2、0，隔离 host gate |
| `fade-driver.test.ts` | 接管拒绝、runner 取消、旧信号/owner、完成后归属都观察进度和 Promise | 标题与业务断言一致，旧 abort 不冒称 DOM 监听计数验证 | 只测幕布进度和生命周期，不重复场景提交测试的上层所有权 | 简短构造各自自然独立，无需全局 fixture | 6 个原测试保留；最新绘制值和异常两手均核，不靠 mock 数证明正确 | 文件与类名职责匹配 | 不增加只有覆盖率价值的极端重复用例 | 完全由调用方提供时间轴，合并后无需真实计时 |

`reforge-scene-hold-switch-receipt.json` 固定原读域、两份代码反控、旧测试到真实后继或相邻入口的映射，以及仍待裁定的落点反例。当前切场/预检/渐变范围原已通过，最终候选和测试精确回执取同一归档。九个原文件按八维核完，累计 97 个；二阶段落点实现留 review。Content 命名落点校验既有结论不向运行时继承。

### 本批冻结范围

初次候选有 99 个原始主体；现行冻结是 97 个：Content 16、Editor 35、Reforge 46，含 42 个旧路径退役和 55 个保留原路径。新增承接不重复计，另有 14 项 review。原清单见 `window-original-paths.json`；最终以 `window-scope-withdrawal.json` 减去其中两个 ActiveScene 路径。版本、真实调用域或合法输入合同变化时，只复核受影响判断。

TypeScript 语法树初筛原始范围（含 review）113 文件，决策数大于 10 的函数 8 处；没有跨文件连续六语句 token 完全相同的窗口。这只提供重点读域，语义重合仍按测试合同裁定。8 处分别为迁移能力、旧脚本库三路、帧压缩读、过场分派、帧播放器和试玩存档元数据解析：具体处置各回对应 A–H 与风险卡。复算工具和输出均在同一归档。

只读快检先运行 `node scripts/quality/code-quality-ledger.mjs`，再对归档执行 `tar -tzf` 定位 `execution.json`、原生结果或补丁；重放时把历史绝对 reporter 输出改到自己的临时目录。反控和归档里的 witness 只在自行核实的隔离候选恢复，核完清理。最终候选包代码原树→现树为 +19/-42/~77 文件，净减 81,635 字节；将 `window-scope-withdrawal.json` 叠加在原 `candidate-package-inventory.json` 即为最终路径和指纹。日志与对照只保留一份持久执行归档；不改 E2E 源码、数据或执行记录。


### 活动场景所有权与门禁返工

集中 `pnpm check` 首轮实际通过 593 项文档工具测试、正文链接及文档模型，随后在测试来源绑定处退出 1。四条诊断均指向 `runtime-active-scene` 的原实现和专测哈希。活跃 `codex/q2-content-coverage`（`965663cc7f887d1104b0b2d0af3d5eb52dda7982`）修改该 catalog、evidence 与 report，文件本身没重叠，但证据所有权重叠。故把两文件恢复到基点，保留早期候选差异和非空瓦片反控，等活跃 Owner 接续后再复验。未写 E2E 文件，也未把两个 pending 改为已验证。

首轮官方覆盖率在未改动 Game 里报告多项失败，主机使用约 16.5 GiB swap 时仅中止本任务的 Game Vitest。命令退出 1，未到 Editor，未写基线。失败所涉五个文件用同一 fast 配置复验，19/19 通过。第二次官方采集在未改动 Migrate 的 5 秒期限处退出 1，相关专测同配置复验 37/37。完整失败、定向复验和最终运行分别留在同一归档。

### 集中门禁与交接

撤回 ActiveScene 后，`pnpm check` 的文档检查、工具测试 1,320 项和七包类型及测试 20,929 项全部完成。最后的 lint 在 `document-locations.json` 命中一条格式诊断，命令退出 1。格式化后已证明 JSON 内容等价，并按格式后的字节绑定准入。全仓 `pnpm lint` 实际检查 6,807 个文件，error、warning、info 都为 0。文档、文档模型、账本和 diff 检查均已复验。归档内 `final-gates/input-and-run-digests.json` 固定各原件和两阶段相同的 `packages` Git 树。

`env VITEST_MAX_WORKERS=1 pnpm coverage:ratchet --allow-scope-removal` 实际退出 0，stderr 为空。保留官方配置、超时和默认 reporter，只降低运行并发。七包 20,571 项 fast 测试全部通过，840 个源码文件进入覆盖率，未观察到 React act 或环境诊断。覆盖率范围经过复算，38 个退出的 fast 测试路径均已从树中移除，三个同路径候选有精确的合同去向与身份指纹，源码范围无退出。

四项包级覆盖度量按实测对照修订。Content 的 `asset.ts` 移除旧分片专测的执行命中，已覆盖语句减 2、函数减 1，`validate.ts` 的已覆盖语句增 1。Reforge 场景准备去重使 `scene-preparer.ts` 的函数计数 12→11，仍全部覆盖。Editor 的资源记录校验去重、复制与编解码收拢、帧元数据专测重组及 Worker 路径补验合计使已覆盖行减 18、总行减 19。五个文件的已覆盖行变化为 `command-asset-record.ts` −12、`clone.ts` −3、`frame-animation-codec.ts` −3、`frame-animation-draft.ts` −2、`frame-animation-worker-client.ts` +2。总函数项随包级差异重算。归档内 `final-gates/coverage-comparison.json` 给出主线和候选的逐文件整数计数。旧基线及相关源码和测试字节均有固定锚点。以 `701b34334dd4b07d72c2d88180c67cb693f076fa` 为基线的只读复算没有未解决的回退；正式 protected fast 随 PR 原有 GitHub 作业执行。

文件批次接受 97 个原主体，中央账本为 3,772 tracked、1,135 closed、14 review、2,623 pending。九张后续卡仍留草案，按现有判别反例继续；先核 Content 余下未占用的战斗、物品或作者脚本合同，再决定接续范围。发布取同一治理分支的精确 PR 头和 GitHub 两项保护回执；当前卡记录文件审查与本地运行。执行原件集中在一份归档，保留含独有诊断的失败轮次。复验不使用主工作树写入、完整临时树副本或 E2E 通行结论。
