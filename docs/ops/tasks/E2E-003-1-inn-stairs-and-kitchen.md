# E2E-003-1 - 下楼、道士交谈与厨房交代

Status: draft
Phase: phase2
Capability: E2E-R4-1 / W1
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Codex（独立验收）/ e2e_002_runner（独立前提核查）
Visual Verification Owner: Codex / User
Visual Verification Timing: mixed
Contributor: Codex
Branch: TBD

## 用户范围（2026-10-01）

从真实002结束（三苗人全部进房）开始，李逍遥正常下楼到一楼找李大娘交谈，再与醉酒道士交谈，
听到李大娘喊后正常走到厨房，结束于李大娘让把桌上菜端给苗人；不开始拿菜，不跨进004。
用户已见下楼梯动画不对、李大娘后续脚本不对，其后尚未测；不能以这些报告直接猜根因。

## 前提与上下文

- 必读 `docs/phase2/READ-FIRST.md`、`docs/phase2/reference/phase1-knowledge-harvest.md` W/E段、
  `docs/testing/e2e-002.md`、`docs/ops/tasks/E2E-R4-1-route-and-checkpoint-foundation.md`。
- 真正前驱：冻结10e65063 RF002 `build/e2e/reforge-002-2026-09-30T23-09-35-990Z`，
  actual ended SAVE9/content21，SHA `42ac15aff0719f8f11b3f59d6001266c59e2075c715d616f5c75985bcfb0136f`。
  game002 `23-09-37-718Z`另用本引擎真实档，不互相转换。
- 第一阶段/原版内容脚本为演出顺序参考；新引擎靠显式作者脚本，不移植对白全局冻结等隐式耦合。
- 未核项：真实楼梯script/移动/动画调用域，楼下NPC身份与对白矩阵，喊话与厨房接管和003精确结束状态。
  当前只准只读取证与草拟runner；关键前提核实前不得修产品或标build/done。
- 禁止跳场景/坐标瞬移、手造world/替代真实存档、恢复原版转换核、兼容旧版本、放宽采集/超时/像素合同。

## 验收预登记

1. 正式恢复真实002，沿楼梯触发走到一楼，核实际中间位置/朝向/脚步帧、切场/控制恢复；不只比终点。
2. 正常走到大娘/道士交互，按原版内容与第一阶段核说话者、正文、状态选择、局部暂停及喊话偏序。
3. 正常进厨房，等待交代端菜正文及控制恢复，仍未拿菜；核菜还在桌上、无取菜物品/旗标污染。
4. 生产保存与新上下文恢复World/画面；作者校验、相邻回归、全仓静态零诊断；剧情现代化逐项登记。
5. 实际视觉缺陷已由用户明确要求当场试，本轮可一次最小复现；不重复已通过001/002的整段视觉。
   证据位于隔离树build/e2e/，6012保持运行，不刷新用户页面。

## 当前模式推进

- Root单一Coding Owner；独立003前提核查与渲染返工分离，不重叠写入。
- 前提/design/build：pending，待四向真值矩阵和实际复现。
- 用户对本次003起止边界已批准；实现/技术验收不自动替代用户体验判断。

## 下一位 Agent 提示词

无用户转交提示词；e2e_002_runner只读核003一手源与结束边界，Root负责落卡/核准入与实现。
