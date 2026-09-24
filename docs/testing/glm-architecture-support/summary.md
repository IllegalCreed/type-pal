# ARCH-SUPPORT-GLM-1 · 总报告（GLM 八包准备取证，r1）

日期 2026-09-25。贡献者：GLM（证据/测试贡献者，**不充独立第三方**）；接收复核：Codex。
任务卡：[ARCH-SUPPORT-GLM-1](../../ops/tasks/ARCH-SUPPORT-GLM-1-eight-audit-packages.md)（draft，不进 build）。

## 起点/终点与白名单核验

- 起点 SHA `3270473862d1e1574f266b70b65de89ca8b65352`；八包各自独立提交；最终 SHA=push 时分支 tip（见 git log）。
- 冻结核验：`git diff b11d4bc9..32704738 -- packages/ scripts/` 输出空；本轮 `git status` 在视觉操作后核验为
  0 改动（会话内临时改动经刷新丢弃，无任何工程写盘）。
- 本轮只写 `docs/testing/glm-architecture-support/**`（9 文件：v0 小样 + p1~p6 + v1/v2 + evidence.json +
  summary + README 登记）；未改产品/正式测试/配置/基线/共享看板/任务卡；未跑全仓 check/ratchet/strict、
  未跑迁移写盘、未跑完整剧情 E2E；未触碰 A3 帧循环（main.ts/runtime-frame-session 等 Codex 工作区）。
- 独立 worktree `/Users/zhangxu/illegal/type-pal-glm-architecture`、分支 `codex/glm-architecture-support-r1`，
  从含工作包的提交建立，未在 main 目录切分支。

## 八包确证事项（每包详据见对应报告+evidence.json 条目）

| 包 | 确证要点 | 条目 |
|---|---|---|
| P1 App 所有权 | 16 effect/3 listener/4 rAF/1 RO 全部对称清理（除 derivedStore.start 无 stop——risk）；导航/保存/历史/试玩边界图完成；20+ 条回归标题对账；卸载路径无测试覆盖（证据空白如实列） | P1-001~006（4 risk/1 covered/1 N/A） |
| P2 MapMode | 手势 ref 全私有、会话/项目切换清场有 5 条标题实证；pointerCancel 缺口+双 effect 重叠+吞错三 risk；58 条标题（对账 20） | P2-001~005（3 risk/2 covered） |
| P3 脚本表单 | 50 命令族分派全景；42 条标题对账；focusRevision 三连可抽 hook；JSON 指纹比较线性成本 | P3-001~005（2 risk/2 covered/1 N/A） |
| P4 战斗会话 | done Promise 单构造+双闸收口+两级屏障 token 配对；拆分顺序与三处不可跨 await 区；87 条标题对账（含本席贡献的 46 条，已声明贡献者身份） | P4-001~004（2 risk/1 covered/1 N/A） |
| P5 一阶段环 | 实测环=6 文件两环（非卡面"7 文件环"）；最短无行为切边=getCurrentMapNum 模块态搬家；703 条既有测试为回归门 | P5-001~004（2 risk/1 covered/1 N/A） |
| P6 迁移/校验 | 翻译/校验层零 fs、写盘单点在事务 commit；校验递归调用域逐边列出；89+ 条标题对账；mapScenesStatic 参数矩阵与 walkBody 深度两 risk | P6-001~005（2 risk/2 covered/1 N/A） |
| V1 表单视觉 | 试打方案/我方预设/技能多选弹层/768 降级 5 条截图链路（实际看图）；两条 risk：弹层过滤输入无可访问名（a11y）、多选"逐击提交+Esc 仅关"语义与草稿模型不一致（请产品裁定） | V1-001~005（2 risk/1 covered/1 N/A/1 blocked） |
| V2 工作区视觉 | 三栏工作区/弹窗遮挡与焦点/Esc 零创建/tab 切换/空态/768 菜单收纳 5 条截图链路；对象列表折叠 toggle 操作未生效——如实 blocked 留复核 | V2-001~004（1 risk/2 covered/1 blocked） |

**机械小计**（evidence.json 由脚本可复算）：32 条 = covered 12 / risk 13 / blocked 2 / reproduced **0** / N/A 5。
**reproduced=0 是如实结果**：本轮所有 risk 均为静态读出或视觉观察，无一经过运行时复现——按取证纪律
不把 grep 命中当缺陷复现，也不为凑数发明缺陷。

## 视觉通路与小样

V0 小样（`v0-visual-sample.md`）先于八包交付：真实操作（tab 切换）→截图→判读全链路成立，
 locator 超时重建过程如实记录。11 张截图全部在 `/tmp/glm-arch-visual/`（不入 Git），SHA256 前 16 位
 与 viewport 登记于 evidence.json.screenshots。

## 未证风险（如实，交 Codex 复核）

1. **对象列表折叠 toggle 无可见变化**（V2-002）：两类定位途径各一次未生效，原因未定位；6010 正式环境一次复核即可裁决。
2. **画布内容全未判定**：worktree 资源接入不完整（tileset bytes/标准色彩 JSON 404），canvas 内渲染、
   精灵、调色板属资源完整环境（6010/6051）的复核范围。
3. **ActorMode/TrialDialog/物品·敌队·战场 Tab 独立页**未截图（V1-005 blocked）。
4. P1-001 derivedStore 生命周期语义需运行验证；P5 循环初始化顺序无运行证据（703 条测试全绿为间接证据）。
5. 面板分隔条拖拽未验证（V2-003）。

## 建议可拆实施批次（供实施卡参考，非本包执行）

1. **零行为批**：P5-002 getCurrentMapNum 搬家；P2-003 双 effect 合并；V1-003 过滤输入补 aria-label（一行）。
2. **低风险批**：P4-002 先建 transitionUi 单点再拆 render/输入路由；P3-002 抽 useFocusRevision hook。
3. **中风险批**：P1 导航簇自洽拆分（reference-navigation 族作回归门）；P2 手势单元拆分（补 pointerCancel 归零）。
4. **最后**：P1 保存流程（lease/recoverySnapshot/journal）单独卡，leave-guard 八条作门。
5. **最小正式回归集合**：P1 三测试文件 + MapMode.test.tsx 生命周期 20 条 + battle 六 flows 46 条 +
   event-system/scene-system 抽样（P5 表）+ reference-navigation 全族。

## 复算命令

```bash
cd /Users/zhangxu/illegal/type-pal-glm-architecture
git log --oneline 32704738..HEAD                    # 八包提交序列
git diff 32704738..HEAD --stat                       # 应只含 docs/testing/glm-architecture-support/**
git diff b11d4bc9..32704738 -- packages/ scripts/   # 冻结漂移=空
node -e "const e=require('./docs/testing/glm-architecture-support/evidence.json');console.log(e.entries.length, e.mechanicalSubtotals)"
grep -c "test(" packages/editor/src/ui/MapMode.test.tsx                # 58
grep -rc "test(\|it(" packages/game/src/core/event-system.test.ts      # 331
# 视觉复验：dev 6013 + 截图 SHA256 对照 evidence.json.screenshots
```
