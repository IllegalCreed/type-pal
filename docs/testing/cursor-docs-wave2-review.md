# DOC-CURSOR-2 — Codex独立接收复核

日期：2026-09-25。当前正文候选`4b75d1c397f7d86f3ac92a5adcfff7aa552aca9a`，
登记tip`cc2720c5c40e7d3eab9d0d5889c81923527a0ce1`；证据冻结`dab017e7`。
首轮3852afe5/e3da44ca的反证保留在下方历史节，不再作为当前counter。
[Cursor原回执](cursor-docs-wave2.md)原样保留，不由Codex代改贡献者结论。

## 结论

**accept（仅审计材料接收，含两条非阻断文字观察）；无剩余阻断counter。**
R1/R2/R4闭合，R3的关键证据定位与cwd修订已完成，两处定位/表格瑕疵由Codex明确列为非阻断，
不宣称文本已毫无瑕疵。未改Cursor原文，不要求再交一轮仅文字返工。
原DOC-CURSOR-1 accept保持；五份指南修订卡未开门，当前两卡均不标done、不合main。

## 窄返工接收 — 4b75d1c3 / cc2720c5

- R1：C01已补Reforge消费者并撤销断链结论；C12两个短名导航已撤销误报，原ID保留去向。
- R2：C07替换句已只指向PAL发布入口，不再承诺当前指南有烘焙细节；后续可执行建议范围明确。
- R3：前轮列出的shared/pal-extract extract/game/editor/migrate代表锚点已纠正；
  C09五脚本cwd、preview相对out与缺省out区别、路径裸竖线及LF配方表述已修。
  下方NB1/NB2是剩余文字精度问题，不改变上述事实/建议，不继续作为阻断。
- R4：未执行迁移/未起服务已从未核输入移出；机械求和十二组为3/1/2/1/4/2，
  原16 ID去向唯一（13条分类记录+3条撤回），无凑数新发现。
- 候选对7e52d514仍只改回执；登记提交仅回填SHA/检查/交接。packages/scripts/.github/projects/data零改。
- 候选原树文档检查PASS（549 Markdown / 2994 links / 181 tasks），候选diff检查exit0。
  本轮不复跑已核事实、资源hash、CLI、产品测试、覆盖率、视觉或CI。
- 两回执提交原样接入独立复核分支为ac0fdb1b/478dd663；不是合main，也不修改贡献者语义。

### 非阻断文字观察（有证据的勘误，不代改回执）

| ID | 当前候选位置 | 准确读法与后续处理 |
|---|---|---|
| NB1 | `cursor-docs-wave2.md:79`，pal-extract test/typecheck仍引package.json:8-9 | dab017e7实际是test:8、typecheck:7（:9是check）。脚本存在和正文结论不变；未来使用这条证据时按7/8定位，不沿用错误范围 |
| NB2 | `cursor-docs-wave2.md:205`，preview-fbp行是6格而表头7格 | 输入格混入输出说明，pngjs被排到输出列，外部工具格为空；正文cwd/out事实正确。将输入与输出拆成独立格即可，不是运行行为问题 |

两条不影响已纠正的误报、替换句、cwd事实或小计，且可从同一源码直接无歧义还原，
本席接受材料并将这两条降为非阻断，不要求Cursor重跑/重交；后续正式文档引用必须采用上表准确版本。

## 首轮反证记录（历史，以下R1～R4已不阻断当前材料）

## R1：C01与C12不能按当前理由判定为确定错误

### W2-C01-1（候选回执:34-47）

`packages/shared/README.md:4`原话是“当前 **Reforge** 仍复用…（见assets.ts与index.ts）”，
没有声明`packages/shared/src/assets.ts`存在。实际`packages/reforge/src/assets.ts:17-28`
从shared导入Palette/RleFrame/解码器；`packages/reforge/src/index.ts:112-114`再导出类型/解码器。
“跨包消费者/导出文件的简称”是有直接源码支持的替代解释；回执自己的:36也已列出此消费者。
只证明shared同目录无assets.ts，不能推出原文引用了不存在的文件。

返工：撤销“文件不存在=确定不符”。可将裸文件名归为需澄清的引用，建议写全Reforge消费者和shared定义路径，
但不得冒称已证断链/不存在，也不要用只列类型定义的替换句丢掉原文的Reforge复用证据。

### W2-C12-1/2（候选回执:289-301）

`docs/ops/README.md:12`的`tasks`→`tasks/README.md`和`docs/ops/audits/README.md:10`的
`pre-e2e`→`pre-e2e/README.md`均是正确目录短名，目标存在且归属一致。
`docs/ops/guides/documentation.md:25-35,57-71`无“链接标签必须等于目标H1”的规则。
本卡明确不按个人偏好重排/重命名；不能一边允许phase3“目录入口”短名，一边把这两个短名计为缺陷。

返工：撤销两条确定不符，保留在C12事实表为合法导航；中文化可以是非阻断可选编辑意见，
不计新缺陷、不要求将长H1整段塞回目录。其它已核导航不重审。

## R2：C07建议替换后仍未解决内容指向问题

候选:165-169建议把`packages/migrate/README.md:61`改成“资产烘焙与发布细节见”当前发布指南。
但`docs/phase2/guides/content-publication.md`全文仅15行，:3-12是PAL提取/发布/校验入口，
:4回链migrate README，:15明确把早期烘焙方案归为历史；它没有engine-chrome当前烘焙细节。
只把链接标签改成H1，仍然承诺了目标没有的“烘焙细节”，不是可直接采用的修订。

返工：问题收窄为“标签/内容承诺与实际入口不匹配”，不是一般的短标签不等H1。
可用替换方向：`当前PAL内容导入与发布见[PAL内容导入与发布](../../docs/phase2/guides/content-publication.md)。`
如确需保留chrome烘焙说明，另指`docs/ops/guides/dev-servers.md:24-26`现有维护者说明；
不得把历史asset-pipeline或当前指南中的回链循环包装成完整烘焙文档。本轮仍只改回执，不改这些指南。

## R3：冻结锚点与CLI工作目录必须能照着定位

不是要求业务重测。候选多处标了确切行号，却落在另一个script键上；应从dab017e7现场校准，
或给正确行号加精确JSON键，不靠近似位置冒充证据。代表反证如下（行号均在冻结树）：

| 候选所引 | 实际证据 |
|---|---|
| shared test→package.json:15 | :14是test，:15是check |
| pal-extract extract:11 / extract:videos:12 | :10是extract，:11是extract:videos，:12是对象结束 |
| game dev:8 / test:11 | :7是dev，:10是test；所引分别为build/check |
| editor typecheck:13 / test:14 | :12是typecheck，:13是test；:14是check |
| migrate migrate:content:19 / test:fast:11 / check:14 | 分别应为:16 / :9 / :11；:19在dependencies中 |

C09整表还漏了本卡明确要求的cwd轴，这不是所有脚本都能从任意目录安全运行：

- `grep-sdlpal-chunks.ts:31,37-40`直接向grep传`reference/sdlpal`，依赖进程cwd，当前说明的跑法应从仓库根。
- `extract-videos.ts:32-35`、`find-scenes-without-setpartypos.mjs:26-31`按模块位置计算repo。
- `scripts/docs/check.mjs:13,278-290`按模块位置取repo并给git显式cwd。
- `scripts/docs/relocate.mjs:117-118`将相对PLAN路径基于repo解析。
- C08的`preview-fbp.mts:9,17-23`需区分：输入与缺省输出按ROOT，显式相对out原样传writeFileSync，
  因而按进程cwd解析；不能只写一个ROOT暗示两者相同。

返工：校准七包事实表的源码行号；C09补cwd和关键锚点，C08补preview相对输出区别。
不要求为所有工具补help，不执行任何被审CLI。
顺手把C09路径单元格里的裸`|`改成三个完整路径（当前会拆坏Markdown表格），
UI digest配方写明“实际LF换行”，不要把字面`\\n`当成拼接字节；散列结果本身已独立复算通过。

## R4：未执行不是未核输入，计数不可混轴

`W2-C08-U2`（候选:187）仅指未运行迁移，`W2-C11-U3`（:279）仅指未起服务。
两者是本任务刻意排除的运行验证，不是已发现缺少输入。移入“未执行边界”，不混入未核输入小计。
缺extracted、未核上游源文本可继续保留相应范围和原因；没有要求下载或补素材。
R1分类纠正后同步表格/小计，不继续报“6条确定不符”；保留16条原ID的去向说明即可，不必造新问题补足数字。

## 已核通过与不重开范围

- C03禁止架构演进与`CLAUDE.md:22-23`现行授权冲突，判断成立；前批H1的新出现位置仍只算已知关联。
- C11原版数据说明漏掉已入库README/BDF例外，`.gitignore:14-17`与冻结跟踪树相符；
  建议只说跟踪例外及既有provenance，不扩大版权或授权结论。
- C02/C04/C06的命令/版本/依赖事实及C08/C09主要参数/副作用、C10两份workflow映射成立，
  本轮只要求R3对应定位与工作目录补齐，不重跑CLI/CI。
- C05保持待确认是合适的：dev中间件提供extracted路径和离线审计读extracted，不证明产品加载器会读它；
  不因这条待核修改README边界，不要求本批开浏览器证明。
- C07默认命令在参数校验后先recover，`migration-transaction.ts:264-270`确有恢复/清理写盘；前批关联保持。
- C11资源复算直接读dab017e7的Git blob，不借主树gitignored输入：UI=85文件、48629字节，
  aggregate=`5e5315f85945b35e9df2ae3a205d0d6fcd4faaa524c12082b6ba91ff55888485`。
  title/dialog-icons、两份许可证文本、两个status seed、BDF各自hash也与PROVENANCE一致。
  未运行bake、未下载上游、未验证观感/权利。此结果不重做。

复算算法：`git ls-tree -r --name-only dab017e7 -- <chrome>/ui/`筛PNG并排序，
对每项`git show dab017e7:<path>`取字节，求SHA256与字节数；拼接`hash + 两空格 + UI相对路径 + LF`再SHA256。
单文件同样对Git blob求SHA256，再与PROVENANCE明确值核对。

## 范围与验证记录

- 远端tip=e3da44ca；3852正文→登记只回填SHA/文档检查/提示词。
- `git diff --name-status 7e52d514..e3da44ca`恰一份回执；对dab017e7的packages/scripts/.github/projects/data零diff。
- 候选原树`node scripts/docs/check.mjs`PASS（549 Markdown / 2993 links / 181 tasks）；
  `git diff --check 7e52d514..e3da44ca`exit0。数学小计原值能相加，但R1/R4显示分类本身有误。
- 回执原样快进接入`codex/doc-cursor-review-r1`只为承载复核证据，**不等于accept或合main**。
  main仍26c4ae5c；未改Cursor回执措辞、正式指南、产品、测试、基线或五份修订卡。
- 无服务、浏览器、全仓测试、覆盖率、迁移/提取/发布执行；本卡Status仍draft，不代签、不标done。

## 下一步

Cursor本包无剩余阻断返工。无下一位Agent提示词，等待用户决定后续文档修订准入；
不合main、不代签、不标done，前批五份指南修订卡仍未开放。
