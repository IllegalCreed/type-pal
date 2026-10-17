# Registry 存储拆分证据

Status: current
Owner: Codex
Last reviewed: 2026-10-18
Template: governance-index-v1 / 1.0.0

## 目的

保存[存储拆分任务](../../tasks/DOCS-REGISTRY-SPLIT-1.md)的非作者设计复核、实现反例和后续固定候选验收，区分设计准入、存储实现与正文语义信用。

## 范围

当前仅含设计 2.0.2、两项设计 counter 及迁移输出路径的真实 I/O 反例。代码/数据尚未获得独立接收；1838 固定 cohort 和五项历史回执隔离不由本目录续期。

## 当前状态

设计限定接受，实现 build。源 2374 条保真迁移与后续新增候选分开。新增本目录的文件暂未接入逼近 1 MiB 的旧 flat registry，缺口显式保留；待 v2 接收后登记 partial/needs，不能凭目录或 raw hash 宣布治理完成。

## 入口与责任

- [固定 38f18ff9 的设计独立报告](independent-design-review-38f18ff9.json)：只接收设计；完整门超时、strict/progress 失败和两处旧 pin 漂移原样保留。
- [原报告与110项产物的无损接入映射](design-intake-38f18ff9.json)：报告保持原 SHA，附件以 gzip 保存原 payload/stored 双 SHA 和字节数，解压后逐字节核对。
- [迁移输出前置检查 counter](implementation-output-counter.json)：缺 mapping 父目录时，旧候选 exit1 但已发布七片且未生成映射；现有输出文件拒绝对照已通过。作者修复待固定候选非作者复验。

`registry_storage_author` 独占隔离实现文件；root 维护本目录与中央登记并独立验实现。原命令 stdout/stderr 不编辑，后续结论只追加新记录。

## 证据与下一步

迁移输出 counter 保留未冻结源码观察的限制：命令起始 CLI SHA、实际退出/效果/完整输出已捕获，未声称拥有完整 frozen module 输入快照。最终验收必须绑定固定实现提交与全部源文件；源码层映射 TOCTOU 和半发布判别力观察也须在实际反例中闭合。

先接收真实实现、2374 对象/顺序/顶层 metadata 映射及并发/混包/输出路径反例，再接新文件和逐篇语义记录。check:docs、lint、完整基点/staged diff 与全量语义门按实际字节重跑；未满足全量硬验收前不合 main、不标 done。
