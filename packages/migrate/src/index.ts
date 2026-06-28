/**
 * @type-pal/migrate — 第二阶段迁移器（空壳占位）。
 *
 * 职责：一次性把第一阶段产物（data/extracted，经 @type-pal/shared 解码）转成 content
 *   数据模型的内容数据 —— 原版脚本 / 对话 / 数据表 → content schema 实例；原版 indexed
 *   素材 + palette → 烘 RGBA 资产（D15）；原版全局下标 → 稳定 id。
 * 依赖边界：依赖 content（目标 schema）+ shared（读原版解码）——
 *   **是唯一合法依赖第一阶段 shared 的第二阶段包**（两阶段桥）；不依赖 reforge / editor。
 * 见 content-schema §8、decisions D18 / D15。
 * 状态：占位。③ 阶段（schema 被切片验证稳定后）正式实现。
 */
export const MIGRATE_PLACEHOLDER = true
