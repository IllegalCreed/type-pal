# TEST-COVERAGE-TRUTH-1 - 类初始化覆盖率合并真值修复

Status: review
Phase: ops
Capability: ops / coverage
Coding Owner: Codex
Generation Owner: N/A
Reviewer: both
Visual Verification Owner: N/A
Visual Verification Timing: N/A
Unavailable Agents: 无
Branch: codex/coverage-initializer-truth-r1（Codex独立工作树）
Revision: r1
Planning Base: 3f1b111d
Production Freeze: 57dda7ed2376fc25f07756be117bb4a058d09915

## 目标与范围

修复覆盖率合并器把“仅导入类”误报为“执行类方法”的缺陷；保留所有业务测试、范围和门槛。
此卡承接宿主卡STAT-1，**不是继续补业务覆盖率，更不是旧虚高基线的一次性下调许可**。
用户2026-09-23批准继续定位/推进；正式工具变更仍需三席build前签字。

范围内：版本锁定的合并器最小patch、工具回归、同输入统计对照和修复记录。
范围外：游戏/编辑器/内容产品、原测试断言、资源/存档schema、视觉/E2E/full/Q1/Q2、DEV-TOAST-1、
GLM战斗卡R1～R4返工；不因本卡关闭它们。不开上游issue/PR（需另获外部发布授权）。

## 前提真值门

一句话：函数位置相同不代表同一函数；V8类的静态与实例初始化记录必须保持不同身份。

| 维度 | 真值 | 一手证据 |
|---|---|---|
| primary source | Node22.19原生inspector给两个initializer同range、计数1/0；合并器仅以range当key | [12组原生复现](../../testing/coverage-initializer-probe.mjs):59-76/:123-136；安装树merge.js:79-86/:125-127 |
| 第一阶段 | N/A机制；此任务不判断原版游戏语义。game作为七包统计消费者仍需最终回归 | `scripts/coverage/config.mjs:105`七包清单；633文件AST盘点见机账 |
| 当前二阶段 | 旧1378、官方范围不变时client仅导入造成core 195/195；同raw保留initializer身份变158/195 | [诊断](../../testing/coverage-initializer-diagnosis.md)与[机账](../../testing/coverage-initializer-evidence.json)；core:104/:123；旧两个client套件 |
| 目标 | 不调用的方法不得从静态初始化继承正计数，真实调用仍计数；合并前后源/测试范围不变 | 最小样本actual0/0→stock2/experiment0；真调用1/1→两者2；本卡验收矩阵 |

最强替代解释：V8原始记录就错误，或remapper本身在不合并时也会虚报；原生副作用计数、单份转换0、
先转换后合并0、仅改key后0排除了本例的替代解释。**若独立复建无法见同range双身份/原计数，或修订清除了
真实调用/改了分母/依赖与范围，则counter**。其它V8盲点未一并排除，特别是字段自身归因不宣称完整精确。

四类根因排查：runtime语义/原版理解/提取解码均不涉及（无项目代码的样本亦复现）；test模型错误由真实
inspector、实际副作用与同raw多路径转换交叉排除。不是用大面积coverage红推测产品有错。

before→after：旧合并把两种initializer混为一个→分别保留身份再转换。没有玩家/编辑器行为改变。
用户不需要选择游戏政策；若需下调官方基线或扩大provider方案，停线单列裁决，不预先授权。

## 上下文

- AGENTS/CLAUDE/phase2 READ-FIRST；[宿主卡](TEST-RUNTIME-SHELL-COVERAGE-1-boot-menu-flows.md)STAT-1。
- Kimi窄审e7c4b743仅证明旧计数不可信，非本r1设计签字，三席不借用旧签。
- `@vitest/coverage-v8@4.1.7` provider:32-48 raw先合并、按ssr/client分组；`ast-v8-to-istanbul@1.0.5`同range优先级。
- `scripts/coverage/run.mjs:378-385/:499-518` provider可比性与只升不降门；不加豁免参数。
- 原7790/633冻结保持；宿主36项与GLM战斗包最终增量按同树并集去重。

## r1实施方案（2026-09-23三席准入）

1. 用pnpm版本绑定patch修`@bcoe/v8-coverage@1.0.2`的函数合并key：**仅**把两种initializer名称纳入
   身份；其它普通函数沿原range键，不把所有任意函数名都拼入（避免对命名差异引入新的不合并）。
   补丁通过正式pnpm patch/lock记录安装，不手改共享node_modules。Vitest/provider版本仍4.1.7，
   不切Istanbul、不重写provider。若review发现此方案不能保持计数/顺序合同，回draft修订。
2. 常驻`node --test`回归直接调用**实际安装**的merger/provider：原生零调用/正调用、静态/实例分离、
   2及3份合并、两种输入顺序、嵌套/匿名类、普通函数原合同、空输入/单输入；加真实Vitest两文件import-only
   夹具与使用类的正控，跨ssr/client验证。明确区分方法调用正确性与字段计数不完全归因。
3. 保存patch内容hash和安装验证；补丁缺失/错版本时工具回归必红。提交说明记录上游依赖与移除条件：
   上游提供等价修复、同组回归全通过后才能撤本地patch，不能静默升级或修改被测业务。
4. 同一旧1378及宿主1414分别按修前/修后重放。对633源码与测试身份、分母逐文件核验；旧计数修正与
   新测试收益分栏。另六包在最终官方门统一实跑，不拿本次AST盘点代替其实际统计。
5. 当前门按package/total比较，正式集成与已验证宿主增量同树后仍执行原只升不降check→ratchet→
   受保护单次strict-fast。**若任一包/总计不能通过原门，则停止登记为待裁决，不改比较器/不手写低基线**。
   不要求等GLM战斗返工才能审工具方案；是否同时纳入battle只看其独立接收是否通过。

## 精确白名单

- `patches/@bcoe__v8-coverage@1.0.2.patch`（pnpm生成时命名有机械差异须记录）、`patches/README.md`。
- 根`pnpm-workspace.yaml`或`package.json`仅pnpm patchedDependencies登记（二选一按当前pnpm生成）、
  `pnpm-lock.yaml`仅相关patch resolution；不升级其它依赖。
- `scripts/coverage/merge-initializers.test.mjs`及`scripts/coverage/fixtures/initializers/`新隔离fixture
  （运行时复制到/tmp执行，不扩大生产统计）。工具回归由现有coverage-tools glob自动收集。
- 本卡/诊断/机账与两个只读工具，必要board/index/README、覆盖率记录；官方baseline只能由最终ratchet生成。
- 禁改`packages/`、已有测试/全局timeout/exclude、ratchet比较器与CI放行规则；需要越界先counter修方案。

## 验收条件

- 原生最小反例先红后绿；实际安装补丁的负控制（撤patch）可复现0→2错误，不以内部复制逻辑自证正式安装。
- 方法0保持0、真正调用1/1合计2；initializer身份和两个计数都保留。顺序/多份/嵌套/普通函数无回退。
- 正式Vitest实际导入跨文件合同与原始执行见证同向；source/test集合、逐文件四维分母不缩。
- 解释本例37L/42S/2F/37B，其它文件变化逐条登记，不据本例做全量豁免。
- pnpm冻结安装可复建；check→ratchet→受保护strict串行，原门槛不降。尚未完成的宿主/战斗审查不借签。
- 旧版本兼容审查：本卡无产品兼容层；第三方版本绑定patch不属于游戏旧schema兼容。done前仍单列pass/counter。
- 视觉/E2E：N/A，仅测试统计工具，不操作玩家界面。

## 推进签字

### build前

- Codex：**premise verified / design agree（2026-09-23，r1）**。独立原生12组复现，旧1378 raw捕获，
  同数据单份转换/合并后转换/内存唯一key修订三向核验；原正式包四维与7790基线一致，实验修订分母不变。
  直接锚点为merge.js:79-86/:125-127和机账中12组actual/reported；可证伪观察与风险见上。
  实验不等于已安装修复；正式补丁/常驻回归待三签。
- GLM：**premise verified / design agree（2026-09-23，r1）**。独立复跑probe（本机v22.19.0）：12组
  rows与机账逐项一致，唯一反例both/import actual 0/0→stock合并2/实验0；valid/reject真实1+1在两种
  合并下均保留2；static-only/instance-only无幻影。同range双身份断言亲见（两记录counts [1,0]、
  start/end偏移相同；stock剩1条、实验保留2条）。直读安装树锚点：merge.js:120-127纯range键+
  :73-92分桶求和；provider.js:30-49先mergeProcessCovs再按environment转换；ast-v8-to-istanbul
  dist/index.mjs:427-434同面积取后序、:435-443按包含区间取count——整类正计数可传导到方法。
  三个保护哈希（merge.js/provider.js/baseline.fast.json）与机账一致，安装树未动。633盘点：baseline
  七包sourceFiles=633（shared11/content51/pal-extract38/migrate51/reforge131/game125/editor226）、
  testCount 7790冻结；本席复跑仅命中同两候选，core:104亲证both形状（static MAX_CALL_DEPTH/
  MAX_SYNCHRONOUS_STATE_TRANSITIONS+实例callDepth/running），declare/abstract排除、含static块属实。
  旧1378：capture钉baseline.packages.reforge.fastTests（146文件、断言testCount 1378）+官方
  include/coverageExcludes；capture的before四维与冻结官方reforge基线完全相等（14599/8759、
  16737/9710、2539/1542、11359/5913）。37/42/2/37：script-runner-core文件级差额（195→158、
  208→166、18→16、141→104）与包级差额逐维相等，script-runner.ts四维不变，lostLines[0]=123与
  宿主卡":123旧计2/真实0"互证，分母全不变。设计压测：仅两种initializer名加前缀不可能与纯数字
  range键冲突、不改普通函数合并合同；矩阵含static/实例分离、2及3份、双序、嵌套/匿名类、空/单输入、
  普通函数合同、真实Vitest跨ssr/client夹具与正控——对本缺陷无遗漏承重形状。白名单闭合实证：
  `package.json:10` node --test scripts/coverage/*.test.mjs自动收集新回归；run.mjs:378-385
  provider可比门、:499-518只升不降/ratchet/protected链亲读未降。边界披露诚实（633盘点≠完整性、
  另六包未测、字段归因不完全）。非阻塞观察：(a)机账sourceCensusSha256配方未记录，独立方无法
  逐字节重算（逐文件依赖哈希可复现），建议补记配方；(b)合并键对所有函数忽略functionName，其它
  同span对（如get/set访问器）理论上同样坍缩——在本卡"其它V8盲点未排除"披露边界内，建议另开
  探针卡勿扩本卡；(c)最终官方门取决于与宿主增量同树并集，失败路径保持待裁决、不改比较器/不手写
  低基线——正确处理，不得演变成基线下调捷径。可证伪观察成立：本席独立复建亲见同range双身份与
  原计数，修订未清真实调用、未动分母与范围。
- Kimi：**premise verified / design agree（2026-09-23，r1；probe 与 1378 离线重放本人复跑，merge.js 本人直读，未读 GLM 本轮结论；e7c4b743 窄审不代本次签字）**。
  - **同 range 双 initializer 身份冲突直读**：安装树 `@bcoe/v8-coverage@1.0.2/src/lib/merge.js:79-86`
    的 `stringifyFunctionRootRange` 只拼 `startOffset;endOffset` 作 key——两个合成 initializer 必然
    并键；合并后 functionName 取首条（:146-169 区域）。本人复跑 probe 12 组全 exit0：
    `both/import` actual 0/0 → raw0/raw0/**stock 2**/experiment 0（幻影复现）；
    `both/valid` 与 `both/reject` actual 1/1 → stock 2、experiment 2（真实调用不清零）；
    其余 9 组两者一致。三类形状×四操作的对照链闭合。
  - **项目级闭环（离线重放，未重跑测试）**：对既有 1378 raw 捕获 `--replay` 复算——
    script-runner-core 195/195→158/195，包合计 8759L→8722L/9668S/1540F/5876B，
    分母 14599/16737/2539/11359 不变，script-runner.ts 不变——37L/42S/2F/37B 差额与宿主
    before/after 完全吻合，可由合并缺陷充分解释；158 不被绝对化为逐行真值。
  - **最小 patch 方案同意**：仅把两种 V8 合成 initializer（`<static_initializer>`/
    `<instance_members_initializer>`，非合法 JS 标识符、无用户函数碰撞面）纳入合并 key，
    普通函数保持纯 range 键——不引入「命名差异不合并」的新风险；回归矩阵含两种输入顺序/
    2 与 3 份合并/嵌套与匿名类/普通函数原合同/空单输入，残余风险面覆盖到位。
  - **安装与回归纪律同意**：pnpm patchedDependencies+lockfile、补丁 hash+安装验证、
    回归调用**实际安装**的 merger/provider（非内部复制自证）、撤 patch 负控可复现 0→2、
    上游等价修复+回归全绿才准撤 patch；白名单闭合（patches/、workspace 或 package.json
    二选一、lockfile 仅 patch resolution、单测+隔离 fixture、文档）——不碰 packages/旧测试/
    超时/排除/比较器。
  - **门槛纪律同意**：修前/修后同树重放旧 1378 与宿主 1414、逐文件四维分母核验、旧计数
    修正与新测试收益分栏、另六包在官方门实跑；任一包/总计不过原只升不降门即停线待裁决，
    不改比较器、不手写低基线——防止把真值修复当成一次性下调许可。
  - **可证伪观察**（任一成立即 counter）：① 补丁把非 initializer 命名函数纳入 key 致普通
    同 range 函数不再合并；② 撤 patch 负控不复现 0→2；③ 重放出现分母变化或 script-runner.ts
    等无关文件计数变化；④ 任一真实调用样本计数被清零；⑤ 原门未过却被手改基线放行；
    ⑥ 上游版本漂移时补丁静默失效（安装验证应红而未红）。
  - 返工项：无。
- 非Owner独立反证：已完成；Kimi49269a61及GLMdefd960e分别核实际依赖/原生12组与同raw对照，直接锚点与可证伪观察见各席。旧e7c4b743不代本次新根因签字。
- 缺签豁免：无。
- build准入：**build allowed（2026-09-23，Codex统一核定，准备候选2fcf57d7/r1）**。Codex原签、Kimi49269a61、GLMdefd960e同r1均premise verified/design agree，无counter/缺签豁免。用户确认签字；仅授权原白名单版本绑定patch与工具回归，官方门不降。GLM三条非阻断观察保持：补census配方、其它同span盲点不扩范围、原门失败停线。

### done前

- Codex：**accept（实施者自验，2026-09-23，统一候选b6286df0，非独立审查）**。实际安装patch的10项回归全绿，未修版同3条业务AssertionError重现；空目录冻结安装/真实路径hash通过。旧1378与宿主1414四格对照分母/身份不变，37/42/2/37误报修正已分栏；633生产文件与57dda7ed一致。统一check8317+coverage-tools27/ratchet7826/保护c5569d1a的单次strict7826全exit0，其余六包基线对象不变、无降门。实现与风险见诊断文末/机账implementation。旧版本兼容审查：pass（无产品兼容新增，仅版本绑定第三方修复）。
- Kimi：**accept（2026-09-23，统一候选b6286df0；全部锚点本人直读/本树与隔离树复跑，未读 GLM 本轮结论）**。
  - **实际安装 patch**：`@vitest/coverage-v8@4.1.7` 的 `@bcoe/v8-coverage` symlink 指向
    `1.0.2_patch_hash=2f8a8ecf…`（内含 static_initializer 判定 ×1）；补丁仅给两种 V8 合成
    initializer 加身份前缀，普通函数保持纯 range 键；根 package.json 仅 patchedDependencies、
    lock 仅 patch resolution 三处登记。
  - **10 项回归（本席复跑全绿）**：node --test 10/10——含原生四态×5 类与普通函数、二/三份
    双序、嵌套/匿名、空/单输入，及真实 Vitest 两个 ssr+两个 client 只导入与真正调用正控。
  - **撤 patch 三业务红（本席独立复现）**：`git archive c5569d1a`→冻结离线安装（未打补丁
    merger）→复制同测试/fixture 跑 3 条——native import/same-range static/real Vitest
    import-only 全 not ok、exit1。证明是**实际安装的补丁**修复，非内部复制逻辑自证。
  - **四格对照（既有日志逐项核）**：旧 1378 未修 8759/9710/1542/5913 → 已装补丁
    8722/9668/1540/5876（patchHash 一致）；宿主 1414 修前修后均 10374/11430/1750/6712；
    四格分母全部 14599/16737/2539/11359 不变。37/42/2/37 统计修正与宿主 36 项真实收益
    （修正口径 +1652L/1762S/210F/836B；旧口径 +1615L/799B）分栏正确，不互相冒充。
  - **门禁**：check8317+coverage-tools27/ratchet7826/保护 c5569d1a 单次 strict7826 采信
    Codex 已落日志，本席未并发重跑官方覆盖率；最新 main CI：Documentation 绿、ratchet
    在途（评审时点）。基线 7790→7826 仅 +36 宿主项，另六包对象不变。
  - **旧版本兼容审查（单列）：pass**——第三方版本绑定 patch，无产品兼容层/升级器；
    上游等价修复+回归全绿才准撤 patch 的移除条件在册。
  - 返工项：无。类字段逐语句精度/其它 V8 盲点如实不担保。
- GLM：**accept（2026-09-23，统一候选b6286df0；证据全部本人独立复建。共享工作树发现另一席
  未提交改动，为避免吞没其编辑，本席在同分支tip的临时worktree落卡推送；其后其块抢先落远端，
  push竞态rebase解冲突机械保留双方、必然接触其已落文本——本席全部复跑与结论在此之前独立完成）**。本机复跑`node --test
  scripts/coverage/merge-initializers.test.mjs` 10/10绿，矩阵与设计逐项对应（安装/锁校验、
  原生四态×5形状+普通函数、2/3份双序、混合调用、initializer身份/计数、异名同range普通函数
  原合同、空/单输入、真实Vitest ssr+client导入报0与正控报2）。patch内容=设计签字原案（仅两种
  initializer名加前缀、普通函数range键），SHA-256与机账一致；package.json仅patchedDependencies、
  lock diff恰3处登记；实际安装目录`@bcoe+v8-coverage@1.0.2_patch_hash=2f8a8ecf…`且其merge.js:126
  含补丁源码；spessasynth保持4.3.20，无搭车升级。撤patch负控设计核实：git archive c5569d1a冻结树
  +冻结安装+同一测试文件（SHA相等）跑3条业务反例全AssertionError exit1，未动共享node_modules、
  未以复制合并器逻辑自证；机账frozenReplay与exactSameTest双路记录。四格：旧1378
  8759/9710/1542/5913→8722/9668/1540/5876（-37/-42/-2/-37，设计轮已离线复算同值）；宿主1414
  修前=修后=10374/11430/1750/6712；修正口径净增+1652/1762/210/836、旧官方口径+1615/1720/208/799，
  两组差值恰为37/42/2/37——统计修正与补测收益分栏成立。基线ratchet亲核：7790→7826仅reforge
  +6文件+36项（新增文件=白名单六文件，战斗卡用例未混入），633 sourceFiles与另六包
  files/tests/metrics逐项不变，reforge新基线=四格并集值；基线相对旧官方口径上调、原门通过，
  未改比较器/未手写低基线。633生产文件对57dda7ed逐个hash一致（本席全量核验）。GLM(a)配方已补于
  诊断:99，本席按其复算sourceCensusSha256完全一致（633行[路径,文件字节SHA-256]紧凑JSON.stringify）；
  (b)其它同span盲点未扩、(c)原门不降均落实。门禁：机账记录check8317+coverage-tools27、保护
  c5569d1a的ratchet7826与单次strict7826全exit0；本席亲见候选树CI（525c40cd=b6286df0+纯文档）
  Coverage ratchet跑至success。旧版本兼容审查：pass——24个非docs变更文件关键词扫描仅命中
  测试标签'legacy'（产品拒绝旧试放路径的断言）与patch README移除条件说明，无版本分支/fallback/
  upgrader/双读双写。非阻塞备注：机账/tmp与/var/folders证据日志易失，但核心数字、配方与两条定向
  命令均可独立重算重跑，不受影响。
- done准入：blocked（GLM/Kimi同候选实现审查pending；不以设计签字代验收）。

## 交接日志

- 2026-09-23 Kimi（独立终审）：对统一候选b6286df0签 done 前 accept，单列旧兼容 pass。
  实证：provider symlink 指向 patch_hash 目录（实际安装）；node --test 10/10 绿；本席独立
  git archive c5569d1a 冻结安装未打补丁树，同 3 条测试全 not ok/exit1（撤 patch 负控复现）；
  四格 1378 8759→8722/9668/1540/5876、1414 两格相同、分母全不变。check8317/ratchet7826/
  strict7826 采信 Codex 日志，未并发重跑；CI Documentation 绿、ratchet 在途。统计修正与
  真实收益分栏正确。未读 GLM 本轮结论；未改实现/他席/状态，不标 done。
  Next：GLM 同候选 accept 齐后 Codex 核 done 门。

- 2026-09-23 GLM（r1实现终审）：统一候选b6286df0独立审毕，签done前accept（证据见本人块）。
  复跑两条定向：merge回归10/10绿、宿主mutants control36+8针全业务红；另核patch实际安装/lock
  恰3处/撤patch冻结负控、四格与基线+36、633对57dda7ed零改、GLM(a)配方复算一致、候选树CI
  ratchet success、兼容扫描干净。共享工作树存在另一席未提交改动，故在同分支tip临时worktree
  落卡推送，不动共享树；push竞态rebase机械保留双方（Kimi结论不在本席证据链内）。战斗卡返工
  独立，其用例未计入7826。

- 2026-09-23 Codex（r1实施→review）：候选b6286df0，patch提交bb0e3c3e、联合宿主树e0803d6e。两个冲突文档按并集保留全部历史签字/日志。官方三门串行一次通过，基线7790→7826仅新增宿主36项，源633不动，其余六包完整对象相同。本人签实施者accept；GLM(a)配方已补、(b)其它同span理论盲点不扩、(c)原门不降落实。两卡分开审，战斗返工未纳入，不代签、不done。

- 2026-09-23 Codex（build准入）：同步defd960e后核工作树干净与同r1三席直接证据，签字齐且无counter。本席统一转build，独立工作树实施实际安装补丁/原生与Vitest常驻回归；不借统计修复覆盖宿主验收或GLM战斗返工，不降低基线。

- 2026-09-23 Kimi（r1 独立根因/修补方案审查）：签 premise verified / design agree，无返工项。
  直读安装树 merge.js:79-86（key 仅 range 起止，合成 initializer 必并键）；复跑 probe 12 组
  exit0（both/import 0,0,2,0 幻影复现；valid/reject 1,1→2 真实调用保留）；离线重放既有
  1378 raw 捕获 exit0（core 195→158、包 8759L→8722L、分母不变、script-runner.ts 不变）。
  方案核：仅 initializer 纳入 key（无标识符碰撞面）、矩阵含顺序/多份/嵌套/普通函数；
  安装=pnpm patch+lock+hash 验证、撤 patch 负控 0→2、实际安装回归；原门不过即停线待裁决，
  不许手写低基线。六条可证伪观察入席。e7c4b743 仅证旧计数不可信，不代本次签字。
  未读 GLM 本轮结论；未实施 patch/未改依赖/基线/状态。
  Next：三席齐后 Codex 统一核 build。

- 2026-09-23 Codex：用户同意继续；先推送既有Kimi e7c4b743到宿主分支，然后只读定位合并器同range冲突。
  12组原生、旧1378正式范围raw捕获和同raw实验复算通过；633文件两类形状盘点，未改产品/依赖/官方基线。
  新建本draft与复建工具；按协议并行请两席独立审r1，宿主卡仍build、GLM战斗仍rework。

- 2026-09-23 GLM：r1独立审毕，签premise verified/design agree（证据见本人build前块）。本机复跑
  probe 12/12与机账一致；直读安装树merge/provider/remapper锚点；633盘点、旧1378官方范围等值、
  37/42/2/37逐维核验、白名单glob与门槛链均实证。留三条非阻塞观察（census哈希配方、get/set同span
  盲点另卡、最终门失败走待裁决不降门）。未读Kimi本轮结论；未改工具/patch/基线/他席块/共享状态；
  未签accept/done。战斗卡TEST-BATTLE-WORKFLOWS-1返工独立，本席不借统计缺陷豁免其业务反例。

## 下一位Agent提示词

### 当前：给Kimi（与GLM并行，两卡分别裁决）

在 /Users/zhangxu/illegal/type-pal-coverage-truth 同步codex/coverage-initializer-truth-r1，独立终审统一候选
b6286df0的两卡r1：本卡TEST-COVERAGE-TRUTH-1与TEST-RUNTIME-SHELL-COVERAGE-1（均review，设计不重签）。
先核工作树/读AGENTS、CLAUDE、READ-FIRST、两卡与docs/testing/coverage-initializer-diagnosis.md文末、
codex-runtime-shell.md及两份机账；不读GLM本轮结论。核实际pnpm patch/lock/安装hash、10回归与撤patch
三条业务红、旧1378/宿主1414四格/37L修正与收益分栏；宿主六组真实boot/loader/codec/store/runner、实际
输入快照、异步finally同一Promise、白名单和8负控。必要复跑node --test scripts/coverage/merge-initializers.test.mjs
与node docs/testing/codex-runtime-shell-mutants.mjs；官方check8317/ratchet7826/受保护strict7826已有证据，
不并发重跑。633源不变、其它六包基线对象不变，原诊断probe只在未修7790冻结树重放，别在新基线上误判。
分别签本人accept或counter与旧兼容审查/直接证据、日志，提交推送此分支；只改本人席位，不代签、不改
状态/产品/基线、不标done。DEV-TOAST-1、真实视觉/full/Q1/Q2、GLM战斗返工都不随本次关闭。

### 当前：给GLM（与Kimi并行，两卡分别裁决）

在同一worktree/分支独立审统一候选b6286df0的上述两卡r1 review。先同步核工作树，读AGENTS/CLAUDE/
READ-FIRST、两卡与诊断实施节/宿主回执及机账，不读Kimi本轮结论。重点核10工具回归的真实调用与双序/
多份/嵌套/空单输入/普通函数矩阵、实际安装和撤patch红因、修前修后四格与基线36增量；宿主H1～H6的
9/4/7/8/5/3项、合法fixture/实际输入保真、真实IO门/异步收口、8针钉名业务红、回执与树一致。
可复跑两条定向命令；不跑浏览器/视觉、不并发重跑官方覆盖，不借旧STAT-1或设计签字代实现审查。
两卡分别在本人done前席位签带证据accept或counter、旧兼容审查与日志，提交推送当前分支；不改他席/
状态/实现/基线，不代签、不标done。战斗返工独立，不把其用例算入7826。

### 历史给Kimi：设计（已完成）

在 /Users/zhangxu/illegal/type-pal 独立审 TEST-COVERAGE-TRUTH-1 r1 draft，卡
docs/ops/tasks/TEST-COVERAGE-TRUTH-1-class-initializers.md。先同步main/核工作树，读AGENTS/CLAUDE/
READ-FIRST、卡与docs/testing/coverage-initializer-diagnosis.md/机账；不读GLM本轮结论。
你先前e7c4b743不是这次修复设计签字。独立跑node docs/testing/coverage-initializer-probe.mjs，
必要时capture（也可先复用raw离线重算）；直接读实际安装merge/provider/remapper，核同range双身份根因、
仅initializer区分key是否足够、计数/输入顺序风险、正式patch的可重复安装与回归方案。
写本人带锚点premise verified/design agree或counter与日志、提交推送main；只改本人块，不代签/改状态，
不实施patch/官方基线，不签整卡accept。与GLM同r1独立审，三席齐后Codex统一核build。

### 历史给GLM：设计（已完成）

在 /Users/zhangxu/illegal/type-pal 独立审同卡 TEST-COVERAGE-TRUTH-1 r1 draft。先同步/核工作树，读
AGENTS/CLAUDE/READ-FIRST、本卡、诊断与机账，不读Kimi本轮结论。直接跑最小probe，核12组实际调用/计数、
633文件形状盘点边界、旧1378文件选择与官方范围一致、37/42/2/37差额、script-runner不变及另外六包未测披露。
重点压力测试矩阵是否漏静态/实例/两序/多份/嵌套/真实调用、白名单是否闭合、无降门/假正控/越界。
写本人带直接证据premise verified/design agree或counter及日志、提交推送main；只改本人块、保留他席，
不改工具/patch/官方配置基线/共享状态，不代签，不签accept或done。战斗卡返工独立，不借本卡豁免。
