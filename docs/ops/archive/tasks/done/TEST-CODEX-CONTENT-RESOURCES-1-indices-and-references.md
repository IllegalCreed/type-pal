# TEST-CODEX-CONTENT-RESOURCES-1 — 五组资源索引与引用边界

Status: done
Owner: Codex（本接收对话）
Phase: phase2
Visual Verification Timing: N/A（纯数据/字节与索引合同）
Production Base: `7cac1d72ac0b8a44521a353cc87dbe1d18d65fa5`

## 前提与范围

2026-09-26用户授权本对话并行补覆盖，Codex核 **premise verified / build allowed**。
不接管另一对话A3/B1架构，也不占GLM三守卫叶或Cursor八组命令文件。
一手真值是当前content模块的公开入口/类型/现行guard，原版/第一阶段N/A；保持当前格式，不发明旧版本兼容。
现有fast LCOV与[冻结机账](../../../../testing/coverage-parallel-wave3-evidence.json)的codex组仅定位未命中，
不把可达性未知的156臂称作可交付数量。最强替代解释为已测上层的重复或守卫后的不可达防御；先读旧测试去重。

| 组 | content/src目标 | 缺口B/L | 范围 |
|---|---|---:|---|
| R1 | frame-sequence.ts | 49/19 | 真实容器parse/encode/decode、UTF-8与索引/块边界、时序选项；合法对照与字节保真 |
| R2 | script-library.ts | 57/18 | 当前脚本index/chunk校验、分桶/导入/所有者冲突、CRUD归一化与输入不变 |
| R3 | asset.ts | 29/13 | 当前asset目录/角色与tagged/canonical引用边，非法输入明确防御域 |
| R4 | enemy-team-reference.ts | 11/12 | JSON树真实tag递归、完整where和稳定顺序、同名非tag不误报 |
| R5 | project-map.ts | 10/2 | 公开校验/序列化/实例查询剩余轴、同一canonical往返与输入保真 |

新增仅`<模块>.resource-boundaries.test.ts`五文件，可选`__tests__/codex-resource-contract-fixtures.ts`；
专属证据`docs/testing/codex-content-resources/**`。产品/旧测试/配置/阈值零改；实际缺陷单列，不用绿预期掩盖。
guard成功样本先走正式validator，坏输入仅破一轴，完整错误message/字节输出或引用数组、实际参数深快照。
不访问私有实现。原始字节格式可在测试构造独立最小容器，不复制生产算法作唯一oracle。

## 验证与收口

按整个资源域连续开发，定向/相邻/TC/代表负控；不逐文件跑覆盖。
完成后串行全仓check→官方ratchet→受保护单次strict-fast，统计实际并集和未证项。
本批Codex实施及自验不冒称贡献者独立审查；按当前模式自行收口。视觉N/A，full/Q1/Q2另排。
无下一位Agent提示词，本对话持续实施。

## 实施记录

2026-09-26：五文件65项已落，定向65/65、content931/931与TC、5代表业务负控通过；
见[实施/去重回执](../../../../testing/codex-content-resources/README.md)。R4公开helper暂无生产调用者，仅锁API合同，
不冒称产品缺陷；不可达/超大内存防御不强造。与GLM已接收91项并集跑一次全仓门后再done。

2026-09-26收口：实现`d1e99a0d`，全仓check8896、ratchet与保护7d64de13单次strict-fast8404/701通过。
[并集机账](../../../../testing/codex-content-resources/evidence.json)：与GLM合计+156测试/+134分支/+73行，
原生产分母/文件及另六包基线不变。本批Codex实施及自验如实披露，核定done；其它覆盖缺口、full/Q1/Q2另排。
