---
marp: true
theme: default
paginate: true
---

# CI/CD con GitHub Actions
### Construyendo tu propio pipeline, en vivo

Bootcamp — Módulo CI/CD

---

## Agenda

1. ¿Qué es CI/CD y por qué importa?
2. Anatomía de un pipeline: lint → test → build → deploy
3. Estructura básica de un workflow de GitHub Actions
4. Cada etapa: concepto + ejemplo de código + ejercicio
5. Branch protection

---

## ¿Qué es CI/CD?

- **CI (Integración Continua):** cada push/PR se valida automáticamente
  (estilo, tests, build).
- **CD (Entrega Continua):** el código validado se publica solo, sin pasos manuales.

**Sin esto:** cada persona valida "a mano" (o no lo hace) → errores se detectan tarde.

---

## Anatomía de un pipeline

```
lint  →  test  →  build  →  deploy
```

- Cada etapa depende de que la anterior haya pasado.
- Si una falla, las siguientes ni se ejecutan.

---

## Estructura básica de un workflow

```yaml
name: CI

on:
  push:
  pull_request:

jobs:
  nombre-del-job:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: <comando>
```

---

## Cómo vamos a trabajar hoy

Por cada etapa:

1. **Concepto** — qué problema resuelve
2. **Ejemplo** — el job completo, explicado
3. **Ejercicio** — lo implementás en tu propio repo, lo rompés, lo arreglás

Todo el código está en la guía — no necesitás ningún repo externo.

---

## Etapa 1: Lint

```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run lint
```

**Ejercicio:** agregalo, rompé el lint (variable sin usar), fix.

---

## Etapa 2: Test

```yaml
  test:
    needs: lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm test
```

`needs: lint` encadena las etapas. **Ejercicio:** rompé un test, fix.

---

## Etapa 3: Build

```yaml
  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with: { name: dist, path: dist/ }
```

**Ejercicio:** rompé el build desde `vite.config.js` (no desde el código de la app).

---

## Etapa 4: Deploy (GitHub Pages)

```yaml
  deploy:
    needs: build
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    permissions: { pages: write, id-token: write }
    environment: { name: production, url: ${{ steps.deployment.outputs.page_url }} }
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }
      - id: deployment
        uses: actions/deploy-pages@v4
```

---

## Deploy: detalles importantes

- `base: '/tu-repo/'` en `vite.config.js` — sin esto, la página carga en blanco.
- El `if:` hace que este job **solo corra en push a `main`** (después de mergear).
- Consecuencia: el rojo de un bug acá **no se ve en el PR**, solo en `main`.

---

## Branch protection

- Regla en `main`: requiere que `lint`, `test` y `build` pasen antes de mergear.
- Se configura en **Settings → Branches** (no en el YAML).
- Bloquea el botón de merge si algún check falla o sigue corriendo.

---

## Resultado esperado

Al final de la clase, cada estudiante tiene:

- Su propio repo con el pipeline completo: `lint → test → build → deploy`.
- Su propio sitio publicado en GitHub Pages.
- Branch protection activa en `main`.

---

# Gracias
### Preguntas
