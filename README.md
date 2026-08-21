This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Деплой (тестовый хостинг на NetAngels)

Собирается как статический экспорт (`output: 'export'`, `basePath: '/constructor3d'`),
раздаётся с того же сервера, что и сайт: `https://yasnaya-mebel.na4u.ru/constructor3d/`.

```bash
npm run build                       # собирает out/
FTP_USER=... FTP_PASS=... ./deploy-netangels.sh
```

Родительская страница конструктора (`constructor/index.php` на сайте) по умолчанию
грузит приложение с `https://kitchen-demo.onrender.com/`. Для теста локальной копии:

```
https://yasnaya-mebel.na4u.ru/constructor/?app=constructor3d
```

`?app=` принимает относительный путь на том же домене; дефолт не меняется.
Когда появится доступ к onrender (или другому хостингу) — поменять адрес в
`constructor/index.php` и при желании удалить override.

Важно: все пути к ассетам в коде относительные (без ведущего `/`) — это позволяет
хостить приложение в любой подпапке. На корневом хостинге (onrender) они тоже работают.

Проверка после деплоя:
```bash
curl -s -o /dev/null -w "%{http_code}\n" https://yasnaya-mebel.na4u.ru/constructor3d/
curl -s -o /dev/null -w "%{http_code}\n" https://yasnaya-mebel.na4u.ru/constructor3d/modules/M_SPL/M_SPL_1_Correct.glb
```
