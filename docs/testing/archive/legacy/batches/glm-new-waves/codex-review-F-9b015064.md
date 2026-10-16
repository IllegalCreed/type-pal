# TEST-GLM-NEW-F-1 · Codex 独立审核 r1

Status: historical
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-17
Template: archive-record-v1 / 1.0.0

本页把 testing archive 材料接入 archive-record-v1。原任务日期、状态、合同、测试数字、失败、counter、机器字段、链接和未执行项在 quote 中保全；本次不授 runtime/E2E/视觉/coverage 信用。

## 历史范围

- 源 revision 64bd3b936eb8fdd0943deba5e476d032a30c1830；本轮 R75。此文件属于 testing archive 历史层，不能单独授权当前测试或发布。

## 原始结论

- TEST-GLM-NEW-F-1 · Codex 独立审核 r1：原始正文完整保留于下方 quote；本轮只改变文档封套，不改变原始结论。

## 当时证据

- 原始命令、输入、caller/oracle、结果、机器字段、SHA、counter、链接和未执行项保留于 quote。

## 当前有效性

historical。历史测试结论必须带日期和 source revision，并由当前 catalog、contract、fresh receipt 重新核定。

## 继任文档

- 当前入口：对应 testing catalog/domain report、contract、paired evidence 和 fresh receipt。
- 若重新启用：补齐合法输入、真实 caller/oracle、排重、独立 review 和静态零诊断。

## 停止线

- 本页不证明 runtime、E2E、视觉、coverage 或当前产品行为；不得以 archive wrapper 替代执行回执。

## 原文保全

固定 source revision `64bd3b936eb8fdd0943deba5e476d032a30c1830`，source SHA `674a24a8031c1fb9f8609edefb9b9a4b6e2fabb9a3654ff473dda4f029052727`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # TEST-GLM-NEW-F-1 · Codex 独立审核 r1
>
> 日期：2026-09-29。分支最终 HEAD
> `9b0150643ee65749678780011ae0fc8380dd2034`；测试/证据内容提交
> `38d849a170e97b59c743660f1b3c3bc7816b9bb8`，后者之后仅回执 SHA 登记。
> 结论：**rework，未合 main，未运行官方 ratchet/受保护 fast**。
>
> ## 已独立验证
>
> - 产品源、旧测、共享配置/基线未改；候选工作树干净、diff check 干净。
>   Editor typecheck 零诊断。
> - 四张截图 SHA256 与回执一致；Codex 实际看图确认等待命令取消后仍为 17ms、
>   48×16 上传预览恢复为三帧。只证明隔离宿主，非完整 App/E2E。
> - 派发版 `verify-targets.mjs` 误将交付后新测试判路径占用，是 Codex 脚本缺陷，
>   已在 main `10a5d601` 修复，不归责 GLM。
>
> ## 必须返工
>
> 1. 当前 HEAD 的新增测试**不全绿**：Codex 复跑整个 `glm-next-wave` 文件集为
>    9 文件 passed、1 文件 failed，21 测试通过；单跑
>    `packages/editor/src/ui/App.glm-next-wave.test.tsx` 也在收集阶段失败、0 测试。
>    `App.glm-next-wave.test.tsx:19–21` 的 hoisted `vi.mock` factory 引用尚未初始化的
>    静态导入 `memoryAuthorSaveStore`，Vitest 报 `ReferenceError: Cannot access
>    '__vi_import_2__' before initialization`。改为 hoist-safe 的真实现/测试端口装配，
>    不降低组件验证范围；重新生成 HEAD 的新鲜 10 文件 `file/fullName/status` 回执，
>    不能沿用旧 22/22 JSON。
> 2. 完整 `pnpm lint` **失败：1 error**，为提交的
>    `wave-F/evidence/vitest-final.json` 格式诊断；按原规则格式化，复跑完整
>    0 error/0 warning/0 info。
> 3. `packages/editor/src/core/battle-trial-launch.ts` 的新测试却命名
>    `battle-trial-launch.glm-next-wave.test.tsx`，不符合冻结表同源扩展名规则。
>    改为 `.test.ts`（必要时用 `createElement` 等类型化写法去 JSX），更新
>    回执/针路径后独立复跑。其余 9 个新测路径与源扩展名一致。
> 4. `wave-F/needle-judge.mjs:30–34/116–162` 在注入 `try` 内用 `process.exit`
>    宣告 INVALID，会跳过 `finally`，遗留 `.needle-tmp.test.*`；失败文件与
>    fullName 又仅用 basename/子串匹配，未核汇总 failed 恰 1 或确切绝对路径。
>    修为所有 VALID/INVALID/异常均清理，精确核文件、完整名称、执行数、
>    skipped/混错/timeout/exit2 与产品 hash；用同一判据的自测证明反例，
>    再重跑四枚代表针。不要把隔离截图代替业务反控。
> 5. `wave-F/receipt.md` 是该子目录唯一 Markdown，却没有 `wave-F/README.md`：
>    候选 docs check 报“含 Markdown 的文档目录缺少 README 索引”，此项在 GLM
>    专属证据白名单内可修（可将回执整理为本目录 README）。父目录缺 wave-F
>    导航是 Codex 的共享索引工作，不要求 GLM 越界修改父 README。
>
> 只改 Wave F 原白名单，不碰产品、旧测、共享配置/基线或其它分支。
> 新候选须复跑 10 文件定向+相邻、editor typecheck、完整 lint 0/0/0、
> docs/diff 与严格四针，推送固定完整 SHA 后交 Codex 再审。
>
<!-- original-source-quote:end -->
