# Defects / 未证账 — TEST-CURSOR-ASSET-UI-LARGE-1

## 产品缺陷（本卡只举证不停全卡）

- 无已确认需停整卡的产品缺陷。C02 观测到的「焦点对象外部变更关上传面板」「帧数不足拒新增后类型菜单仍开」按现行为写入断言，未改产品。

## 合同/证据限制

- contracts.json 现 **707** 条（directed 707 passed）；oracle/matcher 为测试源路径级引用，Codex 验收应以测试源 + directed fullName 为准。
- 反控 50 枚有效；部分 manifest 候选因 multi-failed/wrong-fullName 拒收，见 blocked-counters.json。
- 自动脚本预览/完成流（world-sprite-behavior）按派发停线，未作主合同。
- 私有 coverage 不可与官方 baseline 相加；正式收益只认 Codex 并集实测。

## 视觉流程

- 12 条 flows 全 pass（见 flows/flow-index.json）；FLOW-DS03 consoleAttested=false 属 console 归属边角，合同仍经 number oracle 通过。

## 全包 test 环境存量

- `tests/world-sprite-behavior.pal.test.ts` 因本 worktree 缺 `projects/pal/assets/migrated/sprites/*.rle`（ENOENT）失败 2 例；BASE 上同失败，非本卡引入。未越界补真实工程数据。
- 设计系统 boundary「工程」用词：本卡 fixture 已改为「项目」。
