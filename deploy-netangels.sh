#!/usr/bin/env bash
# Деплой статического экспорта 3D-конструктора на NetAngels (тот же сервер, что и сайт).
#
# Приложение собирается в out/ (см. next.config.ts: output: 'export', basePath: '/constructor3d')
# и раздаётся из подпапки https://yasnaya-mebel.na4u.ru/constructor3d/
# Родительская страница конструктора (constructor/index.php) подключает его через
# ?app=constructor3d; по умолчанию сайт использует этот же сервер.
#
# Использование:
#   npm run build
#   FTP_USER=... FTP_PASS=... ./deploy-netangels.sh
#
# Переменные окружения:
#   FTP_HOST   хост FTP (по умолчанию h61.netangels.ru)
#   FTP_USER   логин FTP
#   FTP_PASS   пароль FTP
#   REMOTE_DIR удалённый каталог (по умолчанию /www/constructor3d)
#   JOBS       параллельность загрузки (по умолчанию 8)
#
# Первый аргумент — локальный каталог для заливки (по умолчанию out/).

set -euo pipefail

FTP_HOST="${FTP_HOST:-h61.netangels.ru}"
FTP_USER="${FTP_USER:?FTP_USER не задан}"
FTP_PASS="${FTP_PASS:?FTP_PASS не задан}"
REMOTE_DIR="${REMOTE_DIR:-/www/constructor3d}"
JOBS="${JOBS:-8}"
SRC="${1:-out}"

if [ ! -d "$SRC" ]; then
  echo "Нет каталога $SRC — сначала соберите: npm run build" >&2
  exit 1
fi

cd "$SRC"

TMPLIST=$(mktemp)
trap 'rm -f "$TMPLIST"' EXIT
# Список строится заново при каждом запуске: статического лимита на число файлов нет.
# Нулевой разделитель позволяет корректно загружать имена с пробелами и спецсимволами.
find . -type f ! -name '.DS_Store' -print0 > "$TMPLIST"
TOTAL=$(tr -cd '\0' < "$TMPLIST" | wc -c | tr -d ' ')
echo "Загружаю $TOTAL файлов в ftp://$FTP_HOST$REMOTE_DIR/ (JOBS=$JOBS) ..."

if [ "$TOTAL" -eq 0 ]; then
  echo "В каталоге $SRC нет файлов для загрузки."
  exit 0
fi


upload_one() {
  local rel="${1#./}"
  local target="${REMOTE_DIR}/${rel}"
  local attempt ok=0
  for attempt in 1 2 3; do
    if curl -sS --connect-timeout 20 --max-time 900 \
        --ftp-create-dirs -T "$rel" \
        "ftp://${FTP_HOST}${target}" \
        --user "${FTP_USER}:${FTP_PASS}" >/dev/null 2>&1; then
      ok=1
      break
    fi
    sleep 2
  done
  if [ "$ok" -ne 1 ]; then
    echo "FAILED: $rel" >&2
    return 1
  fi
  return 0
}
export -f upload_one
export REMOTE_DIR FTP_HOST FTP_USER FTP_PASS

FAILED=0
# Не используем код выхода 255: xargs прекращает обработку очереди при 255,
# а нам важно попытаться отправить каждый найденный файл и собрать все ошибки.
xargs -0 -P "$JOBS" -I{} bash -c 'upload_one "$1" || exit 1' _ {} < "$TMPLIST" || FAILED=1

if [ "$FAILED" -ne 0 ]; then
  echo "Есть ошибки загрузки — проверьте вывод выше." >&2
  exit 1
fi
echo "Готово: $TOTAL файлов загружено в $REMOTE_DIR/."
