# Registry 存储拆分证据

Status: current
Owner: Codex
Last reviewed: 2026-10-18
Template: governance-index-v1 / 1.0.0

## 目的

保存[存储拆分任务](../../tasks/DOCS-REGISTRY-SPLIT-1.md)的非作者设计复核、实现反例和后续固定候选验收，区分设计准入、存储实现与正文语义信用。

## 范围

覆盖设计 2.0.2、固定95def601存储实现、两次路径返工、中央接入脚本的隔离反例与原2374条的canonical映射核验。1838固定cohort和五项历史回执隔离不由存储验收续期。

## 当前状态

设计、固定95实现和c4d中央存储增量已获非作者限定接收，均只在候选分支，任务仍build。b753快照的原2374对象/顺序/缺省与八项metadata保真；c4d仅按33个新增pending调整summary，不把现summary说成原值，也不授正文完成。S03/S04固定65ee30ad组合也已获限定接收；本次报告接入、再新增候选及全量硬门按各自实际字节另验。

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

上述每个原报告的`intake-*.json`配对表逐项保存原路径、payload/stored双SHA与字节数。原始文本、fixture的Git元文件等均按payload SHA无损gzip保存，避免在仓库重建嵌套`.git`；字节相等才复用同一容器。作者37目录的590项是本次实际晚期快照，活动命令索引已追加过，不能冒称原37报告生成时的完整快照。

首轮中央lint实际报四项format error，原日志不改。三份作者报告和中央脚本首版counter报告的同名JSON现为仅格式化的阅读投影；配对表的`formattedReaderViews`给出展示SHA、原件payload/stored SHA及JSON值相等验证，原始报告身份须解压指定容器核对，不能拿展示件SHA替换原报告pin。其余原报告保持原字节。

`raw/central-sessions/`归本卡与root中央维护所有：每个会话的`transport.json.gz`保存原/tmp路径→gzip容器、双SHA/字节数及producer/caller，原命令metadata、完整stdout/stderr、输入manifest与脚本均按原字节保留。它们只是本次执行/运输附件，不授正文、历史运行或独立验收信用；失败与后来重跑并存。

`registry_storage_author` 独占隔离实现文件；root 维护本目录与中央登记并独立验实现。原命令 stdout/stderr 不编辑，后续结论只追加新记录。

## 证据与下一步

迁移输出旧counter保留未冻结完整模块的限制。固定实现已通过非作者真实输出前置拒绝、并发writer、映射snapshot、真实混包kill与显式恢复检查。中央脚本也不提供跨文件事务：发布后的外部字节竞态会拒绝继续pin，但可能已发布registry并留下空输出；外部原始stderr才是该次失败证据，空JSON不能登记为成功。

固定实现与c4d中央增量已按限定范围验收，后继逐篇语义和每次中央变化继续独立核验。check:docs、lint、完整基点/staged diff与全量语义门按实际字节重跑；未满足全量硬验收前不合main、不标done。

### S05私有接入工具的固定护栏扩展

[76509484非作者报告](independent-private-runner-v3-review-76509484.json)SHA `250b0984d54c574b2dd0e48fefd2edd0a0d1f68e2574ed1d81cb8e87ea9eb293`与[460项无损运输](intake-independent-runner-v3-76509484.json)只接收root工具增加S05精确path/body/report/design tuple的护栏：13次真实执行，3合法/10指定负针拒绝、完整2414native与R60六→五保全、旧S03/S04类型边界未退化。旧344623/builder字节及原200+107+97封包不变；并非新模板/审阅标准放宽，也不授真实未来中央、报告本文语义/模板、全量或main/done信用。

### 固定4ddd S05中央接收与后续原件设计

[固定S05中央报告阅读投影](independent-S05-central-review-4ddd17e4.json)与[62项原件运输](intake-independent-central-s05-4ddd.json)保留原payload fb5ea36b…/gzip stored及展示SHA；只接收4ddd唯一迁移与旧对象/历史、所有pin、原执行scope，未来变化另验。

[回执存储设计报告](independent-governance-receipt-design-review-4ddd17e4.json)及[210项运输](intake-independent-receipt-design-4ddd.json)限定接受稳定93a6 proposed1.0.0的设计正文/模板和可冻结性。既有2424/1838候选零迁移，未知归属pending、native JSON实际gzip拒绝反例保留；实施/consumer/pilot/采用均未验收。不用该设计追溯删除既有报告，不新增ignore或structuralRoots，不授报告本文完成。
