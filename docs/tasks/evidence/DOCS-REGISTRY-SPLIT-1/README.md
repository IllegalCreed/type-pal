# Registry 存储拆分证据

Status: current
Owner: Codex
Last reviewed: 2026-11-03
Template: governance-index-v1 / 1.0.0

## 目的

从[registry拆分卡](../../cards/DOCS-REGISTRY-SPLIT-1.md)进入指定设计、实现、反例、中央接入与原件运输，回答“接受了哪个候选的哪一层”。拆分任务已done；全量治理的有限终态见[母卡收口](../../cards/DOCS-FULL-TEMPLATE-1.md#最终验收与主线收口)，当前唯一review/registry维护逐篇来源。

## 范围

本目录保存registry设计2.0.2、37/db返工、95def601实现接收、b753 canonical映射、c4d增量以及S03–S05限定中央验收和私有接入护栏。这里的registry分片不同于后来review存储分片；前者保存分类/覆盖，后者保存逐篇审阅，不能把2374对象保真当作2374篇语义完成。

原1838 cohort、1896撤回及五个历史执行隔离各有固定范围；运输产物数量、工具检查数与正文篇数不相加。新文件仍需显式pending登记，不借structuralRoots或路径启发式消分母。

## 当前状态

原卡与治理母卡已经过独立接受及PR38/39主线收口，不再等待下方历史轮次的全量门。设计、固定95实现、c4d存储增量、固定65ee30ad的S03/S04组合、固定4ddd的S05组合与76509484私有护栏仍各自只证明原候选；旧失败不被后继成功改写。本次核终态、真实消费者和固定来源，未重跑旧50/178专项或产品流程。

`raw/central-sessions/`保留269份原transport身份索引；7,399份关闭窗口payload已退出当前检出（含首批3份大补丁及最后7份已转固定Git的人用原件）。各会话原路径、作者、时间、范围、payload/stored双身份仍由原transport维护；完整字节、独有失败和执行记录从[固定Git原目录](https://github.com/IllegalCreed/type-pal/tree/159cd0e2f8753536800ba4635e896020a897fddc/docs/ops/evidence/DOCS-REGISTRY-SPLIT-1/raw/central-sessions)显式恢复，方法见[附件退役与恢复](../../../engineering/guides/documentation.md#历史输入附件的显式退出与恢复)。不从当前读取静默补回，不在新位置复制整套历史。

b753的2374对象/顺序/缺省和八metadata保真，与c4d新增33pending后的summary不是同一个数值快照。原迁移mapping不改目标；canonical转换和格式化阅读投影用显式映射记录，不能拿后继summary或展示SHA替换原件身份。

## 入口与责任


- [固定 38f18ff9 的设计独立报告](independent-design-review-38f18ff9.json)：只接收设计；完整门超时、strict/progress 失败和两处旧 pin 漂移原样保留。
- [原报告与110项产物的无损接入映射](design-intake-38f18ff9.json)：报告保持原 SHA，附件以 gzip 保存原 payload/stored 双 SHA 和字节数，解压后逐字节核对。
- [迁移输出前置检查 counter](implementation-output-counter.json)：旧候选缺mapping父目录时exit1却已发布七片且无映射；固定95已由非作者复验前置拒绝，旧反例和完整输入未冻结的限制仍保留。
- [37实现返工](independent-implementation-review-37adc410-rework.json)与[db路径返工](independent-storage-path-review-db814e3c-rework.json)：分别发现首段点路径别名、转义孤立代理项映到同一原生文件；原失败不改。
- [95固定实现独立接收](independent-storage-review-95def601-scoped-accept.json)：原counter闭合，50专项/178工具检查通过；完整check:docs、strict、require-complete仍失败。
- [root canonical映射核验](canonical-intake-b7534fc5.json)：源mapping原目标不改，八份显式路径转换仅绑定b7534fc5候选快照，后续新增登记与语义绑定变更另列。
- [中央脚本首版反例](independent-central-guard-review-v1.json)、[固定344623护栏复验](independent-central-guard-followup-34462316.json)和[S04合法/非法正反针](independent-s04-guard-addendum-34462316.json)：只证明owned fixture中的护栏；尚不接收真实中央结果。
- [固定65ee30ad的S03/S04中央报告](independent-S03-S04-central-review-65ee30ad.json)与[146项运输](intake-independent-central-65ee.json)：只接收两篇唯一迁移及原2407→2411→2414组合，新增七份仍pending；本次确认写回和后继正文另验。
- [固定c4d中央增量独立报告](independent-central-intake-review-c4d00d3e.json)与[134项原件运输](intake-independent-central-c4d.json)：核原2374+33pending、2407绑定/全部pin、原报告/四阅读投影与实际门；不外推后继S03/S04或全量语义。


Codex维护中央登记、导航与实际组合验收；隔离实现Owner的原职责仅适用于指定候选，新写入仍先核当前任务准入。读取原报告先找其配对intake/transport：payload SHA证明原件，stored SHA证明gzip容器，formattedReaderViews只证明展示件及JSON值相等；三者不互换。

## 证据与下一步

首版输出前置失败曾在exit1前发布七片但缺mapping；37/db分别有路径别名和孤立代理项反例。原失败保留，95限定接收只关闭报告中明确复验的counter。中央接入脚本也不保证跨文件回滚：发布后外部竞态可留下已发registry与空输出，必须查实际原stderr，不把空JSON作成功证据。

继续工作先核原卡当前Owner、目标候选和引用DAG，format后取最终pin；语义接收、中央组合和全量硬门分记。raw/central-sessions由root中央维护，原命令metadata/完整流/脚本按原字节运输，未知来源不补造。未满足硬验收前不合main、不推送、不done。

### 2026-10-18运输与验收记录（原时点）

以下沿用本批基点的历史段落和链接；“本次/尚不/未来/当前”等词只指原固定候选，不覆盖上方现行职责。590项晚期快照、110设计产物、228清单、1859运输/666容器、146/62/210/460等运输数量只证明各自清单，不是新测试数或正文完成数。

上述每个原报告的`intake-*.json`配对表逐项保存原路径、payload/stored双SHA与字节数。原始文本、fixture的Git元文件等均按payload SHA无损gzip保存，避免在仓库重建嵌套`.git`；字节相等才复用同一容器。作者37目录的590项是本次实际晚期快照，活动命令索引已追加过，不能冒称原37报告生成时的完整快照。

首轮中央lint实际报四项format error，原日志不改。三份作者报告和中央脚本首版counter报告的同名JSON现为仅格式化的阅读投影；配对表的`formattedReaderViews`给出展示SHA、原件payload/stored SHA及JSON值相等验证，原始报告身份须解压指定容器核对，不能拿展示件SHA替换原报告pin。其余原报告保持原字节。

`raw/central-sessions/`归本卡与root中央维护所有：每个会话的`transport.json.gz`保存原/tmp路径→gzip容器、双SHA/字节数及producer/caller，原命令metadata、完整stdout/stderr、输入manifest与脚本均按原字节保留。它们只是本次执行/运输附件，不授正文、历史运行或独立验收信用；失败与后来重跑并存。

`registry_storage_author` 独占隔离实现文件；root 维护本目录与中央登记并独立验实现。原命令 stdout/stderr 不编辑，后续结论只追加新记录。

### 当时的证据与下一步

迁移输出旧counter保留未冻结完整模块的限制。固定实现已通过非作者真实输出前置拒绝、并发writer、映射snapshot、真实混包kill与显式恢复检查。中央脚本也不提供跨文件事务：发布后的外部字节竞态会拒绝继续pin，但可能已发布registry并留下空输出；外部原始stderr才是该次失败证据，空JSON不能登记为成功。

固定实现与c4d中央增量已按限定范围验收，后继逐篇语义和每次中央变化继续独立核验。check:docs、lint、完整基点/staged diff与全量语义门按实际字节重跑；未满足全量硬验收前不合main、不标done。

### S05私有接入工具的固定护栏扩展

[76509484非作者报告](independent-private-runner-v3-review-76509484.json)SHA `250b0984d54c574b2dd0e48fefd2edd0a0d1f68e2574ed1d81cb8e87ea9eb293`与[460项无损运输](intake-independent-runner-v3-76509484.json)只接收root工具增加S05精确path/body/report/design tuple的护栏：13次真实执行，3合法/10指定负针拒绝、完整2414native与R60六→五保全、旧S03/S04类型边界未退化。旧344623/builder字节及原200+107+97封包不变；并非新模板/审阅标准放宽，也不授真实未来中央、报告本文语义/模板、全量或main/done信用。

### 固定4ddd S05中央接收与后续原件设计

[固定S05中央报告阅读投影](independent-S05-central-review-4ddd17e4.json)与[62项原件运输](intake-independent-central-s05-4ddd.json)保留原payload fb5ea36b…/gzip stored及展示SHA；只接收4ddd唯一迁移与旧对象/历史、所有pin、原执行scope，未来变化另验。

[回执存储设计报告](independent-governance-receipt-design-review-4ddd17e4.json)及[210项运输](intake-independent-receipt-design-4ddd.json)限定接受稳定93a6 proposed1.0.0的设计正文/模板和可冻结性。既有2424/1838候选零迁移，未知归属pending、native JSON实际gzip拒绝反例保留；实施/consumer/pilot/采用均未验收。不用该设计追溯删除既有报告，不新增ignore或structuralRoots，不授报告本文完成。
