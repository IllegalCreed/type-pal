# CODE69 time-format 测试复审

基点 `d49de5240`，唯一 `codex/code-quality-3y`。修改白名单为三份 time-format 测试及治理记录；生产实现未改，未改 UI、schema/save、资产管线、公共出口、静态或覆盖率规则。本轮 CODE69 当前 partial，旧 done 不作为新的 accept。

## 读取、caller 与 primary

[read-boundaries](read-boundaries.json) 保存全文实现/三测试/overlay/store 和部分 tools-panel caller 的 SHA、行数及限制。overlay 显示墙钟/本次与最佳差值；tools-panel:879-893 将输入文本交给 parseHms，null 只提示格式错误，合法值交给 setSpeedrunBest；store 读回只接受有限非负数。primary 为 speedrun design Task 1 的 H:MM:SS、M:SS、厘秒截断、负数归零/差值合同和真实 caller；SDLPal 无同形态浏览器工具 API。本片不重新实现旧设计中已被后续 finite 修复替代的解析代码。

## 发现与逐文件处理

- `time-format.test.ts`：原 GLM 的小时/厘秒测试只是换数字；把 3,661,234ms 的精确截断 oracle 归回主测试。正常解析与非法文本拒绝职责分开，zero diff 仅保留主测试的符号合同。
- `time-format.boundaries.test.ts`：旧标题“59.995s 进位到60秒”与实际 59.99 断言矛盾，改为截断；原混合 clock/Hms/负数与进位用例拆成各函数的边界合同。负数 Hms oracle 从 GLM 归入本文件；保留 parse 溢出、空白、空段/负号/错误段数/秒越界反例。
- `time-format.glm-phase1-leaves.test.ts`：移除重复小时/负数用例，改核两个独立文本反例：`1e2:00:05` 不能因 Number 可转换就被接受；`1:60:00` 分钟越界时不能靠合法秒数掩盖守卫遗漏。

数量由旧 10 例变为新 14 例：增加来自拆分混合合同；不是覆盖率目标，也没有新增核心 mock/强转/ignore。正常格式、截断/符号、解析拒绝仍用直接字符串/毫秒常量 oracle；无异步或共享状态。

## 反控与恢复

[before-proof](before-proof.json)、[after-proof](after-proof.json) 与 gzip default/JSON 原件保存命令/cwd、退出/信号/spawn、完整 file×fullName、源/临时副本与raw hash；`probe.py` 只在临时副本中修改语法/分钟守卫，正式生产源字节保持，副本全部清理。

| 变异 | 旧10例 | 新14例 | 结论 |
|---|---|---|---|
| control | 10通过 | 14通过 | 恢复对照 |
| 允许科学计数法词法 | 10通过 | 13通过/1个指定 AssertionError | 独立词法反例有判别力 |
| 去掉分钟范围检查，保留秒检查 | 10通过 | 13通过/1个指定 AssertionError | 分钟/秒各自受约束；旧混合越界样本未检出此遗漏 |

未将运行错误、跳过或重复红计为有效针；不是生产修复。旧 GLM 的精确 3,661,234ms / 3,661,000ms / -5ms oracle 已分别保留在主测试和 Hms 负数边界。

## 验证、账本与后续

[test-gates](test-gates.json)：完整 speedrun 与 tools-panel 相邻测试 **20 files / 108 tests passed**，无 failed/pending/stderr；game typecheck 退出0，无诊断。最终 docs/lint/ledger/diff 见 [static-gates](static-gates.json)。本批未运行新全仓 check、coverage ratchet 或 protected fast；旧53波次不能认证本候选，昂贵门留完整模块/集成窗口。

三测试登记已验证：3311 tracked / 285 closed / 44 review / 2982 pending；`time-format.ts` 仍 review，未自行扩大非有限显示输入合同。83卡为47 partial / 36 pending / 0 accept。tools-panel 相邻测试仅作回归，未由本片认证其整文件合法夹具；后续先回查已发现的夹具强转与入口，再继续70及剩余pre‑94卡，94–102/editor优先级不变。
