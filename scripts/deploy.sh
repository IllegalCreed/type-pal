#!/bin/bash
# ============================================================
# type-pal 一键部署脚本
# 用法: ./scripts/deploy.sh [app|data|all] [--skip-check]
#
#   app   - 仅部署应用壳(index.html + assets + soundfont 等,~33MB)
#   data  - 仅同步 extracted 资源树(~580MB,rsync 增量)
#   all   - data + app(默认;先数据后应用,新壳不会踩到缺数据)
#
#   注:Service Worker(dist/sw.js,register updateViaCache:'none')自更新,无需 nginx 特殊配置;
#       asset-manifest.json 随 data 目标同步。若重跑过 pnpm extract,务必用 all(data 同步新清单)。
#
# 部署策略(沿用 quiz-monorepo 的"本地构建 → 原子切换"+ 大资源分离):
#   - 应用壳:vite build → tar → 远程解压 dist.new → mv 原子切换(旧版留 dist.old)
#   - extracted(579MB,仅重跑 pnpm extract 后才变):**不进 tar**,rsync 增量同步到
#     /var/www/type-pal/extracted(dist 的兄弟目录),dist 内放 `extracted -> ../extracted`
#     符号链接 —— 日常改代码只传 ~33MB,改提取器才走一次大同步(且 rsync 只传差异)。
#   - 构建优化:public/extracted 是指向 data/extracted 的 symlink,vite build 会跟随
#     拷贝 579MB 进 dist(实测 16s/658MB)。构建期把 symlink 暂移走、结束后还原(trap
#     EXIT 兜底),build 降到 ~3s、dist 仅 ~33MB。
#
# 首次上线还差两步手工操作(脚本无法代办,见脚本尾部提示):
#   1. DNS:给 pal.illegalscreed.cn 加 A 记录 → 47.120.26.143
#   2. 证书:服务器上 certbot --nginx -d pal.illegalscreed.cn
#      (HTTPS 必须:AudioWorklet 需要 secure context,纯 HTTP 下 BGM 不响)
# ============================================================

set -e

# 服务器配置(与 quiz-monorepo 同一台)
SERVER_HOST="47.120.26.143"
SERVER_USER="root"

# 远程路径:站点根 /var/www/type-pal,nginx root 指向其下 dist
REMOTE_ROOT="/var/www/type-pal"
SITE_DOMAIN="pal.illegalscreed.cn"

# 本地路径
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
GAME_DIR="${PROJECT_ROOT}/packages/game"
EXTRACTED_DIR="${PROJECT_ROOT}/data/extracted"
PUBLIC_LINK="${GAME_DIR}/public/extracted"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'
log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

check_ssh() {
  log_info "检查 SSH 连接..."
  if ! ssh -o ConnectTimeout=5 -o BatchMode=yes "${SERVER_USER}@${SERVER_HOST}" 'echo ok' &>/dev/null; then
    log_error "无法连接到服务器。请确认 SSH key 已配置。"
    log_warn "提示: ssh-copy-id ${SERVER_USER}@${SERVER_HOST}"
    exit 1
  fi
}

check_extracted() {
  if [ ! -f "${EXTRACTED_DIR}/data/event-objects.json" ]; then
    log_error "data/extracted 不存在或不完整(缺 data/event-objects.json)。"
    log_warn "先跑 pnpm extract 从原版 MKF 生成资源。"
    exit 1
  fi
}

# 构建应用壳。public/extracted symlink 暂移走避免 vite 拷 579MB;trap 保证还原。
RESTORE_LINK=""
restore_public_link() {
  if [ -n "$RESTORE_LINK" ] && [ -e "${PUBLIC_LINK}.deploybak" ]; then
    mv "${PUBLIC_LINK}.deploybak" "$PUBLIC_LINK"
    RESTORE_LINK=""
  fi
}
trap restore_public_link EXIT

build_app() {
  cd "$PROJECT_ROOT"
  if [ "$SKIP_CHECK" != "1" ]; then
    log_info "pnpm check(gating;--skip-check 可跳过)..."
    pnpm check >/dev/null 2>&1 || { log_error "pnpm check 未通过,中止部署"; exit 1; }
  fi
  log_info "构建 @type-pal/game..."
  if [ -L "$PUBLIC_LINK" ]; then
    mv "$PUBLIC_LINK" "${PUBLIC_LINK}.deploybak"
    RESTORE_LINK=1
  fi
  rm -rf "${GAME_DIR}/dist"
  pnpm --filter @type-pal/game run build
  restore_public_link
}

# 应用壳:tar → scp → 远程 dist.new 原子切换(quiz deploy_static 同款)
deploy_app() {
  local local_dist="${GAME_DIR}/dist"
  if [ ! -f "${local_dist}/index.html" ]; then
    log_error "dist 未构建(缺 index.html)"; exit 1
  fi
  log_info "部署应用壳到 ${SERVER_HOST}..."
  # 防御:用户手动 vite build 过的 dist 可能含 579MB 的 extracted 实体目录,一律不进包
  tar czf /tmp/type-pal-dist.tgz --exclude='.DS_Store' --exclude='./extracted' -C "$local_dist" .
  scp -q /tmp/type-pal-dist.tgz "${SERVER_USER}@${SERVER_HOST}:/tmp/"
  ssh "${SERVER_USER}@${SERVER_HOST}" "RD='${REMOTE_ROOT}' bash -s" <<'REMOTE'
set -e
mkdir -p "$RD" && cd "$RD"
mkdir -p extracted   # 首次 app-only 部署时占位,避免悬空链接(内容由 data 目标 rsync)
rm -rf dist.new && mkdir dist.new
tar xzf /tmp/type-pal-dist.tgz -C dist.new
[ -f dist.new/index.html ] || { echo "解压异常:缺 index.html,中止"; rm -rf dist.new; exit 1; }
# 资源树以兄弟目录共享,壳内放相对符号链接(nginx root 内,默认可跟随)
ln -sfn ../extracted dist.new/extracted
rm -rf dist.old
[ -d dist ] && mv dist dist.old || true
mv dist.new dist
rm -f /tmp/type-pal-dist.tgz
REMOTE
  rm -f /tmp/type-pal-dist.tgz
  log_info "应用壳部署完成 ✓(旧版本在远程 ${REMOTE_ROOT}/dist.old)"
}

# extracted 资源树:rsync 增量(--delete 清理重提取后消失的文件)。
# 非原子,但 extracted 仅在重跑提取器后才变、且文件级原子(--partial 只影响续传临时文件)。
deploy_data() {
  log_info "rsync 同步 extracted(~580MB,增量;首次全量较久)..."
  ssh "${SERVER_USER}@${SERVER_HOST}" "mkdir -p '${REMOTE_ROOT}/extracted'"
  rsync -az --delete --partial --info=progress2 \
    --exclude='.DS_Store' \
    "${EXTRACTED_DIR}/" "${SERVER_USER}@${SERVER_HOST}:${REMOTE_ROOT}/extracted/"
  log_info "extracted 同步完成 ✓"
}

main() {
  local target="${1:-all}"
  SKIP_CHECK=0
  for arg in "$@"; do
    [ "$arg" = "--skip-check" ] && SKIP_CHECK=1
  done

  echo "========================================"
  echo "  type-pal 部署"
  echo "  目标: ${target}"
  echo "  服务器: ${SERVER_HOST} (${REMOTE_ROOT})"
  echo "========================================"
  echo ""

  check_ssh

  case $target in
    app)  build_app && deploy_app ;;
    data) check_extracted && deploy_data ;;
    all)
      check_extracted
      build_app
      deploy_data
      deploy_app
      ;;
    *)
      echo "用法: $0 [app|data|all] [--skip-check]"
      echo ""
      echo "  app   - 仅部署应用壳(代码改动后的日常部署,~33MB)"
      echo "  data  - 仅同步 extracted 资源(重跑 pnpm extract 后)"
      echo "  all   - 两者都部署(默认)"
      exit 1
      ;;
  esac

  echo ""
  log_info "部署完成!"
  echo ""
  echo "  站点: https://${SITE_DOMAIN}"
  echo "  烟测: curl -s -o /dev/null -w '%{http_code}\\n' -H 'Host: ${SITE_DOMAIN}' http://${SERVER_HOST}/"
}

main "$@"
