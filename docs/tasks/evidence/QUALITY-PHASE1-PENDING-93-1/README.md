# game / pal-extract pending 逐文件审查

Status: complete
Owner: Codex
Last reviewed: 2026-11-05
Template: audit-report-v1 / 1.0.0

## 审计问题

本批解决[原卡](../../cards/QUALITY-PHASE1-PENDING-93-1.md)冻结的 93 个 pending 主体；以下只登记实际完成读域，不以扫描/相邻测试冒称全文审查。中央文件状态与集成门仍由原卡和 live ledger 分别维护。

## 范围与证据

基点 `00e38451b4594512c9236d5e214eb47d2cdf6e89`。下表主体均完整读取，非主体引用只授明确列出的范围。当前为未提交候选，最终 Git 身份与原件保全待整批冻结。后续恢复时先核 diff，不只更新哈希继承信用。

语言生产端依赖读域：CLI 1–235（源校验、纠错、翻译预检、清理与事件发布）、shared/localization.ts 全文、game/localization/messages.ts 全文、cli-host.ts 全文。primary 是 SDLPal `text.c` 的 ST_DIALOG/ST_WORD/ST_LAYOUT 与 `script.c::MESSAGE_GetSpan`（3088–3147）；严格失败策略取现行工程知识，不冒称逐字节复制 C 的宽容解析。复用[原英文审查](../GAME-ENGLISH-1/text-review.json)：builder 实现和三份修订源与该记录 SHA 相同；CLI 当前顺序重新核对，测试变更独立审核。

## 发现

### 语言生产端（9 个原主体）

路径均相对 `packages/pal-extract/src/`。A–H 分别为正确性、注释、内聚耦合、复用、测试、可读性、简洁性、可测试性；每格是本文件判断，不能外推其它文件。

| 主体 | A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|---|
| `io/slf.ts` | 数字身份、重复/交叠区间、嵌套和未闭合拒绝；正文逐行保留，CLEAR→null；UTF-8 由真实 CLI fatal 解码 | 修正头注责任与 C 宽容差异；81/82非位置注释与过滤一致 | 函数局部状态拥有一次解析；无IO/全局写入；词表和消息状态仅在对应分支推进 | 单一遍历保持行号错误域，不为不同 WORD/正文转义合同合并循环 | 18 grammar合同；空格反控恰1业务红，既有空行/CLEAR/escape预期独立 | section/message/groups/layoutIds各有语义；较多分支对应语法状态，保留单文件便于对照 | SETTING/CREDITS/DESCRIPTIONS仅跳过，不转存运行时；无无用出口 | 纯字符串→对象，失败带源行号，直接可测，不为测试注入新接口 |
| `io/slf.test.ts` | BOM/CRLF、空词、双反斜杠、正文空行/#/控制符、乱序不交叠范围及16拒绝轴输入明确 | 将“清理前”越层标题收窄；补真实前后空格预期 | 正常模型与拒绝表分组；每例独立字符串，无模块状态 | 同一拒绝合同采用参数表；不抽离小夹具成框架 | 18身份全保留，仅describe更正；正文trim变异定位唯一深等业务断言 | 标题说明保留/拒绝行为，非覆盖率/作者编号 | 不复制 CLI 清理测试；保留 grammar 与 CLI 不同调用层 | 无mock/计时/资源；具体reason区分拒绝分支 |
| `localization/build-language-pack.ts` | 受支持指纹、before、完整范围/词号、别名消费和汉字拒绝；克隆可变展示数据，输入不写；MESSAGE_GetSpan 逐段核对 | 指令身份不变、别名方向、全语言不可静默回退的注释均有caller依据 | 无IO；只接解析结果/共用指令/修订；provenance由caller提供并借用，CLI随即序列化 | 与runtime扫描虽相似，返回全集/全量拒绝和单次播放/缺译回退不同，暂不新增跨包公共helper | 原7例拆清独立轴并补输出ownership；布局借用反控恰1红；真实源578词/4768组通过全部前值守卫 | 范围key、remaining、usedAliases表达约束；局部扫描保留C对应结构 | 未添加模式/兼容分支；两个alias只映射既有修订范围，不复制脚本 | 纯函数由typed独立fixture直测；无需真实磁盘即可核失败和所有权 |
| `localization/build-language-pack.test.ts` | 每次fixture包含565合法基础词与typed Command；坏输入仅针对明确拒绝合同 | 标题从多轴串行改为各拒绝原因，保持来源含义 | 来源、前值、完整性、未消费、未译、所有权各自独立输入；fixture仍本文件 | word/message同合同参数化；无万能共享host | 旧7身份全部断言保留/加强成13身份；成功快照完整核输入不写；新增返回对象修改后源不变，非clone自比oracle | `fixture`仅单一builder上下文；kind只用于测试参数，不进入产品 | 去掉只核某一条命令的窄非变异断言，以完整输入非变异替代；不以例数升格 | 无核心mock；layout所有权反控精准失败，恢复31/31 |
| `cli-localization.test.ts` | 真实CLI faithful合法源、可选语言发布/缺参/冲突/帮助；自有临时树和子进程清理 | 缺font警告为隔离fixture明确输出，精确stderr断言；无“真实原盘正常启动”冒称 | 复用host负责进程和树；本文件只持有语言入口场景 | CLI pipeline builders/host与既有源测试共用，未新造launcher | 5例分别核languages.json、en.json不存在、旧输出字节、错误原因、帮助；与PAL源拒绝不重复 | 文件与标题均按CLI语言职责 | 保留help为公开调用文档合同，不以log spy次数替代文案 | argv/log/modules在finally恢复；子进程输出被捕获并断言，外部树不写 |
| `cli-localization.pal.test.ts` | 支持原盘三输入只读复制；坏语法/不同版/缺文件三种源在清理前拒绝 | 标题限preflight与旧输出，不称全提取成功 | 每例独占tree，finally等待dispose | 和合成faithful组输入/前置守卫不同，保留独立PAL文件 | 3例真实exit1、指定诊断、旧文件内容与events不存在；不mock管线 | `.pal.test`明确真实资源要求，与fast/full策略一致 | 三轴参数化；不复制源二进制入仓 | 依赖已有raw，缺输入真实失败不skip；host清理子进程与目录 |
| `localization/english-revisions.ts` | 固定SLF SHA、183词/21组与两别名适配共同修订指令；当前原源实建成功 | 2019-08-31 Win v3.3项目增补出处与原卡一致 | 只有静态装配；不从英文SSS引入机制或IO | 唯一builder合同接两数据表；无运行时分支重复政策 | 原源经实际parser/correctScripts/disasm/builder核全条前值，578/4768/364clear | aliases源→目标端点明确；命名表明项目修订非原译全表 | 不存整份第三方SLF；仅固定前提和变更 | 数据可替换经纯builder验证；原来源缺失应显式失败，不能fallback |
| `localization/english-message-revisions.json` | 21组逐项读完；群组0恢复呼唤、诗词/戏文补译、6640段null分隔保留，范围不改 | JSON无注释；before提供来源上下文，原审查说明授权边界 | 仅展示文字；不混脚本跳转/保存字段 | 统一before/after由builder应用，不分散到对话caller | 当前原SLF前值全部通过；全clear364不变；旧独立来源和授权复用，未重授全剧情视觉 | 键为起止消息身份，字段显式方向；歌词诗词译文不擅自改文风 | 仅实际补译差异，不复制未变全组 | 全JSON可由真实构建核匹配；翻译审美不由哈希/计数认证 |
| `localization/english-word-revisions.json` | 183条逐项读完；同名敌人变体保留不同身份；只改显示名；当前before全匹配 | JSON无行注，before中文名保留语义，来源由装配/原卡持有 | 名称与格式身份分离，不改物品/敌人表 | 一张修订表服务全caller，不为同义名造运行时别名层 | 真实源构建全词存在/无残余汉字；此前10列字体约束证据复用，未重新验全部画面 | 缩写受现有10列限制，领域含义由before可查；不为偏好改译名 | 只存183增补，不保留整份原WORDS副本 | 索引和前值错误可被builder直接拒绝；无IO或隐式状态 |

### 合同映射与局部结果

builder原“source and per-entry preconditions”映射为edition、word-before、message-before三身份；原“every common message range and original word identity”映射为missing-range/missing-word；原“unused revision rules and untranslated text”映射为unused-group/word-Han/message-Han。两alias拒绝、正常构建和非递增消息原身份保持；新增一个返回对象ownership合同。SLF只更正describe，18例未删。

当前定向原件暂由 Codex 持有于仓外 `~/.codex/quality-evidence/type-pal/pending-93-20261103/`：`language-producer-before` 33/33；`language-producer-after` 39/39；`slf-whitespace-control` 与 `language-layout-ownership-control` 各30绿/指定1业务AssertionError；精确恢复 `language-producer-restored` 31/31。各命令均显式default+JSON reporter，stdout/stderr/执行身份保留。帮助stdout属于预期文案；合成源缺font由用例精确断言子进程stderr，不是被隐藏的runner诊断。尚未整批入库保全，不能据此宣布可集成。

另只读构建用户已提供的原SLF与本树raw，核指纹81c4bed6…、纠正流9adb46c7…，183词/21组/2别名、578词/4768组/364clear成立；不写提取输出、不等于全流程CLI或新剧情验收。改动首轮scoped Biome发现1格式错误，已由formatter修复；本批静态门未最终封板。

### 脚本纠错生产端（余下6个extract原主体）

以下均全文读取。复用[现行脚本纠错合同](../../../testing/domains/cross-phase/script-corrections/report.md)的已批准D/E变更含义；本轮重新核当前计划、pure engine、原盘测试、CLI输出和scene serializer接线，不重授完整剧情E2E。相邻 `resources/scene.ts`、`io/sss.ts`全文核过，不计本批主体。

| 主体（pal-extract/src/） | A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|---|
| `events/script-corrections.ts` | 指纹/数目/每条before/WORD域拒绝；输入克隆；先解析所有block位置再应用；补充对象ID连续且scene存在 | before守卫与克隆说明准确；静态plan是受信源码，不冒称通用外部JSON schema | 纯算法、不读磁盘；尾脚本/消息/场景分属各plan字段；caller持发布权 | 局部word/block解析复用，不把原盘纠错与资源序列化合成万能入口 | 原盘5例、合成21例核错误及输入不写；不是以clone相等验证纠错正确 | named block与绝对IP方向清晰；多阶段保留在单一小模块以显露顺序 | 只保留当前plan/faithful分支；不生成二份旧管线 | 依赖通过typed输入注入，错误可在写输出前直接观察 |
| `events/win-script-corrections.json` | 全条D01–D18及E02计划核读；D10 tail5077保留原4841；D18 scene286新exit43518；原始指纹锁版 | JSON的id、reason与before/after提供来源含义，不添任务流水注释 | 只声明纠错，不混IO/运行态；脚本、消息、附加对象有独立域 | 使用现有plan结构，不为个别剧情新增解释器模式 | 当前原盘测试核变更IP全集和关键字；每项剧情语义沿已有合同，不冒称本轮重新跑剧情 | 领域命名block可查，引用D号是数据纠错身份，不作源码文件职责 | 只储差异；原盘和faithful不改 | builder前值阻止错版本静默应用；人工剧情判定仍不由哈希替代 |
| `events/script-corrections.test.ts` | synthetic源与对应指纹一致；错误只改单一输入域；supplemental每例新typed fixture | 标题拆成具体source/count/collision/gap/duplicate/scene拒绝，不串报全通过 | 15→21，互不共享可变输入；本地fixture只服务本合同 | 同合同source域参数化，正常/拒绝场景拆例，未新增泛用host | 原所有预期保留；old source+count、supplemental复合例分别拆开，防首个失败遮蔽其它分支 | expected words与命名tail直接表达目标，不从实现重算oracle | 小fixture留本文件；有意保留原数据不变和第二次确定性两个不同轴 | 无mock、磁盘或全局计时；正常结果按字面word/metadata校验 |
| `events/script-corrections.pal.test.ts` | 原盘SSS/M.MSG只读；明列changedIPs、关键word、旧tail与portal目标 | 原盘/纠正流区分明确；不是完整提取或E2E | parse→correct→serialize→disasm只读资源链，fixture和结果属于本例 | 与synthetic输入错误测试不重复，覆盖具体原盘plan | 5例固定字与changedIPs并核序列化后的场景metadata；普通可达性不外推 | `.pal`表示资源域；plan术语与产物一致 | 不复制二进制；复用repository raw | 缺raw真实失败不skip；输出对象仅内存 |
| `cli-script-corrections.pal.test.ts` | 2例支持版/faithful的发布顺序与旧输出保护；DATA缺失是有意终止点 | 明示只到events发布，不把预期中断称完整CLI成功 | CLI host拥有子进程/临时树且finally清理；无主树写入 | 两个不同版本策略共用host；不重复纯engine字节测试 | 补exit1与signal=null；scene81先断非空，再逐命令对全局同label完整内容，替代只判some(label)弱检查 | 默认修订与faithful标题分清路径 | 不保留生成输出副本到仓库；只用临时树 | 真子进程、真实源；stdout/stderr由host捕获并核指定失败 |
| `resources/scene-supplemental.test.ts` | 3原对象+3补充对象分散在0/1/0场景；核事件ID、坐标和场景区间未挤占 | extra与native边界注释对应实际输入，无重复宣称 | 只测serializer归属，不引运行态GameState | 与PAL检查plan内容不同；这里固定最小混序分布反例 | 核全局和场景返回对象身份、精确列表、原输入不写；1例内同一次序列化结果合同 | 命名说明supplemental归属，保留独立文件 | 无为增加数量拆成多个相同执行；无模式helper | 纯内存输入，不依赖raw文件或mock |

定向6文件：组织前34/34（该次CLI弱断言已补强，不是纯基点回执）；组织后40/40，default完整stderr空。原件 `extract-corrections-{before,after}-organization.*`。相邻scene与script-entries包含在此运行，但未因此计入93原主体。

### 运行时对象与描述消费（9个game原主体）

实际caller读域：event-system的0x1F/0x20与giveItem入口、menu-driver的物品筛选/描述/使用、equip-effect的消耗接线；bootstrap三条新游戏/读档/资源初始化注入点；game-state npcFromEventObject及场景范围；draw-magic/inventory/battle的描述消费；battle-system的投掷调用。原盘WORDS/OBJECT只读。SDLPal `magicmenu.c`读取item.wScriptDesc而非magic union的WORD4，现TS WORD5保留正确；不因只看结构体误报偏移。

| 主体（game/src/） | A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|---|
| `core/inventory-state.ts` | id0/qty0/99上限与既有合同；负值由caller处理装备兜底；TS删除零行是此helper原表示 | 删“原版空箱故意如此”泛论，明确D12已获批纠错与helper/caller责任；不假称C的零行策略相同 | 唯一库存数组owner，调用方负责业务时机；没有IO | event/equip/menu共用实际相同增删语义，不和投掷count0策略强合 | 既有dependency-ownership、event-system真caller断言核增删；366相邻只授运行范围 | add/consume语义直接，局部entry不跨脚本持有 | 两短入口服务实际caller，无死参 | 状态显式传入，资源/时钟不隐式读取 |
| `core/object-script-state.ts` | item2/3/4与magic2/3续点；完整7WORD播种避免flags/desc丢失，0续点不回退 | 补魔法菜单WORD5的union使用原因，原C读法与当前原盘63非零描述相符 | 只拥有rgObject overlay，业务运行脚本由caller负责 | get/set复用完整对象初始化，magic/item布局不同不合并裸数组 | 当前两类object-progress测试核Save/import、失败/新游戏和独立钩子；equip补全7字断言 | namedhook映射保留字段语义，未暴露任意WORD写 | 无IO、无同份状态复制缓存 | 可用真实caller及typed对象直接验证，未增加测试专用接口 |
| `core/object-script-progress.test.ts` | 修正2个物品菜单用例：usable=true且有库存；施法显式learn296；此前夹具不可从菜单选择 | equip标题对应flags+其它hook完整字预期；失败/等待/取消语义各自明确 | 5例分别涵盖真实事件/menu/equip/save路径，初始化每例独有 | 复用已存在game/菜单夹具，不另写runner | 由slice两字升级完整7字；5例均保留，根checkpoint与标题cancel有真实合法输入 | 文件职责是持久对象续点，不按作者/任务命名 | 不为每个断言增新例；保留等待持久化与取消不执行两个不同轴 | 全局events/菜单处理按现有生命周期恢复；没有mock脚本算法 |
| `core/scene-supplemental-objects.ts` | 只接显式supplemental标记尾段；缺口/不同定义碰撞不补；重复同定义幂等 | definition比较静态身份，不把mutable位置状态误纳入一致性说明 | 一个函数负责注入定义，共享对象引用保留；scene进度/存档由caller管理 | 三个bootstrap入口统一使用，未分叉加载政策 | 3合成+5真实资源用例分别验结构与旧档/门户接线 | 名称/短控制流清楚；保持同一模块避免分散append顺序 | 无兼容upgrader；只处理明确附加数据 | 纯列表操作；失败保护可用小fixture直接观察 |
| `core/scene-supplemental-objects.test.ts` | native不写、缺tail补入、全局已有仅补scene、碰撞/缺号/未标记跳过 | 标题对应安全边界，未声称真实剧情 | 每例新数组，归属与幂等分组 | 合成安全边界与PAL真实出口合同不同，不合并 | 3例核精确引用/数量/未覆盖旧对象，非只断不抛 | `supplemental`指实际数据职责 | 反例输入保留但不制造单例文件 | 无磁盘/时间/全局mock，确定性强 |
| `core/scene-supplemental-objects.pal.test.ts` | 当前extracted+旧档结构[1,0,4]，真实Save/export/loadScene/接触脚本/回归；4结局路径 | 手动布置站位与战斗handler是测试seam，未称自然剧情E2E | 每例slot1/handler/performance清理，场景资源readonly | 共用真实数据而非复制portal解释；与serializer层不重复 | 5例核native身份、入口/出口、场景进度，普通/胜/逃接线区分 | `.pal`明确资源与功能范围 | 不保存整份临时档/生成树 | 隔离保存槽与handler；缺资源不静默skip |
| `core/menu/script-desc.ts` | 合同为有界线性showDialog/0xA7/end描述；译文组保持resumeIP；合法未知入口返回空 | 删“100% C等价”与死循环误称，32限制是源指令数非译文行数 | 从event-system大出口改直接script-catalog依赖；展示查询不耦合执行器 | 复用既有消息区间，不能把有界展示扫读变成通用脚本执行 | 当前原盘295唯一入口最长5指令；5本体+10dialog-playback定向 | 常量改MAX_DESCRIPTION_INSTRUCTIONS，避免lines误导；文件保持单一职责 | 删不实长头注，不增加抽象层 | 显式目录和语言服务，可独立fixture检边界；时钟不参与 |
| `core/menu/script-desc.test.ts` | 未知IP改合法WORD60000；显式zh-CN隔离；新增无end32条上界 | 木剑标题直接包含skip0xA7/end边界 | 5例使用独立catalog setup/cleanup，语言偏好afterEach恢复 | 2旧用例与木剑完整数组断言同合同，合并映射不删唯一轴 | 原6→5：删木剑子集length/不undefined2例，新增32上界1例；全文预期保留 | 标题从编号/情绪描述改结果，不按card分文件 | 去掉多余Command[]强转，真实typedfixture | 无实现oracle；中文及译文播放合同分文件；32→33上界反控恰1指定业务AssertionError，源码恢复SHA匹配当前（description-bound-control） |
| `core/battle/__tests__/object-script-progress.test.ts` | 3例真实runScript：酒神8次/Save/load/第9次、失败/newgame、use与throw独立钩子；敌HP9000不提前死亡 | “持久化”只授内存Save/export/import，不冒称浏览器整战E2E | battle fixture提供hydrate与资源；gs overlay保留续点 | 和大世界文件caller/时机不同，保留battle目录归属 | 字面次数/库存/rgObject断言，Repeat回入口等边界不以mock回执替代 | 按battle对象续点命名，非模型/卡号 | 3个合同保留，无机械重复用例删除 | 每例独立状态及槽清理，真实脚本可证伪 |

局部对象/描述由6文件32/32到8文件366/366；增跑的是相邻dependency-ownership与event-system，不把多测数量算治理完成。完整stderr空；原件 `game-object-and-descriptions-{before,after}.*`。当前产品差异只有文案、内部依赖层级和常量语义名。

### 投掷路径（2个原主体）

完整读实现与专测，真实caller为battle-system投掷分支；相邻读取item-inventory-lifecycle、battle-lifecycle夹具、typed battle-records与脚本解释器对应0x20/giveItem分支。SDLPal `fight.c` 4332–4376先RunTriggerScript再AddItemToInventory，`global.c` 1063–1177按调用时库存查ID；[独立机制裁决](../../cards/GAME-BATTLE-THROW-LIVE-INVENTORY-1.md)不借前一使用物品授权代签。

| 主体（game/src/） | A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|---|
| `core/battle/actions/throw-item.ts` | 真实脚本重建库存时旧entry漏扣，用户批准后按当前ID重查；脚本耗尽不再扣，普通count0行保留；续点/目标/异常传播未变 | 清除旧覆盖数量及“兼容旧fixture”说明；明确即时效果/缓冲数字的所有权 | 本模块只编排脚本、消耗与动画，脚本持实际伤害，driver持播放；entry不跨任意脚本持有 | 保留现有runScript与timeline/driver；不把use与throw不同消耗条件强合并 | 正式重建入口1红→绿；近邻item及object-progress12绿；旧引用反控恰1业务红 | origin同时表达可建挥臂前提与位置，删两处强制非空；无作者职责文件 | 无新fallback/模式；未借此删除敌方参数或RunScriptFn重出口 | 真实hydrate/startBattle+解释器直接观察；不为测试改产品注入接口 |
| `core/battle/__tests__/throw-item.test.ts` | 改完整typed Item/Magic/Object视图与真实开战；正常windup/效果/数字消费和库存均可达；耗尽/缺条目分别为合法拒绝输入 | 标题限定数据级演出及生命周期，不称浏览器整战 | 夹具只布资源/phase，真实tick负责播完；warn由本例精确断言并onTestFinished恢复 | 共用现有开战与record夹具；物品专属资源留本文件 | 旧6条合同全有去向：伤害/挥臂/即时蓝字3条合入同次真实动作并最终精确1条蓝字；施毒与零脚本保留；缺库存拆成缺条目/零数两输入；另2条脚本后库存合同 | 文件以投掷职责命名，case按结果；无any/shape双强转 | 合并重复执行，保留每个旧轴；当前7身份不以数量证明等价 | 没有mock解释器；IP0提供实际有副作用指令以验证不执行，警告参数/次数及无动作一并核 |

原件`throw-item-before`6绿、`throw-live-inventory-red`6绿1红、`throw-live-inventory-green`及`throw-item-organized`、`throw-live-entry-control`、后继局部恢复；最终分组后缺条目/零数分开，因此当前7身份，下一次相关恢复以实际原生集合核定。首个行为修复补丁已独立保留，后续纯组织/夹具整改在最终提交时分开；重型门尚未跑。

### 原盘纠错的运行时消费者（3个原主体）

全文读3个PAL专测及真实资源/入口；与上游extract6主体复用同一纠错源，但此处检查真实战斗施法、enter/tick场景脚本与walkability/BFS/搜索消费，不能用生产端字节测试代替。源数据只读，翻译/剧情文风没有新增修改。

| 主体（game/src/core/） | A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|---|
| `script-corrections.pal.test.ts` | 酒神9次的旧夹具未hydrate且首击已打死敌人；新增存活前提先红后修，真实loadDefaultGame/投影，合法WORD敌HP60000；每次明确补MP，非连续9回合 | 注释明示隔离重复调用与原盘数据纠正，未冒称普通完整战斗 | 夹具持运行态，实际脚本/法术处理次数与续点；运行间目录/偏好恢复 | 原盘与执行器共用现有数据，不再手填部分BattleState | 原8身份/断言保留，施法前存活断言阻止假阳性；计数/入口/伤害均由正式执行观察 | 真实原盘路径用pal语义，夹具名称表明源 | 不为次数测试复制解释器或九份输入 | 可直接证伪合法目标前提；失败原件非产品bug，不授自然剧情/E2E信用 |
| `script-story-corrections.pal.test.ts` | 10例真实脚本/cursor/选项；asset loader与performance只隔离IO/时钟，不替换剧情分支 | 显式owner、denyCount、stopAfterCourtAnswer说明测试停点 | 六位置参数改命名options，停点与场景进入回调分清；每例新状态 | 复用同一正式执行推进helper，未扩成通用剧情模拟器 | 所有原输入/业务断言保留，无新增例数；合成停点不称自然演出 | options展示调用意图，避免布尔/undefined位置串 | 删位置负担，无额外中间层 | 真实事件系统，mock资源恢复；可观察剧情状态/队伍/跨场景出口 |
| `script-topology-corrections.pal.test.ts` | 原盘portal、map walkable BFS与真实搜索；方向/半格offset为合法tuple | 校正“反直觉”来源误读后保留实际搜索阈值含义 | 只核拓扑与入口，动作机制仍属于scene owner | 复用实际walkability和search，预期距离/triggerMode用一手常数而非再实现公式 | 4身份不删；方向强转去掉，固定48与mode5 oracle，非算法自比 | `.pal`与topology明确资源/职责 | 不添加第二套地图/路径运行器；无多余cast | 真资源缺失会失败；没有跳过/环境兜底，也没有因此授全剧情可达性 |

`pal-script-fixture-precondition`21绿1前提红，修复后`pal-script-and-throw-restored`33/33、stderr空。酒神修复前提补丁和指纹保留，不把失败改写为产品机制修复。

### 语言呈现与夹具归属（7个原主体）

全文读本表文件；相邻全文读language/layout/font/draw-description、tools/map-names、shared authored map names、tools-panel英语host及被迁移的4个夹具消费者。ASCII一手为SDLPal `ascii.h::iso_font_8x8`基本128字形；箱体图为uigame.c 1075–1168与1810–1860。重用此前本轮原资源布局验证，不重新授所有译文或画面审美。

| 主体（game/src/） | A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|---|
| `localization/map-names-en.ts` | 全表核与authored地图ID一致，缺名由number caller回Map N；静态译名不写身份 | 无泛化“全剧情已验”注释；显示名/源名边界由caller声明 | 只数据，无IO/存档写入；map-names持语言选择 | 唯一英文名表；不与中文考据真源复制为一张新万能表 | 当前map-names4例核已知/未知与语言，资源ID对照；不以计数替翻译审美 | 地域语义名称及number键明确 | 缺104/164/168/171不是用原型缺词处理；不造无用条目 | 静态表可经真实查名入口核，无核心mock |
| `localization/settlement-language.test.ts` | 真实结算输出、save/import身份与实际渲染；role3/学习349为typed数据 | 限结算本地化及身份，不称完整浏览器胜利 | 改现有偏好隔离夹具并恢复localStorage/html.lang，避免持续写测试偏好 | 从退役present-fixtures转现有menu-ui夹具，绘制spy仍call through | 原1身份保留，确切文字及身份/运行态结果均未弱化 | 按settlement语言职责命名 | 不复制另一套菜单资产/全角色数据 | 无实现算法mock；语言订阅与宿主资源按已有Owner恢复 |
| `present/menu/localized-background.ts` | 借用已校验320×200源只读，裁剪目标box，WeakMap按源身份+layout键缓存；源替换后缓存可释放 | 补借用只读前提；box搬移与equipment擦字两注释各对应一手段，不称完整C绘制等价 | 一模块两种背景派生，源资源owner持替换；不读语言全局或IO | 复制带范围/生命周期不同，局部copy不抽万能图形框架 | 擦除边界、源不变、缓存布局分离、两端裁剪；>=319变异精准1红 | 两导出按实际用途；矩形坐标保留便于原源对照 | 无mode flag、额外包或死参数 | 纯buffer输入可精确像素断言；不为检测暴露cache |
| `present/menu/localized-background.test.ts` | 独立320×200渐变源；左右/上下合法裁剪坐标和第二source身份 | 原同源比较加强为字面带边界，标题不冒称实际游戏截图 | 每例新source；缓存身份用对象区分，不清全局WeakMap | 3例各为擦字/搬框/裁剪与缓存合同，不拆每个像素为弱例 | 2→3：旧断言保留，8边界与8邻点、远角/原源非变异；edge control恰1业务红 | 标题直接说明绘图结果 | 无像素快照副本/缓存私有访问 | 直接运行派生实现，oracle来自源坐标一手含义，不复制绘制循环 |
| `present/small-font.ts` | 全128基本字形与SDL iso_font_8x8逐行一致；font.ts转换MSB与布局8px合同核过 | 许可/来源说明保留；不扩大到C扩展Latin字符全表 | 只只读字形表，font caller持渲染布局；无状态推进 | 与已有C字形共用明确来源，未再造font框架 | `small-font-source.json`逐行同值；layout/description实际消费测试支撑尺寸，非图像审美断言 | 字符码/行bit职责直接 | 无死分支/模式；不补未需求字符 | 无IO/时钟，byte表和实际转换器可低成本复验 |
| `tools/tools-panel.english.test.ts` | 5例真实DOM面板及资源可用门；语言切换保留焦点/state，移动布局排除，所有tab帮助无汉字 | 标题与DOM范围一致，不称剧情英文全可用 | host拥有timer/listener/偏好/音乐controller，套内清理与host恢复顺序核过 | 使用tools-panel现有host，未复制mount | 5身份全保留，真实切换/文字/禁用状态结果；非只mock次数 | 按英语面板职责命名 | 与新的ui-text未知key专测不同层，不删必要工作流 | 真实DOM/事件，边界资源由typed host注入；恢复不清无关storage |
| `__tests__/glm-phase1-leaves/present-fixtures.ts`（退役） | 全文核229行，4当前caller均读；默认mp99/max40非法且绝大部分无消费者 | 不搬旧作者说明到新入口；各保留fixture声明实际职责 | 角色→menu-state，UI帧→menu-ui，像素→raster；唯一battle图标留具体消费者 | 复用现有职责夹具，无新平行文件或包 | 4消费者/相关9文件57绿，固定像素oracle仍在；magic fixture显式maxMP40/mp20 | 真正消除按作者组织，非仅换名 | 整文件删除，dead textDot/mkItem/makeGs等不留包装出口 | 现有fixture承担各自合法输入；不以通用大上下文提高“可测性” |

迁移调用方为settlement-language、draw-equip.localization、magic-menu-fixtures与draw-battle-ui.selection-pixels；后3为既有相邻已关闭范围，当前只授必要变更/引用核验，不增加93原主体。`language-presentation-and-fixtures`9文件57/57、stderr空；background裁剪反控及恢复见后继战斗切片。不会重写旧运行报告中的历史路径。

### 工具标签查询（1个原主体，另1个新增专测）

完整读 `localization/ui-text.ts`及新增`ui-text.test.ts`，真实caller为全文核读的`tools/tools-panel-dom.ts`，依赖为`localization/language.ts`及隔离夹具；本轮沿用已全文核过的tools-panel英语专测与其host。原表只含展示译文，未触碰数据身份、原盘对白或语言包。历史同类入口与本次Git归因见[本次裁决卡](../../cards/GAME-TOOLS-LABEL-OWN-KEY-1.md)，不以旧修复授本文件信用。

| 主体（game/src/） | A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|---|
| `localization/ui-text.ts` | 正式DOM入口证实继承constructor违背未知文字原样回退；用户批准后hasOwn限定实际译文，缺键仍回原文；普通操作触发该键未证明 | 模块头仅声明展示用途，符合caller；不添加逐行复述守卫的注释 | 私有静态译文表只读，language持偏好，DOM caller持节点；不写其它状态 | 复用现有localize；其它表的缺键合同不同，不为两行查询造公共helper | 同一真实红例转绿，3文件10例覆盖中文/英语/普通缺键/继承缺键及真实工具操作 | `english`明确查询结果，表与唯一查询函数同模块，文件职责充分 | 无名称黑名单、兼容分支或新增出口；原表值保持 | 真实DOM文字可直接断言；偏好通过现有夹具恢复，无核心mock |
| `localization/ui-text.test.ts`（新增，不增加93完成数） | string签名下合法未知键；中文、已定义英文与普通未知为同一查询合同正控 | 标题准确限定已定义及继承缺键，未声称全工具路径 | 每例新parent；before/after恢复模块偏好、localStorage及html.lang | 复用现有隔离夹具和生产DOMprimitive，不注入私有表 | 精确文字oracle先1业务AssertionError后绿；不只检查typeof，不复制实现查表 | 按模块职责命名，无模型/任务后缀 | 1例保留必要正反控，不重复工具全页渲染测试 | 无timer/网络/核心mock；失败位置指向最终DOMtext |

原件`tools-label-own-key-{red,green}.*`含source SHA、完整输出/原生结果与执行身份；红1/1失败，绿色3文件10/10且stderr空。scoped Biome两TS文件0诊断；未运行全仓、coverage、protected或新增浏览器视觉验收。规范补充字典所有权和同类根因扩查要求，横向初筛不计其它文件已审。

### 合击、敌方决策、动画及状态机测试组织（10个原主体）

完整读取本表原10主体和新目的文件，主源为SDLPal fight.c::kBattleActionCoopMagic（3364–3378、3856–4107）、目标拒绝与状态门（4489–4668）、UpdateFighters（940–1019）、真实battle-system生产调用/时钟收尾和present-battle调用。相邻全文核过battle-fixture/records/scripted-rng、magic-action-contract、battle-start/lifecycle/settlement夹具、settlement两专测、hidden-exp专测、battle-progression及runScript返回入口的分支；不把这些相邻文件增加为本批原主体。原TEST-GLM-GAME-BATTLE-STATE-1为已归档done，唯仍在飞的turn-boundaries不写入。

| 原主体（game/src/core/battle/） | A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|---|
| `actions/coop-magic.ts` | 核对象解析→healthy筛选/降级→HP成本→伤害→时间线/即时输出；同步传播异常，无异步资源Owner；普通数值域按C段核，既有TS暂存SHORT/超杀HP表示不改，不承诺极值C转换等价 | 删“旧fixture兼容”与WORD下溢误称；数字采用TS钳0后的完整计算伤害，非剩余血；资源缺失回落含义收窄 | action协调健康/费用/伤害，timeline持帧数据，driver持副作用；召唤建链是本模块私有职责，无DOM/IO混入 | 删除重复SHORT/OffMagic类型谓词/数字类型，引用现有magic-action-contract，实际输入/失败/生命周期相同 | 原15+3→新17，C原生函数向量166/15替代实现自比；正常EXP误写变异旧3绿、新恰1红 | 公共input保持；局部变量表达目标/参与者，保留顺序可读的协调函数，不按行数拆小包装 | 不新增模式、万能上下文或出口；无来源的旧兼容叙述删去，保持现有失败策略 | 注入typed资源/RNG，真实state/queue与bus结果可直接检验；不为测试新增私有出口 |
| `__tests__/coop-magic.test.ts` | 完整合法record+createBattleState；普通合击传gs/actor，降级真实费用/伤害/经验；濒死排除改成3人中2健康的可执行路径 | 删除把无actor no-op当C排除的说明；字面伤害注释对应固定C向量 | 本文件只放参与者、HP/MP、伤害、经验；动画装配断言迁同模块animation专测 | 两文件共用小型coop fixture，底层复用现有record/factory，非复制部分BattleState | 结算9身份：HP/低血/濒死/高maxHP/强度/超杀/sleep及降级healthExp2/3；全旧轴去向明确，非clone调用同算法作oracle | 文件/标题按合击语义；没有核心as/any；降级完整RNG调用序显式 | 合并主测降级与H05两重复子集；正常EXP负向合入费用动作而非新增弱例 | 直接动作typed输入，不需宿主全开战；这一夹具不声称hydrate/startBattle全生命周期 |
| `actions/coop-magic.glm-next-wave.test.ts`（退役） | 三原用例全文核；正常合击少传gs导致EXP断言不具检出力，降级两例可达但与主测同合同 | 旧“补测未证”历史叙述不搬到当前代码 | 降级归结算主测，正常EXP负向归普通合击成本例，已无独立职责 | 复用同一完整fixture；未生成glm后缀替身 | 两降级子集→参数2/3的完整动作+动画+RNG/EXP断言；正常负向→传gs后有效反控，旧3绿对同一错误仍绿的原件保留 | 作者/任务命名退出 | 整文件删除，必要断言全迁而非只删后缀 | 以反控证明旧弱点被消除，不凭新17绿宣称改进 |
| `enemy-ai.ts` | 用户批准删除测试专用预过滤分支，完整party/enemySlots必传；生产拒绝抽样、状态先后、sentinel及既有64guard保持，原C无64guard的差异明示 | 纠正battle.c定位与“纯函数”假称：消耗调用者可变RNG；省略参数兼容说明退出 | 只返回决策，caller持脚本/队列/执行/隐身；生产装配不再算两份无用数组 | 不用共享helper强合party与enemy不同拒绝条件；使用现有RNG接口 | 当前14例核完整动作与方法序；silence短路变异恰1业务红；后继13文件102恢复 | 输入名按实际完整表，删future扩展hp字段说明和过时任务号 | 已批准删除alivePlayers/aliveEnemies及旧fallback；不复活兼容路径 | RNG显式注入，不读全局；状态与slot表够用，不传GameState大上下文 |
| `__tests__/enemy-ai.test.ts` | 所有主测迁生产完整槽；confused施法者必须在活槽内，旧self9改4槽/自身3；空/全死明确是防御域 | 标题只描述当前决策，不声称RNG算法同SDL；固定seed仅TS向量 | 单模块决策，无IO/timer；每例新RNG不共享游标 | 换50行复制Enemy为现有record；同规则概率/状态用参数表 | 14身份：法术0/必出/率0/沉默/sentinel，sleep/paralyzed先选人，拒绝/无活目标，confused他/己/拒绝，固定seed输出；同seed自比改既有独立PRNG向量预期 | 命名消除B2/OBS任务来源标签；case空队伍具名 | 与旧状态机文件DL7合并，重复弱type检查升完整结果+顺序，不增加独立“roll次数”假oracle | recordingRng拒绝域外值；不再spread种子RNG后任意重写方法制造不一致假数据 |
| `battle-anim-driver.ts` | 逻辑时钟唯一提交keepEffect/数字/声音/消息；render只写视觉，loop/fade交专驱；完成返回由caller清理，边界0时长逐帧有限推进 | 两段错挂docblock重归实际函数；纠正O(前进帧数)为每次扫描前缀；删无证实测数量，不把TS idle clock称C逐帧等价 | driver低于actions/host避免反向循环；传state/clock/bus，没有资源IO、规则结算或DOM | visual更新由逻辑和渲染复用，playerRestFrame用于复活/召唤/收尾；无相同规则再复制 | 25driver与4真实host测试；副作用归属变异精准业务红，后继102恢复；不授新视觉观感 | 按时钟/应用/复位明确职责；现239行保留一模块，拆分会分散同份render state ownership | 无行为/公共签名变化；旧噪音注释删而未造新wrapper | 时钟显式数值，bus直接观察；render可与logic顺序调用验证，不靠“没有bus参数”推定安全 |
| `__tests__/battle-anim-driver.test.ts` | 构造完整record与公开工厂，不再造部分Enemy/Role强转；显式frame输入、角色状态和逻辑时钟可核 | 删“无bus即结构保证”错误结论，新增实际persistent/idx/elapsed断言 | 25例围绕帧应用、时间线启动、render clock、复位四组；各自新state/bus | 用既有battle-fixture/records；未抽特定三帧测试成模式框架 | 原24→25仅sleep/puppet独立参数化；render先走再logic提交，精确数字/音效/持久帧仅一次；idle复位补frame/tick | 无shape cast，标题按时钟与结果 | 没有把每个delta另拆弱测试，旧合同保留 | 副作用反控首次render提前创建持久缓存即唯一业务红，实际logic后能断言完整结果 |
| `battle-state-machine.glm-battle.test.ts`（退役） | 全464行核完：旧boot无hydrate/另造resources；现改正式hydrate/start helper和实际资源；死亡槽快照旧不一致不继续保留 | 过时“残余10条/旧侧未证/作者任务”头注退出，真实范围写到目的模块 | 选择/队列/经验→battle-action-wiring，ready→runscript-rearm，屏→settlement.screens，主升级→progression.level-up，AI→enemy-ai | 统一现有start fixture，去两份完整record/资源副本；已有settlement.scripts同合同被复用 | 全10旧轴映射见下；未学两个分支拆独立，学法正控显式学习，EXP精确3；槽满由只查无354升整表不变，快照27→31字面oracle | 所有目的文件为职责名，没有换作者后缀保留大杂烩 | 原文件整删，PhaseE重复项删除有具体新合同指针；无新增公共产品接口 | 真实tick/成长函数，不再用越界RNG0覆盖所有区间；fixture新增端口只是已有start参数透传 |
| `__tests__/battle-anim-integration.test.ts` | 旧首例实测先播敌动画，玩家先手前提恰1红后修为dex100；现在核队列/当前actor与实际伤害，敌HP60000为WORD合法；回血明确正式脚本后复位 | 删“向后兼容”与误称首动画必玩家，区分动作即时推进和胜利收尾 | 复用真实hydrate/start helper，4例只核host所有权，不复制所有Frame规则 | 删除140行重复boot/record结构，保留局部角色/物品输入 | 原4身份不删；实际actor/掉血前提加强，播放中index不进、播完进1及治疗HP/frame0保持 | 文件按integration职责；暴露的空生命期仅作为显式已选择输入 | 不留原partial host；治疗资源与input是实际需用参数 | 真tick跑时间线/解释器，不替换performItem或完成算法 |
| `__tests__/runscript-rearm.test.ts` | 去0x9F未支持占位+全局静音，改合法battle描述前缀；入口1保留0空槽；越界只在指定反例精确核warn | 注释说明返回点与caller回写，不泛称explore同步runner为生产路径 | 纯返回5例与唯一ready caller1例各有范围；caller真实脚本给物品，第二次不重复 | 使用现有typed battle factory与start helper；不另造脚本循环 | 旧plain/advance/reset/missing/out-of-range全保留并更换合法前提；旧状态机ready指针例升真实脚本副作用与重触发 | 按返回入口职责，无作者标签；advance/reset预期字面IP | 去beforeEach warn/debug blanket spy，无无关raw分支 | 唯一预期warn的spy精确参数/次数并onTestFinished恢复；其它5例零静音 |

#### 旧合同→新去向及原件

- 合击：旧主测费用/低HP/濒死/高maxHP/强度/超杀/sleep留结算主测；7个动画组移至`__tests__/coop-magic.animation.test.ts`（原双type声音改2个独立输入，共8身份）；主测降级与H05的掉血/HP/经验及顺序两子集合并为healthExp2/3的同一完整动作合同。H05普通EXP负向合入传入gs的正常费用例。总15+3→9+8；所有原断言的独有含义仍有去向。
- 原状态机：haste、未学攻击/辅助降级、防御经验、施法经验→`battle-action-wiring.test.ts`5身份；DL7→enemy-ai概率表的silenced与未沉默控制；ready→runscript-rearm最终真实caller；exp0/cash→settlement.screens新例；defeated脚本执行且entry不回写→已有`battle-settlement.scripts.test.ts`“真实战后脚本仅执行一次”例（makeWonBattle实际HP0/defeated，明确核entry=1/collectValue7/dialog/恢复释放）；满法术槽/含装备快照→`battle-progression.level-up.test.ts`2例。原10轴无遗漏，没有为作者边界新增一套重复的状态机测试。
- `battle-actions-before-organization`6文件70绿；`coop-normal-exp-old-control`植入普通合击经验误写后旧3例仍绿；同一错误在`coop-normal-exp-new-control`仅费用/普通EXP断言1红。`coop-c-oracle`编译本树C原函数，固定普通输入magic166/physical15，不调用TS作为oracle；编译器stdout/stderr与harness保留，二进制已退出。
- `enemy-silence-order-control`实际仅silenced顺序断言1红；捕获脚本因预期子串没含Vitest显示引号而自检拒绝，后以原件完整身份定向核实，未重采/改写原件。`render-ownership-control`与`localized-background-edge-control`各恰1业务红；每次source字节恢复证明保留。
- `animation-actor-precondition-red`3绿1业务前提红，非产品bug。红输入已用Git基点+补丁重构并与原运行SHA完全相等。`battle-module-slices-restored`13文件102/102、stderr空；`battle-organization-complete-types`exit0且stdout/stderr空。以上均定向/相邻，未跑全仓或coverage，未声称新浏览器视觉接受。

新增/相邻重组闭包也分别核八维；本表不增加93原主体进度。相邻已关闭文件只接收本次必要差异，不重授其全文信用。

| 文件（game/src/core/battle/） | A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|---|
| `__tests__/coop-magic.animation.test.ts` | 8例均从旧主测迁移，合法Magic/Object完整flags与有效party；资源有/无分别有明确前提 | 声音、层次、召唤/归位注释限定声明式帧，不冒称像素观感 | 只测合击协调器到timeline/driver的数据接线，和结算分开 | 使用唯一coop夹具及真实动作，无复制输入工厂 | 所有旧7组断言保留；声音2输入分开；numIdx增加正数守卫及精确166，避免两个-1自比 | semantic文件名/组名，去不必要Magic类型断言 | 不复制各timeline的内部算法预期；仅保留真实caller参数/时序接线 | 无核心mock/时钟等待，bus与frames可直接观察 |
| `__tests__/coop-magic.test-fixtures.ts` | 3个小输入帮助项/完整ObjectMagic flags；createBattleState提供当前完整形状；声明不hydrate | 模块头说明direct action前提，9001明确合成测试object | 只持本组typed数据，actor/phase和业务结果由例自己选择 | 底层records、battle-fixture、recordingRng均已有真消费者，不再复制结构 | 两消费者17例实际执行，业务oracle留测试，不嵌入fixture | 名称与合击输入职责一致；party/role有显式对应 | 不提供无caller选项或旧shim；输出仅现有fixture加本组sleep设置 | RNG确定性且域校验，输入每次新实例；不公开产品私有状态 |
| `battle-action-wiring.test.ts` | 5身份使用hydrate/startBattle与显式已学/未学队列；完整资源沿真实host读取 | 删DH3/E04来源编号和“未证”旧结论；隔离queue语义明示 | 只核动作选择后的执行/队列与经验，拒绝混入奖励屏/升级 | 共用start fixture与record；Magic/Spell特定输入留本模块 | 未学攻击/辅助2轴独立；魔法消耗/经验精确3且正控显式学296，防御+2/haste排序均真实结果 | queueSingleActor替换歧义injectSingleItem；按实际接线职责命名 | 去复制resources/field/Enemy/Role大表；每例不共用可变状态 | recordingRng受控，真实tick负责动作，不mock合法性或费用 |
| `battle-progression.level-up.test.ts` | 2例用完整正阈值表与hydrate角色；full32slots及唯一装备加7是合法输入 | 说明主升级与hidden growth区别，不把此轮当全结算 | 专注升级结果/槽与有效属性快照，不驱动屏幕 | 使用既有lifecycle+recordingRng；没有新boot包装框架 | 槽满整表不变，字面27→31并核裸24；不再用实现当前值+7生成oracle或越界0RNG | 按主升级职责命名，fixture只服务本文件2例 | 2独立合同，未重复hidden7池/恢复顺序例 | 纯公开成长入口，合法最小6抽均明确供给 |
| `battle-start.test-fixtures.ts`（相邻差异） | 原hydrate/party/start顺序保留，只透传实际需要的items/spells/magics/commands/seed和party；旧默认完全不变 | 原fresh hydrated说明仍准确，不冒称真实原盘全资源 | 唯一start宿主持装配；测试自选已知phase与资源，helper不执行待测业务 | 4消费者共用真实初始化；替代2份复制boot，新增字段均有caller | lifecycle/idle旧11与本片动作/动画/ready测试均进真实runner，默认行为绿 | 字段沿StartBattleInput类型，party显式说明角色顺序 | 不增加mode布尔、兼容分支或全局缓存 | typed依赖可控；资源仍由真实startBattle安装，非自行构造假resources |
| `battle-settlement.screens.test.ts`（相邻差异） | 新exp0/cash50以真实won状态入屏；无升级/经验但仍现金入账 | 标题限屏与现金一次，不称完整战斗输入生成 | 归现有屏装配组，makeWonBattle持合法快照 | 与实际script生命周期专测复用相同won helper | 新例保留原状态机两预期并补下一tick不重复现金，原6身份未改 | 按zero experience屏合同，非来源卡号 | 没有复制一份settlement构造；8旧脚本合同复用，不添重复dead槽例 | 真host入口观察screens/cash，未mock结算算法 |


### 法术资源解析、编排及专测组织（7个原主体）

完整读取原magic-object及六个原测试文件，含1498行magic-inline-damage；新目的文件也逐项核过。caller为performMagic全文及battle-system的pickAutoMagic、buildBattleMagicSelect、handleMagicSelectInput、executeCurrentAction相关分支；相邻核shared Spell/ObjectMagicView、parsers/spells全文、OBJECT入口读写、runScript的本片分支与0x1B/0x2D/0x41。不授event-system或actions主测全文信用。primary为SDLPal PAL_BattleUIPickAutoMagic、PAL_BattleEnemyPerformAction预掷/伤害/受击段、OffMagic/DefMagic/Summon及当前HP/RNG合同，帧断言不是新画面验收。

| 原主体（game/src/） | A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|---|
| core/battle/magic-object.ts | Spell优先且引用缺失不偷换OBJECT视图；缺项返回undefined/reason；同步无IO；Magic和既有Spell借用，fallback新建Spell但flags借用，进度归GameState | 纠正295现已被parseSpells追加的旧叙述；补错误优先级/借用 | 只解析静态资源，caller持费用/脚本/菜单推进 | 成功解析与失败解释的返回/分配合同不同，失败才二次find，不造万能result | 动作/自动选择及相邻parity90绿；295 fallback已有actions例，不把测试缺Spell称生产常态 | 两身份id/magicNumber及source清晰，小模块不拆包装 | 注释修，无接口/兼容变化 | readonly资源输入，真实caller可直接注入，无全局状态 |
| battle-action-error-arms.glm-q.test.ts（退役） | 13例核caster防御域、真实投影及自动选择；throw缺库存已在当前主测 | 历史Q号/静态行号退出，warn精确参数且保证还原 | caster归magic-input、选择归battle-auto-selection、throw归已有throw主测 | 删除复制Role/Enemy/BattleState，复用records/factory | 原2+10保留；throw1重复由missing/zero两输入覆盖；逐身份映射有原生索引 | 按真实调用职责分文件，无作者后缀 | 整文件删除，非改后缀留杂合 | 投影真实hydrate；拒绝例仅精确捕获预期warn，不全局静音 |
| battle-magic-e2-target-semantics.glm-q.test.ts（退役） | normal/all/overkill三轴；三个真实不同roleId，HP/max合法，65/30字面oracle | 删Q号和首次补测叙事，C数值与钳制区别保留 | 归enemy-magic同一敌方动作caller | 用完整factory及域校验RNG，删第二套partial state | 原3转同3，HP及完整number数组区分全体/单体/钳制 | 文件按敌方法术职责 | 260行旧文件退出，无重复表定义 | 真performMagic/runner，不以当前实现重算预期 |
| battle-magic-e2-autodefend-poses.glm-q.test.ts（退役） | 三独立角色，预先sleep，32/65及guard/hurt/数字时点保留 | 过期magic.ts:953等位置与来源号退出，注释限实际帧 | 资格与动画反馈归enemy-magic | target/pose/pre-roll同一小夹具，不共享mutable enemy | 原2转同2；唯一guard帧、5hurt、颜色坐标及数字全保留，两例均无即时bus | 按guard/hurt职责 | partial state和无校验RNG退出，不制造第二个AoE宿主 | 显式合法抽样，真实HP/frames直接核，不用mock次数冒充结果 |
| battle-magic-fizzle-audio.glm-q.test.ts（退役） | 合法entry1真实0x41；sound9/0各核MP25、HP50、无实际heal/动画 | 长篇作者返工史退出，说明只限失败脚本/反馈合同 | 归magic-scripts失败gate | 与旧inline伪失败合并，删第二套部分Role/state/gs | 原2归新参数2；错误执行0x1B会HP130，正式反控指定HP断言1红 | 按脚本/声音输入命名 | 整文件及blanket warn spy删除 | hydrate真实gs，观察后委托真实runner，不手置fScriptSuccess |
| core/battle/actions/magic.glm-next-wave.test.ts（退役） | 原entry9超出唯一end、核心mock直接设sleep；现真实entry1/0x2D，sleep2及HP468/435同核 | 删无直测等易过时覆盖宣称，方法序不冒称PRNG位等价 | 归enemy-magic，与预先sleep姿态合同分清 | awake/sleep自比与相对比较三身份合为hit/miss字面2 | 预掷移到script后使指定命中例HP435非468，恰1业务红 | trace按事件/IP命名，case按hit/miss | 整文件及越界核心替身退出 | 真实runner施sleep，recordingRng只控制抽样，有实际伤害 |
| core/battle/__tests__/magic-inline-damage.test.ts | 全33原例核，伤害10留此，0x88用真实hydrate；正常HP/MP合法，缺位置显式删字段 | 更正DefMagic无前摇/35与40错帧注、fallback兼容措辞及伤害数字叙述 | 原伤害/召唤/player/def/enemy/scripts/数字分五职责，不按历史交付组 | 小夹具复用records/factory；统一精确数组placeFighters，去三个静默位置helper | 33全映射；重复player链1及zero-use/heal子集1合并，伪失败并真实fizzle；numIdx>0和精确50避免-1自比 | 按职责组织，caller/帧/数值命名明确 | 1498行拆职责，删partial state/noop，不仅换模型名 | MP100/max30、两队员共用role0等非法输入纠正，产品不加兼容 |

新目的文件不增加93原主体进度，各维结论如下。

| 文件（game/src/core/battle/__tests__/） | A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|---|
| magic-action.test-fixtures.ts | 完整records→createBattleState→hydrate，每次新状态，ID独立 | 头注明确不安装startBattle资源 | 只造typed输入，oracle留case | 复用既有records/factory，有实际消费者 | 6消费者51例，不计helper为运行身份 | 名称说明法术输入 | 无模式/强转/空断言或复制加载器 | 可控真实state/gs/RNG |
| player-magic-animation.test.ts | 15例召唤/Off/Def资源/位置/音效，防御队员ID唯一 | 更正错帧/前摇，删旧兼容说明 | 专注player到动画数据 | 精确数组placeFighters服务两组，无默认位置 | 3召唤+8Off+4Def，重复普通链只存一次 | player动画职责命名 | 无公共产品接口/新模式 | 真动作及frames/声音观察，不授像素/实听 |
| enemy-magic.test.ts | 10例normal/all/overkill/动画/资格，32/65合法向量 | 区分C数值、调用序与帧数据 | 敌方动作到资格/伤害/反馈同域 | 三原专测共用小敌方夹具 | 3动画+3target+2guard+2真实pre-roll；时序反控1红 | 明确slot/role与输入结果 | 无核心mock和三相对弱比较 | 实际0x2D+HP核脚本，RNG范围校验 |
| magic-scripts.test.ts | 合法entry1/3；顺序/目标/效果，use0仍heal，失败保MP/声音 | 说明真实脚本边界，不称wrapper为执行替身 | 只核脚本分派/失败 | 小夹具复用，命令留case，两声音同合同参数化 | 核背包/HP/MP，失败gate变异HP130≠50恰1红 | use/success及IP明确 | 合并zero-use/heal重叠，无自比oracle | 委托真实runScript，无静音/越界 |
| magic-input.test.ts | caster9及缺role为明确防御域 | 只声称提前拒绝，warn精确 | 仅两拒绝前提 | 完整base只改非法域 | 诊断数组、MP/bus/未调用，onTestFinished恢复 | 输入职责命名 | 无复制表或blanket restore | vi.fn仅证不执行，另核业务结果 |
| battle-auto-selection.test.ts | 2target+8auto，经真实hydrate/投影 | 来源Q头退出，C筛选条件已核 | 选择规则独立于菜单呈现 | typed factory共用 | 10独有轴完整映射，MP/cost/strict tie字面值 | 自动选择职责与组名一致 | 无任务名/死出口，不同seed自比 | 纯调用+合法资源，投影断言不授UI |

原生基线magic-callers-before-organization 23绿、magic-inline-before-organization 33绿。仓外magic-contract-mapping.json引用各native JSON的file及0基身份索引：旧56恰覆盖一次，新51魔法身份全部有去向，语义映射由人工核读承担。少5例：throw重复1、普通player链重复1、zero-use/heal及失败音效合并2、旧三种mock睡眠相对比较转hit/miss字面2减少1。不是为过门删反例。

过程错误保留：新脚本例首次误写rgInventory/item及GiveItem.amount，先后1红和2个type错误；按真实类型/入口改为inventory/itemId/count。两轮原件/输入保留，不计产品红例信用。预掷时序、失败HP正式反控各指定1业务AssertionError，产品源字节已恢复。失败gate首轮停在实际IP序断言，后把HP断言前置再采130→50业务反例，两份原件不改写。早期unused imports 17 warnings、后继unused bus 1 warning均已实际清除。

magic-module-final：8文件90/90、stderr空，含6目的主测51及相邻damage24/parity15；magic-organization-types-corrected exit0输出空；magic-module-static-final 8文件Biome0诊断。外部runner本片改为同时收test及附加依赖SHA，旧执行身份缺列的test不回填伪装原件；最终90已有test/source/依赖指纹。最后295文案仅注释，不重跑未变业务测试。全仓、coverage、protected及新视觉未跑。

失效条件：资源wrapper分段、解析优先级/借用变化重核magic-object；脚本门/预掷/ctx或0x1B/0x2D/0x41变化重核脚本/敌方资格；动画/定位变化重核相应帧；证据/流程文字单变不触发全量复跑。

### 阵亡音、死亡淡出和对象进度（2个新增原主体，1个已计主体补证）

三原主体全文读取，caller定向核battle-system的emitPlayerCasualtySounds、动作收尾两条调用、tickPostAction、checkEnemyDeaths、tickBattleFade、stepDeathFadeRender/stepSummonLoopRender；present-battle.draw核两渲染细分调用，battle-role-projection全文核投影/回写，Save API及save-io既有合同按实际SaveSnapshot使用。primary为SDLPal PAL_BattlePostActionCheck的奖励/濒死门及PAL_BattleFadeScene的12×6、16ms步骤；酒神局部脚本与本批真实原盘九次施法证据配对，不授新剧情/实听/像素验收。

| 原主体（game/src/core/battle/__tests__/） | A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|---|
| casualty-sounds.test.ts | 本helper输入是普通健康角色的HP快照/可选毒前map，不授全SDL状态/音效时序；prevHp为上次sweep而非固定回合初；当前/前态两个阈值各核 | 更正每回合一次、回合初以及min阈值误注；标题equal不冒称已测heal | 只核音效sweep，不造大战斗宿主 | 去partial Role双重强转和soundId cast，用records/判别union；小本地fixture保窄接口 | 11→13仅把最后三个独立阈值输入参数化；旧各死亡/濒死/零音/毒杀轴完整保留；快照实值核 | 文件按伤亡音职责，来源M6/DL标题退出 | 无新增helper层；类型断言清除而非豁免，未堆新弱例 | 无核心mock/RNG/时钟，真实bus；prev快照是函数真实公开输入 |
| death-fade.test.ts | startBattle前真正hydrate；角色先手明确；杀敌奖励/死亡音一次、游标已+1而fade只hold；29个40ms逻辑tick清72步；毒例现由真实0x21从100扣0 | 更正开头“淡完才推进”与旧兼容误注；不把手置HP0称毒脚本证明；相邻sweep参数说明也改成实际caller分工 | 死亡检测/逻辑hold/render细分仍同域，召唤loop4迁独立职责文件 | 删除两完整record及重复boot，用既有startTestBattle；三个相同杀敌前缀合成完整生命周期例 | 原16→死亡10+召唤4；前三例同输入合一但奖励/声音/单调/时长全保留且收紧28..31为29；停掉毒script旧指定1绿、新HP100≠0指定1红 | 职责名保留；局部startFadeBattle不再名bootstrap；typed BusEntry不窄化cmd | 删除180余行重复结构/前缀；召唤不混在死亡文件 | 真host/tick和合法毒条目；render时钟显式数值，无timer与snapshot自比 |
| object-script-progress.test.ts | 已学/库存/非leader正确；旧缺objectMagics使0x57空跑，现完整view执行并核MP0；每次投影/真实HPMP回写，载入不沿用旧role快照；九次之间明确补蓝且目标/施者存活 | “Repeat”改为实际验证的stale-action执行校验，不冒称按键UI；保存前回explore、清battle资源指针 | 本文件专核战斗OBJECT进度跨动作/保存，和大世界异步等待5例不同caller | 保留battle-fixture/records，投影和回写用生产函数，不手造角色模型；静态Spell不变另核 | 3例保留：8次→存读→9次删非leader/第10动作降级、失败不进与新游reset、use/throw独立；漏耗蓝变异旧指定1绿、新MP29≠0指定1红 | 文件按对象进度职责，标题如实限定caller | 不删Save往返独有轴；不把两种调用层强合到同一大fixture | 实际解释器、Save/JSON门面、执行校验；未新测IndexedDB浏览器路径，afterEach清本模块内存槽 |

新增summon-loop-render.test.ts不增加原93完成数：A以真实createBattleState/startBattleAnim安装当前250ms帧；B头注分清logic完成与render索引；C只持召唤wall-clock细分，不混死亡奖励；D复用既有工厂/driver；E原4身份和0/1/3/4帧、倒退保持、非loop清锚全保留；F名字表达职责；G双重强转的局部伪状态删除；H无真实等待，显式时钟和完整state可测，不授实际渲染观感。

原件battle-fade-progress-before 3文件30绿。poison-death-caller-control与wine-mp-hook-control均对同一产品变异执行旧/新指定例：旧各1绿，新各1业务红（其余为CLI过滤，不是源码skip）；两轮完整raw/native、测试/产品SHA、补丁与逐字节恢复保留。前者新例是真实postAction poison caller，后者新例是实际0x57消费MP，已不只靠手置状态或mock次数。后继battle-fade-progress-final为6文件60绿（含world进度5及driver25），stderr空；battle-fade-progress-types exit0输出空；battle-fade-progress-static 5文件0诊断。全仓及coverage未运行。调用时点/毒结算/回写/SaveSnapshot变化只重核相关claim，不由日期刷新全表。

### 装备状态、属性数据和玩家毒槽（3个原主体）

三个原模型/任务后缀文件全文核读；为按真实职责归并，也全文核了相邻equip-effect主测、equipment-state/equip-effect/player-poison-state、stats及freshPlayerOpcode夹具、现有毒装备生命周期专测。真实caller定向核menu-driver换装、event-opcode-player的0x17/0x19/解毒及本批已核的battle毒调用。primary核SDLPal PAL_SetPlayerStatus、PAL_RemoveEquipmentEffect、PAL_IsPlayerPoisonedByKind/Level、Flee/PoisonResistance getter及当前TS取舍：完整16槽去重/压紧不丢毒、属性不额外WORD回绕、毒抗下界钳0保留。C的RemoveEquipmentEffect没有越界no-op守卫，原注释把TS防御策略冒称C真值，已随退役清除；相邻getter注释也改清C仅WORD累加/上限100，TS另有下界0。

| 原主体（game/src/） | A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|---|
| core/equip-effect.glm-next-wave.test.ts（退役） | 4原例核坏状态不刷新、puppet活/死与较久持续；新fixture正式loadDefault，HP/max合法；只核同步runner的状态写入，不授通用触发器成功旗等价 | 删除“无直测”等历史宣称，当前来源按函数与CLASSIC状态条件说明 | 与相邻good状态3例合为equip-effect.status，状态写入与换装/属性纯数据分开 | 共用小installStatusScript，底层freshPlayerOpcodeState，既有script catalog而非复制状态 | 原4+good3→8，puppet活/死独立；sleep/silence同时核有/无状态角色；所有旧状态预期保留 | 文件/表项按装备状态，短case名可独立识别，不按H03/模型 | 整文件退出，去freshGs包装与未清理的全局目录 | afterEach清目录；真实runEquipScript，不mock状态核心 |
| core/equipment-state.glm-next-wave.test.ts（退役） | HP/MP覆盖层不改合法base100；coveredBy两次累加仍3；Extra两字段仅清目标；越界为TS防御域，不声称C有guard | 删除错误C边界归因、只测四行却称LEVEL族的头注；各行题目限实测范围 | 合入equipment-state，原纯getter/mutator也从相邻runner主测迁入，与IO/脚本分层 | 复用正式fresh角色与既有row API；不复制效果矩阵或零maxHP假运行态 | 重复invalid-write合并；Extra清目标与保他角色合一，invalid-remove拆-1/7且核全状态不变，不只查part0 | 数据层职责命名，HP/MP/Extra/coveredBy具名 | 整旧文件退出；只为真实独立输入拆例，没加万能模式 | 同步纯状态可直测；before快照用于no-op所有权，不作为实现算法oracle |
| status-poison-equip.glm-q.test.ts（退役） | 非在队角色先拒、按种/等级、孔洞去重、零入口/满槽核；ByKind改注册level99毒以真能区分ByLevel；满槽17个合成定义明确注册，不称原盘正常剧情 | Q06/CODE53和失实覆盖头退出；缺定义限明确退化输入，C函数名替脆弱行号 | 毒槽15归player-poison-state，getter归equipment-state，Wear清伪毒复用生产移除caller及现有生命周期 | effectRoles手造空矩阵删；getter/clamp/remove99重复合已有完整合同；入口假回调改真实同步解释器 | 原16全映射，弱runner+fallback并相邻同合同；零入口/满槽拆独立，完整map不变；ByKind错套level过滤时旧指定1绿、新1业务红 | 根目录杂合按真实owner入core职责文件，不只删后缀 | 原文件/局部半矩阵/冗余gs包装退出，没删未知产品路径 | 真实entry产生现金7并返回3；全局defs/catalog都清理；vi.fn仅证拒绝时不调用，另核状态 |

必要重组闭包同样核A–H，不增加原93计数：

| 目的文件（game/src/core/） | A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|---|
| equip-effect.test.ts（相邻） | 真实换装三种库存、抗0必中特定slot、实际heal及上下文reset | 头注收窄为同步runner，去M12/P2来源头，纯row不冒称完整换装 | 36→6，纯属性/状态/毒primitive分别交实际owner | 继续既有freshPlayerOpcodeState；目录资源每例新装配 | 六保留真实caller，毒record改精确slot/script而非some；旧36其余身份全迁 | 现名与解释器职责吻合，留opcode是领域协议非任务号 | 重复不再借facade混放，未留无消费者fixture/import | 无核心mock，零抗使随机门确定成立，afterEach清catalog/defs |
| equip-effect.status.test.ts（新增） | 8合法状态输入，角色1好状态和0/1坏状态不混slot | 头注限持久状态写入，不冒称C所有flag | 仅0x2D同步脚本状态合同 | 小typed脚本安装器两类真实使用，无大context | bad2/puppet3/good3，原7轴保留且活死各判别 | 文件、组和短表名表达领域，原编号退出 | 无新产品接口/兼容分支/额外状态副本 | 真runner/目录，结束恢复 |
| equipment-state.test.ts（新增） | 31例沿纯API核写/清/有效值；Extra末槽、隔离role/part、base/effect归属明确 | 修正row23-27全称实只wind、all stat rows实只四行等夸大标题；不把直接write称完整装备 | 原facade纯数据组与本片新补并到数据owner，除Wear的显式poison依赖无脚本推进 | 共用既有fresh载入态；warn检查合入三个实际override写入 | 31身份，clamp两轴独立；invalid完整状态/效果不变；只捕获预期无warn并保证还原 | getter名及步骤说明实际属性/来源，不以M2/D14分类 | 删单独warn-only及重复无效part用例；合法base100替旧不一致HP200/max0 | 纯输入可直接核，无Math随机或全局脚本；毒定义清理 |
| player-poison-state.test.ts（新增） | 15例角色→party、查询/清理/插入/entry；正常脚本entry1及返回3合法 | module头与范围一致，缺定义明确不是常态 | 只操作毒定义/每份gs的槽，装备/呈现留相邻 | 与现有生命周期7例不同层：这里核primitive/拒绝，后者核真实卸Wear/嵌套entry | ByKind level99与ByLevel并置反控有判别力；现金效果及续点不只查callback次数 | 命名去模型/任务，seed显式role→slot | getter与remove99重复迁完，不留下大矩阵构造 | fresh完整角色，全局defs/catalog恢复，真实runPlayerPoisonEntrySync |

原件equipment-contracts-before为3文件25绿，equipment-adjacent-main-before将同Git主测原件定向恢复实测36绿后逐字节恢复候选。equipment-contract-mapping.json把旧61身份全映到新60（4目的文件），每个源身份恰一次、每个目的被引用；缺尾映射和尾目标越界负自检均拒绝，计数校验不冒称自动证明语义。Wear/remove99、Flee Extra、上下clamp及入口callback的重复都有具体目的指针，不能按数字相近算排重。

poison-kind-level-control：同错套level过滤的产品变异下，旧ByKind指定1绿，新因false≠true指定1红；raw/native、源SHA、补丁及字节恢复保留。equipment-contracts-final 6文件75/75、stderr空（目的60+既有生命周期7+状态像素8）；equipment-contracts-types输出空/exit0，scoped static-final 5文件0诊断。没有产品行为/接口变更，只有测试重组、夹具/断言质量和adjacent注释更正；不新增全仓、覆盖率或实际视觉信用。

### 事件入口、续点与等待（5个原主体）

全文读原K01/K02/K03/K05/K06、相邻shop-menu.flow/shop-menu及scene.test-fixtures；生产读域为scene-system真实搜索消费者、event-system的trigger/auto/end/reset/enter/wait/Shop/fade分支、mode tick及bootstrap的shop handler。原卡经索引和卡顶确认已archived done，没有恢复旧Owner。SDLPal来源为script.c的PAL_RunTriggerScript 0x02/0x09/0x26/0x27、PAL_RunAutoScript 0x02，scene.c手势复位及video.c::VIDEO_FadeScreen循环；只授权实际状态合同，不把TS 72个区间预算1440ms冒称C首次绘制和总墙钟时序等价。

| 原主体（game/src/core/，均按职责退出） | A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|---|
| event-system.glm-event-k01.test.ts | 下一次由真实NPC search读取owner续点；旧idle夹具第二次手动从0跑、绕过已存5，改真实续点先暴露预期错误，再用合法回跳到计数节点 | 去任务头与“整仓已证”宣称，注释只说明owner/回跳前提 | triggerResume归NPC，测试不能替真实consumer决定入口 | 复用场景flat-map和typed角色；与runScript返回值不同，不合并成同一假runner | 原2→resume两例；忽略真实consumer续点的同错变异旧指定1绿、新声音44≠11指定1业务红 | NPC reset职责命名，合法entry1且0留end | 删除重复手动cursor装配，未改产品重臂规则 | 真实tickSceneInput→事件tick，可直观观察[11,44]及两次计数 |
| event-system.glm-event-k02.test.ts | auto计数3次、async/sync enter保存并再进入，wait的gesture=1/0在等待期而非进入期应用 | 标题去作者/旧行号，自动脚本与onEnter分明 | sceneOnEnterIp、NPCauto计数、party手势各留原owner | resume共享真实reset程序；wait单独语义文件，不用模式万能runner | 原5全部迁到resume3+wait2；enter重入断言排除重放，wait真实后续音77只在两帧后执行 | 文件按续点/等待功能拆分 | 取消只验一次写入不消费的镜像前提 | 显式时间/帧与fresh状态，无真实IO或核心mock |
| event-system.glm-event-k03.test.ts | sell operand4/9都经bootstrap形态handler开实际菜单，关闭后cash7才续跑；缺handler两opcode独立 | 不再把mock次数称实际商店，缺handler为TS防御域 | menuStack与event waiting交接按真实tickMenu/tickEventSystem归属 | 合到已有shop-menu.flow，同一生产交易链 | 原2复合→4独立，保原shop5；核cash/库存、ip、mode和关闭时机，不只handler次数 | 全部归商店flow而非K03 | 旧mock-only文件退出；未造新shop facade | afterEach恢复handler/目录；无产品测试专用接口 |
| event-system.glm-event-k05.test.ts | 显式performance注入核既有TS dither预算、冻结释放、边界前不推进/边界推进；三lookahead与shake分开 | 更正72区间预算的证据范围，不声称C画面/首帧或总墙钟相同 | 只核事件/sceneAutoFadeIn状态，不接管present画布 | 同类fade边界同文件，小typed palette不扩通用夹具 | 原3→fade5，party-walk/ride/pan独立，正负needToFadeIn与后续声音77判别 | event-scene-fade说明实际职责 | 去K05头与冗余长来源宣称，无行为改动 | onTestFinished恢复时钟spy；真实状态函数无核心mock |
| event-system.glm-event-k06.test.ts | end三态复用已更强runScript返入口专测；giveItem迁真实战斗脚本；物品失败前完整状态不变且合法正例完成后消费 | 删除caster.idx fixture自比的“合法正控”业务宣传，纯fixture自比明确退役 | battle hook归battle；overworld admission与pending消费留事件入口 | 三态与giveItem不再复制其它专测，真实item61有库存与use入口 | 原6含1纯fixture断言退役，其余映到rearm、magic-scripts、overworld3；成功不只核pending字段，也完成消耗 | 原混合K06按已有owner分流 | 旧文件整体退出，无新产品接口/兼容路径 | 真解释器、完整hydrated运行态、warn精确捕获并可靠恢复 |

必要目的闭包也逐文件核A–H，不增加原93计数：

| 目的文件（game/src/core/） | A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|---|
| event-script.resume.test.ts | 5例真实NPC/auto/enter owner；entry1/合法回边/续点消费均明确 | 重臂与跨调用计数注释只讲不变量 | NPC与scene各存自身续点，无跨层手填第二次入口 | 共享同一reset程序给两个真实enter runner | 下一触发音44、计数[11,11,22]、auto positions和重入均字面oracle | resume功能归属明确 | 无任务编号/无用helper/context | fresh场景和目录清理，真实搜索与执行器 |
| event-script.wait.test.ts | 2帧前后与gesture0/1独立 | 注释限当前wait状态预算 | 只核等待期party手势写入时机 | table只合共同装配不合不同输入 | 进入期不复位、等待期与声音精确时间 | wait职责文件 | 2独立case无冗余分支 | 无墙钟/IO/全局mock |
| overworld-item-script.test.ts | 0/合法WORD缺label独立拒绝；合法owned61完成才扣 | 入口接纳不冒称全套菜单选择 | pendingItemConsume归event lifecycle | 用已有角色初始化和目录，无第二套消耗器 | 失败完整GS无改、警告精确；成功实际库存空 | admission/consume语义明确 | 三原子合同，无fixture-only假业务 | onTestFinished恢复warn，fresh全状态 |
| event-scene-fade.test.ts | TS budget精确到前1ms/边界，lookahead与shake | 注明非C首帧/墙钟/视觉验收 | event状态与presentation边界保留 | 同用途palette共享，不复制renderer | 5独立身份、false正反和续跑均有字面断言 | 文件名直接表达领域 | 不增加产品参数/测试hook | 注入时钟可确定复验，所有spy回收 |
| menu/shop-menu.flow.test.ts（相邻） | 原买/卖/资金/关闭5例不动，加真实sell等待与缺handler4例 | 新标题限真实输入输出 | handler→menuStack→event续跑清楚，未混pure价格helper | 同一实际shop flow复用现有真实handler | 5→9，operand与missing-handler各独立，cash与inventory核业务 | 持续归shop flow，不新建任务文件 | 旧K03退出；业务无重复mock计数 | catalogs/handler按现有before/after隔离，无IO |

原件event-k-contracts-before 6文件20绿包括未改control-flow的2例，不授该文件本片完成信用；event-shop-flow-before为Git基线5绿并逐字节恢复候选。event-entry-contract-mapping.json核旧23身份（含相邻shop5）全部有去向或明确退役，新scope24全被引用；缺尾/越界目标负自检均拒绝，身份全覆盖不冒称自动语义证明。

trigger-resume-premise-red为旧夹具真实续点前提1红，明确非产品修复；trigger-resume-caller-control旧指定1绿/新指定1业务红，变异源码和旧临时文件都按SHA恢复。event-entry-contracts-final 8文件39/39、stderr空（本scope24+相邻rearm6/magic4/object5）；types exit0输出空、scoped static5文件0诊断。未改产品事件行为或公共接口；全仓/coverage/protected仍未跑。

### 对话分页、清场与场景状态（5个原主体）

全文读dialog-bug2-skip、event-dialogue-pagination.glm-contracts、event-system.glm-event-control-flow、event-system.glm-event-state-opcodes、event-rng-scene-restore，以及相邻现行pagination主测；生产按实际分支读取tickEventSystem的对话/confirm/camera/scene/walk/0x90、runEnterScript、完整dialog-box状态函数、present的RNG/场景短路及bootstrap播放finally。旧两事件卡与分页卡均archived done。原盘all的3571–3576六行逐条核1327–1332与文本一致；0x90全表只有21806/41279/41365三处，operand2全0。SDLPal核TEXT_DisplayText/ShowDialogText/WaitForKey、PAL_PartyWalkTo/MonsterChasePlayer、0x7F/0x90和OBJECT的6/7字固定布局。

| 原主体（game/src/core/） | A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|---|
| dialog-bug2-skip.test.ts（退役） | typing真实长文与显式100ms，三行同tick停段末；五行只是分页强例子集 | 去Bug2过程长头及未在本文件测试的tilde复位宣称 | 归现行pagination，演出函数与解释器时序不混作一层 | 三个相同三行执行合一，五行映现八行分页强合同 | 原4→同tick完整三行1+现8行边界；精确shown/current/fullchars/ip/endwait/history替包含与ip>= | 去bug编号文件名，合同按结果命名 | 旧文件与重复helper退出，无新产品代码 | 真实tick、无核心mock；同tick链被切断时新合并用例指定1业务红 |
| event-dialogue-pagination.glm-contracts.test.ts（退役） | 任意翻页键与仅Confirm/Menu跳字分相位；control空行/新页重新逐字保留 | “恰4行end”改实际7行/末页3行；“已显字数全不动”改墙钟继续增字；不假称24字576ms | 归现行pagination唯一流测；状态primitive单测留present层 | 6合同逐一合入，Cancel/Down及Cancel/Up各独立，无万能对话runner | 6→8；每条原轴均映，显字新增>before、<length，不复制算法当oracle | 去模型/卡号与过时行号标题 | 去历史排重宣传头；不为旧未测“4行末页”另堆弱例 | 时钟显式，helper只做启动/推进/等页，超限有业务assert失败 |
| event-system.glm-event-control-flow.test.ts（退役） | No缺label fail-closed属TS策略，真实问句清场；两camera flag续话portrait独立 | 不把C无target guard说成相同拒绝；移除旧测试行号/全仓零覆盖宣称 | 新归event-dialogue-lifecycle，都是控制流对对话owner的清理/保留 | 真实tick与小local启动共用；删无用startIp | 2复合→3；精准warning、无Yes文本、camera坐标与portrait前提；不再手写delayUntilMs | 生命周期职责与短标题可直接识别 | 去不执行的时间突变、全局restoreAllMocks与冗余重复时钟赋值 | warn按例onTestFinished恢复；按真实nowMs推进，未替换核心 |
| event-system.glm-event-state-opcodes.test.ts（退役） | walk三态、same-scene、sync goto、chase共7有效轴；脚本pose需先证明存在且party含成员1；越OBJECT第9格例无合法C合同 | 改零距离“零副作用”为确有站立相位复位；撤“C定长零初始化等价扩展”错误归因 | 新归event-scene-state，仅场景/位置事件状态；loader只IO边界 | 统一fresh已hydrate状态，cursor由typed装配返回不强转 | 原8→7，撤非规范fieldIndex7要求写第9格的测试；合法0x90行内及播种由既有event-system主测对应两例保留，不冒称覆盖越界策略 | 去模型/任务号，按真实场景状态命名 | 删cursorOf的assert后强转和无用参数；goto缺失改合法WORD地址60000 | pose先经0x15+实际wait观察再走，不靠空对象假阳性；setter在finally恢复 |
| event-rng-scene-restore.test.ts（保留） | 4例真实解释器+present像素；media IO回调仅替下载/播放完成，未授真实视频/E2E | 原注释与bootstrap finally备份、普通/RNG重绘ownership一致，无新失实注释 | fb归每例，backup归gs，handler/clock afterEach清 | 与对话文本/纯palette不同，继续保留职责文件 | literal173/0及party像素5排除仅清旗标假绿；保留动画ownership变异指定1红173≠0 | 文件名已表达RNG场景恢复职责 | 未发现死参数/无用出口，不为改而改 | 受控时钟及微任务，画面函数真实，所有资源引用局部隔离 |

必要目的闭包A–H同核、不加原93分子：pagination主测全文11旧身份保留，加入9结果合同成20；keys/end/page/blank控制保留层次，两个小启动/单步helper服务人工观察，原自动遍历run服务全文/history，两种推进合同不强合模式万能helper。新增lifecycle全文3例只管脚本清场/portrait；scene-state全文7例只管场景状态，语义边界清楚、无跨层写实现或测试专用产品hook，warning及IO setter均回收。测试组织的可复用/可读/简洁/可测性与原表逐项一致，无未登记新产品行为修改。

对话旧4文件23身份（含相邻主测11）→新2职责文件23；mapping全覆盖并负校验缺尾/坏目标，保留唯一业务合同。event-dialogue-before 23绿，dialogue-same-tick-control指定1红（shownLines空≠两完整行）、源码按SHA恢复；event-dialogue-final 4文件60/60且stderr空。event-state-before原8+RNG4=12绿；组织后7+4+resume5+lifecycle3=19绿。rng-redraw-pixel-control真实fb首像素173≠0指定1红，源码恢复。类型/scoped静态等待与下一相邻事件片集中，不预填统一门。

0x90撤例不修改现行产品的越界数组扩展策略，也不授该输入规范性或C等价；本批现有原盘只写合法turnStart，行内写和播种的既有两例另有实断言。坏fieldIndex处理若未来成为真实输入需求，须先核输入合同与机制裁决，不继承被撤测试的验收信用。

### 自动脚本与同步执行器（2个原主体）

全文读event-system.cov85（597行）及event-system.glm-event-contracts（445行）、battle-fixture/scripted-rng/原harness。生产完整读tickAutoScripts/runOneAutoOp、runPlayerPoisonEntrySync、tickSceneAutoFadeIn、runEnterScript，定向核runScript的call/goto/拒绝分支、条件/移装/halve、palette完成和trigger清场。C核PAL_RunAutoScript的0x03/0x04/0x06/0x09及0x20/0x5D/0x74/0x79/0x94/0x78/0x8F；既有TS同步毒入口限制、auto多tick子调用与unsupported策略不冒称C阻塞模型等价。

| 原主体（game/src/core/，均退役） | A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|---|
| event-system.cov85.test.ts | 原26身份逐轴核；旧goto第二次手填cursor改合法循环自然重访；空colors改真实256色FadeIn | 去cov85/r3/r4及全仓未证宣称；rate101实推进却称跳、0x7A误称ride、call未观察对象却称restore均更正 | 归auto/fade/lifecycle；当前事件入口不接收bus，旧空drain与业务断开 | auto计数复用resume，lookahead合fade，end边界交真实分页/tilde，非手造矛盾box | 每身份有目的；概率同错旧1绿→新指定cash0≠222红，证明旧end目标弱oracle | 按自动脚本、fade、cursor生命周期命名 | 删空转bus及未用load-save reset，无产品协议改动 | 时钟/Math随机为边界注入；目录/spy回收，真实runner |
| event-system.glm-event-contracts.test.ts | poison非零entry/角色槽/效果返回；battle attach+hydrate且角色匹配；移装前证明slot42/effect7 | 去旧行号/全部旧测stub宣称；现金110加法不能证明顺序，改child33→halve→caller77=93，caller先则110 | 分poison-entry/battle-script/auto，不再依coverage目录harness | 复用现有battle工厂+hydrate、fresh角色，不复制执行器 | 原22映射；1个未传GS的explore no-op自比退役；explore throw保真错误但删无关GS断言 | 语义文件和结果标题，marker表达条件输出 | 原混合文件退出；未改产品unsupported/API | 无核心mock，毒定义/diagnostic spy均恢复 |

目的闭包也逐文件核A–H，不加原93分子：

| 目的文件（game/src/core/） | A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|---|
| event-script.auto.test.ts | 29原子输入，合法连续tick/child/owner，0留end、入口1；49/50门与stagger坐标独立 | 明确TS多帧child退化，位置用OP_SET_OBJECT_POS具名 | 只核auto runner，NPC持cursor/计数 | local装配共用；walk常量只读；count reset复用resume | 同帧cash、合法循环、child/caller各自坐标真观察；首跑oracle错误另记 | 自动脚本功能名，无作者/卡号 | 无统计窗口、无手填计数复位、无空bus | Math spy确定抽样且核一次；目录每例清理 |
| event-script.battle.test.ts | 12直接API合同，attach/hydrate、角色/装备前提；explore仅真抛错边界 | direct-runner不冒完整战斗/自然剧情，TS策略不假称C | 顺序归runner；helper只装输入 | 现有partial fixture+显式hydrate，不复制矩阵 | 精确diag、条件正反、slot前提、非交换现金93；无return-only假业务 | 同步battle与marker命名直接 | 删未传GS的假断言，不增加产品接口 | 无核心mock，defs/本例diag spy清理 |
| player-poison-entry.test.ts | 13输入核label/identity/end/call/goto/阻塞/越界/角色槽及真0x29 | 标题限同步helper，不授C所有脚本 | 只核即时入口和owner写回，不用假runner回调 | 共用fresh/目录；与纯毒插槽查询分层 | child有caller后缀40、正反goto、现金50和续点3为literal | 按poison-entry职责 | 表拆独立输入，不建新产品入口 | 抗性0合法必中，afterEach恢复，无随机/时钟mock |
| event-script.lifecycle.test.ts | missing cursor/dialog与trigger清场；portrait先由实际style/tilde生成 | scene-load明确无当前生产writer，仅公开tag防御态 | cursor/portrait归事件owner，不冒真实加载回调 | localprogram仅装命令，与resume/fade时机区分 | 4身份，实际layout前提后清理，无断开bus | 生命周期命名直接 | 撤不一致DialogBoxState手造，未删未知产品branch | fresh完整GS，无全局mock或IO |
| event-scene-fade.test.ts（扩展） | 现19输入；真实0x51到前1ms/边界，完整256色finalize后sound续跑 | 0x7A为speed-four party walk；predicate-only不冒modal生命周期；保TS预算限制 | 只核fade接纳/完成，逐帧render留present | 原5及cov同类合入，lookahead不另复制文件 | 复合输入拆开；frame-wait/scene-fade为新增显式predicate，不倒填原覆盖；target/identity判别 | 同职责文件 | 无空color数组或重复同义工厂 | performance按例注入并恢复，无palette核心mock |

event-runner-contract-mapping.json：旧48+前片fade5共53身份，除明确退役的脱离GS自比外都有目的/复用；本scope77身份均有来源或新增输入说明。缺尾/越界目标负自检均拒绝，身份覆盖不自动证明语义。拆复合输入造成case数变化，不按数量授信；这里只完成两个原pending主体。

原件：event-runner-before 48绿；首组织55中54绿1作者oracle红，auto-call-oracle-erratum.patch/JSON可逆恢复当时把0x13位置误断为状态的输入，不记产品缺陷。组织后7文件89绿；概率变异旧指定1绿/新指定1现金业务红，源SHA恢复；event-runner-final 10文件116/116、stderr空。event-organization-types exit0输出空，之后仅增加slot前提/非交换oracle、删无效断言，全批收尾仍须当前typecheck。event-organization-static-final 10文件error/warning/info 0；全仓/coverage/protected未跑。

结构候选：event-system的scene-load waiting tag/分支没有当前生产writer，callback说明已过时。本批只收窄测试信用，不擅删公共EventCursor联合或改场景加载；归父卡后续接口清理候选。其防御测试不当作真实IO生命周期证据。

### DEV状态导出（2个原主体）

全文读state-dump与原GLM专测，真实consumer为main-loop::startRafLoop/advanceRafFrame（全文），每逻辑tick后push，暂停/无tick不记录；cancel只停止生产，window端口供事后下载。present的每角色帧数/精灵查表与dump caller提供参数不同，不强合。SDLPal dump-frames.patch全文核字段和hook：C为scene-local NPC id且无party.members；TS为global id并加members，不能按旧头注说格式逐字节一致。

| 原主体（game/src/dev/） | A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|---|
| state-dump.ts | 无状态写入的JSON投影；零sprite保留、缺值才回退；walking优先pose；DEV参数3/4来自caller；下载正常创建/释放URL | 修“和C逐行diff/同renderer所有查表”过度声明；写明window保留buffer供停止后下载，重新init替换 | 计算投影/浏览器导出同为该调试功能，caller掌握推送时机；不引present依赖/游戏状态写入 | 两处同合同sprite查询抽私有spriteForDump；renderer有不同资源优先级不强合；不加公共出口 | 原字段与缺值合同均迁，正常download实际Blob/filename/URL回收已验；异常download/真实浏览器未授信 | 公共语义名保留；局部helper只属于dump | 仅消除重复查询，未恢复legacy路径；既有fallback只解释不扩 | 纯序列化可直测，window/URL是IO边界；模块不造timer，显式opt-in生命周期 |
| state-dump.glm-phase1-leaves.test.ts（退役→state-dump.test.ts） | 改错优先级标题，walking与非零pose同时在场；完整字段oracle不变，零pose/零sprite独立判别；短数组明确故意不完整输入 | 去任务/作者/无其它测试宣称；不再称稀疏runtime合法旧档 | 新文件只管snapshot与opt-in download，不放实际rAF调度算法 | snapshot返回unknown，不再Record<string,any>；共用局部GS装配 | 原5→8有身份映射；字段literal、walking4/3、零值、disabled、buffer与Blob。zero→fallback变异指定1业务红；不拿暴露句柄当已下载 | 按state-dump功能命名，不只删模型后缀 | 删除多处强制非空/宽any，helper无死参；不堆格式类型用例 | history、原window descriptor、URL方法、anchor click及log spy逐例恢复；真实Blob/FileReader，IO仅拦实际下载 |

state-dump-before 5绿但stdout有1条正常启用log，未写零诊断；新正常日志精确捕获两条并断言，state-dump-organized+main-loop共29/29且stderr/stdout无运行诊断。state-dump-zero-sprite-control使sprite0错误变7，新指定1业务红，源码SHA恢复；static-final三文件0诊断，typecheck及重型门留模块/整批收尾。新scene-jumps PAL用例是独立风险反例，不算此处2主体的通过。

开发跳转表295条全部字段已读，295张地图引用对上真实资源；94备用点的range=true检查发现scene-86卡边界，已开GAME-DEV-SCENE-JUMP-SPAWN-1并等待用户裁决。该JSON尚未完成收口，不因全文读过/其它表通过而加到完成数。partyStart确有真实consumer，dev-panel“已删除”注释失实，不能据此删坐标。

### DEV静态输入与普通测试产物（3个原主体）

battle-fixtures两条、scene-names全34条及原dump-evidence全文核读；scene-jumps的295条读域与94坐标属于独立未决，不在此增加完成数。真实DEV consumer为dev-panel的applyFixture/applySceneJump及bootstrap装配，正式loadDefault/hydrate/startBattle/loadScene负责运行态与资源边界；输入不是存档。dump-evidence的全部8个调用测试全文核读，实际DOM/Canvas断言与PNG往返逐处对应。其它辅助依赖仅按真实需要定向读取，不借此授整文件信用。

| 原主体（game/src/） | A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|---|
| dev/fixtures/battle-fixtures.json（保留） | 两队/敌槽/战场/角色/物品存在；HP/MP不超max、Exp6000在WORD域、覆盖键均在真实接口；只由DEV入口消费，不当合法save | _doc说明固定调试输入，与实际消费一致，不宣称完整剧情 | 静态选择与运行态装配分开，fixture不拥有战斗推进 | 两条输入复用同一生产装配，非重复模拟器；没有抽多余模式 | dev-fixture-contracts核2条资源引用和数值；真实DEV consumer相邻测试通过，未授两套全剧情E2E | id/label按对白与升级意图；override字段沿实际角色合同 | 只两条必要场景，无未用资源副本 | JSON可独立核字段/资源；无隐式时钟/IO实现 |
| dev/fixtures/scene-names.json（仅_doc更正） | 34个非空标签全部引用已声明jump；数值键为0-based资产编号；不是完整地图名表 | 撤去未核证“三信号已确认”和粗略数量，明确为作者DEV导航标签，不冒原版地名真值 | 只持显示标签，地图身份和移动属于jump/loader | 缺名沿实际caller回退，不造第二命名/转换层；34个标签逐字未变 | 静态引用核验+真实DEV筛选consumer；未重新做34处地理/剧情考据，未授该语义信用 | 保留职责明确现名与位置标签，不用模型/任务号 | 部分表有明确fallback；没有为凑完整复制全场景 | 单纯数据可核，_doc不影响菜单；全JSON重复键检查为0 |
| __tests__/grok-render-r1/dump-evidence.ts（退役） | readHost→手绘PNG→decode同输入自比不是真实截图；其余PNG像素与前置Canvas断言逐处相同。8调用点均保留真实业务观察 | 退役误导“图像证据”头；Dialogue标题撤PNG字样，旧执行原件不重写 | 删除测试运行与文件归档混合的中间层；普通单测只断言，实际E2E/视觉证据仍由其专有流程产出 | 已有真实DOM/索引/RGBA断言足够，不另造万能capture/helper；8个相邻消费者不计原93分子 | 64→64身份全映射；业务AST按限定IO删除校验全等，预期RGBA改1值的内存负控拒绝。无断言删除；不把同源PNG当第二oracle | 删除按贡献者命名目录；三个案例去任务号，现文件按实际呈现/启动功能保留 | 退役整文件、13次往返及冗余全屏readback；移除无等待test callback的async，IO fixture的async保留 | 保留DOM生命周期/真实Canvas、handler/timer清理；单测不写PNG。前后各独占TMPDIR且成功后仅清本轮自有目录 |

DEV核验原件dev-fixture-contracts记录输入SHA、2个战斗数据和34个标签；scene-names改动仅_doc，显示值不变。dev-fixture-consumers 4文件65绿、stderr空，但stdout有正常DEV状态日志，未冒称统一零诊断。dev-fixture-static-final真实exit1/0 processed：已有Biome配置排除了该DEV JSON目录；本批未新增ignore或放宽规则，这一命令不能记通过。实际JSON语法/重复键/输入合同按独立核验记录验收，统一门仍待整批。

pixel-witness-before/after均8文件64/64、stderr空；业务差异限定证明pixel-witness-business-invariance与64身份映射保留。首次本地清理误删了async IO fixture标记，最终验证前已恢复并将转换范围收窄到it/test callback；pixel-async-scope-erratum如实记录。scoped Biome 8文件0诊断。普通测试原本生成13 PNG+13 readback，本轮独占目录26文件的身份/字节SHA已登记后删除；后继运行产物0。原helper由固定Git 08d67e28ec454d29941f8fab614644c5e160d790可恢复；未删除历史失败/视觉原件。AST证明只授权限定纯测试组织，不把8个相邻测试重新计全文治理成果。

### FBP、结局与Splash播放器（3个原主体）

三实现全文核读；共享闭包trademark-fallback/rng-player、dos-cutscenes、screen-wave全文，bootstrap的0x76/0xA4/0x96/开场caller和input::listenForModalActions按需读。复用[FBP](../QUALITY-PENDING-100-3/organization-shell-fbp.json)、[开场](../QUALITY-PENDING-100-3/organization-shell-opening.json)、[结局](../QUALITY-PENDING-100-3/organization-shell-modal-media.json)测试证据，本轮也读当前FBP/scroll/splash及结局三个专测全文。primary为ending.c三个播放器、main.c::PAL_SplashScreen、palette.c::FadeOut/FadeIn/ColorFade；不授整段E2E/视觉。

| 原主体（game/src/shell/） | A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|---|
| fbp-player.ts | 96相位nibble、49/68终屏例外、220步双向卷入、长度错误两合同；生产WORD参数；finally清监听，caller恢复挂起 | 修effectSprite留Phase3失实说明；明确未处理gs wave/fNeedToFadeIn | 持快照/绘制/监听，caller持暂停/续点；两个FBP算法保留同文件 | 共用真实overlay；索引、行切片和RGB不同不强合 | show8/scroll5核中间像素/时间，既有blit反控复用 | 文件/选项职责和单位清楚 | 无死出口，不造模板播放器 | 真Canvas/FB和可控时钟，不扩Abort协议 |
| ending-player.ts | 背景/妖兽/女孩、资源fallback与键退出；波幅局部，波相位仍为screen-wave共享状态 | 修i%4、滚高0..199、索引0不泛称黑；RGB/ColorFade近似不再冒称原版像素/观感等价 | 结局owner持绘制，caller暂停；wait清native/abstract监听 | 三份floor亮度体共享，ColorFade插色和RNG round独立 | 旧四女孩帧同色；新增异色帧75/125ms核91/92及180/179位置，i取帧变异指定1业务红 | API现名保留，brightness表达转换 | 去常真wave门、重复helper，现有参数/预算不变 | 真Canvas/FB加performance边界，无私有句柄 |
| splash-fallback.ts | 卷轴200→1、9鹤、标题补满/淡黑、finally；窄图只是防御输入 | 去任务号头及FadeOut等价；明确TS晚跳仍等500ms而C只早跳等待，未暗改时序 | 单Promise按显示步骤，caller管GS/暂停/音乐；不拆过宽context | floor合同合商标/结局；visibleRows裁剪与通用sprite不同 | 原8例/4针复用，行像素/黑终点/键owner仍判别，不授全C帧等价 | 职责现名；两anchor未读登记接口候选，未删除 | 去重复亮度体，无新兼容层 | nowFn/真Canvas/受控资源，finally清两种输入 |

新叶palette-brightness全文A–H：纯Palette到fresh colors，clamp+floor；cycles等metadata借用不写，错误同步传播，无IO/计时/全局状态。按用途命名、单一转换，不增aggregate出口或弱测试。三旧体去类型后runtime AST一致；新体统一绑定名后相同，floor→round内存负控拒绝。四caller限定迁移/常真门/注释差异由palette-sharing-inputs和cutscene-organization-proof-final核定。首次printer因独立strict、换行/尾逗号拒绝，失败原件保留，后继按函数AST核。

cutscene-current-final 8文件41/41、stderr空；ending-girl-clock-control指定1业务AssertionError（90≠91），源字节恢复。scoped静态6文件0诊断；shell-current-types exit0输出空，此后只加1 typed测试，整批仍核当前类型。既有RGB近似、晚跳预算、共享相位和Scroll未做wave/fade-in均明确，不扩大保真信用；未实施新机制/格式/存档/显示取舍。

### 壳层与菜单混合专测（2个原主体）

全文读原shell-bootstrap/glm-msio及五个实际目的文件；precache-client、两个既有测试host、main-loop主测、menu-mode/stack、Save API/data全文，bootstrap::syncShellAudio、audio::pickMusicTrack/battleVictoryTrack/sfxForBattleEvent、menu-driver的hub/save dispatcher和createBattleState按真实读域核。两原卡已archived done，无当前写入者；Codex只改测试组织，不改这些产品函数。C核PAL_SystemMenu的跨槽max循环；原shell已证BGM/SFX含义复用，不冒实际音频或浏览器SW/IDB。

| 原主体（game/src/，均退役） | A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|---|
| shell/shell-bootstrap.glm-shell.test.ts | 六合同逐项迁移；角色hydrate、完整敌人记录；intro从preBattle到selectAction；缺soundId明确为loose边界防御输入 | 去SB/模型/旧行号与未清descriptor头；明确只是音频端口策略、页面消息和受控rAF | 三种owner归audio/precache/main-loop；navigator恢复原描述符，取消实际删除pending回调，清理自身spy/设置 | 用既有record/state factory及precache EventTarget host；消息透传轴复用已有两例，不保留人工handler入口 | 原6+目的既有14=20身份全映；序列done/error真dispatch；SFX有合法BusEntry和原缺字段反例；真实队列不只记cancel次数 | 整旧文件退役，按三模块职责归并，不新建作者壳文件 | 去手抄大BattleState/Enemy、重复host和无关cleanup；不改产品协议 | 时钟确定、native MessageEvent和真实loop；仅IO端口记录，非真实音频/离线浏览器信用 |
| core/menu/menu-save-chain.glm-msio.test.ts | 真实tickMenu的双键优先与dispatch→Save内存写链；合法槽3→1、hydrated角色；peer槽不变 | 撤任务号/陈旧“此前未测”头；存档链明确非IDB验收，非真实持久事务 | 取消优先归menu-mode，真实写链归save-slot-menu.flow；清槽、IndexedDB端口和log spy按Owner恢复 | 复用已有输入/菜单和Save；状态导航与异步写盘不混回同一万能host | 原2轴全保留；等公开槽写入替setTimeout(0)，加读回快照/peer；两个机制变异各指定1业务红 | 两目的文件按dispatch和save flow命名 | 旧混合文件退出；去宽cast与无断言log屏蔽，不改任何保存/输入机制 | 真Save/dispatcher、显式内存环境；成功log精确断言，意外error/warn不吞 |

必要目的闭包A–H（不加93分子）：

| 目的（game/src/） | A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|---|
| shell/bootstrap-audio.test.ts | 三策略含loop/静默/SFX，元数据完整且runtime hydrate；不推进战斗 | 明确shell policy，不冒整战/实际播放 | 输入每例fresh，音频输出归记录端口 | 既有spy与正式record factory，无巨型手造state | 4例保留原字段/声音顺序，未知声静默与explore不消费 | 归真实公开函数，标题无任务号 | 去重复构造；不加测试产品hook | 同步确定性、无真实音频或全局mock |
| shell/precache-client.test.ts | progress透传、独立终局与连续终局、persist拒绝后ready/start | 只验客户端，不声称worker离线运行 | 复用host恢复navigator描述符及模块隔离 | 现有native消息复用，新增序列不复制progress | 9→11含原6贡献轴中的2；精确post与callback结果，不可条件跳过handler | 现名按桥接职责 | 无第二套SW假环境 | 真EventTarget/MessageEvent；持久权限只隔离IO |
| shell/main-loop.lifecycle.test.ts | 原4+迁入1，初帧/最新帧取消，100/250/280ms时只有2逻辑帧 | 不再把数组记cancel说成实际停链，不授浏览器时序 | 只有本host的RAF/clock/settings/队列被回收，地图引用退回空测试基线 | 两真实caller复用小queue；不将动画产品逻辑塞host | exact pending IDs与GS帧号并核，不只mock次数；原取消轴保留 | 以lifecycle和queue职责命名 | 删原型直接赋值和重复数组host | 确定时钟、真实startRafLoop，host取消真实移除工作 |
| core/menu/menu-mode.test.ts | 既有7加双键1，取消实际回explore；正向可打开合法角色状态页 | describe去阶段任务号；未宣称save IO | catalog退回本隔离文件空基线；setter无uninstall，不冒称恢复null | 共用现有snap/menu，无第二dispatcher | 精确空栈/模式排除先开子页再pop；变异指定栈长1≠0 | 按dispatch/return分组 | 去空数组强转，不扩产品接口 | 真tickMenu与typed角色，模块隔离生命周期明确 |
| core/menu/save-slot-menu.flow.test.ts | 当前/peer快照及meta都核8/7，cash555、currentSlot1 | 只声明memory IO，不授浏览器IDB | 清本模块槽与全局端口，等待实际写入 | local freshSaveState只供本合同两实际输入 | 精确log/次数且Save读回；max变1指定1红，不靠自算counter | 新文件表达真实保存链，非作者/卡号 | 一条完整流程，无弱endpoint克隆 | API真实执行，waitFor仅等可观察完成，不替换存储核心 |

shell-menu-contract-mapping将旧20+菜单2身份全映，业务例无退役；SB4 progress透传复用两既有native case。原件shell-bootstrap-before 20绿、menu-save-before 2绿。首迁音频夹具漏pendingSounds=[]使2作者断言红，已恢复原前提、不改期望；错误原件/补丁保留。一次Save API路径误过滤只执行8文件68绿，不授缺席套件；修正后shell-menu-restored 9文件77绿。cleanup误传null/undefined不符合setter类型，已改本文件typed空基线而非强转/扩大API；首typecheck exit2如实保留。

最终shell-menu-owned-cleanup-final为5文件29绿、stderr空，shell-menu-types-final exit0输出空，scoped静态5文件0。当前合法cleanup的menu-cancel-priority-current-control指定1业务红；menu-save-counter-control指定1业务红8≠1，两个生产变异源码均按SHA恢复。统一门仍未运行；旧反控原件不完整的战斗回合卡未因此闭合。

### RIX来源清单（1个原主体）

全文读vendor/rix/source-manifest.json、README、真实build-rix.mjs和kernel/主测。清单是来源证明数据，build直接消费源码，不在运行时解释清单路径；不把本行扩大为八份第三方解码器全文审查。

| 原主体（game/） | A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|---|
| vendor/rix/source-manifest.json（保留） | referenceTree与当前真实Git subtree同为ee230139；8上游/8vendored路径与16个SHA全部实算相同；编译器4.0.23与build固定版本一致 | 明列upstream/vendored方向；改编说明/版权与license头在相邻README和源头保留，不冒音频硬件逐位复现 | 来源清单归供应边界，编译/原盘读取/运行态不混入；bridge是本项目适配，不伪列上游映射 | 独有8条来源映射，不复制整份第三方源码为证据；编译只用当前同一来源 | 真实核16 SHA和Git树；相邻现WASM6例含4个独立native PCM hash通过，未声称本轮重编/全音轨验收 | referenceTree、upstream、vendored及两SHA命名清楚 | 每条四必要字段，无死入口/为未来抽象；文档消费者是真实保留理由 | 静态数据可重算，不需播放或编译；源码与清单差异能直接拒绝 |

rix-provenance-current记录16路径/字节/SHA及Git树；rix-provenance-adjacent 6/6、stderr空，未改源码/wasm。Vite配置另外已全文核读并用真实loader/原生流复现读取错误导致进程退出；已开GAME-ASSET-SERVER-READ-FAILURE-1等裁决，config暂不计完成；未写共享输出。

### 真实资源战斗流程（1个原主体）

原e2e-battle全文、目的文件及实际startBattle、loadDefaultGame、battle-runtime-context、脚本目录与输入dispatch读域核定；真实DEV初始化读域复用。本例调用控制器/真实输入与公开死亡渐变时钟；显示像素、真实音频、浏览器剧情E2E仍在各自域。原盘表team1对应敌2/对象399，HP30/经验1/钱3；C战果算法复用既有3w核证，不以测试内重算奖励为oracle。

| 原主体（game/src/） | A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|---|
| __tests__/e2e-battle.test.ts（退役） | 原静态role覆盖未hydrate，正式前提反例runtime HP0≠200；新每例fresh表+loadDefaultGame，完整敌OBJECT/升级/全局脚本，实际Confirm/Flee走接纳，不再直填pending；正常终态并清资源 | 撤E2E/未验sprite/旧Bug编号等宣传；删除flee即时等过时描述，目标是controller集成 | 原资源顶层共用会跨例污染；现GS/资源/seed/时钟每例独立，目录/runner引用清理；读原资源不写管线 | 小prepare仅装资源，finish共用真实tick/时钟，不复制phase/公式/保存算法或dev panel | 原2全迁，经验/现金>0改精确1/3，另核对象399和队长存活/资源释放。真实多1钱变异指定4≠3业务红；逃跑精确0奖励 | 归core/battle/battle-flow.pal，名称表达资源与流程，不假称完整浏览器E2E | 删除死Tilemap、void占位动作/leader、强转、吞旧objects.json解析/缺资源skip；30s特设timeout取消 | 真输入/控制器/资源，500tick上限；clock仅控制边界，失败也清本例持有资源；无核心mock |

目的文件全文A–H与本行相同，2业务例无退役；readFixture只接受当前受信producer资源，不授通用schema校验。11个实际JSON输入SHA随最终执行保留。原2绿，加入合法runtime前提后指定1红，是夹具缺陷，非产品修复。组织后2绿；battle-flow-exact-cash-control指定1业务红、源码按SHA恢复；battle-resource-flow-final含相邻结算共9绿、stderr空。当前game类型、scoped两文件静态和路由配置5单测均0诊断。

必要consumer scripts/coverage/config.mjs全文核读，只删除已不存在旧文件的单条fast精确排除；既有PAL glob、生产include和其它筛选均不变。A–H delta：实际资源依赖与fast/full合同对齐；注释不加新豁免；唯一selector仍是原testSelection；不用第二过滤器；配置5单测及真实Vitest文件发现证明新路径仅full存在、fast不在，旧路径两者都不存在；语义PAL命名；去死排除；只做文件发现，无覆盖率采集或全仓运行。list的--json末置，无位置输出参数，未覆盖任何源码。配置原有主体信用仅承接此有限差异，不新增93分子。

### 动画时间线与专测组织（3个原主体）

原anim-timeline实现2067行、主测1962行和增量专测105行均全文核读。生产actions/magic-animation全文；attack/attack-mate/flee/throw/coop、battle-opcodes、battle-system、driver及present复用有效读域并补核真实入参/消费点，不给依赖重新加分。primary为fight.c的Pre/Def/Off/EnemyMagic、Coop、Steal、受击函数，battle.h的25fps，util.c::RandomLong。SDL整数前移累计y=-4、辉光13帧、零区间不耗随机均核原文；不授整战视觉保真。

| 原主体（game/src/core/battle/） | A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|---|
| anim-timeline.ts（保留出口，函数下沉） | 不写战斗状态/执行脚本；嵌套帧/位置允许借用，caller/driver持播放/释放；原导出/参数/返回类型不变 | 修纯函数总述、前摇-5为逐步整除-4、辉光14为13、零区间假deviation、失效切片/行号与反向插值解释 | 物攻、法术、合击、召唤、手势、受击、敌变形分开；聚合仅原出口转发，无包装算法/产品循环依赖 | 共用frame参数/受击；敌我前导、姿态、落点、声音不同，不用布尔模式合并；小吹飞块重复登记可改善结构 | 原115全映、相邻真实caller；AST声明/接口核带负控，两同错旧绿新红 | 按animation职责拆8实现；原入口不改调用方 | 去三冗余special断言、两!!iBlow后的!=0；未获批准的输入退役不偷改 | 资源/时间/RNG显式，locale读取/RNG推进披露；6个复杂函数>10仅作读域线索，不为指标拆分 |
| __tests__/anim-timeline.test.ts（退役） | 110例合法slot、正帧计数、复位/护卫前提逐例核；共享frames只读 | 修前摇标题/辉光帧范围，去任务前缀；数据断言不冒浏览器/视觉 | 依实际动画owner归7目的，不再巨文件混所有动作 | 同owner合并，不复制生产公式造新oracle | 独立40ms/72步/DATA10；空overlay自证换非空两帧字面值；script-pre用独立坐标/帧号替同builder自比；零吹飞stub为合法0并验全链无位移 | 目的文件表达功能，身份逐条映 | 110业务例全保留，无堆例补覆盖率 | 纯数据可控，无核心mock/IO；新oracle可被指定业务变异击穿 |
| anim-timeline.glm-next-wave.test.ts（退役） | 偷窃正/负slot差、玩家受击单/多/空5合同保留；实际caller为opcodes/magic-animation | 去作者/卡号和过时magic.ts消费说明 | 两偷窃归手势，三玩家受击归受击模块 | 同业务owner合并，不删负offset/多目标独有轴 | 原5全保留；40改41旧偷窃仍绿，新例41≠40指定红 | 不新建extra/next-wave文件 | 薄增量文件/重复头退出，无禁用 | 独立时长/坐标，真实函数同步执行，无共享宿主 |

目的文件的函数体/接口按唯一声明映射承接上述A–H全文读域；新增头、依赖与测试变化逐处核读，不另增加原93分子。组织与所有权如下，不复制第二套逐函数算法：

| animation/目的 | 真实职责、差异与验证 |
|---|---|
| frames.ts | 40ms、DATA10与delay；纯乘帧单位，没有状态/额外策略层 |
| action-gestures.ts / .test.ts | flee/steal/throw/use的手势/文字帧；脚本与扣物留caller，locale读取明确；原13例，独立40ms反控 |
| physical-attack.ts / .test.ts | 玩家/敌人物攻及混乱攻击；伤害留action，共用hit-reaction；原31例，已确定复位偏离不暗改 |
| magic-effects.ts / .test.ts | 施法姿态/特效/吹飞；caster、脚本与伤害留caller；原51例，修注释与独立script-pre，零吹飞全帧反例 |
| hit-reaction.ts / .test.ts | 敌抖/玩家五步受击；物理和法术共用，不声称扣血；原6例，空/单/多目标保留 |
| cooperative-magic.ts / .test.ts | 贡献者聚拢→off/post→滑回；C计数不对称保持；原6例；无额外动作类 |
| summon.ts / .test.ts | 变亮与神留场合成；present持dither/loop播放，借用调用方帧；原5例，非空overlay业务反控 |
| enemy-transformation.ts / .test.ts | opcode召唤/变形/分身的敌人增量；与玩家召唤神生命周期分开；原3例，无新模式/IO |

timeline-describe-organization与timeline-test-identity-mapping保留115→115、业务退役0。timeline-organization-proof-final逐声明核runtime、原出口、接口/参数/返回类型相同；仅对基点两个冗余guard做明确归一，40→41内存负控拒绝。首版证明误给空sourceFile，负控失效且allEqual=false，未授信；timeline-proof-erratum保留纠正事实，没有改产品来过证明。

原2文件115绿；重组13相关文件178绿/stderr空；game类型exit0输出空；17文件scoped静态0。timeline-old-clock/overlay同错各1绿，新clock/overlay各恰1业务AssertionError，两个源均SHA恢复；-t未选用例不计通过。全仓/覆盖率未跑。

结构候选保留：OffMagic.targetIdx、EnemyMagic.targetPlayerIdx、enemy summon的casterPos/attackFrames未直接读，公共输入退役需另核授权，此片未删。coop主调度每行动清iBlow且合击不跑use脚本，不以未传blowTargets推断普通合击缺陷；普通召唤二次效果的非零吹飞可达域留caller后续核查，不将builder显式可选合同扩大为全召唤SDL等价信用。

### 动作综合专测（1个原主体）

__tests__/actions.test.ts的2532行/89例全文核读；attack.ts、magic.ts、item.ts、flee.ts、defend.ts与magic-animation及既有fixture/RNG全文/有效既读域复用，补核真实tickSelectAction/roundEnd、status/opcode和资源context。C伤害、帧时长、逃跑既定偏离复用一手证据；新增精确数值按实际C步骤、玩家抗性基线与合法随机输入核，不从当前输出抄预期。

| 原主体（game/src/core/battle/） | A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|---|
| __tests__/actions.test.ts（退役） | 用真实createBattleState/hydrate，同一GS与战斗view；HP/max合法，敌攻击负SHORT用合法WORD32836；固定骰越域与Float上界1.125改合法域1.0625；毒表/spy清理 | 去3simple actions/M3/虚假端到端头；修旧地址、错误数值与“状态0=睡眠”误读；0x2E的>=明确为项目取舍，不冒SDL后期真值 | 物攻、敌混乱、防御、逃跑、法术协调、物品请求、status接线分属7目的；原巨文件退出；renderer未安装的直接动作输入明确移除底锚，不冒完整开战 | 复用既有record工厂、公开战斗工厂、严格recordingRng；动作fixture只补本域默认值，不复制BattleState/Enemy结构；两个弱重复法术case合入既有真实脚本合同 | 概率失败旧被格挡短路、用0脚本，删概率门仍绿；新真实命中/合法脚本指定1毒状态红。旧haste/round手动调组件不能判别controller错接，新真实选择/队列/回合各指定1业务红；伤害/物品实效/完整诊断变精确 | 文件/fixture/测试标题按职责，不留作者/任务标签；pendingActions不再是本片status接线的oracle | 89→87；2重复有强后继，余87一一映；去强转、重复巨型构造、空端口假效果；不恢复死代码保覆盖率 | 真脚本跑giveItem/0x31/0x35、真实tickBattle；观察spy只委托真实runner。时间/RNG可控，有限guard与资源清理；不把自调函数顺序当生产时序 |

八个目的文件的A–H按上行及actions-identity-mapping逐例承接，新增factory/runner/控制器增量全文读：action.test-fixtures只装fresh/hydrated资源与严格输入；physical-attack保留39轴；enemy-confused-attack 4；defend 2；flee 10（保留用户fleeRate取舍）；magic-action 20（脚本、成本和反馈协调，不授渲染）；item-use 8（同GS真实脚本/扣除先后及全体哨兵）；status-action-effects 4（真opcode→伤害/真实queue/roundEnd）。新文件不再计原93分子。单例缺定义、零库存等是明确反例，其余脚本地址落在实际命令表内；敌人item调用只证已有API分支，不冒普通剧情可达性。

actions-identity-mapping核89原身份→87保留/强化+2吸收，后继为magic-scripts的真实失败和零入口/成功治疗合同，后继也在本次相邻实跑。金钱/伤害等宽比较换字面值，不能把mock次数当业务结果。新增八维知识写回engineering-notes的动画/动作所有权；attack-effects注释跟随真实帧测位置，不改历史原件路径。

原89绿；actions-final-current含7目的与3相邻共96绿/stderr空；9文件scoped静态0。类型actions-legal-types-final为0，此后仅增加typed反馈断言与文案，整批仍须核当前类型。actions-caller-controls保留三个同错：旧各绿、新各恰1业务AssertionError，源SHA全部恢复；-t未选不计通过。首轮独立预期漏掉玩家抗性基线/默认格挡、状态enum和四个可空ctx类型错误，如实留actions-organized-current/types及authoring-erratum；核primary后显式非格挡得到65伤害/HP435，状态0核confused4，未改产品迎合测试。两次编写中formatter的unused import告警不算门通过，最终raw零诊断。

### 共享测试夹具与离线worker（2个原主体）

harness原87行全文，公共battle-fixture/scripted-rng、八个实际消费者的调用闭包与必要类型/状态入口已核。原直接factory不hydrate、不安装startBattle资源，不能给宿主测试虚授完整开战前提。SW原190行、precache-client、现有两Node专测全文，main/bootstrap的注册/暂停/恢复接线、manifest生产者与已有UI证据复用并补核。primary为现行manifest合同、W3C Service Workers的waitUntil/Cache.put及WHATWG Fetch的Response.clone；不是SDLPal功能比对。

| 原主体（game/） | A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|---|
| src/__tests__/coverage85-glm-game/harness.ts（退役） | fresh状态/附着/独立bus语义迁公共factory；不补隐式hydrate；整数队列共享游标，非法值改为明确fixture错误，默认仍取下界 | 说明下界策略与unit-jitter默认不同；next/state恒0不冒LCG重放，调用trace范围明确 | 直接opcode构造归既有battle-opcode.test-fixtures；inspect/item只借公共构造；RNG归scripted-rng，业务推进不下沉夹具 | 删除重复构造，保留不同随机默认策略，未给通用factory新增模式开关；包装只选择本域输入策略 | 11消费文件253身份前后相同且全绿；偷窃11曾被钳10，现显式合法10，业务轨迹不变；没有新堆例 | 作者/覆盖率目录退出，makeOpcodeBattle/lowerBoundRng说明功能；真实consumer全部迁移 | 删零外部caller的freshGs与重复接口；没有恢复死生产路径；8依赖不重复计分 | 精确调用序和严格域可观察；每例独立状态/bus/RNG，无进程资源；自定义旧constantRoll/fakeRng只迁底座，不冒其全文件再审 |
| public/sw.js（保留） | 缓存响应先clone，200/206分开；跨cache命中与worker重启、版本清理、离线保留、暂停与重复start的所有权核明；在途请求不由pause取消 | 去旧过程叙事/无效ESLint指令，修跨所有cache与仅type-pal的误述；说明激活和precache都会核version、进度不是成功缓存证明 | 页面只发意图/收进度，worker持一轮worker池和waiters；没有把UI/版本生成混进SW；190行单一生命周期模块不为数量拆文件 | fetch按需和预缓存的错误/暂停合同不同，不合万能下载helper；版本维护复用setCacheVersion | 原2合同保留，新增版本保留/离线/暂停去重3个原子生命周期例；真实Response与真实listener，只有平台IO为port；两个关键同错各旧绿新1业务红 | 原生入口名/消息名及部署URL不动；注释描述输入/生命周期而非卡号；测试仍按SW缓存职责组织 | 只改注释/格式，去无消费者eslint抑制；去注释并统一格式后代码相同，常量8→9负控拒绝 | VM可控IO与有限微任务，不复制worker算法；每例独立域/缓存；Node合同不能替代真实浏览器离线/配额/部署验收 |

harness-consumer-identity-proof记录253→253；game typecheck exit0/stdout/stderr空；turn-harness-static-final实际17文件0诊断。不同随机默认策略不强合，现行recordingRng逻辑未改。原consumer文件仅按本次依赖差异授信，不将它们再计原93分子。

全packages/scripts引用复核只余approved-baseline-adjustments的20261031旧快照来源条目，不是活跃import。只读调用真实adjustApprovedBaseline，当前baseline对象SHA154524a5…得到applied=[]、sourceReads=0且返回原对象；不采覆盖率、不改旧授权和baseline，不把历史来源指针机械改成新文件。harness-historical-approval-probe保留结果。

SW原两例绿，新5例绿，precache-client/UI/widget相邻43绿，均stderr空。sw-current-cache-delete与sw-pause-bypass：原两例仍绿，新对应各恰1业务AssertionError；turn-flee-floor与turn-auto-producer：旧各1绿，新各1业务红。四处mutant均按当时未提交源码SHA恢复，原件/patch在turn-sw-controls；不把-t未选例计通过。

public既有Biome排除不变；实际源码另以相同JS规则stdin核，check必须用--write模式，且stdout须逐字节等于输入、stderr空、exit0，才授零修复/零诊断信用（sw-stdin-static-verified）。两次plain stdin check的exit1原件保留，不授静态通过。sw-body-invariance首版printer保留链式换行而文本不同，未授信；两侧以同一formatter规范化后sameCommentFreeCode=true，8→9负控仍拒绝。工具默认只读，产品未改来迎合证明。

回合边界在本段采集时仍pending。新职责spec及finalizer后继已有17条独立合同绿；真实合击→混乱的正式单红推翻“未见接线缺陷”，见[机制卡](../../cards/GAME-BATTLE-COOP-CONFUSED-QUEUE-1.md)。当时未获准，未改产品或关闭原主体；后续裁决与修复见下节。两项夹具错误（抵抗24误写28、0xFFFF误作占位而应为0）与finalizer采集/编辑交错均有勘误；固定Git原件补采6绿后再改真实caller，交错运行不算基线。

### 回合、开发落点与资源宿主（最后4个原主体）

用户2026-11-05分别批准合击后的行动吞并、scene-86唯一落点、dev/preview流失败处理及第三方worklet验收范围调整。前三项消费已保全的正式业务红例后窄修；worklet本体不改。前三项产品变化分别在独立卡控制，不借原测试卡扩大机制授权。

回合原504行/15例、后继3份spec与fixture、既有finalizer增量均全文核读；battle-system对应选择、队列、执行、roundEnd及coop生产者按已有读域补核。primary为SDLPal fight.c的PAL_CLASSIC混乱解析与PAL_BattlePlayerPerformAction的fThisTurnCoop门。scene-jumps全295条与94处备用点已全文/逐字段核，真实loadScene→onEnter→备用点覆盖→tickSceneInput→range碰撞为oracle。Vite配置全文及两个真实注册hook、Connect类型、Node ReadStream/ServerResponse生命周期核读；Node官方pipe合同指出源error不会自动替目标收尾。worklet按获准合同核供应者来源与边界，不宣称上游DSP算法全文审查。

| 原主体 | A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|---|
| game/src/core/battle/battle-turn-boundaries.glm-turn.test.ts（退役） | 物品改真实库存/选择；毒用真实脚本，胜负走tick；co-op/auto经真实前序，核伤害/EXP/随机trace | 去旧任务/作者头、错状态说明；原15针/历史accept不恢复 | 依round-order、round-lifecycle、escape分3spec；终局归既有finalizer，夹具仅持本域fresh/hydrate与有限推进 | 用公共startBattle与recordingRng，不复制BattleState/解释器；两毒合同合一强后继 | 15→12专属+既有6finalizer=18；每旧身份有映射；floor/auto/co-op生产者同错各旧绿新指定1业务红，源SHA恢复；原缺raw由新实际执行替代，不伪造旧31轮 | 后继按回合顺序、生命周期、逃跑职责命名；不按模型/卡号换皮 | 两终局合回已有，毒游标/8tick合一；无删唯一业务轴/忽略/超时放宽 | 真菜单与opcode前序可达，随机域严格、每例清catalog/context；旧手填flag绿不能判别生产者，现新反控可判 |
| game/src/dev/fixtures/scene-jumps.json | 295记录场景/map资源一致，94备用点核真实移动域；唯一scene-86从80移176，y1048/facing不变；其余记录字节不改 | _devNote改实际x边界和网格相位，去假BFS中心解释；caller中“partyStart已删”两处失实注释同步纠正 | 只承载dev跳转数据，loadScene持脚本/覆盖顺序，碰撞不在表内修补 | 沿用实际场景加载/移动，不新造坐标或碰撞helper | Node环境正式旧点四向零位移红→新点四向均位移绿；不以JSON字段自比代替 | 场景名/编号/坐标单位沿现行表；不重命名稳定场景键 | 单记录最小修改，未删有真实consumer的备用点；无新fallback | 真实PAL资源和无浏览器的loadScene/movement可定向复验；不授剧情/浏览器观感信用 |
| game/vite.config.ts | 正常字节/头不变；源error在未发头时next(error)，已发头时destroy响应；客户端close/error销毁源，源close解绑监听；dev/preview均验证 | 说明pipe源与响应的清理责任、已发头不可拼错误页；现有部署/端口合同未改变 | 小型serveDir仍聚合配置私有职责，无为测而导出；服务持IO，core不反依赖Vite；真实Connect替宽泛结构类型 | 两hook共用同middleware；不推广成各包万能静态服务器 | 新4个Node合同：真实HTTP/ReadStream的正常、stat后消失、断连、发头后EIO；原1绿3红→4绿，所有分支核同server后续可用与源closed | input/stop/headersSent直述状态，有限分支符合请求生命周期 | 不加空catch吞错，不复制中间件、不加ignore/例外；普通路径/资源格式/其它包不扩张 | loadConfigFromFile加载实际config，只有IO端口注入；每例隔离子进程，父持临时目录清理；无需新产品接口 |
| game/public/spessasynth_processor.min.js（第三方生成物） | lib4.3.6供应者文件与public394736B逐字节相等；冻结lock含core4.3.20/stb-vorbis0.0.6；实际Chrome加载、有限非零PCM、错误拒绝和dispose关闭原生context；不推断bundled算法等于单独core包 | 本体不改；bootstrap失实“缺音色库静默”改实际controller error；边界/来源/许可证明确，不补压缩体注释 | 注册器/processor/core边界核供应者source map，游戏MIDI适配器持context/node/sequencer；上游算法不进入game源码重构 | 复用已安装供应者，不复制/解压算法到仓库；同一Apache文本只发布一份notice | 新cheap guard核installed artifact+三供应者许可证；12例MIDI及相邻由独立定向补验；原生PCM与404分别按确切执行授信 | 压缩供应者稳定部署路径保留；许可证按供应者职责命名，不用任务编号 | 不手改生成物/新增兼容层；一份11358B许可证为发布义务保留；冗余探针按退出合同清理 | 单元边界可注入，原生worklet另跑真实浏览器；算法正确性/全浏览器/物理听感明确不在此合同 |

回合identity-mapping逐条记录15旧身份的强后继；旧items=[]/手注fThisTurnCoop/prevPlayerAutoAtk缺口已由真实路径替换。lost与watchdog合入现有finalization；poison游标和8tick合一，保留同一次真实结算的双oracle。旧62日志/31JSON不可恢复，旧15VALID和accept永久撤回；本轮不复制历史汇总冒充原始执行，也不为补足旧“15针”堆人工反控。当前三个关键生产者反控、正式缺陷红例和全部恢复原件可独立复核。

合击窄修只在confused分支加!fThisTurnCoop，不能让已pass的行动重新选靶。真实菜单co-op后敌HP29889、队员499/499/500、第三人攻击EXP0；后续随机trace仅保留睡眠敌人现有的rangeInclusive(0,2)，无混乱选靶。turn-coop-producer反控去实际producer flag时旧手注测试仍绿、新指定1业务红；源码恢复SHA相同。scene/co-op恢复相邻8文件46绿，stderr空，不能外推整战画面或普通剧情可达性。

资源服务新game-asset-server.test.mjs及fixtures/asset-server.mjs均全文核读。父进程持临时树，异常必须允许终止隔离子进程；每轮捕获真实dev/preview hook，真实HTTP失败/关闭后还验下一请求。注入仅映逻辑路径到自有临时文件、给真实ReadStream第二次read的EIO，不写共享data，不复制业务算法。两个层次分文件是原生进程失败隔离的真实边界。asset-server-formal-red为1绿3红；修复4绿，stderr空。Vite专用类型项目继承实际严格tsconfig并零诊断；先前root缺node类型/TS6显式文件用法失败单列，未新增--ignoreConfig或弱规则。

worklet SHA256为2b01a0e28af38aefb21fc32bcd8a288c68fba36b391e5d495b865322f9ae0a25，license为cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30。source-map只全文读注册器、处理器名、WorkletSynthesizerCore的边界，不授143源/1003函数的算法信用。官方包锁定来源与Apache-2.0三份同文本核实；game-midi-worklet.test.mjs仅核artifact/notice漂移，不认证声音算法。后续更新依赖须同步worklet、重核锁与notice，并按实际后端加载/失败/dispose复验。

原生组件验证使用已安装Chrome157.0.8103.38、实际createSpessaSynthBackend、真实soundfont与049.mid、可信点击和原生AudioContext/AudioWorklet；不是完整游戏E2E或物理扬声器听验。worklet-browser-report-r2的positive已验200响应394736B/SHA、48kHz原生PCM（2048帧，peak0.24912965297698975、rms0.05736039096097364）、dispose后closed。该整轮exit1来自后续404观察器误用page.response；不冒整轮通过。只补跑missing-r3，实际HTTP404、backend.ready以AbortError拒绝、context关闭、exit0。两轮pageconsole/pageerror均空，不声称worker日志域已被page捕获。worklet-browser-observer-erratum保留两次观测器错误，原成功不重复跑；PCM/输入指纹/独占cache清理均保全。

### 必要的现行文档接入工具（不增加原93分子）

首次完整check在testing-docs停止，尚未执行产品包测试：8项为本树缺已留存E2E006原件，已由官方restore-e2e-evidence.py从已核归档只读恢复，8项SHA/字节吻合、runtimeCredit0；另14项是三个稳定测试身份的7个源码来源在canonical/evidence中漂移。四实现仅注释，typed去注释正文与08d67e28相同且负控有效；两PAL测试改具名选项/typed方向后原14合同保留，旧回执指纹不匹配如实保留，补当前两文件14绿/stderr空；uiText完整译文表与旋转自有literal不变，只对获批未知继承键修复。catalog/report/evidence仅回绑2+4+1来源并追加history，旧源、日期/状态/候选/版本/原执行和附件不重写。

现行位置合同只接受Markdown修订，无法合法接入这四个仍需维护的JSON载体。先保留真实loader的unsupported-body-change单红，再补受限testing-source-bridge：四路径、三ID、七来源由代码固定，候选manifest不能扩容；完整对象反向还原须与固定Git原件深等，原history前缀及真正变化的previousSourceRefs精确匹配，新sourceRef核实际字节/行/anchor，退出再次复核。非作者/afterSHA/Owner准入、原native类型和配对门保留，不给任意JSON开口。规范回唯一文档维护流程与测试治理版本适用性，不新建平行账本。

| 新主体（scripts/docs/） | A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|---|
| testing-source-bridge.mjs | 严格解析原生字节；只改七来源SHA/行范围及追加一条事件；原对象/成员/顺序/角色/出版/执行/附件/claims不变；JSON/entry/event畸形先明确拒绝 | 说明有限pilot与固定Git/原执行保全，未称任意JSON维护或语义自动认证 | 只核元数据差异，文件/准入由loader持有；private Map/Set无外部writer，snapshot限一次检查 | 复用terminal JSON与现有sourceRef校验；不导入上层check-testing造循环，不造万能native框架 | 四载体正控、字段/历史/非法范围/指纹/任意JSON/畸形输入拒绝；真实loader读后漂移反控1业务红 | restoreReferences/restoreHistory说明有限反向还原；文件按测试来源桥接职责命名 | 无忽略/降门/任意路径或模板覆盖；没有以hash自批语义 | 只读传入Buffer与caller-owned reader，克隆后比较；读源cache仅本次调用，退出新检查不复用旧缓存 |
| testing-source-refs.mjs | 原safePath、range parser与存在→范围→读取→SHA/anchor规则迁移；非法路径不进IO | 注释明确IO/snapshot Owner和读取顺序，不称文件名能证明来源真实 | 语法/指纹核验与FS选择分开；CLI用原fs端口，loader用受保护字节端口 | 同一真实输入/错误合同共享；旧CLI不反依赖loader，未建跨任务通用path库 | 原公开check-testing相邻守卫保留；I/O顺序反例及源提取证明带有效负控 | testingSourceRefIssues/safeTestingPath表达领域，不隐藏repoRoot全局 | 删除旧重复实现，原wrapper仅装原IO责任，未删任何拒绝条件 | 显式has/read端口；错误仍返回具体路径/范围，源读取异常沿原合同传播 |
| testing-source-bridge.test.mjs | 小型完整关系fixture只服务该元数据谓词，不冒完整catalog发布；坏输入是明确拒绝域，七源字节真实参与摘要 | 名称描述保全/拒绝合同，不以测试数认证新runtime或算法 | 每例fresh JSON/Map；真实Git/loader集成在既有location专测，无共享进程状态 | 同一字段保护按数据表列独立反例，三evidence路径各核固定ID；不复制生产还原算法造oracle | 明确status/candidate、成员/path/anchor、history/previous、artifact/claim与shape错误原因；非恒真、不用mock次数代替保护结果 | 文件按来源维护域组织，不用卡号/模型后缀 | 参数表不堆同义断言；共享解析已有独立UTF8/重复键合同，未复制整套解析测试 | 无时钟/网络/磁盘副作用；源IO端口只提供实际fixture字节，正常与拒绝可确定复验 |

必要相邻差异不授额外整文件关闭：check-testing只抽原校验，loader保留旧Git/模式/独立接受/afterSHA/行数与退出复核，model先验历史接受，再用真实有限JSON合同避免误送Markdown分支；旧专测字节保留，仅追加真实Git/loader合同。testing-source-validator-extraction-normalized是默认只读的三函数/IO桥等价证明，路径谓词、范围、核验体与wrapper均相同，范围1→0内存负控拒绝。首版printer保留多行布局产生false未授信，纠正只在证明工具规范化，不改产品迎合证明。

testing-source-bridge-adjacent旧95轮后增加了两处根/entry对象守卫和测试模板字面量整理，不能冒旧原件为当前；两旧文件已按原SHA逐字节逆还原保全。当前adjacent-final四文件96绿/stderr空，新增root/entry/event反例已实跑；static-final完整JSON为7文件0error/warning/info，stderr中的Biome JSON实验性工具提示保留，不写“stderr空”。真实loader去唯一桥接调用使指定一例Missing expected exception/ERR_ASSERTION，源码SHA恢复再绿。real-model-frozen实际exit0/0 issues/stderr空；前轮探针与指南编辑交错被assertUnchanged拦下，原exit1与erratum保留、不授通过。后续有活跃读取子进程先等明确exit，再改其输入。

集中覆盖率只采集一次：七包20273全绿/829源，原官方ratchet整轮因game分支9954/12268→9961/12278下降0.00907144个百分点而exit1，完整原件保留。按既有用户授权只精确调整这一指标，另三game floor及六包floor不降，当前逐源原件保全；没有窗口前逐源V8，不声称单helper计数证明。五条精确count/digest/source快照是迁移/强后继，净66不是删除66业务合同。原runner guard/comparator/atomic writer原文不改，仅在仓外复用同一冻结报告执行其尾段；same-report ratchet/protected各exit0/stderr空，163工具守卫绿，不重采全仓。整批check完整恢复及最终交付仍须实际完成。

## 结论

冻结93条原路径均已登记八维/处置：92个按原全文合同，1个worklet按用户明确批准的第三方生成物合同。新目的/相邻补读不增分子；battle/__tests__/object-script-progress曾重复加1的历史数字仍保留勘误。未知结构候选、既定偏离及未授视觉/算法信用均保留原适用边界。当前文件层审查及必要门工具增量已接受，中央账本已同步；覆盖率一次采集及同报告ratchet/protected已完成。全仓check完整恢复、持久归档及集成尚未完成，不据此宣布整个专项完成。

## 整改与复核

本批停止扩展，核实际diff/93身份、caller漂移、退役映射及中央库存，再集中门和按用户授权集成。原件持久保全后清自有临时树/探针，记录实际净量。SLF/指令/资源/生命周期或supplier输入变化只重核受影响claim，不按日期重跑全仓。后续包pending由原live账本选择，不将本批完成当全仓完成。

文件层冻结复算：3664 tracked /967 closed /0 review /2697 pending。93原主体中61原路径保留，32有明确退役/合并后继；60新目的实现、专测和夹具经上述读域/映射及新增量核读，故当前中央增121条，不把目的路径重计原主体完成分子。MIDI四文件25绿（含audio-midi12），stderr空。asset-server-ci-fixture-green的4合同均绿；CI工作流不提供gitignored资源，因此后续请求采用自有临时JSON字节，IO仍经真实中间件/HTTP/ReadStream。之前真实battle-fields字节探针仍只授对应执行，不改原件。

必要门工具接入后的当前机器口径为3667 tracked /970 closed /0 review /2697 pending：原61路径+63新增当前路径，共增124条，其中3个维护工具不计原93分子。前文3664/967为添加该必要维护能力之前的真实冻结阶段，原846旧行保持；各次原生执行字节不改写。


## 集中门最终组成与必要返工

原`pnpm check`、恢复轮及后缀父进程都曾exit1，原件保持真实退出值，不改写成“完整命令exit0”。采用相同package.json脚本顺序：r2已通过的docs/coverage-tools前缀复用；r3已通过的工具与五包复用；editor五个失败身份逐一恢复，migrate完整补跑，最新类型/lint另行完成。`full-check-resume-plan.json`与`final-gate-diagnostics.json`逐项指向实际原件；正常七包共20623个既有身份，数字是组成集合，不冒称一次20623全绿进程。

| 门 | 实际范围与结果 |
|---|---|
| 文档工具与现行文档门 | r2：528/528，docs/model/testing/lore/content/progress均0问题；最终正文由非作者按SHA接受，封板后仅复核元数据与附件绑定，远端以保护检查为准 |
| 覆盖率工具 | r2：163/163；有限授权、历史退役计数守卫不降级 |
| 质量／E2E／脚本治理工具 | r3前缀：50/50、414/414、22/22；E2E工具不是新剧情实跑 |
| content／shared／game／extract／reforge | r3：1473、118、3836、424、9014全绿，各包类型0诊断 |
| editor | 原4967绿/5红保留；当前受影响PAL9/9、DOM与静态65/65；当前官方fast子集620文件/4802绿，原五个失败身份都有精确绿色后继，不删除或改名逃避 |
| migrate／最终editor类型 | migrate完整94文件/786绿（含PAL项目），最新editor双tsc均0，stderr空；Vite严格单独类型项目亦0 |
| lint-zero | 全仓6697文件，error/warning/info=0/0/0、完整报告；旧Biome JSON实验性工具提示留在原轮，不冒称该轮stderr空 |
| coverage ratchet／protected fast | 原七包20273绿/829源，首ratchet因game枝比下降exit1；精确有限floor调整后同报告收口。必要文案改动后只补editor，报告对象／逐源计数与原editor整体相同，六包未重采；final ratchet/protected各exit0/stderr空，完整报告SHA仍f762801d… |
| 账本／差异 | 当前3667 tracked /970 closed /0 review /2697 pending；diff检查按最终源再核，包级全绿不授文件关闭信用 |

两处隔离CLI夹具漏复制新增bridge/refs依赖，分别导致docs-tools三红与quality-tools一红。`terminal-codec.test.mjs`及`code-quality-inventory.test.mjs`各仅追加两条真实依赖路径，原断言、合法／非法输入、反控和临时树清理不动；34合同与50工具恢复。已横向核显式复制入口，其余同仓导入或完整目录复制不漏这两个依赖；只接受这些必要差异，不新增整文件closed。

### 统一门中的既有PAL与术语差异

这些不是扩展94–102复审。`projects/pal`及生产引用收集器均未修改。四项旧census来自s005/e116在0847b1a6e已合入的船只页面动画：在当前其它数据保持不变时，仅内存换回d1cadb32ea旧实体，便精确恢复22668/400/4452/28136；当前为22664/401/4451/28137，rows25224不变。旧四条自目标、auto页面绑定退出，新增sprite-196的具名动作页面边；完整owner/target/locator与旧auto零引用变成正式断言，原九合同和独立collectors/worker对照全保留。世界精灵汇总4235→4236；该动作对在s014/s100/s111已有消费者，唯一对数保持38。

作者曾误把引用增加推为唯一对39，`pal-reference-census-green`实际8绿1红，名字不能改变exit1；已恢复38，反向补丁与SHA勘误保留，最终restored9/9。诊断probe两次因Node不支持import.meta.glob、端口缺NotFoundError归一而失败，原件保留；纠正端口后仅授因果诊断，不计产品测试或E2E。唯一临时probe已按SHA核对后删除，源留归档。

ProjectSaveDialog两处“工程”由01739e引入，现行DS-P.5明确界面用“项目”。原两个真实DOM业务断言先红，再只替换两个字面量，原preparing/reopening合同加强，3文件65绿；写盘、取消、格式、百分比和UI形态不变。该组件及两专测仍pending，本轮只接受必要差异，不把全绿当整文件治理。

| 必要差异 | A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|---|
| project-reference.pal.test.ts既有关闭刷新 | 单实体可逆内存因果解释五计数，作者数据不写 | 说明船只归属与已有pair，不冒未验证剧情 | 原一次加载／只读索引结构不动 | 独立collector和fresh worker原对照保留 | 九身份不删，新增精确具名边与旧auto零引用；38误推如实留失败 | 使用稳定scene/entity/page/action名，不以数组位置为新oracle | 无宽断言或派生实现自比替代；无新case堆数 | 同原合法PAL source，端口缺失错误显式；临时probe清退 |
| ProjectSaveDialog.tsx必要文案 | 两个等长展示字面量跟随既定术语；无机制／保存取舍 | 原不可取消与资源职责说明不改 | App提供activity，session持保存状态，组件只呈现 | 不为两词新增helper或模式 | DOM双红后修，原进度和取消合同保持 | 项目术语一致 | 两处替换，不建兼容分支 | 原props/时间线/IO边界不改，未授整文件关闭 |
| ProjectSaveDialog两专测必要断言 | 原合法preparing/reopening输入 | 名称与实测范围不扩张 | 原host/root与prototype夹具生命周期保持 | 原渲染端口复用 | 一个原literal更正、一个output精确断言；原三身份保留，非mock次数oracle | 字面业务结果可读 | 不新增例数或重抄fixture | 同测试字节先2红，再恢复65绿；其余既有设计不据此授信 |

原846中央行在文件层初冻时确实未改；最终必要门刷新PAL这一行的来源指针和oracle说明，845行逐字节保全。仍是846既有关闭＋124当前主体=970，不新增PAL关闭数。UI三文件及其它2697文件继续pending，review为0；本批结束不等于全仓专项结束。

封板元数据首轮`final-publication-metadata`实际exit1：TURN现行收口段误放在“原文保全”标题后，进入受保护范围。只把该段移到保护区前的现行小节，完整历史区字节不变；未改检查器、规则或历史授权。独有失败全文、源恢复补丁和执行身份归唯一包；后继封板元数据与远端保护门按真实结果执行。

## 唯一交付包与退出

执行原件、身份映射、反控补丁、六份不可由当前／固定Git替代的早期输入及默认只读校验程序统一保存在本目录`execution.tar.gz`。压缩载体的SHA／字节由document-locations的artifact项绑定；内部manifest逐成员校验，当前199个代码输入与32退役路径另有冻结证明。指纹证明身份，不自动认证语义；先消费本页A–H与具体争议轴，不重做93全文。部分早期作者中间输入只有原生失败／恢复及变异补丁，不宣称全部临时树可完整重放；必要当前获批修复和来源边界的原件单独明确。

默认低成本只读复验（不重跑测试，不写基线）：

```sh
tar -xOzf docs/tasks/evidence/QUALITY-PHASE1-PENDING-93-1/execution.tar.gz verify-receipt.py | python3 - .
```

其它coverage／变异producer只供明确恢复对应候选后使用，不是默认复验入口。原七包报告只保留一份；editor新报告对象相同也保留其不同执行身份／原生日志，不合并丢失时间和诊断。重复整树备份、组织脚本、launcher重复输出、可重建全仓inventory不进入持久包；发布到同一治理分支并核远端对象后，Codex删除自有仓外暂存和无消费者构建输出。仍被现行合同消费的8个E2E006恢复原件、原盘只读源和依赖链接保留，恢复不授新runtime信用；未知归属资源不自动删除。

相对08d67e28的packages/scripts最终源范围为193条实际变化、64新增／32删除、净-68896字节（含许可证和有限门数据，不含本Markdown／唯一原件载体）。没有创建新分支／worktree，继续保留当前治理分支与隔离树供下一窗口；本次原件持久保全后清理冗余本地备份，不把阶段合并当长期清理全部完成。远端PR保护检查及合并/main CI按其真实Git身份执行，封板时不预报未来成功。

下一窗口可选scripts/docs的资源载体／读取所有权相关pending（该目录仍215项），开工前重新核Owner和最新main；game/pal-extract/shared当前pending均0。本次不扩展94–102或其它pending，不用本批质量门代替下一批八维。
