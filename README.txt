HANZ GARAGE XP — GitHub + Vercel optimized build

Nasazeni:
- repo: https://github.com/toby53002/hanzgarage
- Vercel je napojeny na branch main a po git push nasadi web automaticky.
- `vercel --prod` uz neni potreba.

Media mimo Vercel Fast Data Transfer:
- komprimovane MP3 a plne fotky Archivu jsou ve slozce /media
- GitHub Action `.github/workflows/publish-media.yml` je pri pushi automaticky nahraje do public GitHub Release s tagem `media`
- web je pak nacita primo z GitHub Release
- slozka /media je ve `.vercelignore`, takze ji Vercel neposila navstevnikum
- Radio KISS zustava primo z play.cz

Nove funkce:
- Start -> Obnovit do tovarniho nastaveni
- dialog obnoveni lze zavrit krizkem, tlacitkem Storno, Esc i kliknutim mimo dialog
- Hledani min -> jmeno hrace + ONLINE TOP 10 + nejlepsi score per jmeno
- Had -> jmeno hrace + ONLINE TOP 10 + nejlepsi score per jmeno
- online TOP 10 je ulozeny serverove a je spolecny pro vsechny navstevniky

JEDNORAZOVE NASTAVENI ONLINE LEADERBOARDU NA VERCELU:
1) Vercel Dashboard -> projekt hanz-garage -> Marketplace / Storage.
2) Nainstaluj `Upstash for Redis` a pripoj ho k tomuto projektu.
3) Vytvor Redis databazi na Free planu.
4) Integrace musi projektu pridat promenne UPSTASH_REDIS_REST_URL a UPSTASH_REDIS_REST_TOKEN.
5) Po pripojeni databaze udelej Redeploy (nebo dalsi git push).
6) Endpoint `/api/leaderboard` pak sdili TOP 10 mezi vsemi navstevniky.

Bez databaze web nespadne; leaderboard se prepne na lokalni zalohu a ukaze chybovou hlasku. Tovarni reset maze jen data konkretniho prohlizece, ne globalni TOP 10.
