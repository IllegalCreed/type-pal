# TEST-CODEX-CONTENT-RESOURCES-1 — 五组资源索引与引用边界

Status: done
Owner: Codex（本接收对话）
Phase: phase2
Visual Verification Timing: N/A（纯数据/字节与索引合同）
Production Base: `7cac1d72ac0b8a44521a353cc87dbe1d18d65fa5`
Last reviewed: 2026-10-18
Governance Owner: Codex（历史卡文档治理；不代签原执行）
Template: task-card-v1 / 1.0.0

本卡是 content 模块五组资源索引/引用边界的纯测试历史记录（2026-09-26 用户授权并行补覆盖）：R1 frame-sequence（容器 parse/encode/decode、UTF-8 与索引/块边界）、R2 script-library（index/chunk 校验、分桶/导入/所有者冲突）、R3 asset（目录/角色与 tagged/canonical 引用边）、R4 enemy-team-reference（JSON 树真实 tag 递归、完整 where、同名非 tag 不误报）、R5 project-map（公开校验/序列化/实例查询剩余轴）。

## 目标

为当前 content 公开入口补五组合同回归：合法对照与字节保真、CRUD 归一化与输入不变、非法输入明确防御域、同一 canonical 往返。

## 范围

- 范围内：五份新 `<模块>.resource-boundaries.test.ts` 与可选 codex-resource-contract-fixtures.ts、专属证据 codex-content-resources/**。
- 范围外：产品/旧测试/配置/阈值；另一对话的 A3/B1 架构、GLM 三守卫叶、Cursor 八组命令文件；可达性未知的 156 臂不称可交付数量。

## 前提与证据

一手真值=当前 content 公开入口/类型/现行 guard（原版/一阶段 N/A）；fast LCOV 与冻结机账的 codex 组仅定位未命中；最强替代解释（已测上层重复或守卫后不可达防御）先读旧测试去重。R4 公开 helper 暂无生产调用者，仅锁 API 合同不冒称产品缺陷；原始字节格式可在测试构造独立最小容器，不复制生产算法作唯一 oracle。
- 当前状态：done（历史终态）

## 验收

原卡记录：五文件 65 项、定向 65/65、content 931/931 与 TC、5 代表业务负控通过；收口实现 d1e99a0d，全仓 check8896、ratchet 与保护 7d64de13 单次 strict-fast 8404/701 通过；与 GLM 已接收 91 项并集 +156 测试/+134 分支/+73 行，原生产分母与另六包基线不变。本页未复跑。本页治理验收：quote 字节保全与模板合同。

## 状态与交接

原卡 Codex 实施自验如实披露、核定 done；其它覆盖缺口与 full/Q1/Q2 另排。无下一位 Agent 提示词。本页治理不重授。

## 历史范围

2026-09-26 准入、实施与收口同日；固定源 bb7b1d24e9e517e09730282b104ce51b4204cb0b。2026-10-17 R42 泛化封套，2026-10-18 S15 改写。

## 原始结论

`Status: done`：五组资源索引/引用边界按纯测试批收口。原卡全文在下方 quote 保全。

## 当时证据

五组缺口表（49/19、57/18、29/13、11/12、10/2 B/L）、冻结机账 coverage-parallel-wave3-evidence.json、并集机账 evidence.json。本页治理未新增执行。

## 当前有效性

historical。content 合同现行状态以当前代码与测试为准。

## 继任文档

同批系列 codex-* 批回执；现行 guard 以 content/src 各 validator 为准。

## 原文保全

固定源 revision `bb7b1d24e9e517e09730282b104ce51b4204cb0b`，source SHA `cb1fb6872a6bb4b653de7b942e126b10dd32936b14eb4ae6c1a6a5f9e561cd8b`；下方 quote 逆回读规则：直接逐字节相等（逐行剥 "> " 或空行裸 ">"，零额外变换）。
<!-- original-source-quote:start -->
> # TEST-CODEX-CONTENT-RESOURCES-1 — 五组资源索引与引用边界
>
> Status: done
> Owner: Codex（本接收对话）
> Phase: phase2
> Visual Verification Timing: N/A（纯数据/字节与索引合同）
> Production Base: `7cac1d72ac0b8a44521a353cc87dbe1d18d65fa5`
>
> ## 前提与范围
>
> 2026-09-26用户授权本对话并行补覆盖，Codex核 **premise verified / build allowed**。
> 不接管另一对话A3/B1架构，也不占GLM三守卫叶或Cursor八组命令文件。
> 一手真值是当前content模块的公开入口/类型/现行guard，原版/第一阶段N/A；保持当前格式，不发明旧版本兼容。
> 现有fast LCOV与[冻结机账](../../../../testing/archive/legacy/quality/quality-gates/coverage-parallel-wave3-evidence.json)的codex组仅定位未命中，
> 不把可达性未知的156臂称作可交付数量。最强替代解释为已测上层的重复或守卫后的不可达防御；先读旧测试去重。
>
> | 组 | content/src目标 | 缺口B/L | 范围 |
> |---|---|---:|---|
> | R1 | frame-sequence.ts | 49/19 | 真实容器parse/encode/decode、UTF-8与索引/块边界、时序选项；合法对照与字节保真 |
> | R2 | script-library.ts | 57/18 | 当前脚本index/chunk校验、分桶/导入/所有者冲突、CRUD归一化与输入不变 |
> | R3 | asset.ts | 29/13 | 当前asset目录/角色与tagged/canonical引用边，非法输入明确防御域 |
> | R4 | enemy-team-reference.ts | 11/12 | JSON树真实tag递归、完整where和稳定顺序、同名非tag不误报 |
> | R5 | project-map.ts | 10/2 | 公开校验/序列化/实例查询剩余轴、同一canonical往返与输入保真 |
>
> 新增仅`<模块>.resource-boundaries.test.ts`五文件，可选`__tests__/codex-resource-contract-fixtures.ts`；
> 专属证据`docs/testing/archive/legacy/batches/codex-content-resources/**`。产品/旧测试/配置/阈值零改；实际缺陷单列，不用绿预期掩盖。
> guard成功样本先走正式validator，坏输入仅破一轴，完整错误message/字节输出或引用数组、实际参数深快照。
> 不访问私有实现。原始字节格式可在测试构造独立最小容器，不复制生产算法作唯一oracle。
>
> ## 验证与收口
>
> 按整个资源域连续开发，定向/相邻/TC/代表负控；不逐文件跑覆盖。
> 完成后串行全仓check→官方ratchet→受保护单次strict-fast，统计实际并集和未证项。
> 本批Codex实施及自验不冒称贡献者独立审查；按当前模式自行收口。视觉N/A，full/Q1/Q2另排。
> 无下一位Agent提示词，本对话持续实施。
>
> ## 实施记录
>
> 2026-09-26：五文件65项已落，定向65/65、content931/931与TC、5代表业务负控通过；
> 见[实施/去重回执](../../../../testing/archive/legacy/batches/codex-content-resources/README.md)。R4公开helper暂无生产调用者，仅锁API合同，
> 不冒称产品缺陷；不可达/超大内存防御不强造。与GLM已接收91项并集跑一次全仓门后再done。
>
> 2026-09-26收口：实现`d1e99a0d`，全仓check8896、ratchet与保护7d64de13单次strict-fast8404/701通过。
> [并集机账](../../../../testing/archive/legacy/batches/codex-content-resources/evidence.json)：与GLM合计+156测试/+134分支/+73行，
> 原生产分母/文件及另六包基线不变。本批Codex实施及自验如实披露，核定done；其它覆盖缺口、full/Q1/Q2另排。
<!-- original-source-quote:end -->
