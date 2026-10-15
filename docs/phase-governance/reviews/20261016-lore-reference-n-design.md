# Lore 九篇导航、创作指南与参考资料治理设计

Status: current
Owner: Codex（冻结与接收）；history_cards_c_tail（候选正文单一 Owner）
Last reviewed: 2026-10-16
Template: design-spec-v1 / 1.0.0
Version: N-lore-reference / 1.0.0（提交冻结后另准 pilot）

## 问题与目标

九篇当前正文尚属governed-legacy，旧content-reviewed不能冒template-compliant。按实际内容冻结3governance-index、1guide-runbook、5reference-canon，全部现有1.0.0，0archive overlay、不加type/variant。新增正文明确项目既定约束、旧采集来源、粉丝解释/推论和待作者裁决，不由AI整理替代canon选择。本文自身pending增量，设计/结构图/旧review标签不给新迁移信用。

## 真值与约束

来源固定4079482759bddd1c941b92e92eba21c891f571a0，九篇682行，逐blob/SHA与79dce/738d相同，当前根逐篇字节相等。lore树14MD：已接受dlc-ideas只守边界不重计，四大篇characters/timeline/brainstorm/beat-sheet保各必要窄域、不在N改或冒全文治理。原所有九篇无独立Owner/Status/Last reviewed，新增Owner/date只指当前文档责任，原“你/作者”不倒填AI身份。

作者A MD全文SHAf60c6974ff19ee89f055b7e0f28e1e02564a1fe75a0e9b4ee0fc45c0f65305a9，详细JSON SHAea255eda04641d77a92777627ed0c2fe257cdb8e35db1284ab24041f4b8d023c、mapping SHAe461234f4b79867abb42113e88a961ff19d04f47d3bf3ae09c746a9259eb4ee2。非作者tail独立849行报告SHA82176502345d4279d3ac07f6c216582d203ae062bd44aa17ffaa5578b791c3fb为9/9design agree，不预签正文实现；其原设计复核之后由根指定其为正文Coding Owner，最终正文另由A及根非作者接收，不自签accept。

根已分三批完整读九source682行、完整MD提案、每篇具体五章设计及完整独立849行报告；详细JSON其余字段/mapping复用准确独立读域和source identity，不假称149817字节mapping全语义复审。根三次source阅读证据为/tmp/type-pal-lore-initial-three-full-read-20261016.json（9a54edeecaace09745c2086bc1294f72968a041074f90ac5b866e291e3c7aa8b）、second-three（bac644281c77fb370c932fc049eda5e808326c622f19c80b16b28caa957a1b94）、last-three-and-n-proposal-root-reading（4e0eb8f09d482c48d74f98371280b5e4315bec670a060bdfe5a675d8f464e058）。primary572行的直接source读域属于tail报告，根不冒fresh四大篇全读或外网/官方认证。

四向真值：primary是九原文及明确窄读作者后继决策，原URL/✅是旧时点来源；phase1不重判原游戏canon或新执行；phase2 D12技术demo/D19纸面并行不等完整DLC准入，backlog110真时间属第三阶段；目标只迁文档，不扩产品/角色/制作排期。没有需要用户重拍才能做治理的事项；未知只阻相应创作，不阻登记冲突。已定鬼阴山临时入口/禁天鬼族/不复活/T5.5等不因外网未核而撤销。

| 原路径 | 行数 | Git blob | SHA256 |
|---|---:|---|---|
| docs/lore/README.md | 62 | b3f7b254f8eb3f5b81a06b55a32008a704d17b79 | 03bb38e6443e71ee5b90ccae38895f6f1921284c7d7c644725ecf1890e3e6442 |
| docs/lore/narrative-workflow.md | 57 | 7f84d46bbcc203174a383724c9ace72b9fe51aa7 | 08f1acfa6febb66ab0b9c2af6368a9c3be99594c1683219300845ac072bf334d |
| docs/lore/versions.md | 106 | 62cf091770775a34edc8936e7605d0e2262903c6 | 18fe47ad182fdcf5fe50231bb7800e9572f1190bcdbee9232e68a995561996f2 |
| docs/lore/taboos.md | 105 | 8477caef346f641278ac8ceb43e0b62b957093d7 | 8ee557a990d936dbb13b36613313e5cc573732eb08b9a8347df03ce2a10dcd42 |
| docs/lore/world-rules.md | 106 | 29cbb3bdf490612867e47a0fd16af45d087fa188 | b5074aa3a20bbc69446dbfb43cb3b3e3b61a278a148a71c18e48c37d364c5339 |
| docs/lore/world-rules-ghost-realm.md | 93 | b0903f597145bceaa0646bede79c9198fd507954 | 32b45f7fe6a79a07f5817aa6b4fdb62694b6772ffc63e2aa7371e7f447d0c438 |
| docs/lore/factions.md | 135 | 80143183a87468fad825a37342f688560aa49a5e | cc7852a574ccf99897c4143b76cf977157300e256db03fe1a9c45a601157dbf8 |
| docs/lore/ideas/README.md | 9 | 5e693e37a051b047210c3766f848e5714213faa3 | 548ad48e8d7b14aa736c1addabbe8a3672dfa84fe0062041332aa17a99f5e708 |
| docs/lore/ideas/guijie/README.md | 9 | ee9c2431fda79deb095fcb6f8079c089db09dcdd | ae2b7c08382d0ab44dea86c2b90eede667f14f8a654918947d5db2afa0e8ae3c |

## 方案

### 逐篇五章与合法状态

### docs/lore/README.md

绑定governance-index-v1/1.0.0，Status=current；phase catalog成熟度另轴，不能复制draft到reference正文。

- **目的**：作者是最终裁判，AI只检索/结构化/排冲突；世界观资料与未承诺创作分流。
- **范围**：lore参考材料、版本/红线、方法论、ideas和已有DLC池，跨阶段素材不是产品排期。
- **当前状态**：当前导航可用；所有采集✅按原时点；指明不入轮回在world-rules/timeline仍待官方，不改不复活红线。
- **入口与责任**：保原8行主题索引+鬼界补充/ideas入口；状态改为各正文真实成熟度，不用初稿/已坐实自动授官核或实跑。
- **证据与下一步**：保原按需建库、落库/来源/冲突版本/纠错留历史规则；作者决定canon，文档治理Owner另标；完整62行原源保存。

### docs/lore/narrative-workflow.md

绑定guide-runbook-v1/1.0.0，Status=current；phase catalog成熟度另轴，不能复制draft到reference正文。

- **目的**：六步帮助创作从概念到可玩；情境张力/空间战斗承担叙事，不是官方canon资料。
- **前置条件**：作者目标/红线/版本与输入来源已标；①–⑤纸面无需编辑器，⑥需明确能力与内容任务准入；D12技术demo不等完整DLC。
- **步骤**：保六行①概念②节拍③流程④关卡⑤演出⑥落地及每行产出；垂直切片能力→小实验对应D19，不恢复旧产品排期。
- **失败处理**：版本未定/来源冲突先versions+作者；创作/产品授权未定不能用方法论推进代码；旧路径与现行ideas布局冲突按显式route映射。
- **完成定义**：每步有实物与来源/待选/验收责任；纸面完成不等可玩或runtime通过；新稿放docs/lore/ideas/<支线名>/，D19原日期路径留历史映射。

### docs/lore/versions.md

绑定reference-canon-v1/1.0.0，Status=candidate；phase catalog成熟度另轴，不能复制draft到reference正文。

- **适用范围**：仙剑一扩展及跨作品引用，DOS/98、新仙剑/IF、影视等按原差异范围，不扩为今日重制产品规格。
- **一手来源**：逐链接标原来源类别/原✅与本轮未外网核验；作者记忆记录与百科/知乎冲突分开，资料并非全为primary。
- **当前真值**：原已登记月如链主干作为项目约束继续受taboosT5.5约束；当前尚无作者A/B/五珠/TV/生育官方表述新裁决。
- **未知与冲突**：保两月如选项表及4分歧、全部待办；回魂珠执行者库内另有王小虎记述，三说并列待核，不能只挑逍遥/忆如；五珠处理建议不升已定。
- **使用边界**：依据具体版本/出处/作者裁决使用，保2026-06-25与原建议原文；未核官设不能作改剧情硬事实，未选版本只阻相关创作。

### docs/lore/taboos.md

绑定reference-canon-v1/1.0.0，Status=current；phase catalog成熟度另轴，不能复制draft到reference正文。

- **适用范围**：仙剑扩展创作的现有硬/软红线与安全区，不修改角色命运或替作者重选正典。
- **一手来源**：保6/25采集日期、原链接/✅及记忆记录；不将百科/知乎/萌娘升级为新官方primary，原硬约束作为项目约束保留。
- **当前真值**：逐项保T1不复活、T2逍遥后续、T3阿奴、T4反派终局、T5掌门、T5.5月如链、T6忆如-韩-小蛮链；无需因source待核撤销作者约束。
- **未知与冲突**：T7月如版本两选择、T8生育官方、T9TV待作者；官方可靠性与project规则分轴；自检旧编号冲突做精确勘误。
- **使用边界**：8项自检实际分别T1/T2/T3/T4/T5/T5.5+T7/T8/T9；安全区月如T6改引T5.5/T7，只修引用不重排T编号；安全区不是全情节免责。

### docs/lore/world-rules.md

绑定reference-canon-v1/1.0.0，Status=candidate；phase catalog成熟度另轴，不能复制draft到reference正文。

- **适用范围**：2026-06-25世界观采集总览，按具体版本和创作用途读；非当前引擎机制说明。
- **一手来源**：逐原表/链接保✅/⚠/❓和日期，本轮未认证网站或官方，primary缺失明确。
- **当前真值**：项目现行不复活/掌门代数等约束回taboos；本页原五灵/组织资料列为原采集有源说法，不因章节当前真值授新官核。
- **未知与冲突**：五珠应采用改作原推荐待作者（versions仍未定）；生育即亡/不入轮回原粉丝解读与README断言冲突；六界细节/获取/地理/掌门24–26原待查全保。
- **使用边界**：官方/粉丝/推论/作者规则逐claim分轴；待核项不作为canon新前提；不改五珠方案，不生成新的游戏机制结论。

### docs/lore/world-rules-ghost-realm.md

绑定reference-canon-v1/1.0.0，Status=candidate；phase catalog成熟度另轴，不能复制draft到reference正文。

- **适用范围**：6/29采集与6/30作者创作入口/天鬼族约束；不是完整DLC实施或新官方设定发布。
- **一手来源**：保官网旧URL及百科/攻略的原链接和可靠性标签；跨作入口/种族/制度每claim标采集而非本轮官核；没有外网重认证。
- **当前真值**：6/30鬼阴山后山临时裂隙为作者创作已定，非官方唯一入口结论；NPC禁天鬼族、小鬼普通亡魂保为项目约束，入口触发/制度呈现仍未定。
- **未知与冲突**：第四节/末待决入口重选改标已被6/30继任；原仙剑二琉璃谷 vs表酆都城并存待核；父母等待投影旧假设被brainstorm6/29已轮回方案取代；制度与至尊等采集须分层不可自行解矛盾。
- **使用边界**：“官方未限定唯一”不等“已验证任何入口合法”；地名/魂流量逻辑是创作自洽推论，不是primary；动态时辰需求归第三阶段真时间，不授权二阶段补系统；保源及后继段。

### docs/lore/factions.md

绑定reference-canon-v1/1.0.0，Status=candidate；phase catalog成熟度另轴，不能复制draft到reference正文。

- **适用范围**：中原武林、官盗、修仙、苗疆四种分类视角，非全系列完整社会关系或官方互斥分区。
- **一手来源**：保百科/知乎/B站/维基链接、所有表格姓名/关系/出处与原6/25标记；本轮无官方网站核验。
- **当前真值**：继续遵守taboos掌门/人物命运等项目规则；四分组是源文组织方式，不授“任挑一组不会打架”保证。
- **未知与冲突**：“几乎不交叉”“官方无设定/可前移/安全”系原采集或建议，不能证明全宇宙不存在关系；留白填充仍需具体作品/时点与作者确认。
- **使用边界**：创作缺口与优先级保为候选建议，非产品待办/排期；不选择四大恶人boss或更改与李三思关系，不改图中身份。

### docs/lore/ideas/README.md

绑定governance-index-v1/1.0.0，Status=current；phase catalog成熟度另轴，不能复制draft到reference正文。

- **目的**：将未承诺制作的素材与lore资料分开。
- **范围**：当前ideas仅guijie目录，制作范围/排期另行作者产品决策。
- **当前状态**：这是当前导航，不是其中素材已定型/已开工；保draft内容边界。
- **入口与责任**：保上级../README与guijie/README两link，作者裁内容、治理Owner维护路由。
- **证据与下一步**：新素材按独立稿登记来源/红线/版本，升级为canon或内容任务须另准入；原9行完整保存。

### docs/lore/ideas/guijie/README.md

绑定governance-index-v1/1.0.0，Status=current；phase catalog成熟度另轴，不能复制draft到reference正文。

- **目的**：统一鬼界素材目录入口。
- **范围**：两份设计探索源；世界观参考不是开发承诺，切片1只借灵感。
- **当前状态**：导航current；brainstorm作者6/30、7/02已定方向与beat-sheet仍含草案占位分开，未全文source不宣称两稿全量同步。
- **入口与责任**：保两原相对链接，新增上级/红线/版本/方法论只作导航；不复制boss或剧情真源。
- **证据与下一步**：具体决议看brainstorm最终清单，具体节拍看beat；待核内容分别记录，实际制作另卡准入；原9行完整保存。

### 实质语义、保真和历史继任

六月采集日期、✅/⚠/❓、所有人物/关系/URL/原表行和建议保留；“一手来源”章也要准确标二手出处或缺primary，不能因章节名把百科/知乎/B站/记忆升格官方。reference词表candidate/current/historical/superseded，无draft；taboos current仅项目约束现行，其余四reference candidate，phase catalog可另draft。三index current只说导航，不把ideas承诺制作。

README“不入轮回”无条件断语改导航/冲突说明，world-rules/timeline仍粉丝/待核，不判其假、更不撤T1。五珠“应采用”保原推荐，不替versions待作者选。versions四分歧/五unchecked全保，用珠人王小虎/逍遥/忆如是三库内记述待核，非新官方第三答案。taboos只active四处xref精修：88/101月如T6→T5.5+T7，102生育T7→T8，103TVT8→T9；独立T6忆如-韩-小蛮编号/约束不变，原错指在原文完整保存。

ghost同页仙剑二琉璃谷/酆都并存待核，不能任选。Jun30鬼阴山后山临时裂隙已定优先旧“重选入口”，不重开选择；原父母等待投影由brainstorm94–104已轮回及Jul2后继裁定继任，两时点清楚；小鬼普通亡魂与帮父逃脱的后继范围保留，不复活早期教徒猜想。制度/至尊/天鬼禁令分别为采集、推论、项目约束，不造官方物理命题。动态时辰需求不恢复phase2真时间。factions四分组/无交叉/留白安全/门派前移/优先级都是原分类或建议，不能全称保证安全/批准新boss/DLC。

narrative六步及六行产物保留，①–⑤纸面与⑥实施准入分开；新路径docs/lore/ideas/<支线名>/明确继任原路径。D19:247旧日期例在作者白名单外，根如另做只窄路由注/保历史，不冒整篇done或全仓冲突已消。四大稿仍单独全审；beat已落部分待办不允许据窄读勾全部完成。

每篇完整原源放足长text围栏，外层严格超过内部反引号run；fixedGit/blob/SHA和围栏payload两条恢复源，inverse全字节相等。新五章必须逐篇实际传达结论/限度，原quote不能代迁移。原H1唯一live，74原标题markup/顺序保持live短导航，重复“处理建议”按原顺序保slug后缀，真实候选核碰撞。22表128行/84data逐项映射，76出链=44内部+32外部逐occurrence old→live记录；54入链/0入站fragment是实际图，不等所有caller正文已读；外部32URL保出处，不认证当前HTTP或官网内容。

### 单一 Owner、白名单与 pilot

history_cards_c_tail在新隔离codex/docs-lore-reference-n从根另传已提交clean冻结基点开始，先核九source。最终仅九MD+docs/ops/evidence/DOCS-FULL-TEMPLATE-1/contributor-lore-reference-n-20261016.json共10文件。**先准lore/README.md、narrative-workflow.md、taboos.md三类各一canonical pilot及同一专属回执三项（4文件）**；独立全文接受后根另准余六。其余四大篇、dlc-ideas、phase catalog/中央/路由/矩阵/任务/SSOT/scripts/product/旧tests/coverage/CI/main不写。不得reset/stash/覆盖原L或他人工作树。

回执沿已接收L/K的schemaVersion1现有17顶层/43公共逐篇字段及object类型，不加native format：17顶层schemaVersion/kind/task/date/owner/status/sourceRevision/approvedSourceManifestSha256/frozenDesignSha256/summary/authority/readScopes/notRun/checks/entries/candidateManifestMethod/candidateManifestSha256；43字段完整source/after/Git/readscope/core/原身份/新增Owner/phase/version/primary/deps/caller/input/oracle/dedupe/counter/history/supersedes/beforeAfter/stop/next/双conformity/originalPreservation逐行头表链映射/linkCheck等沿既有receipt。toolAssociations=[]，runtimeExecutionPerformed=false限定本轮；旧日期/作者/置信度不变。回执自身pending不自审，body manifest排序path NUL afterSHA LF、不含自身。初三项与后续完整九项交付的完整prior/version状态在真实Git保全，不覆盖旧已受审候选。

原classifier只维护registry，不是lore prose producer；不运行旧writer/广域layout改链接或历史prompt。旧工具是否有caller不由此退休。非正文目录没有新增raw恢复/删除，旧外部资源/原来源引用保日期与出处；治理证据归本任务/真实贡献者/接收方，Git pins及收件长期保留，今日未知raw/网站不冒可用性保证。

## 边界与风险

真正反证是新层升级未核官设、替作者勾五珠/A-B/谁用珠、撤销既定红线或以旧待办覆盖后继决定。结构model仍可能对这些假话和reference draft返回绿，故合法词表和逐条语义须独立核；本包不因此扩大共享工具scope。目录词表current与子资料candidate/旧catalogdraft分轴，不把旧45d890/content22/SAVE11审计刷当前版本或续期。原图entity处理初错/修正及原结果保留，不追改绿；静态图不称浏览器/GitHub精确渲染或runtime/E2E/coverage。

## 验收

根精确冻结正文/入口/任务实际提交，再内部传commit方build allowed三pilot；源九pins始终相同。每个canonical pilot新五章/完整current回执/原source均由非作者全文核，真实inverse/GFM slug重复序/出链 multiplicity/表行/置信度日期与xref纠正逐项核。实际checkMigratedDocument结构正控和registered词表另核，原日期变造逆回读拒；造canon哪怕model绿也semantic counter。先3pilot接受再另准余6，最终九篇完整独立接受，不用/tmp布局代完成。

最终实际pnpm check:docs、pnpm lint、git diff --check零error/warning/info；根独立接收后同步九旧registry/current完整prior/真实after、九routes、phase catalog和39关系矩阵所需现有行，不冒其它source全审。未满足留draft/rework，作者不合main不自签done，N未完成前0新增信用，全1838+增量/artifact目标继续active。

### 完整原始只读提案

下方原稿的未冻结/未准入状态属原交付历史，本文准入以前文冻结与根后续明确commit为准；不授旧命令或别的scope。

> # N：九篇 lore 正文治理只读设计 / 2026-10-16
>
> 仅设计，未冻结、未build、0新增迁移。固定源 `4079482759bddd1c941b92e92eba21c891f571a0`；九篇均与 `79dce0162b7febf84c10c1619471ec529df8ff17`、冻结L738d逐blob/字节相同。固定lore树共14 Markdown，N九篇全文682行（前六529）；既有dlc-ideas120行另全文读作边界，不重计。L分支保持clean，未写仓库/产品/旧tests/coverage/main，未外网重新认证官方或启动浏览器/raw。
>
> ## 逐篇模板与五章内容
>
> | 文件/源行数 | 内容决定的模板与状态 | 五章具体职责 |
> |---|---|---|
> | lore/README.md /62 | governance-index1.0 current | 目的：作者裁判/AI辅助；范围：参考/创意分流；当前状态：目录可用与源可靠性分轴；入口与责任：保8项主题索引及鬼界/ideas入口；证据与下一步：按需查证、来源/版本/纠错留历史与stop。目录不再另立“不入轮回”第二真源。 |
> | narrative-workflow.md /57 | guide-runbook1.0 current | 目的：六步方法；前置：①–⑤纸面/⑥准入；步骤：六行原产出、情境/迷宫/小实验；失败处理：来源/版本/路径冲突；完成定义：有实物不等runtime通过。保D19并行，旧路径映射到ideas，不恢复旧实施授权。 |
> | versions.md /106 | reference-canon1.0 candidate | 适用范围：作品/版本；一手来源：原作者记忆与二手URL身份；当前真值：月如已登记主干作为项目约束，未选项仍未选；未知与冲突：4分歧/5待办及库内第三说；使用边界：不混IF/影视，不代作者选A/B、五珠或谁用珠。 |
> | taboos.md /105 | reference-canon1.0 current | 适用范围：项目既有硬/软约束；一手来源：6/25采集与原标签；当前真值：T1–T6含T5.5原约束不撤销；未知与冲突：T7/T8/T9原待定及错编号；使用边界：精确自检映射、安全区不是免责。current指项目规则继续适用，不认证每句为官方已核。 |
> | world-rules.md /106 | reference-canon1.0 candidate | 适用范围：6/25资料总览；一手来源：各表/链接原可靠性；当前真值：仅已登记项目约束与资料使用规则；未知与冲突：五珠建议尚未选、两女娲粉丝解读与六界等待核；使用边界：逐claim区分原采集/作者规则/建议，不选canon。 |
> | world-rules-ghost-realm.md /93 | reference-canon1.0 candidate | 适用范围：6/29采集+6/30约束；一手来源：官网旧URL/百科/攻略逐claim；当前真值：作者已定鬼阴山临时裂隙、禁天鬼族等项目约束；未知与冲突：旧重选入口/仙剑二两地名/父母投影继任/制度采集；使用边界：创作因果不冒官方，时辰系统不扩二阶段。 |
> | factions.md /135 | reference-canon1.0 candidate | 适用范围：四体系分类视角；一手来源：6/25全部表/URL；当前真值：taboos项目约束继续；未知与冲突：“不交叉/可前移/官方无设定”不当新证明；使用边界：创作缺口与优先级保为建议，不是canon/排期。 |
> | ideas/README.md /9 | governance-index1.0 current | 目的：未承诺素材分流；范围：现有guijie；当前状态：导航current、子素材仍idea；入口与责任：上级与guijie两链；证据与下一步：来源/红线/版本、升级另准入。 |
> | ideas/guijie/README.md /9 | governance-index1.0 current | 目的：鬼界稿件入口；范围：两份探索稿与切片灵感；当前状态：已定创作方向与草案占位分轴；入口与责任：brainstorm裁定/beat具体节拍两真源；证据与下一步：不据窄读宣称两大稿全量同步或DLC开工。 |
>
> 实际reference-canon词表没有draft，未核四篇用其合法candidate（phase catalog建议draft）；taboos继续current项目约束。三索引current只表导航有效，不把ideas旧draft升成创作批准。0新增模板、0archive overlay；九篇仍承担现行职责，历史字节与supersedes在既有五章中完整保留，不靠退役包装代替正文。
>
> ## 四类事实轴与停止线
>
> 1. **作者已登记项目约束**：不复活灵儿/巫后、人物归宿、T5.5月如链、T6悲剧链、禁天鬼族、6/30鬼阴山临时入口与7/02已采纳方向照原文保留。外网来源待核不授权AI撤销作者红线。
> 2. **旧采集说法**：2026-06-25/29/30、原✅/⚠/❓和原URL保留为原采集记录；百科/知乎/攻略不因图标变成今天重核的官方primary。
> 3. **创作选择与逻辑推论**：入口“正路/野路”、名字阴气/魂流量自洽、时辰机制需求、各安全区/优先级不认证为官方命题；已定创作选择有效也不等产品build。
> 4. **未拍与未核**：月如呈现A/B、谁用珠、五珠来源处理、影视边界、生育官方表述等维持未知/作者裁判；只阻相应具体创作，不阻断全docs治理。没有当前需要再次询问用户才能做文档设计的事项。
>
> ## 精确冲突、修正与反例
>
> - README将“不入轮回”写成无条件硬事实，但world-rules女娲表及timeline213–220均明标粉丝解读/官方待核。新目录只导航并说明该点未知；**不撤销T1的不复活约束，也不宣称不入轮回为假**。
> - world-rules“五神骸骨体系应采用”与versions仍待作者确认冲突。新层将其准确标为原推荐，不能替作者勾选。
> - ghost6/30入口已定与第四节“重新定入口”及末待决冲突；brainstorm190–196、382再次证实已定，按时序标旧待办被继任，不能重开作者选择。
> - ghost定论依据称仙剑二“琉璃谷”，同页表写“酆都城”；未查primary，双说保留待核，不能任选一说。天鬼皇/制度/入口唯一性中的官方、推论、创作禁令分别标，不因为推论未证就删禁族红线。
> - ghost父母等待投影旧建议，被brainstorm94–104“父母已入轮回、背影为陷阱”及7/02裁定继任；保两时点，不能恢复父母灵魂长期等候。dlc已治理页仍有其原6/25创意，不在N改写或重计。
> - taboos安全区月如“依赖T6”→T5.5归宿链/T7版本呈现；自检月如T6→T5.5+T7，生育T7→T8，TVT8→T9。**只改active层引用，不改T6身份/编号，不删原错指字节。**
> - versions只列逍遥/忆如两种谁用珠，characters20/54却记王小虎，68–72又回两说。新“未知与冲突”登记第三种库内记录，不把它认证为第三个官方答案或代作者选人。
> - narrative末路径与D19:247均为旧`docs/lore/<支线名>/`；现行ideas两个索引已经分流。新guide用`docs/lore/ideas/<支线名>/`并记录继任。D19不在贡献者写域，根可另窄同步路由注；未同步时明确其日期例与当前入口关系，不能称全仓差异已消失。
> - ghost的动态时辰创意需求不恢复二阶段真时间：design-backlog110已按9/03用户决定归第三阶段，二阶段仅既有昼夜氛围。D19纸面并行/D12技术demo保持，不把借用鬼界灵感升级完整DLC承诺。
> - factions“四体系几乎不交叉→随便深挖不打架”“官方没有设定→安全”只能保为旧采集/建议；具体人物/作品时间线仍过红线/版本与作者裁判。不能借此新增势力、关系或批准DLC优先级。
>
> 最强falsifier是新正文在保持原✅的同时把未核说法升级官方、把五珠/版本待选改已定、为“纠错”撤销已批准红线、以旧待办覆盖后来作者决定、或拿窄读四大篇当全文完成。这些都应counter，即使五章/链接门绿。
>
> ## 原文、标题、行与链接保真
>
> 九篇完整原文放非交互长text围栏（长度超过原文所有内部反引号），固定Git/blob/SHA另存。严格inverse恢复全字节，原日期/作者字样/✅/表行/建议/旧错指原样可读，任何active勘误都有before→after和来源定位。新五章必须实际传达每篇具体职责与所有关键边界，不能只挂原文壳。
>
> 全74原标题以唯一原H1或原顺序的live短导航保留；标题原markup不擅改，尤其重复“处理建议”保原顺序以保重复slug后缀。22表128行/84数据行逐项映射，76出链occurrence（44内部+32外部）均有原→live记录；外部URL保作原出处，不宣称当前HTTP可用或内容已复核。当前Markdown图54入链、入站fragment0、内部断链0；真实渲染slug/碰撞仍须候选阶段重核，非浏览器/GitHub实跑证明。
>
> 首次N图把引号渲染为HTML实体未解码；初脚本/结果在修前保留，已校正基本实体显示，标题/链接计数未变。目录旧代码路径不是失效href，仍需单列路由文本映射，不能用链接门绿掩盖。
>
> ## 来源、consumer与最小写域
>
> 九篇全部真实全文682行；源pin与blob、与79/L相同证明见source manifest。dlc-ideas120行全文只用来守已治理叙事边界。四大篇均不在写域：characters只1–76；timeline199–225/280–292/393–404；brainstorm94–160/180–231/330–384；beat-sheet1–45/210–222/303–324；其它只标题/关键字搜索，不授全文阅读信用。直接D19:223–249、D12所在90–104、roadmap60–76、design-backlog105–115；另读D32地图重建段522–531作锚点排除，未将其误用于动态时间结论；动态时间归属只据backlog110。外网、原游戏源码及raw未重核。
>
> 九篇旧central均governed-legacy/content-reviewed，routing0/9，实际body模型源文9/9缺各五节/日期/声明。旧审查标签不能作为N迁移通过；旧review/hash与10/04静态catalog22/11记录保历史，不刷成新runtime版本。新candidate后预期九after漂移由根接收时真实同步，贡献者不刷新共享账。
>
> 限定scripts/package/CI路径检索只见classifier含lore根；实际全文读classifier只写document-registry，不生成lore正文，路径优先解释旧三个README误判reference。phase checker仅校catalog/hash/index，不判官方真值；M已读广域relocation/link writer仍可按显式映射改MD，不在N运行/退休。没有提案新增自动writer或旧tests。
>
> 未来贡献者最小白名单：这九MD + `docs/ops/evidence/DOCS-FULL-TEMPLATE-1/contributor-lore-reference-n-20261016.json`，共10。中央/phase catalog/矩阵/任务/入口和可选D19窄注由根统一维护。四大篇、dlc已治理、产品/旧tests/coverage/main禁止写。任何新source/canon/系统产品取舍均不能从全docs批准推导。
>
> /tmp设计和源/图/行映射不是canonical候选、不是build allowed或非作者accept。下一步是根冻结精确策略/单Owner/基点，再真实迁移、inverse/模板/Markdown图及非作者逐篇接收；N新增迁移继续0。
