# osbeck.org — Eleventy portfolio

## Kom igång

```bash
npm install
npm start          # dev-server på http://localhost:8080
npm run build      # bygg till _site/
```

## Lägga till bilder

1. Kopiera bilderna till `src/images/`
2. Kör `npm run extract-exif` (körs automatiskt vid build)
3. Öppna `src/data/photos.json` och sätt `title`, `category` och `featured` för varje bild
4. Giltiga kategorier finns i `src/data/categories.json`

## Deploy till Netlify

```bash
# Anslut repot i Netlify-dashboarden och sätt:
Build command:  npm run build
Publish dir:    _site
```

Kontaktformuläret fungerar automatiskt via Netlify Forms.
