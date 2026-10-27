# 百文件窗口集中验收

## 身份与范围

[父卡](../../../tasks/QUALITY-PENDING-100-1.md)；同一治理分支 `codex/code-quality-94-102`，fetched main `72db417255d8ca4227522420e9185ef468462aa7`。窗口100个实际主体全文A–H，前70与末30分别保留原生结果，不把相邻依赖、既有接受、文件搬移或退役计入100。[逐文件唯一索引](../review.json)和[末30](../asset-render/README.md)给每个文件的caller/oracle/整改/局限；哈希枚举不能代替语义判断。

## 统一门状态

最终 `pnpm check` 已实际exit0、空stderr：20536包测试＋732工具测试全部通过，七包typecheck/whole lint 0errors/0warnings/0infos。此前exit1与各恢复定向原件均保留，未相加冒充整仓绿。唯一官方采集实际执行20,188个fast测试，809个生产文件census闭合；七包测试通过，但ratchet首次因提取器branches回落而exit1，167B完整stderr保留。之后按用户允许的合理结构/测试质量基准调整，复用原报告，由[原官方函数提取重放器](replay.mjs)执行原ratchet尾段、原atomic writer及protected fast谓词，二者exit0/空stderr；没有第二次采集，没有改runner、选取配置、比较器或退役谓词。本次提交时push/PR/CI/合并尚待，接下来只执行受保护发布。

## 差异核算与授权

[逐文件核算](recount.json)将实际main CI（Coverage run40478991718/artifact12724545170，CRC验证下载）与当前唯一报告比较：其它六包全部逐文件指标一致，提取器恰10个文件变化。仅调整必要的branch比较基准 `673/796→661/790`；6个退役适配器分支及6个合法夹具/现用模块迁移分支退出旧fast信用，现用动画writer的4个新增覆盖分支保持增益。语句、函数、行及其它六包仍沿用原门槛。原PNG/地图等完整合同在各自模块测试；既有fast排除未改动，全包检查与定向结果保留。

三个无生产caller旧出口退役已获用户明确批准；测试去重/迁移及合理baseline调整来自用户本窗口指令与长期授权。六个仍存在文件的计数减少精确绑定main/current数量、身份摘要和最终字节；五新增数据快照，PNG替换原5→4为当前4→3，旧记录留Git及[授权数据桥接](approval-proof.json)。删除文件逐条必须实际不存在，不使用新增ignore/exclude或浮动容差。

数据更新后退役工具首跑140绿/1红：旧负例用字面量10伪造数量，但新首行的合法旧数量恰为10。只将负例改为该前像加1，14条拒绝身份/谓词均保留；复跑141绿/空stderr。此失败是本次测试夹具错误，不是产品红例或规则豁免。

## 全仓首跑失败与必要桥接

所有完整stdout/stderr/命令时间exit都在[native索引](native-index.json)对应成员，首跑从不覆盖。

- `window100-check`：真实loadSceneCommon的测试提取宿主漏了新增collaborator。现在一同提取真实`supplySupplementalSceneObjects`，原13个断言身份不变；未mock生产业务。恢复13绿/空stderr。
- `window100-check-r2`：唯一git hash-object子进程长期0CPU卡住，向该owned子进程发SIGTERM并保留失败；原docs worker11绿及后续125文档测试实际通过。无timeout或执行规则变化。
- `window100-check-r3`：宿主源码变化引起4个E2E证据引用过期。仅更新current sourceRefs及两条同源指针为527–642；相关world-draw用例文字逐字相同。历史quote/status/runtime信用不变，4份已有审查record增量绑定；未运行/声称完整浏览器剧情验收。
- `window100-check-r4`：本树忽略的extracted仍是旧main剧情产物，6个当前游戏用例失败。先APFS clone备份本树209MB输出，按当前正常提取命令完整再生并保留英文只读SLF输入；最终仅6个场景/修订产物变化，英文逐字相同。正常MAP chunk0为空的50B提取notice单独披露，不冒称提取stderr0；没有手改生成物、没有写主树。
- `window100-check-r5`：census测试仍期待pal-win-1；当前producer的canonical值为pal-win-2。只修该期望，43522/639/noop6/clear53/self48及源码SHA断言保留，22例恢复绿/空stderr。
- `window100-check-r6`：editor PAL测试沿用已撤回的“普通敌人改出口”旧总数。当前main保留e4841敌人且另加出口，故五个精确计数分别加1/2；独立删该对象两个可选字段的私有克隆差分，分别证明team267与sprite548两条真实边。增加精确Owner/Target断言、纠正注释，原9身份绿/空stderr；未改content/adapter/schema。migrate另跑96文件740例绿/空stderr。

这些都是受影响测试宿主/夹具/绑定的必要恢复，不获得第101个主体信用。每处A–H有限桥接、原生运行与源恢复证明均在native。

## 低成本复验与限制

在仓库根执行 `node docs/ops/evidence/QUALITY-TOOLS-CONTRACT-TESTS-1/uniform/verify.mjs`。默认只读，核100主体验收身份/A–H、原件字节、当前baseline与原报告投影、六精确退役及有限调整、最终check实际exit/诊断；不再次跑测试或覆盖率。`replay.mjs`需显式设置此回执的protected ref；只有`--ratchet`允许原writer写baseline，普通模式只读。

native原件与两份完整summary均gzip无损保存。下载网络失败的6份本地诊断可能含临时鉴权URL，只公开SHA/省略原因，私有原件仍保留；它们不是代码或测试质量门原件。代码/测试门日志全部保留，未裁剪或脱敏重写。只有仓库/依赖/合同漂移才针对受影响claim复核，不重复全文100审查。

当前机器账本3465tracked／694closed／0review／2771pending；本窗代码接受100，不代表全仓治理完成。不扩其它pending或94–102新范围，发布仍走受保护PR与CI；远端结果未发生前不提前声明。

收口材料首验亦保留：只读复验因三条过短轴描述拒绝，已按既有全文证据补明stores可测依赖及sounds标题/逐项字面值边界，不改源码或降低校验约束。文档首跑125工具绿后报14项：13张done卡仍留活动看板、索引未按终态重新分区；已移出活动看板并用既有生成器重建索引，其它任务行不变。后续只复跑受影响的文档静态门，复用已绿的125工具。
