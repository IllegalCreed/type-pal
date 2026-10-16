# TEST-GLM-NEW-G-1 · Codex r2 独立代码验收

Status: historical
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-17
Template: archive-record-v1 / 1.0.0

本页把 testing archive 材料接入 archive-record-v1。原任务日期、状态、合同、测试数字、失败、counter、机器字段、链接和未执行项在 quote 中保全；本次不授 runtime/E2E/视觉/coverage 信用。

## 历史范围

- 源 revision 64bd3b936eb8fdd0943deba5e476d032a30c1830；本轮 R75。此文件属于 testing archive 历史层，不能单独授权当前测试或发布。

## 原始结论

- TEST-GLM-NEW-G-1 · Codex r2 独立代码验收：原始正文完整保留于下方 quote；本轮只改变文档封套，不改变原始结论。

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

固定 source revision `64bd3b936eb8fdd0943deba5e476d032a30c1830`，source SHA `7e47b90264ba3cc04496448cd7b15840ea6cdd4b0c90ec6c4242ca7ec356b6dd`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # TEST-GLM-NEW-G-1 · Codex r2 独立代码验收
>
> 日期：2026-09-29。候选 `codex/glm-new-g-r1` HEAD
> `fd1189a314e96863f052439cd1d33b01f1e2951d`。结论：**代码与已证功能
> 画面候选 accept；尚未集成 main，任务保持 review，官方统一质量/覆盖门未运行，
> 不标 done**。
>
> - r2 仅改 Wave G 新测、反控/浏览器宿主/证据并恢复共享 README；产品源、
>   旧测、配置/基线未动，工作树干净、diff check 干净。
> - Codex 复跑完整 lint：2647 文件，0 error/0 warning/0 info；Reforge
>   typecheck 零诊断；新增定向 12 文件、45/45 通过，关键相邻 battle-session/
>   battle-core/battle-command-selection/render/screen-fx 五文件 175/175 通过。
> - 三处双强转已清。Canvas 仅以 `Partial<...>` 单次窄化为外部绘制端口替身，
>   不冒充完整浏览器绘制能力；其声明范围内无业务 fixture 强转。
> - 两条无现行调用锚的陈旧缓存断言已删除并登记未证，保留可证的 shift
>   分支测试。反控判据改为 `/tmp` 一次性配置的内存 loader 注入，正式
>   生产源码不写盘；Codex 审核同一判据的 10 组反例自测与四枚回执：
>   对照 exit0、注入 exit1、唯一 failed、绝对 file/fullName、无 skipped/todo、
>   实际执行数、前后产品 hash 和 Git 干净均被记录。为避免重写已提交证据 JSON，
>   本次未在候选树重跑四针，统一集成前可在隔离副本复建。
> - 四张 r2 截图 SHA256 与回执一致，Codex 已看图确认试打/F5/停止恢复画面。
>   8 条失败请求逐 URL 证为 `/projects/pal/.type-pal/save-state.json` 404，
>   但 9 条 console error 中余 1 条无法归因；**console 继续未证**，不宣称
>   零错误或完整 App/E2E 验收。该项由 Codex 在统一视觉补验时处理或保持未证。
> - 候选 docs check 仅缺共享父 README 的 wave-G 导航，由 Codex 集成时补齐。
>   派发校验器的交付后路径误报已在 main `10a5d601` 修复，不归责 GLM。
>
> 后续：与其它已接收 wave 选择性集成，统一串行 `pnpm check` → 官方 ratchet →
> 受保护 fast；正式覆盖收益只按 main 并集实测。未过这些门前不标 done/
> 不清理工作树。
>
<!-- original-source-quote:end -->
