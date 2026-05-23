import { FPS_EXPLORE } from '@type-pal/shared'

/**
 * M0 占位 —— 验证从 @type-pal/shared 跨包导入工作。
 * M1 起这个文件会变成 MKF 解析的入口。
 */
export function describeEngine(): string {
  return `pal-extract @ ${FPS_EXPLORE}fps explore`
}
