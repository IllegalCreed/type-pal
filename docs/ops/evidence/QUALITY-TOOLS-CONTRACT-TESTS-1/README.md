# 工具专测合同：计数、范围、环境与输入

## 证据身份

id：QUALITY-TOOLS-CONTRACT-TESTS-1；Owner：Codex，单 Agent。基点 `123595ac3a651957b36061eacced329369c495e5`；证据候选来自本窗冻结工作树，按文件指纹定位，发布以受保护PR实际状态为准。[百文件窗口](../../tasks/QUALITY-PENDING-100-1.md)内首三子批分别为[计数/范围/环境/输入专测4](../../tasks/QUALITY-TOOLS-CONTRACT-TESTS-1.md)、[预检/探针4](../../tasks/QUALITY-COVERAGE-PREFLIGHT-PROBES-1.md)、[初始化器fixture9](../../tasks/QUALITY-INITIALIZER-FIXTURES-1.md)。代码接受100，本地统一门已通过、发布单列；前70与末30的时点分别保留。

## 来源与输入

100个主体文件逐个全文与A–H、caller、oracle见[唯一文件索引](review.json)；相邻四实现/配置/runner补读仅作依赖绑定，不计100。fixtures 是窄工具或原生计数探针输入，不冒称真实游戏资源或完整 content schema。fixture同形的原因是两/三路、node/jsdom初始化器合并，具体取舍逐文件记录。

## 断言与业务 oracle

核完整合法前像、单点非法变化、手算分数/集合差、真实inspector与子进程结果。三个单点变异分别删除covered上限、损坏精确整数比较、漏记同数身份替换；均旧绿、新恰一指定AssertionError。第四个向临时fixture子进程注入stderr，原宿主忽略而通过，新宿主恰一AssertionError；这是测试质量反控，未冒称产品红例先行。

四个专测14→22；原normalize标题更名保留合法计数合同，旧弱异常断言迁到完整输入，分数/汇总/版本/目录反例补强，未退役测试。探针十个身份不变，配置五例/保护两例不增加重复合同。完整Node原生事件给真实file×name×status，报告提取而不自报passed。

## 前70主体时点的结果（保留历史范围）

70／约100主体文件代码接受；账本3467 tracked／664 closed／0 review／2803 pending。定向22、探针/相邻21、最终工具136分别记录，互相重叠，不相加为独立合同。完整TAP、原生事件、命令/时间/exit/诊断及全部变异原件见[native归档](native.json.gz)及review.json成员指纹。

成功运行stderr空且诊断标记0；嵌套Vitest使用default+JSON，完整default输出转发到外层原始TAP。内层临时JSON由测试读取断言后清理，未单独持久化，不冒称它们是独立附件。首轮反控后一次Biome仅格式变化，pre-format原件保留，r2反控另以最终字节采集；没有覆盖旧失败。

本窗口extract包typecheck已实际0诊断；全仓check、其它包typecheck、官方采集/ratchet/protected、提交/推送或PR未执行。用户明确约100主体文件后集中收尾；本窗产品源码含用户批准的三旧适配器退役与palette事实注释；计量政策、排除、超时、生产依赖和baseline不变。

## 低成本复验

在治理树执行 `shasum -a 256 -c docs/ops/evidence/QUALITY-TOOLS-CONTRACT-TESTS-1/checksums.sha256`，应全部OK；它核身份与附件，不证明语义设计。原生事件/实际结果从native.json.gz解压读取，review.json给成员SHA及执行nativeCounts；每条反控记录含准确source/test/mutant字节、命令和唯一失败名，可在独占临时树重放。

必要动态复验为 `node --test --test-reporter=tap scripts/coverage/*.test.mjs`，前70时点136 passed；冻结后六精确退役数据行更新，当前141 passed、0 fail/skip/todo；这是约3秒的工具回归，不运行官方覆盖率采集或产品整仓测试。只有源码、caller、依赖或合同变化时才重验受影响claim。

## 限制与退出条件

70文件代码质量结论不授其它pending或产品/E2E/视觉信用。两个非阻断相邻候选已登记：game测试配置中旧L2命令注释、JSON预检IO错误的分类措辞。高风险新取舍继续单项停止线。后续先核lint-zero专测，再选pal-extract未与localization Owner重叠的pending切片；约100实际主体文件后才集中重门与提交。

## 后续同窗子批

[零诊断专测排重](../../tasks/QUALITY-LINT-ZERO-TEST-CONTRACT-1.md)完成1主体，原27→25仅NaN/Infinity两个同JSON输入别名映射到null；原生Node事件证明其它身份完整保留，quality-tools45绿。

[资源清单三专测](../../tasks/QUALITY-EXTRACT-MANIFEST-TESTS-1.md)完成3主体；倒序输入前像捕获原地排序，独立Python常量替换基于被测输出的版本推导。原7身份不变，7绿；原地排序反控旧7绿、新6绿1业务AssertionError，临时树清理。源码、capture、JSON/default与原生事件原件已追加native归档。

首轮docs只有新证据目录漏导航1 issue，完整失败原件保留，补导航后的docs-r2为0 issues。后续窗口继续推进时，文档/绑定最终静态门随冻结再核；不把上次静态绿当作之后所有改动的新门。

## 表解析与 fixture 增量

[表解析子卡](../../tasks/QUALITY-EXTRACT-TABLE-TESTS-1.md)新增21主体逐项A–H，累计42。六角色输出补成完整tuple、MAGIC补全17字段、RIX两签名的非法输入分离；三个单点变异均旧绿新恰一业务AssertionError，准确身份与全部原字节在 table-counters-r2.json。最终20实际测试文件66/66，extract tsc --noEmit零输出、11个改动TS文件Biome零诊断；default+JSON原件及0字节stderr见table-frozen各成员；两旧接受相邻caller只计回归、不凑新关闭。

两个fixture完整读域包括构造函数、各出口实际caller及SoA字段；删除3个无consumer的测试常量，四个构造函数与全部保留值逐字节不变（foundation-cleanup-proof.json）。历史批准表/基线不改，当前baseline不消费旧SHA调整。table-comment-identity.json的foundation条目是中间注释版，不能冒称最终fixture完全JS相同；后续死键清理用独立proof桥接，反控依赖未读取那些键。

palette.ts旧关闭只修事实注释：保留当前TS位复制，25→101与SDL左移25→100的已登记区别不变。最终去注释发射JS一致；不计新增主体或关闭数，不重开颜色产品取舍。测试只核既有输出合同，不授游戏画面/E2E信用。

首次账本行新增后，声明汇总仍是618/0/2844，机器拒绝；已同步为639/0/2823再实测。首次输出只保留于工具传输记录，未冒称有进程raw附件，后续原件单独保存。本段为表解析片时点，字体三专测随后已由下节逐项核验；未因初读或计数自动关闭。

## 字体、旧适配器退役与场景/图片（2026-10-27）

新增13主体，累计55／约100。三新子卡、逐文件A–H与五条退役记录均在review.json。用户明确批准旧战斗批处理/RNG转PNG/FIRE转PNG退役；三源码与两专属测试文件移除，退出tracked不计新接受。两个必要新文件为真实RNG writer回归、两个场景专测共用的typed/raw一致fixture。live账本实际3459 tracked／649 closed／0 review／2810 pending；源三旧closed的退出不伪装成增加关闭。

modules-case-mapping.json从原生JSON逐一映射59个旧身份，包括ASCII与triggerMode排重、shared22个操作码合同、真实writer8个合同及原盘golden。纯旧适配器结果形状/缺Map键警告由用户授权退役；真实CLI的player/enemy双命名空间由既有强测试承接，只读核其源，未冒称重跑该CLI。本片实际14文件52例、shared2文件22例，extract typecheck及局部Biome0；这些与旧运行重叠，不相加成独立业务合同。

真实FIRE全表837帧、RGM88头像、BALL251图标的原生RGBA摘要均保持原常量。新writer测试还逐字节核12个RNG blob与1464个帧身份，数据来源是独立Python原始offset表，六份原盘输入SHA另列。RNG原“第一帧非黑”标题其实只查PNG大小；事实第0帧全黑，现直接核像素与帧推进，不继续传播错误标题。

FIRE旧16B夹具缺0xFFF结束符：TS按长度返回不足以认证。已换18B合法流；有读写边界保护、保持原停止条件的SDLPal C验证旧输入bit96截断、新输入111bits读到EOS且11B明文完全相等；1B短夹具也读到EOS。C源/提取方法、编译命令、正负原件全存，不声称修改了生产YJ2规则。

本增量四个业务反控分别为字体JSON第二字形宽度、writer raw回退、场景auto帧尾字段、地图unsigned值；旧套件绿，新套件恰一AssertionError。第一轮writer反控多一个默认超时，不予信用；已用原生Buffer.compare逐字节比较替代通用deep matcher枚举大Buffer，断言域和默认时限不变，后续单红/恢复成立。首次静态的unused PNG warning（exit0）明确不通过，删真正死import后零诊断；首轮格式/暂存前inventory ENOENT与所有恢复原件也保留。

只暂存本卡5个退役路径、2个新文件及FIRE测试迁移路径，使按Git索引枚举的现有inventory能核验；没有commit/push/PR，也没有全仓check、官方coverage/ratchet/protected。正式退役政策/范围与计数审查留约100主体冻结窗口。其它活跃localization/SLF/script-corrections与所有未核文件不受本结论影响。

FIRE测试迁到当前producer旁的animation-assets.fire.test.ts；三case身份不变，模块解析归一化证明只改等价相对导入。原52例回归是旧路径时点，迁移后另有实际3例回执，不混写执行时间；迁移不计第56个主体。

## 事件编解码与剩余二进制夹具（2026-10-27）

[本片任务](../../tasks/QUALITY-EXTRACT-EVENT-TESTS-1.md)新增14主体A–H，累计69／约100。10事件专测60→58，两个重复往返并入对应完整结构例；三MKF壳层重复例退役，shared11与实际CLI/writer承接。IO RLE三低位/透明例在shared已有逐字更强断言，extractor改保留独有PAL来源接线；当前59定向、表相邻66及shared MKF11分别运行，重叠不相加。

events-case-mapping.json逐项映射基线66身份。完整64B oracle补上goto第三word，结构预期防双向共同错误；registry补全169key，roundtrip负例移到第二指令防constant0，PAL高位literal seam区分来源。四个单点变异均旧绿、新恰一指定AssertionError，临时树已清，源未改。

四纯LE/MKF造器由glm-tb04原样移到binary-fixtures，旧出口转发；events专用8B叶只造input，不参与expected。桥接证明四声明AST不变，资源表66回归仍绿。YJ2只修事实注释，emit JS不变；空、1B与65536B输入由有界SDLPal C读到EOS，完整明文与Python独立pattern一致；不把TS按长度退出当合法性证据，不声称任意输入域。原盘roundtrip成功size348024由Python SSS头表独立计算。

过程披露：events-current因改文件头漏掉两import产生7个ReferenceError，修复后59绿，不授反控信用。中间it.each的$title造成Vitest原生名字截短/冲突，改显式for/it(title)后21个原名全部保留，单独21绿；早先日志未改写。两个证据生成器在映射标题/表头拼写上先拒绝，修正只影响派生索引，不伪造进程日志。全仓/official/提交继续等约100，尚未执行。

## main安全同步与原盘表/守卫归属（2026-10-27）

同一分支已快进main72db417255d8ca4227522420e9185ef468462aa7，原窗口基点123595保留。sync-main-20261027.json记录外部78路径tar/补丁/索引校验、精确stash29fe53386d0c24ffca52c2b2f65744b301d7ba43与恢复；stash尚保留，原12暂存路径恢复。只在账本/5审查JSON冲突，保留main新来源再窄写本窗绑定；主树不写。上游8个新tracked只增pending。相关scene/world/CLI和类型增量已核，当前5个scene/root/slice文件回归及extract TC零诊断；原69主体不因同步重计或全量重审。

[原盘表子卡](../../tasks/QUALITY-EXTRACT-RAW-TABLE-TESTS-1.md)只新增tables1主体，累计70／约100；misc-guards退役不计新接受，15个原接受目标仅桥接。104旧身份（tables89/guards15）逐一映射到精确file×fullName；独有短输入/错误/名字/字体合同回实际Owner，重复map、无名spell、zero-roleCount合并。7处排重头已纠正，不继续把迁出的case写在tables。

原盘全字段金标由rawtables-oracle.py直接读物理MKF/LE/SoA，全部领域记录在rawtables-physical-values.json；只复用C结构与既有TS投影，不从TS/提取产物生成expected。tables13例各按parser/真实接线分开，两个原未核声音字段反控均旧89绿、新唯一AssertionError；源不变、独占临时树已清。首轮4个编辑断言错误完整保留，不作产品红例。18文件91运行之后地图重复例撤并、空槽名字规则补强，当前map3/team5单独绿，其它未变例复用；当前91身份是合并原生集合，非一次最终91执行。

实际3467tracked／664closed／0review／2803pending；全仓check、whole lint-zero、官方coverage/ratchet/protected、commit/push/PR仍未执行。约100实际主体才冻结；剩余约30，活跃SLF/英文/修订链不占用，不以依赖/搬移/退役凑数。

## 资产与渲染末30主体／百文件冻结

[本片唯一入口](asset-render/README.md)给30新增存续主体及两PNG退役映射。窗口累计100实际主体；机器3465tracked／694closed／0review／2771pending，包级通过/依赖/退役不凑数。137定向/相邻绿、最后12重叠增量、game TC与30文件静态0；不把此前时点的70或未跑统一门改写为历史通过。现在只做本窗口集中check/official/ratchet/protected和发布，不扩其它pending；当前仍未提交、推送或建PR。

## 百文件集中门入口

[统一回执与只读复验](uniform/README.md)集中记录100主体、三处测试宿主/旧夹具桥接、六次首跑失败与恢复、唯一官方采集和有限分支基准调整。前文各子片时间点保持，不能把早期“门未跑”或70数字当成最终状态；以此入口的实际执行状态为准。最终全仓门结果见下方实际回执。

最终本地统一门已实际通过：20536包测试＋732工具测试、七包TC、whole lint0；唯一official20,188/809，原报告有限调整与protected重放0。原失败不改写；所有细节见统一入口。提交时远端尚未发布，本地卡done不冒称远端CI或合并已完成。
