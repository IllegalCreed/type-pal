# TEST-GLM-NEW-G-1 · Codex r2 独立代码验收

日期：2026-09-29。候选 `codex/glm-new-g-r1` HEAD
`fd1189a314e96863f052439cd1d33b01f1e2951d`。结论：**代码与已证功能
画面候选 accept；尚未集成 main，任务保持 review，官方统一质量/覆盖门未运行，
不标 done**。

- r2 仅改 Wave G 新测、反控/浏览器宿主/证据并恢复共享 README；产品源、
  旧测、配置/基线未动，工作树干净、diff check 干净。
- Codex 复跑完整 lint：2647 文件，0 error/0 warning/0 info；Reforge
  typecheck 零诊断；新增定向 12 文件、45/45 通过，关键相邻 battle-session/
  battle-core/battle-command-selection/render/screen-fx 五文件 175/175 通过。
- 三处双强转已清。Canvas 仅以 `Partial<...>` 单次窄化为外部绘制端口替身，
  不冒充完整浏览器绘制能力；其声明范围内无业务 fixture 强转。
- 两条无现行调用锚的陈旧缓存断言已删除并登记未证，保留可证的 shift
  分支测试。反控判据改为 `/tmp` 一次性配置的内存 loader 注入，正式
  生产源码不写盘；Codex 审核同一判据的 10 组反例自测与四枚回执：
  对照 exit0、注入 exit1、唯一 failed、绝对 file/fullName、无 skipped/todo、
  实际执行数、前后产品 hash 和 Git 干净均被记录。为避免重写已提交证据 JSON，
  本次未在候选树重跑四针，统一集成前可在隔离副本复建。
- 四张 r2 截图 SHA256 与回执一致，Codex 已看图确认试打/F5/停止恢复画面。
  8 条失败请求逐 URL 证为 `/projects/pal/.type-pal/save-state.json` 404，
  但 9 条 console error 中余 1 条无法归因；**console 继续未证**，不宣称
  零错误或完整 App/E2E 验收。该项由 Codex 在统一视觉补验时处理或保持未证。
- 候选 docs check 仅缺共享父 README 的 wave-G 导航，由 Codex 集成时补齐。
  派发校验器的交付后路径误报已在 main `10a5d601` 修复，不归责 GLM。

后续：与其它已接收 wave 选择性集成，统一串行 `pnpm check` → 官方 ratchet →
受保护 fast；正式覆盖收益只按 main 并集实测。未过这些门前不标 done/
不清理工作树。
