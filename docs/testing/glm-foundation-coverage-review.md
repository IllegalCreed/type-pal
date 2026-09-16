> 最新结论（2026-09-17，c0c94333）：上一轮删除/槽位/对象视图/Biome问题已闭；仅R2输入快照浅拷贝仍阻断，另有回执勘误。
> 详见文末「返工复核」。以下01c149b5首轮counter完整原文保留，不表示已修部分仍需重做。

# TEST-FOUNDATION-COVERAGE-1 · Codex r1接收复核

2026-09-16；候选`01c149b5d55a53dd755412c54077b3ab39b564c3`，分支`codex/glm-foundation-coverage-r1`，分叉/开门点`648b4086`。
主线复核树`90d2b877`；产品冻结`d64bbf6d`。任务：[四包基础边界](../ops/tasks/TEST-FOUNDATION-COVERAGE-1-core-boundaries.md)。

**结论：counter，暂不集成测试/fixture，不跑官方ratchet或改基线，不转Kimi终审、不标done。**
四组已有有效贡献与原8负控保留，不要求推倒重写；r1设计不变、不重签。GLM是测试Coding Owner，补齐下列R1～R4后交Codex接收。
本文由Codex独立读取提交树、复跑并构造额外坏实现；不以GLM回执作为独立第三方证明。
卡顶部仍为build，本席仅写counter/交接，Coding Owner接手据counter核定rework，不代写其自验结论。

## 已核通过与实测口径

- 远端HEAD与候选相同，GLM worktree干净；新增产品/既有测试/配置/基线改动均为0，原探针未改。
- 相对648b4086实际增量为**15测试+3 fixture+2文档/诊断文件=20文件**，不是交接的12+4+2。
  测试3+6+3+3；fixture为shared/content/pal-extract各1。pal-extract fixture路径另见R1。
- 通过四包正式定向命令：shared 28、content 69、pal-extract 15、migrate 21，共133项。
  migrate使用原`vitest.config.ts --project unit`；四包`tsc --noEmit`均exit0。
- 直接复跑`node docs/testing/glm-foundation-coverage-mutants.mjs`：4正常对照exit0、8单点负控exit1；
  独立读各日志确认实际业务红因，全部有load命中且8个被替换源码文件hash前后一致。
  YJ2改字面输出的反控有效，未把溢出输出缓冲导致无差异的长度突变算红；plan增加独立净改文件后**写入**反控有效，删除侧仍缺，见R2。
- 旧版本兼容审查：本批产品零修改，无新升级器/版本分支/旧输入支持；`legacyThing`与旧battleSprite字段用例是拒绝测试，地图v4是当前地图格式，不是内容旧版本。pass。
- 未跑浏览器/视觉，测试包不需视觉；未运行提取、真实迁移或改工程/资产。

### 覆盖对照独立复算（认可，不返工算法/数字）

在同一个候选worktree，以相同include/既有测试集before、after仅加本批，报告只写本人tmp：

| 局部范围 | before→after行 | before→after分支 | 实际测试 |
|---|---|---|---|
| pal-extract三解析器 | 0/215→197/215 | 0/48→42/48 | 18文件130通过+3既有skip → 21文件145通过+同3skip |
| migrate三个纯核模块 | 269/292→272/292 | 318/376→325/376 | 37文件314通过 → 40文件335通过 |

pal两侧同排7个缺资产文件；migrate两侧同排`.pal.test.ts`及官方`migrateCoverageFastTestExcludes`，数字与回执相符。
pal局部7排除**不是官方fast的11排除**；report已限定局部，不能把本表搬成全包或官方fast。
3个skip属于原资产域`rng-frames.test.ts`，不是新增测试；部分旧测试还有缺资产早return，不作为本批新增有效覆盖。
回执须补全可重建命令/配置、实际测试清单与skip，而不只依赖机器外的临时目录，见R4。

## R1 · 最终树质量门与交付账不符

- `docs/testing/glm-foundation-coverage-receipt.md:89`写“改动文件Biome 0 error”；本人对候选19个新增代码文件运行：
  `git diff --name-only --diff-filter=A 648b4086 01c149b5 -z -- packages docs/testing/glm-foundation-coverage-mutants.mjs | xargs -0 pnpm exec biome check`，
  实际**exit1，27 errors、1 info**，包括格式与import整理；未执行`--write`替GLM修文件。
- 同回执:30-31的B逐文件数字20/8/6/30/12/8相加为84，却写69。实际是：
  StartWorld20、Actors6、AuthorItems4、SkillsPoisons21、AuthorScript9、EnemyScript9=69。总133正确，逐文件回执需更正。
- 交接文件数需按实际清单更正；pal fixture目前在`src/resources/parsers/__tests__/glm-foundation-fixtures.ts`，
  不在卡面`src/__tests__/glm-foundation-fixtures.ts`精确白名单。移回原白名单并调整新测试import，不移动既有文件。

返工：只格式化/整理本人文件；复跑Biome/typecheck/定向，从最终树现场生成计数与SHA，不抄前轮口径。
这不是要求增加测试条数；也不允许为修格式扩散到产品或既有测试。

## R2 · D组部分断言并未证明声称的合同

### 冲突时禁止删除：真实坏实现存活

`packages/migrate/src/migration-plan.boundaries.test.ts:74-105`只有冲突文件a和净写文件b，没有本应删除的文件。
因此`deletes=[]`不证明冲突删除门有效。Codex将产品`migration-plan.ts`中唯一删除循环从`if (!conflicts.length)`移出，
仍保留写入门（仅一次连续文本替换），**本批D组21/21仍绿，load命中已证**。

同一真实函数的独立输入：base={a:v1,delete:v1}、ours={a:v2,delete:v1}、theirs={a:v3}：
原实现1冲突、deletes=[]；坏实现1冲突、deletes=[content/delete.json]。这是测试鉴别力缺口，不是产品当前会错误删除。
补一个确实可删除的第三文件，并用消除冲突的同fixture正控证明正常时会删除；删除侧独立单点负控应红。

### 自比较与“缺席”替身

- `migration-plan.boundaries.test.ts:172-175`把`sha256(serializeMigrationJson(v4map(),mapFile))`与同一表达式比较，
  并注为“字节合同直证”，这是恒真自比较。改为独立预期字节/不同构造值之间的等价与非等价对照，或明确复用已有具体证据；不得保留该证明说法。
- `migration-baseline-pure.boundaries.test.ts:55-60`比较的是`null`和`{a:null}`，**两者都存在**，没有构造缺席文件或snapshot。
  这不证明卡面D5的absent/null与metadata/write-map对应。用纯snapshot/baselineState/baselineWrites实际结果核对；
  已有用例覆盖者列准确测试名，不复制已有磁盘链来冒充新的纯函数测试。
- `migration-plan.boundaries.test.ts:107-117`只保存/比较base.files，并未验证ours/theirs、managedFiles或hashes不变，
  收窄标题/回执或补三输入的完整快照比较；不能继续称全部输入未变。

## R3 · C2槽位完整性未被钉住；C3明确范围不接受无依据后置

- `packages/pal-extract/src/resources/parsers/__tests__/player-roles.boundaries.test.ts:30-33,53-56`只往装备第0行、
  仙术第0行放值，断言只取`slice(0,1)`。分别只将生产`equipment: equipRows.map`或`magic: magicRows.map`
  改为`rows.slice(0,1).map`，**本批C组各15/15仍绿、load实际命中**。
- 独立合法900B/MKF fixture在角色2的装备第5行放123、仙术第31行放456；原实现长度6/32且尾值123/456，
  对应坏实现变长度1并丢值。补不同角色×非首/末槽的非对称标记与完整数组长度/值断言，保留角色3/4名称映射反控。
- `glm-foundation-coverage-receipt.md:56-57`将object poisons/players后置的理由只有“分支较少”，不构成阻断。
  两导出位于`spells.ts:212-265`，只是14B字段映射/尺寸门，现有fixture已可构造。
  `resources/tables.test.ts:283-335`已有局部合成断言，但套件收集依赖原盘且不进fast；不能说完全没有已有证据，也不能以此省掉本卡自包含补强。
  在白名单spells测试中补非空字段/ID/合法尺寸和截断边界，已有部分按确切断言去重。

## R4 · 分类、去重与可重建证据补齐

- 卡要求A1～A3/B1～B6/C1～C3/D1～D5逐族分类；目前“新增=上表全部、已有=文件头注记”不足以对账：
  D5未证部分、C3未做部分、B中声称复用的组合测试等应逐族列具体测试名/锚点或明确待证，不用模块名笼统代替。
- shared既有`rng.test.ts:43`已有连续帧基面测试、:54已有空chunk；新连续帧加入全缓冲未触字节断言有增量可保留，
  新空chunk与既有相同且无增强，应删新增重复项而不改旧用例。回执“此前未直测”/不重复类说法须限定到实际未测路径。
- 负控实际红因更正：`merge-same-ours-theirs-removed`红的是ID数组新增同a时的无冲突断言，
  并非对象“同改同值”用例；后者有递归叶级快径保护。负控有效，但证据归因须准确。
- 补可重建覆盖配置/完整命令/明确exclude与测试文件清单、每次失败的命令/exit/原因。
  当前pal/migrate最终数字已被独立复算认可，不要求无变化地反复跑，也不把前三版临时配置失败藏成一次成功。

### 三项待证裁定

1. YJ2树归约：**可另列后续独立解码向量工作**，不要求为本批在fast中堆高资源流或复制解码器。记录实际尝试/有界输入风险/未覆盖范围，不称不可构造。
2. YJ2空窗回引：**可保留合法输入合同待核**，先判其是否属于损坏流、原格式是否有定义；不为分支率固定JS越界零值为正确合同。补尝试/下一步，非本批产品修复授权。
3. C3对象视图：**不接受仅因分支少而后置**，按R3本轮补齐；若具体合同真的不明，带一手证据再报告，不能直接标整组完成。

上述是接收边界裁定，不代表全仓覆盖目标或三项全部完成，更不扩大成解码器产品修复。

## 额外见证复建与执行记录

工作目录`/Users/zhangxu/illegal/type-pal-glm-fc1`始终HEAD=01c149b5，前后worktree干净，磁盘产品零改。
临时证据`/tmp/codex-foundation-review.G53t4a/`：`*-direct.log`、`typecheck.log`、`biome.log`、
`mutants.json`/`mutants-progress.log`、`cov-*-{before,after}.log`及各coverage报告；原8负控日志另在JSON中的`logs`路径。

额外三见证入口`witness.config.mjs`与`witness-oracle.mjs`，选择`FC_REVIEW_CASE=deletes|equipment|magic`：

```sh
FC_REVIEW_CASE=deletes pnpm exec vitest run --config /tmp/codex-foundation-review.G53t4a/witness.config.mjs --reporter=verbose
FC_REVIEW_CASE=deletes node /tmp/codex-foundation-review.G53t4a/witness-oracle.mjs
FC_REVIEW_CASE=deletes FC_REVIEW_MUTANT=1 node /tmp/codex-foundation-review.G53t4a/witness-oracle.mjs
```

equipment/magic同入口换case。若tmp消失，可按以下唯一替换重建Vite `enforce:'pre'` load钩子（磁盘不写）：

- deletes：将`for (const file of physicalManaged) if (ours.files.has(file) && !normalized.has(file)) deletes.push(file)`
  从`if (!conflicts.length)`尾部移至其闭括号之后；只移动删除循环，不改writes。测试include=`src/migration-*.boundaries.test.ts`。
- equipment：`equipment: equipRows.map((row) => row[i]!),` → `equipment: equipRows.slice(0, 1).map((row) => row[i]!),`。
- magic：`magic: magicRows.map((row) => row[i]!),` → `magic: magicRows.slice(0, 1).map((row) => row[i]!),`。
  C两针include=`src/resources/parsers/__tests__/*.boundaries.test.ts`。

每针先断言源点唯一、打印load命中，原实现业务对照与坏实现结果分别断言。三个坏实现的候选测试仍绿是本轮counter证据；
返工后的测试应变业务红。Oracle当前exit0表示“确实观察到预期正确/错误差异”，不意味着坏实现正确。
本人的oracle首跑6次因migrate未直接声明vite而MODULE_NOT_FOUND，未计证据；改由vitest声明的依赖解析vite后六次完成，产品/测试未改。

## 集成与下一步

暂缓整批合并和官方check/ratchet/严格fast；已知27个Biome错误足以挡check，无需浪费全仓运行再次证明。
R1～R4闭环后Codex先核差异、定向/负控及待证归属，再合入最新产品树，串行完整check→官方ratchet→受保护单次严格fast。
无产品漂移时不重签r1；最终Kimi终审披露GLM测试贡献和Codex适配/复核边界。本轮不转Kimi、不代签、不标done。

## 返工复核 · 2026-09-17 · c0c94333

候选`c0c9433333037f35da1fd36042cc647d6538f338`，远端与GLM worktree HEAD一致且干净；返工基点8126f5c0。
**结论：counter收窄到R2剩余一个断言缺口，不重开已核通过项；尚未合入，官方check/ratchet/严格fast不抢跑。**
本轮main只更新Codex自己的复核、日志和导航；GLM测试/fixture/产品/基线零修改，r1设计不重签。

### 本轮已核通过

- R1：19个新增代码文件Biome exit0，pal fixture已回`packages/pal-extract/src/__tests__/glm-foundation-fixtures.ts`；
  对共同基点8126f5c0的增量恰15测试+3fixture+2文档/诊断，既有测试/产品/配置/基线/原探针零diff。
- 定向A27/B69/C19/D24=**139/139**；四包typecheck均exit0。
- 相邻：shared 106、content 557、pal 149通过+原3skip、migrate 338通过；不是把这些重复相加为全仓唯一测试数。
  pal仍按两侧同样7资产文件排除，migrate用原fast排除的unit临时配置；未宣称跑全包真实资产或正式全仓门禁。
- 4正常对照exit0、11负控exit1，逐日志核业务红；8个突变目标源hash前后一致。
  另独立使用上一轮Codex的**原始删除循环外移/装备截断/仙术截断**配置重跑，三针均业务红，
  而不是只采信GLM本轮新负控（其删除针是额外追加去重删除循环，业务效果等价但不是原样移动循环）。
- R2删除门：fixture确有可删除文件；无冲突正控产生精确delete列表。真absent/null、metadata/write-map三向对应和hash自比较替换均已落实。
- R3：角色装备6/仙术32完整数组含跨角色末槽标记；poisons/players两个对象视图已有非空映射和尺寸边界，C3不再后置。
- R4主要内容：重复空输入用例删除，逐族表已补，merge反控红因已更正。YJ2两项后续归属继续接受，
  不是本批完成或“不可构造”，不为覆盖率强行固定损坏流的JS越界行为。
- 旧版本兼容审查：pass；没有新增旧输入支持/产品fallback，当前地图v4不是旧content版本。无视觉任务。

### 唯一剩余代码阻断：R2的before并不独立

候选`packages/migrate/src/migration-plan.boundaries.test.ts:103-112`：

```ts
const cloneSnapshot = (s: typeof base) => ({
  files: [...s.files],
  managedFiles: [...s.managedFiles],
  hashes: s.hashes ? [...s.hashes] : undefined,
})
```

`files`数组仍引用原Map中的对象。后续原地改值时，`before.base/ours/theirs.files`也一起变化，
所以:116-118的三侧比较会把输入污染判成未改变。相较旧实现，复制范围扩大了，但没有保留深快照。

Codex独立单点见证：在真实`createMigrationPlan`首个`const baseView = canonicalSnapshot(base)`之前，
分别仅对base、ours或theirs的`content/a.json`值写入`v=17`。原函数正常对照绿；每种坏实现在候选该用例中仍绿。
为避免只看到load命中却没实际执行，本轮在临时测试转换中**仅追加观察断言**（原四个断言原样保留）：
确实读到该输入v=17及由实际写入语句设置的全局见证标记；三针均通过这两个观察断言，同时原“不变性”断言仍绿。

同一个坏实现只将测试before改为`structuredClone({base: cloneSnapshot(base), ours: cloneSnapshot(ours), theirs: cloneSnapshot(theirs)})`，
三针都在对应输入不变性断言业务红（`expected false to be true`）；深快照+无产品突变对照仍绿。
这只证明**测试漏检**，不是发现当前产品真的修改输入；没有修改磁盘源或替GLM落实现。

修复要求：保存真正独立的深快照，三侧JSON嵌套值、files/managedFiles/hashes都保留；把这类输入原地污染反控永久化。
保留当前已通过的139项/11针，其余R1/R3不重做；不允许只把标题改成“浅容器不变”规避本卡D3纯输入合同。

### 随手收尾的回执勘误（不重新开设计）

- 冻结SHA有笔误，正确完整值为`d64bbf6d2817ba971ae2bd3bbe9a24f3870e7e86`，不要手工缩写拼错。
- D组现场逐文件是**merge8/plan8/baseline8=24**，不是11/8/5；逐族表同步更正，合计139本身正确。
- 交付20文件应以`git diff --name-status 8126f5c0 <最终候选>`的独有增量计；
  不能用`--diff-filter=A 648b4086`声称包含修改过的receipt且不包含后来合入的其它文档。
- 回执覆盖表是首轮133项时的测量，**不是返工139项的当前结果**；C3新增两导出、D5新增纯辅助后不得援引“Codex已认可数字，不重跑”混用时点。
  可保留为明确的01c149b5历史快照，最终整合由Codex官方测量，不要求无变化的A/B反复计量。
- 当前所谓“可重建命令”含`[...]`、`...`、`<tmp>`且省略migrate实际配置。补实际可复制命令和配置/白名单内诊断入口，
  或明确给出已入仓配置的调用方法，不能把伪命令说成已可直接重建。
- baseline新测试已确实证明absent/null；旧`null`与`{a:null}`基础字节用例标题仍带“缺席”，更名为真实两输入即可，不删新增业务证明。

### 本轮复建证据

日志根：`/tmp/codex-foundation-r1-rework.KtFIPX/`。定向`*-direct.log`、相邻`*-adjacent.log`、`typecheck.log`、`biome.log`、
`mutants.json`（含各针原始日志路径）；原三见证`original-{deletes,equipment,magic}-witness.log`。
剩余R2诊断：`immutability.config.mjs`，只做Vite内存load替换，不写产品；`FC_IMMUTABLE_AXIS=none|base|ours|theirs`，
`FC_IMMUTABLE_REPAIR=1`仅开启临时测试深快照对照。

```sh
FC_IMMUTABLE_AXIS=base pnpm --filter @type-pal/migrate exec vitest run --config /tmp/codex-foundation-r1-rework.KtFIPX/immutability.config.mjs
FC_IMMUTABLE_AXIS=base FC_IMMUTABLE_REPAIR=1 pnpm --filter @type-pal/migrate exec vitest run --config /tmp/codex-foundation-r1-rework.KtFIPX/immutability.config.mjs
FC_IMMUTABLE_REPAIR=1 pnpm --filter @type-pal/migrate exec vitest run --config /tmp/codex-foundation-r1-rework.KtFIPX/immutability.config.mjs
```

将base替换为ours/theirs复建另外两轴。当前候选首条exit0（漏洞见证），第二条exit1（测试修复后正确拦截），第三条exit0（无产品突变正控）。
若tmp消失：在唯一`const baseView = canonicalSnapshot(base)`前插入目标侧文件对象`v=17`与运行标记；
在目标测试p2调用后追加v/运行标记断言，保留原断言；深快照对照仅包住before对象的构造。
最终采证日志为`immutable-{base,ours,theirs}-observed.log`（三绿，含load及额外观察断言）与`*-deep.log`（三业务红），
正常深快照为`immutable-repaired-control.log`。早期绿日志未显示执行期stdout，只作调试，不单凭load日志判定实际输入已被污染。

### 下一步

只交GLM定点修剩余R2及上述回执勘误；候选未合入，主线仍保留SAVE-BARRIER-LINEAGE-1的6591基线，不改阈值、不跑官方门禁掩盖缺口。
再次接收通过后按原计划合入最新产品树，串行check→ratchet→受保护单次strict fast，再交Kimi终审；设计无需重签，GLM贡献仍披露。
