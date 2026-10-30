# reforge-save-dialog-menu(save/dialog/menu-box 已读件)八维复审批

> Codex当前裁定（2026-10-19）：本页保留作者阶段证据，未获整包/全维收口验收；可复用范围、逐文件依据与未知项见[当前返工记录](../codex-stage2-rework.json)。

- 批次:pre-94 foundation 模块 14 批 42(reforge 包批 3)
- 基线:origin/codex/code-quality-3y @ 53db76bbbb(候选线 77+ 提交)
- Coding Owner:GLM;save 全 7 文件 + dialog/layout + dialog/slot + narration-scroll + menu 已读件全文读毕(save scope 44/types 54/ops 82/browser-state 89/store 141/current-codec 147/current-structure 389;dialog/layout 93;menu item-list 140/equip-box 主体/system-box 95/reward-gain 族)
- **零整改批**(零代码/注释改动,工作树零 diff)

## 零整改依据

- **save/current-structure(SAVE-PREFLIGHT-1)**:eachIndex 显式下标防 forEach 稀疏洞漏检;toast 固定短文案附像素宽实测论证(hiddenExp["luck"].exp ≈248px 超 200px 可视区);"数值叶只要求有限数——不发明数值上限/取整/非负(脚本世界态有分数格位移)";appearance.portrait null 语义不外推声明。
- **save/current-codec**:preflight 在任何兼容 I/O 前拒绝;sceneRuntime 逐实体/逐动作/逐 automatic 的身份闭包校验(移动缺 resume 指令/动作缺 automatic owner/续跑 cursor 与 canonical world 不一致均 fail)。
- **save/store**:IDB 三 store 一事务原子 + 同步请求错误显式 abort 防半提交;Memory 深拷贝防外部突变。
- **save/browser-state**:auto/quick 不可手动写/已存手动槽覆盖确认/load 空槽不可读三态门。
- **dialog/layout**:\n 强制另起行"迁移器用 \n 保留这条数据边界;连续换行不能被宽度排版吞掉";相邻同色 run 合并。

## 验证

- 定向(save 全族 + dialog/layout + reward-gain-queue):**0 failed suites**(计数见 json) → [directed.json](directed.json)
- typecheck 批40 已核 exit 0;工作树零 diff

## 登记项

无新增。
