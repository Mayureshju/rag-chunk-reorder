# Docs Site

The documentation site is built with Vite + React.

## Local dev

```bash
cd docs-site
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Custom domain checklist

1. Add the domain in your hosting provider (Netlify recommended).
2. Configure DNS (A/CNAME records) per provider instructions.
3. Update `docs-site/index.html` canonical + `og:url` to the new domain.
4. Add an SSL certificate in the hosting provider UI.
