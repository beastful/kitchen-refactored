# Kitchen Constructor

Новый React/Next.js 3D-конструктор кухонь для проекта `yasnaya-mebel`.
Приложение собирается в статический экспорт и размещается на том же сервере,
что и Bitrix-сайт.

## Быстрый старт

Требуется Node.js `>=20.9.0`.

```bash
npm install
npm run dev
```

После запуска приложение доступно по адресу:

```text
http://localhost:3000
```

Основные команды:

```bash
npm run dev       # режим разработки
npm run build     # статическая сборка в out/
npm run lint      # ESLint
npx tsc --noEmit  # проверка TypeScript без генерации файлов
```

## Архитектура интеграции

На сайте используется следующая схема:

```text
Bitrix /constructor/
        │
        └── iframe → /constructor3d/
                           │
                           └── React-конструктор
                                  │
                                  └── postMessage
                                        │
                                        └── Bitrix constructor_api.php
                                              │
                                              ├── сохранение/загрузка проекта
                                              └── BpApiClient → Business Plus BpApi
```

`/constructor3d/` — текущий источник конструктора. Старый Render-хостинг
`kitchen-demo.onrender.com` больше не используется как основной источник.

Связанные серверные файлы Bitrix находятся в проекте сайта:

```text
yasnaya-mebel/constructor/index.php
yasnaya-mebel/local/templates/yasnaya/ajax/constructor_api.php
 yasnaya-mebel/local/templates/yasnaya/ajax/order_handler.php
 yasnaya-mebel/local/modules/kitchen.constructor/lib/Controller/Scene.php
 yasnaya-mebel/local/php_interface/classes/BpApiClient.php
```

Копия серверных файлов также поддерживается в каталоге `www/` репозитория.

## Статический экспорт

Конфигурация `next.config.ts`:

```ts
{
  output: 'export',
  basePath: '/constructor3d'
}
```

Поэтому сборка создаётся в каталоге `out/` и должна раздаваться по адресу:

```text
https://yasnaya-mebel.na4u.ru/constructor3d/
```

Родительская страница конструктора по умолчанию подключает именно этот путь.
Для явного указания источника можно использовать:

```text
https://yasnaya-mebel.na4u.ru/constructor/?app=constructor3d
```

Параметр `product_id` загружает товар из Bitrix, например Modena:

```text
https://yasnaya-mebel.na4u.ru/constructor/?mode=iframe&product_id=372
```

Пути к 3D-моделям и изображениям в приложении относительные, поэтому сборка
может работать в подпапке `/constructor3d/`.

## Деплой на NetAngels

Собрать приложение и загрузить его одной командой:

```bash
FTP_USER='логин' FTP_PASS='пароль' npm run deploy
```

Эта команда сначала выполняет `npm run build`, а затем запускает
`deploy-netangels.sh`. При необходимости шаги можно выполнить отдельно:

```bash
npm run build
FTP_USER='логин' FTP_PASS='пароль' ./deploy-netangels.sh
```

Переменные окружения:

| Переменная | По умолчанию | Назначение |
|---|---|---|
| `FTP_HOST` | `h61.netangels.ru` | FTP-хост |
| `FTP_USER` | — | FTP-логин, обязателен |
| `FTP_PASS` | — | FTP-пароль, обязателен |
| `REMOTE_DIR` | `/www/constructor3d` | Каталог на сервере |
| `REMOTE_MANIFEST` | `REMOTE_DIR/.deploy-netangels-manifest` | Файл с хешами загруженных файлов |
| `JOBS` | `8` | Количество параллельных загрузок |

Можно указать другой локальный каталог первым аргументом:

```bash
FTP_USER='логин' FTP_PASS='пароль' ./deploy-netangels.sh путь-к-сборке
```

Скрипт деплоя:

- заново находит все файлы через `find` при каждом запуске;
- вычисляет SHA-256 локальных файлов и сравнивает их с манифестом на FTP;
- загружает только новые и изменённые файлы, кроме `.DS_Store`;
- сохраняет манифест только после успешной загрузки всех файлов;
- использует нулевой разделитель, поэтому поддерживает пробелы и спецсимволы
  в именах файлов;
- создаёт каталоги на FTP автоматически;
- повторяет загрузку каждого файла до трёх раз;
- продолжает обработку очереди при ошибке одного файла и завершает работу с
  ошибкой, если хотя бы один файл не загрузился.

При первом деплое или после удаления манифеста загружаются все файлы. При
последующих запусках неизменённые файлы пропускаются. Удалённые локально файлы
скрипт не удаляет с сервера — это позволяет безопасно выкатывать сборку без
риска удалить серверные данные.

## Проверка после деплоя

```bash
curl -sS -o /dev/null -w "%{http_code}\n" \
  https://yasnaya-mebel.na4u.ru/constructor3d/

curl -sS -o /dev/null -w "%{http_code}\n" \
  https://yasnaya-mebel.na4u.ru/constructor3d/modules/M_SPL/M_SPL_1_Correct.glb

curl -sS -o /dev/null -w "%{http_code}\n" \
  https://yasnaya-mebel.na4u.ru/constructor3d/Handle1.glb

curl -sS -o /dev/null -w "%{http_code}\n" \
  https://yasnaya-mebel.na4u.ru/constructor3d/handles/Handle_01.png
```

Для проверки загрузки Modena из Bitrix:

```bash
curl -sS \
  'https://yasnaya-mebel.na4u.ru/local/templates/yasnaya/ajax/constructor_api.php?action=load_product&product_id=372'
```

Ожидается JSON с `status: "success"`, названием `Кухня Modena` и массивом
`data.modules`.

## Сопоставление Bitrix и BpApi

ID в `supplier_id` — это ID номенклатуры поставщика BpApi, а не локальный ID
Bitrix. Для Modena проверена следующая схема:

| BpApi ID | Bitrix ID | Код Bitrix | Назначение |
|---:|---:|---|---|
| `64579` | `277` | `M_UMA_9` | Навесной шкаф |
| `64580` | `209` | `M_UMP_5` | Шкаф под вытяжку |
| `64581` | `343` | `M_SPL_9` | Шкаф под мойку |
| `64582` | `365` | `M_3YNSD_7` | Шкаф с ящиками |
| `64676` | `330` | `M_SPL_9` | Нижний шкаф с полкой, 2 дверки, 60 см |
| `64584` | `336` | `M_DSY_2` | Шкаф под духовку |

У BpApi-модуля `64676` отсутствует `bitrix_id`, поэтому для него добавлено
явное сопоставление по локальному коду/названию и fallback для старых проектов.

### Замены модуля 64676

При загрузке Modena на сервере проверено, что для `supplier_id: 64676`
приходят два слота замен:

```text
slot_id 9353 — материал
slot_id 9358 — ручка
```

Для проверки заказа использовалась замена:

```json
{
  "module_id": 64676,
  "slot_id": 9358,
  "replace_id": 4
}
```

BpApi распознаёт её как:

```text
option_id: 64553
РУЧКА СА-9 128-156 ЧЕРНАЯ МАТОВАЯ → РУЧКА 128мм
эффект: +500 ₽ за единицу, +1000 ₽ для количества 2
```

В актуальной Modena эта позиция встречается два раза, поэтому в заказе
передаётся `64676` с количеством `2`.

## Поток заказа

1. Пользователь загружает Modena или создаёт проект в конструкторе.
2. Конструктор сохраняет JSON проекта через `postMessage` в Bitrix.
3. При отправке проекта Bitrix загружает сохранённую сцену.
4. `BpApiClient::buildOrderPayload()` сопоставляет локальные модули с ID BpApi.
5. В payload передаются `order`, `positions` и `replaces`.
6. Bitrix отправляет payload в `importOrder` BpApi.

Пример минимальной замены в payload:

```json
{
  "positions": [
    { "id": 64676, "quantity": 2 }
  ],
  "replaces": [
    { "module_id": 64676, "slot_id": 9358, "replace_id": 4 }
  ]
}
```

## Безопасный режим dry_run

`BpApiClient` по умолчанию работает безопасно:

```text
BPAPI_DRY_RUN=1
```

В этом режиме к запросу добавляется `dry_run=1`, а поставщик не создаёт и не
изменяет реальные заявки. Переключать `BPAPI_DRY_RUN=0` можно только после
отдельного подтверждения менеджера и подрядчика.

Настройки интеграции берутся только на сервере:

```text
BPAPI_BASE_URL=https://mebel-ruslan.b-plus.pro
BPAPI_SECRET=секрет-поставщика
BPAPI_DRY_RUN=1
BPAPI_MODULE_MAP={}
```

Секрет нельзя передавать во frontend, добавлять в Git или указывать в README.

## Результат проверки интеграции

Проверен live-запрос загрузки Modena (`product_id=372`):

- ответ сервера `status: success`;
- найдено два экземпляра локального модуля `330 / M_SPL_9`;
- у обоих `supplier_id: 64676`;
- у обоих присутствуют слоты `9353` и `9358`.

Также выполнен полный заказ Modena через код `BpApiClient` с заменой
`9358/4` и запросом `dry_run=1`:

```text
result: true
dry_run: true
errors: []
created: 0
updated: 0
deleted: 0
```

Поставщик вернул `will_clone: true` для `64676`, корректно распознал замену
и рассчитал доплату `+1000 ₽`. Реальная заявка при этой проверке не создавалась.

## Перед включением реальных заявок

Нужно выполнить финальную приёмочную проверку в браузере:

1. открыть Modena;
2. выбрать замену в слоте `9358`;
3. сохранить проект;
4. открыть отправку проекта на проверку;
5. убедиться, что заявка отображается у ответственного менеджера.

До отдельного согласования оставлять `BPAPI_DRY_RUN=1`.
