# QUALITY-PENDING-100-1 — 约百文件代码治理窗口

Status: done
Owner: Codex
Reviewer: Codex（单 Agent；不冒称外部审查）
Phase: ops
Capability: code-quality
Visual Verification Timing: mixed（每个子批按实际风险核定）
Branch: codex/code-quality-94-102

## 目标

按用户2026-10-26指令继续代码治理，约100个实际主体文件后再跑重型 check、集中覆盖率及提交。不把每个2–4文件子批当独立重门/PR窗口。

## 范围

从机器账本 pending 中选择不重叠的模块切片；逐文件八维、必要整改与定向验证持续进行。依赖补读、哈希枚举、未核或有重要未决项的文件不计“已完成审查”，不为凑100而强关。范围逐切片登记；此卡不授权任意产品行为、schema/save/资产管线或公共接口变化。

## 前提真值门

工程调度规则来自用户本次明确要求；八维/测试质量/停止线仍按[长期规范](../code-quality.md)。同一治理分支基点 `123595ac3a651957b36061eacced329369c495e5`，主树不写、同一文件单一 Owner。初始3462 tracked／597 closed／0 review／2865 pending；这不是固定100路径的已审声明。

## 上下文锚点

[总纲](../audits/code-quality-governance.md)、[实时账本](../audits/code-quality-file-ledger.md)、[第一子批](QUALITY-TOOLS-CONTRACT-TESTS-1.md)、[逐文件证据](../evidence/QUALITY-TOOLS-CONTRACT-TESTS-1/README.md)。用户约100是集中收尾的目标，不改变每个文件完成定义。

## 验证

子批运行必要定向、相邻和静态检查，完整原件随各卡保存；重型全仓、官方 coverage/ratchet/protected 留本窗口约100文件冻结后。统一门与PR/main CI未执行时明确待，不以历史绿授予新窗口信用。仍须零诊断才允许提交推送和正常受保护合并；不直接推main或绕过保护。

## 当前模式推进记录

- Codex build allowed：按各子卡白名单逐片进入，单一 Codex 执行；不调用子 Agent，不扩大高风险授权。
- 首批为四个工具专测；完成后写本卡实际计数，后续候选先核账本与Owner。尚未提交、推送或启动新重门。

## 交接

无下一位 Agent 提示词。Codex 持续在本分支补齐相关切片，约100文件后冻结、集中验证与提交；新产品取舍只暂停受影响项。

- 2026-10-26 当前实际17／约100主体文件完成八维并代码接受，来自三子卡4＋4＋9；依赖补读不计。机器3462／614closed／0review／2848pending。局部136工具绿／0诊断；全仓、官方覆盖率和提交仍未启动，继续累计。

- 2026-10-26 累计21／约100主体文件代码接受，新增lint专测1＋manifest三专测；全仓618／0／2844。重门/提交仍未执行，继续收集独立pending切片。

- 2026-10-27 累计42／约100主体代码接受，新增表解析/fixture21；20实际测试文件66例绿/0 stderr。机器账本实际复核3462tracked／639closed／0review／2823pending；全仓、official与提交仍等约100冻结。

- 2026-10-27 累计55／约100主体代码接受（新增13）；用户批准退役5路径不凑主体，含三个既有closed因此账本净新增10closed。3459／649closed／0review／2810pending；52相邻＋22shared、四单点业务反控与native EOS检查完成。重门/提交继续等约100；只有本轮退役/新增及FIRE测试迁移路径为inventory暂存，其余WIP未提交。

- 2026-10-27 累计69／约100主体：事件/纯二进制/编码夹具及RLE接线新增14，MKF重复专测退役不凑数。3460tracked／663closed／0review／2797pending；59定向、66表相邻、11shared与四业务单红成立，YJ2用native核EOS。约100前不运行重门/official或提交。

- 2026-10-27 已外部校验78路径备份、按精确stash29fe53386d0c24ffca52c2b2f65744b301d7ba43恢复，治理分支快进72db417255d8ca4227522420e9185ef468462aa7。非重叠文件逐字节、原12暂存路径恢复；文档冲突合并两方来源。上游8新tracked不增审查信用。tables接受1，guards退役不凑数，累计70／约100；3467／664closed／0review／2803pending。详见共同review的sync与rawTables入口，统一门/official/提交继续延后。

- 2026-10-27 末30资产/渲染主体完成A–H及必要返工，累计100。两PNG重复路径退役不凑数；137定向/相邻及12重叠增量、gameTC/局部静态0。机器3465／694closed／0review／2771pending；冻结当前子卡，下一步只处理统一门与发布，不扩其它pending。

## 本窗口本地验收收口

2026-10-28（JST）：100主体八维及本地统一门接受；本次提交时远端PR/CI/合并尚待，发布以受保护PR实际结果为准。 20536包测试＋732工具测试全部通过、七包typecheck和whole lint error/warning/info为0；唯一official20,188fast/809src，有限计数调整后原报告ratchet/protected0。文件关闭只来自本卡既有逐文件证据，未扩大到其它pending。见[统一原件与只读复验](../evidence/QUALITY-TOOLS-CONTRACT-TESTS-1/uniform/README.md)。本卡done指本地审查/整改/验收，远端发布不是预先完成声明。

## PR30 CI环境合同返工

Codex build allowed：只修animation-assets.rng两测试的fast/full原盘路由与对应证据/精确source pin。远端40529517328唯一ENOENT；原盘合同逐字节迁.pal，fast使用自足真实writer夹具，配置/规则/机制不改。无data红→绿、五定向、extract413/TC0与一个有效业务反控已完成；新官方采集与远端复验仍待。见[CI增量](../evidence/QUALITY-TOOLS-CONTRACT-TESTS-1/uniform/ci-rng/README.md)。

CI返工本地收口：原盘源码逐字节保留，当前extract413/TC0、无data单绿、原生EOS与单点反控成立；当前official20188/809 ratchet0/protected0。实际七包逐文件覆盖计数等于首候选；共两次不同候选采集，因真实CI失败而重采，不伪称一次。全仓20536/732仅作未变包的原件复用。远端PR30复验与合并当前仍待。
