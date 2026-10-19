# 🚀 GitShip — De `git init` al deploy

Entrenador interactivo para dominar **Git, GitHub, GitLab, Bitbucket, CI/CD y DevOps frontend** mediante **31 retos reales** con simulador visual, pistas progresivas, modo mentor y repaso adaptativo. 20% teoría · 80% práctica.

## Desarrollo local

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # genera dist/
npm run preview  # sirve el build
```

## Subir a GitHub y desplegar

```bash
git init
git add .
git commit -m "GitShip v1.0: entrenador Git + remotos + CI/CD + DevOps"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/gitship.git
git push -u origin main
```

**GitHub Pages (automático):** el workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) construye y publica en cada push a `main`. Actívalo en *Settings → Pages → Source: GitHub Actions*.

**Vercel / Netlify:** importa el repo, framework *Vite*, build `npm run build`, output `dist/`. Sin variables de entorno.

## SEO y redes (ya incluido)

| Pieza | Archivo |
|---|---|
| Título ≤ 60 caracteres + meta description 150–160 | `index.html` |
| Open Graph (imagen 1200×630) | `index.html` + `public/og-image.png` |
| Twitter / X `summary_large_image` | `index.html` |
| Favicons SVG + PNG + Apple touch | `public/favicon.*`, `public/apple-touch-icon.png` |
| PWA manifest + iconos 192/512 | `public/site.webmanifest` |
| Datos estructurados `WebApplication` (JSON-LD) | `index.html` |
| `robots.txt` + `sitemap.xml` | `public/` |
| `<noscript>` descriptivo | `index.html` |

> **Antes de publicar:** reemplaza `https://gitship.app` por tu dominio final en `index.html` (canonical, `og:`, `twitter:` y JSON-LD) y en `public/sitemap.xml`. Luego valida en:
> - [Validador Open Graph / Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
> - [Validador de tarjetas X](https://cards-dev.twitter.com/validator)
> - [Google Rich Results Test](https://search.google.com/test/rich-results)
> - [PageSpeed Insights](https://pagespeed.web.dev/)

## Stack

React 19 + TypeScript + Tailwind CSS 4 + Vite. Sin backend: el repositorio Git es una simulación en memoria (`src/lib/gitSim.ts`) y el progreso persiste en `localStorage`.
