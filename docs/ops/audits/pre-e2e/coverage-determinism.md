# 编辑器覆盖率确定性调查

日期：2026-09-06；Owner：Codex；产品/测试基线：`2ac4a9de`，取证前工作树干净。
状态：**已定位测试覆盖缺口，正式修复未开始**。
任务：[TEST-COVERAGE-DETERMINISM-1 r1](../../tasks/TEST-COVERAGE-DETERMINISM-1-editor-ratchet.md)，三方设计准入已齐，正式测试实现已交 GLM；本调查回执不是修复完成回执。

## 结论与因果证据

`packages/editor/src/ui/design-system/reorder.tsx:730`：

```ts
if (!selected) return
```

这是自动滚动回调的合法保护分支。有效拖动可以没有滚动容器（scrollOwners 为 []），此时该帧应直接返回，
不滚动页面、不发送重排命令，之后有效 drop 仍可正常提交。容器收集见 :382，回调早期有效性检查见 :699，
调度见 :737；[设计系统合同](../../../phase2/specs/editor-design-system.md)规定 hover/auto-scroll 零命令、drop 最多一次。

既有 `reorder.test.tsx:370` 的 mouse/touch/pen 用例未控制 RAF，pointermove 后立即 pointerup，
帧可能在拖动结束前运行，也可能被取消。`:769` 已有受控帧测试，但验证的是**有可滚动 modal 容器**，
没有明确覆盖这个返回。生产实现正确，不能删 guard 或改变自动滚动语义来消除覆盖率波动。

## 取证方式

1. 先固定 Node `22.19.0`、pnpm `10.29.2`、Vitest/V8 provider `4.1.7`，读取当前 fast 真源配置。
   editor 为 **213 个生产文件 / 177 个测试文件 / 1,600 项**，测试 identity digest
   `014259d9153f6366574ce5c88db1e43975a0f520971919fe69bb09faf3819acc` 与 execution digest
   `a505eb47698d206d1eae4db93219382e73a63c4ee55190171bddcedd6ef9626c` 均与提交基线一致。
2. 预先限制最多六次串行原样 editor fast 诊断；六次全绿、逐文件 covered/total 相同，随后停止。
   不以此当作概率证明或多数通过；逐次 statement 命中次数提示需要进一步控制帧时序。
3. 临时日志钩子找到真实测试中的无容器返回；正式因果对照不注入生产源码，只在内存加载
   `reorder.test.tsx` 时增加排队/取消 RAF 的测试控制。hold 不推进无容器帧；flush 在 mouse 有效拖动内、
   pointerup 前仅推进一帧。两个配置都保留全部原断言。
4. 单文件两组均 **23/23 通过**：返回语句 statement 313（730:19）从 0→1；branch 127（730:4）
   的 true 分支从 0→1。其余语句/分支的 covered 布尔值不变，行/函数计数不变。
5. 全 editor fast 范围两组均 **1,600/1,600 通过**，分母与文件集合完全相同；逐文件差异唯一是 reorder.tsx：

| 模式 | editor statements | editor branches | reorder statements | reorder branches |
|---|---:|---:|---:|---:|
| hold | 23,455 / 31,407 | 18,168 / 27,329 | 599 / 651 | 444 / 535 |
| flush | 23,456 / 31,407 | 18,169 / 27,329 | 600 / 651 | 445 / 535 |

两组 editor lines 均 21,199/27,409，functions 均 5,907/8,030；flush 恰回到已提交的高基线。
未运行 ratchet，未修改任何基线、生产源码、正式测试、锁文件或全局配置。没有使用 stash/checkout。
这是诊断调度干预的结果，**不是未经修改测试配置的正式 fast gate，也不是七包 full coverage**。

## 边界与替代解释

- 相同树、相同测试、相同生产文件集合，只改变帧时机即可精确复得差额，排除了本次对照的范围漂移、
  舍入或聚合算法解释。返回分支的触发本身不涉及存档代码；editor 相关源/测试在 SAVE-PREFLIGHT-1 前已存在。
- `/tmp/cov2.log`、`/tmp/cov4.log` 的历史差额与本次一致，但没有保存其逐文件报告；
  **不追认每次历史失败都来自这一个分支，也不追认“clean HEAD 10 次/约 1/6”统计**。
- 未发现需要改变产品行为的证据。先补明确业务回归，不全局同步 RAF、不延长 sleep、不降低门槛。
- 后续若仍出现差额，保留新失败、继续逐文件定位，不能因为本分支已补测就一概忽略其他不确定性。

## 复跑与证据位置

```sh
# 快速因果对照：既有 reorder 23 项，两个帧时机各跑一次
node docs/ops/audits/pre-e2e/probe-editor-coverage-timing.mjs

# 同一干预扩到整个 editor fast 范围（不是 pnpm coverage:full）
node docs/ops/audits/pre-e2e/probe-editor-coverage-timing.mjs --full
```

探针与[临时加载配置](probe-editor-coverage-timing.config.mts)只在内存转换一份测试，运行输出写独立临时目录；
产品树有未提交变化时拒绝启动，不自动还原文件。每次保存 SHA/环境/源摘要、命令、测试 JSON、覆盖率 JSON 与差异。
它断言的是当前缺口，修复后可能不再成立；属于历史审计证据，不作为正式回归或 CI 门禁。

初始完整取证：`/tmp/type-pal-editor-cov-det.LMxDo9/`，包含 `run-1..6`、`timing-hold/flush`、
`full-hold/flush` 与各次命令/差异。永久探针的快速复跑见本机
`/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/type-pal-editor-coverage-timing.IdnFzT/`。
永久探针全 editor 双调度复跑见同一临时根目录的 `type-pal-editor-coverage-timing.AckhLk/`，
两组 1,600 项全部通过，计数与表格逐项相同；探针格式/导入整理后仍可复现。
临时目录不承诺长期存在；持久结论与复跑源码留在仓库，不提交完整 HTML/PNG/海量 coverage 产物。

## 下一步

GLM 拟只新增一个独立受控帧测试及自动生成基线；Codex 核提交树、先红负控制和门禁，Kimi 独立审查。
本回执只完成取证，不单独授权 build、不宣称缺口已修。设计、白名单、准入汇总和当前实现提示词见任务卡。
