#!/usr/bin/env bash
# Деплой статического экспорта 3D-конструктора на NetAngels (тот же сервер, что и сайт).
#
# Приложение собирается в out/ (см. next.config.ts: output: 'export', basePath: '/constructor3d')
# и раздаётся из подпапки https://yasnaya-mebel.na4u.ru/constructor3d/
# Родительская страница конструктора (constructor/index.php) подключает его через
# ?app=constructor3d; по умолчанию сайт использует этот же сервер.
#
# Использование напрямую:
#   npm run build
#   FTP_USER=... FTP_PASS=... ./deploy-netangels.sh
#
# Или одной командой через npm:
#   FTP_USER=... FTP_PASS=... npm run deploy
#
# Для локального запуска можно создать .env.deploy в корне проекта (файл
# игнорируется Git), после чего достаточно выполнить: npm run deploy
#
# Переменные окружения:
#   FTP_HOST       хост FTP (по умолчанию h61.netangels.ru)
#   FTP_USER       логин FTP
#   FTP_PASS       пароль FTP
#   REMOTE_DIR     удалённый каталог (по умолчанию /www/constructor3d)
#   REMOTE_MANIFEST удалённый манифест (по умолчанию REMOTE_DIR/.deploy-netangels-manifest)
#   JOBS           параллельность загрузки (по умолчанию 8)
#
# Первый аргумент — локальный каталог для заливки (по умолчанию out/).

set -euo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
# Локальные секреты не попадают в Git; уже заданные переменные окружения имеют приоритет.
if [ -f "$SCRIPT_DIR/.env.deploy" ]; then
  DEPLOY_ENV_VARS=(FTP_HOST FTP_USER FTP_PASS REMOTE_DIR REMOTE_MANIFEST JOBS)
  declare -A DEPLOY_ENV_WAS_SET DEPLOY_ENV_VALUE
  for variable in "${DEPLOY_ENV_VARS[@]}"; do
    if [ "${!variable+x}" = x ]; then
      DEPLOY_ENV_WAS_SET["$variable"]=1
      DEPLOY_ENV_VALUE["$variable"]="${!variable}"
    fi
  done

  set -a
  # shellcheck disable=SC1091
  . "$SCRIPT_DIR/.env.deploy"
  set +a

  for variable in "${DEPLOY_ENV_VARS[@]}"; do
    if [ "${DEPLOY_ENV_WAS_SET[$variable]:-0}" = 1 ]; then
      declare "$variable=${DEPLOY_ENV_VALUE[$variable]}"
    fi
  done
fi

FTP_HOST="${FTP_HOST:-h61.netangels.ru}"
FTP_USER="${FTP_USER:?FTP_USER не задан}"
FTP_PASS="${FTP_PASS:?FTP_PASS не задан}"
REMOTE_DIR="${REMOTE_DIR:-/www/constructor3d}"
REMOTE_MANIFEST="${REMOTE_MANIFEST:-${REMOTE_DIR}/.deploy-netangels-manifest}"
JOBS="${JOBS:-8}"
SRC="${1:-out}"

if [ ! -d "$SRC" ]; then
  echo "Нет каталога $SRC — сначала соберите: npm run build" >&2
  exit 1
fi

if command -v sha256sum >/dev/null 2>&1; then
  HASH_TOOL="sha256sum"
elif command -v shasum >/dev/null 2>&1; then
  HASH_TOOL="shasum"
else
  echo "Не найден sha256sum или shasum — невозможно сравнить файлы." >&2
  exit 1
fi

hash_file() {
  if [ "$HASH_TOOL" = "sha256sum" ]; then
    sha256sum -- "$1" | awk '{print $1}'
  else
    shasum -a 256 -- "$1" | awk '{print $1}'
  fi
}

TMPDIR_DEPLOY=$(mktemp -d)
trap 'rm -rf "$TMPDIR_DEPLOY"' EXIT
PREVIOUS_MANIFEST="$TMPDIR_DEPLOY/previous-manifest"
CURRENT_MANIFEST="$TMPDIR_DEPLOY/current-manifest"
CANDIDATES="$TMPDIR_DEPLOY/candidates"
MANIFEST_ERROR="$TMPDIR_DEPLOY/manifest-error"
: > "$PREVIOUS_MANIFEST"
: > "$CURRENT_MANIFEST"
: > "$CANDIDATES"

# Манифест хранится на FTP, поэтому сравнение работает даже после клонирования
# проекта на другой компьютер. Если это первый деплой, загружаются все файлы.
if ! curl -sS --fail --connect-timeout 20 --max-time 120 \
    --user "${FTP_USER}:${FTP_PASS}" \
    "ftp://${FTP_HOST}${REMOTE_MANIFEST}" \
    -o "$PREVIOUS_MANIFEST" 2>"$MANIFEST_ERROR"; then
  echo "Удалённый манифест не найден — проверяю все файлы." >&2
  : > "$PREVIOUS_MANIFEST"
fi

cd "$SRC"

# В манифесте одна строка на файл: SHA-256, табуляция, относительный путь.
# Нулевой разделитель списка кандидатов сохраняет пробелы и спецсимволы в именах.
while IFS= read -r -d '' file; do
  rel="${file#./}"
  hash=$(hash_file "$file")
  printf '%s\t%s\n' "$hash" "$rel" >> "$CURRENT_MANIFEST"

  if ! awk -F '\t' -v expected_hash="$hash" -v expected_rel="$rel" \
      '$1 == expected_hash && $2 == expected_rel { found=1; exit } END { exit !found }' \
      "$PREVIOUS_MANIFEST"; then
    printf '%s\0' "$rel" >> "$CANDIDATES"
  fi
done < <(find . -type f ! -name '.DS_Store' -print0)

TOTAL=$(wc -l < "$CURRENT_MANIFEST" | tr -d ' ')
CHANGED=$(tr -cd '\0' < "$CANDIDATES" | wc -c | tr -d ' ')
echo "Проверено $TOTAL файлов; новых или изменённых: $CHANGED."

if [ "$CHANGED" -gt 0 ]; then
  upload_one() {
    local rel="$1"
    local target="${REMOTE_DIR}/${rel}"
    local attempt ok=0

    for attempt in 1 2 3; do
      if curl -sS --fail --connect-timeout 20 --max-time 900 \
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
    echo "  ↑ $rel"
  }
  export -f upload_one
  export REMOTE_DIR FTP_HOST FTP_USER FTP_PASS

  FAILED=0
  echo "Заливаю $CHANGED файлов в $JOBS потоков..."
  # Не используем код выхода 255: xargs прекращает обработку очереди при 255,
  # а нам важно попытаться отправить каждый найденный файл и собрать все ошибки.
  xargs -0 -P "$JOBS" -I{} bash -c 'upload_one "$1" || exit 1' _ {} < "$CANDIDATES" || FAILED=1

  if [ "$FAILED" -ne 0 ]; then
    echo "Есть ошибки загрузки — манифест не обновлён; повторите деплой." >&2
    exit 1
  fi
  echo "Загружено $CHANGED файлов в ftp://${FTP_HOST}${REMOTE_DIR}/."
else
  echo "Все файлы на сервере уже актуальны — загрузка файлов не требуется."
fi

# Манифест обновляется только после успешной загрузки всех файлов.
if ! cmp -s "$CURRENT_MANIFEST" "$PREVIOUS_MANIFEST"; then
  if ! curl -sS --fail --connect-timeout 20 --max-time 120 \
      --ftp-create-dirs -T "$CURRENT_MANIFEST" \
      "ftp://${FTP_HOST}${REMOTE_MANIFEST}" \
      --user "${FTP_USER}:${FTP_PASS}" >/dev/null; then
    echo "Не удалось обновить удалённый манифест: $REMOTE_MANIFEST" >&2
    exit 1
  fi
fi

echo "Готово."
