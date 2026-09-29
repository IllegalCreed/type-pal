# TEST-GLM-NEW-F-1 · Codex r2 独立代码验收

日期：2026-09-29。分支最终 HEAD
`c5ecf694ed4942a42ecd7e32f5f033e785d47b69`；测试/证据返工提交
`08371dc26d05990ca412ef80390eac703eb871de`，HEAD 仅补回执登记。
结论：**代码及既有隔离视觉候选 accept；尚未集成 main，任务保持 review，
官方统一质量/覆盖门未运行，不标 done**。

- 相对首轮候选只改 App 新测、battle-trial-launch 新测后缀、Wave F 反控
  判据/回执/证据与本目录 README；产品源、旧测、共享配置/基线未动。
  工作树干净、diff check 干净。
- Codex 复跑新增定向 **10 文件、22/22 passed**；App 新测单文件不再有
  hoisted `vi.mock` 收集错误。关键相邻 App leave-guard/ScriptEditor/
  PreviewCanvas/FrameAnimationEditor 4 文件、61/61 通过；Editor typecheck
  零诊断。完整 lint：2645 文件，0 error/0 warning/0 info。
- `battle-trial-launch.ts` 的同目录新测已改为 `.glm-next-wave.test.ts`，
  JSX 改类型化 `createElement`；10 个新测路径均与各源扩展名一致。
- `needle-judge.mjs --selftest` 独立通过；非鉴别力注入、错名、非唯一
  注入点、红基线/缺文件均判 INVALID，临时针零遗留。Codex 再用真实
  App 测试做一枚单点业务针：baseline/injected 各实际执行 1 项，
  精确绝对文件/完整 fullName、exit1 与产品 hash 不变全部得到 VALID，
  跑后候选工作树干净。
- Wave F 现有 README 索引了本 wave 回执/判据/浏览器证据；候选 docs check
  唯一 issue 是共享父 README 尚未链接 wave-F，由 Codex 集成时补齐。
  四张功能截图 SHA256 未变，Codex R1 已看图确认取消回显与上传恢复；
  仍仅证明隔离宿主，不升级为完整 App/E2E 验收。

后续：与其它已接收 wave 选择性集成，统一串行 `pnpm check` → 官方 ratchet →
受保护 fast，正式覆盖收益仅按 main 并集实测。未过这些门前不标 done/
不清理工作树。
