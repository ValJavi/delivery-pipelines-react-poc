# Guía del estudiante — Módulo 2: Ambientes, secrets y aprobaciones

Esta guía continúa donde termina el [Módulo 1](01-guia-estudiante.md). Ahí construiste un
pipeline `lint → test → build → deploy` que publica tu proyecto a un único ambiente público
apenas se mergea a `main`. Eso alcanza para un sitio de demo, pero no para un proyecto real:
no hay forma de revisar un cambio antes de que llegue a producción, no hay manera de manejar
credenciales sensibles, y cualquiera que mergee un PR publica en producción sin que nadie lo
revise.

Este módulo agrega esas tres piezas: **ambientes múltiples**, **secrets** y **aprobación
manual antes de producción**. Misma dinámica que el Módulo 1: cada sección tiene concepto,
ejemplo de código, y ejercicio.

## Antes de empezar

- Tu repo del Módulo 1 con el pipeline completo funcionando (`lint`, `test`, `build`,
  `deploy`) y el sitio publicado en GitHub Pages.
- Nada de código nuevo hace falta — todos los cambios de este módulo son en
  `.github/workflows/ci.yml` y en la configuración del repo.

---

## 1. ¿Por qué un solo ambiente no alcanza?

**Concepto:** en un proyecto real casi siempre hay más de un ambiente:

- **Desarrollo/Staging**: donde se prueban los cambios antes de que lleguen a los usuarios
  reales.
- **Producción**: lo que ven los usuarios reales.

La idea es simple: un cambio se prueba en un ambiente de menor riesgo antes de exponerlo en
el de mayor riesgo. Si algo se rompe, se rompe en staging, no en producción.

## 2. Modelo de ramas por ambiente

**Concepto:** vamos a usar dos ramas de larga vida, cada una atada a un ambiente:

- **`develop`**: cumple la función de staging/desarrollo. Acá se integran los cambios antes
  de promoverlos.
- **`main`**: producción, igual que en el Módulo 1.

El flujo de trabajo pasa a ser:

```
feature/mi-cambio  →  (PR)  →  develop  →  (PR)  →  main
```

Una rama de feature **nunca** se mergea directo a `main` — siempre pasa primero por
`develop`. Recién cuando ese cambio ya se probó en `develop`, se abre un segundo PR de
`develop` hacia `main` para promoverlo a producción.

### Ejercicio 1

1. Creá la rama `develop` a partir de tu `main` actual (`git checkout -b develop` y
   `git push -u origin develop`).
2. De acá en adelante, cualquier feature branch nueva se mergea primero a `develop` con un
   PR, y solo después `develop` se promueve a `main` con un segundo PR.

**Checklist:**
- [ ] Existe la rama `develop` en tu repo remoto.
- [ ] Entendés que una feature branch no se mergea nunca directo a `main`.

---

## 3. Deploy real a un ambiente de desarrollo

**Concepto:** queremos que cada push a `develop` publique un sitio real y visible, separado
del de producción — así se puede revisar un cambio en vivo antes de promoverlo.

El mecanismo de deploy del Módulo 1 (`actions/configure-pages` + `actions/deploy-pages`) solo
soporta **un** sitio publicado por repo — no sirve para tener dos ambientes visibles a la vez
en el plan gratuito de GitHub Pages. La alternativa: publicar a una rama `gh-pages` usando la
acción de terceros `peaceiris/actions-gh-pages`, que permite elegir una subcarpeta de destino
(`destination_dir`) por cada ambiente. Así, `main` publica en la raíz y `develop` publica en
`/develop/`, ambos dentro del mismo sitio.

**Ejemplo — job `deploy-develop`:**

```yaml
  deploy-develop:
    needs: build
    if: github.ref == 'refs/heads/develop' && github.event_name == 'push'
    runs-on: ubuntu-latest
    permissions:
      contents: write
    environment:
      name: develop
      url: https://tu-usuario.github.io/tu-repo/develop/
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build -- --base=/tu-repo/develop/
      - uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
          destination_dir: develop
          keep_files: true
```

Lo nuevo:
- `if: github.ref == 'refs/heads/develop'` — este job corre solo en pushes a `develop`,
  igual que `deploy` corre solo en pushes a `main`.
- `permissions: contents: write` — reemplaza a `pages: write` / `id-token: write` del
  Módulo 1, porque ahora publicamos con un commit a la rama `gh-pages`, no con el mecanismo
  nativo de Pages.
- `npm run build -- --base=/tu-repo/develop/` — el flag `--base` sobreescribe, solo para esta
  build, el `base` configurado en `vite.config.js`. Como este sitio se sirve desde
  `/tu-repo/develop/` en vez de `/tu-repo/`, los assets necesitan ese prefijo distinto.
- `destination_dir: develop` — publica el contenido de `dist/` dentro de la carpeta
  `develop/` de la rama `gh-pages`, no en la raíz.
- `keep_files: true` — **crítico**: sin esto, cada deploy borra todo el contenido previo de
  `gh-pages` antes de publicar el nuevo. Con `keep_files: true`, el deploy de `develop` no
  borra lo que ya publicó `main` (y viceversa).

**También hay que actualizar el job `deploy`** (el de producción) para que use el mismo
mecanismo — si uno usa `peaceiris` y el otro el flujo nativo de Pages, van a pisarse:

```yaml
  deploy:
    needs: build
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    permissions:
      contents: write
    environment:
      name: production
      url: https://tu-usuario.github.io/tu-repo/
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
          keep_files: true
```

Notá que acá no hace falta `destination_dir` (publica en la raíz) ni `--base` (usa el que ya
tenés en `vite.config.js`), pero sí `keep_files: true` por la misma razón que en
`deploy-develop`.

**Cambio de configuración necesario**: andá a **Settings → Pages** y cambiá **Source** de
"GitHub Actions" a **"Deploy from a branch"**, eligiendo la rama `gh-pages` y carpeta
`/(root)`. Esa rama no existe todavía — se crea sola la primera vez que corra cualquiera de
los dos jobs, así que hacé ese cambio recién después del primer deploy.

### Ejercicio 2

1. Actualizá ambos jobs (`deploy-develop` y `deploy`) como se muestra arriba, con `tu-usuario`
   y `tu-repo` reemplazados por los tuyos.
2. Mergeá a `develop` y confirmá que se crea la rama `gh-pages` (pestaña **Code → Branches**).
3. Cambiá **Settings → Pages → Source** a "Deploy from a branch" (`gh-pages`, `/root`).
4. Confirmá que `https://tu-usuario.github.io/tu-repo/develop/` carga tu sitio.
5. Promové `develop` a `main` con un PR y confirmá que
   `https://tu-usuario.github.io/tu-repo/` sigue funcionando (no debería haberse borrado por
   el deploy de `develop`, gracias a `keep_files: true`).

**Checklist:**
- [ ] Los dos sitios (`/` y `/develop/`) están publicados y accesibles a la vez.
- [ ] Entendés para qué sirve `keep_files: true` — sin él, un deploy pisa al otro.

---

## 4. Secrets por ambiente

**Concepto:** un proyecto real necesita credenciales (API keys, tokens) que no deben estar en
el código ni ser iguales entre ambientes. GitHub permite asociar **secrets** a un
**Environment** específico — solo los jobs que declaran `environment: { name: develop }`
pueden leer los secrets configurados para `develop`.

Vamos a simular esto con un secret ficticio, `DEVELOP_API_KEY`, que el job valida antes de
desplegar.

**Ejemplo — chequeo de secret, dentro de `deploy-develop`:**

```yaml
  deploy-develop:
    needs: build
    if: github.ref == 'refs/heads/develop' && github.event_name == 'push'
    runs-on: ubuntu-latest
    permissions:
      contents: write
    environment:
      name: develop
      url: https://tu-usuario.github.io/tu-repo/develop/
    steps:
      - name: Check develop secret
        env:
          DEVELOP_API_KEY: ${{ secrets.DEVELOP_API_KEY }}
        run: |
          if [ -z "$DEVELOP_API_KEY" ]; then
            echo "::error::DEVELOP_API_KEY no está configurado para el ambiente develop"
            exit 1
          fi
          echo "Using API key (masked by GitHub)..."
      - uses: actions/checkout@v4
      # ... resto de los steps sin cambios
```

Lo nuevo:
- `secrets.DEVELOP_API_KEY` — lee el secret configurado para el ambiente `develop`. Si no
  existe, GitHub lo resuelve como string vacío (no como error).
- El `if [ -z ... ]` chequea explícitamente que no esté vacío, y corta el job con
  `exit 1` si falta — así el error es claro, en vez de fallar más adelante con un mensaje
  confuso.
- GitHub enmascara automáticamente el valor del secret en los logs, aunque lo imprimas.

**Configurar el secret**: andá a **Settings → Environments → develop → Environment
secrets → Add secret**, nombre `DEVELOP_API_KEY`, cualquier valor (es ficticio para este
ejercicio).

### Ejercicio 3 (ciclo rojo → verde)

1. Agregá el step "Check develop secret" y configurá el secret como se indica arriba. Push a
   `develop` y confirmá que corre en verde.
2. En una rama nueva, introducí un typo en el nombre del secret referenciado (por ejemplo,
   `secrets.DEVELP_API_KEY` en vez de `secrets.DEVELOP_API_KEY`, **sin tocar el secret real
   en Settings**). Abrí un PR a `develop`, mergealo, y confirmá que el job falla con el
   mensaje de error que escribiste — aunque el secret sigue perfectamente configurado.
3. En una rama nueva, corregí el typo y mergeá. Confirmá que vuelve a verde.

**Checklist:**
- [ ] Entendés que un secret mal referenciado en el YAML falla silenciosamente como "vacío",
      no como "no existe" — por eso el chequeo explícito con `exit 1` es útil.
- [ ] El secret real nunca cambió durante el ejercicio — el bug estaba en el YAML.

---

## 5. Producción con aprobación manual

**Concepto:** hasta acá, un push a `main` publica en producción sin que nadie lo revise —
igual que en el Módulo 1. En un proyecto real, casi siempre hay al menos una persona que debe
aprobar manualmente antes de que algo llegue a producción. GitHub permite configurar esto
como una regla del **Environment**: **Required reviewers**.

Cuando un job declara `environment: { name: production }` y ese ambiente tiene reviewers
requeridos, el job queda **pausado** ("Waiting") hasta que alguno de los reviewers lo aprueba
desde la pestaña Actions — sin aprobación, no corre.

**Configurar el ambiente**: andá a **Settings → Environments → New environment**, nombre
`production` (tiene que coincidir exactamente con el `environment.name` del job `deploy`).
Activá **Required reviewers** y agregate a vos mismo (o a un compañero).

No hace falta cambiar el YAML — el job `deploy` de la sección 3 ya declara
`environment: { name: production }`.

### Ejercicio 4

1. Configurá el ambiente `production` con un reviewer requerido, como se indica arriba.
2. Hacé cualquier cambio chico en una rama, mergealo a `develop`, y después abrí el PR de
   promoción `develop → main`. Mergealo.
3. Andá a la pestaña **Actions** y confirmá que el job `deploy` quedó en estado **"Waiting"**,
   pidiendo aprobación.
4. Aprobalo vos mismo desde ahí (a diferencia de un Pull Request, en un ambiente **sí** podés
   aprobar tu propio deploy si sos uno de los reviewers configurados) y confirmá que recién
   ahí corre y publica.

**Checklist:**
- [ ] El job `deploy` quedó pausado esperando aprobación antes de correr.
- [ ] Lo aprobaste y confirmaste que el sitio de producción se actualizó recién después.

---

## 6. El workflow completo hasta acá

```yaml
name: CI

on:
  push:
  pull_request:

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run lint

  test:
    needs: lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm test

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/

  deploy-develop:
    needs: build
    if: github.ref == 'refs/heads/develop' && github.event_name == 'push'
    runs-on: ubuntu-latest
    permissions:
      contents: write
    environment:
      name: develop
      url: https://tu-usuario.github.io/tu-repo/develop/
    steps:
      - name: Check develop secret
        env:
          DEVELOP_API_KEY: ${{ secrets.DEVELOP_API_KEY }}
        run: |
          if [ -z "$DEVELOP_API_KEY" ]; then
            echo "::error::DEVELOP_API_KEY no está configurado para el ambiente develop"
            exit 1
          fi
          echo "Using API key (masked by GitHub)..."
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build -- --base=/tu-repo/develop/
      - uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
          destination_dir: develop
          keep_files: true

  deploy:
    needs: build
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    permissions:
      contents: write
    environment:
      name: production
      url: https://tu-usuario.github.io/tu-repo/
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
          keep_files: true
```

Compará este archivo con el tuyo — si algo no coincide, revisalo antes de seguir.

---

## 7. Lecciones aprendidas

- **Un ambiente no es solo una URL — es una unidad de configuración.** Secrets y reglas de
  aprobación se atan al `environment.name` de un job, no al repo entero.
- **Promover, no reescribir.** El flujo `feature → develop → main` existe para que un cambio
  se pruebe una vez y se "promueva" tal cual, sin rehacerlo para producción.
- **Un secret mal referenciado falla como "vacío", no como "no existe".** Por eso conviene
  chequearlo explícitamente en vez de dejar que falle más adelante con un error confuso.
- **Aprobar tu propio deploy es distinto a aprobar tu propio PR** — son dos mecanismos de
  GitHub separados, con reglas distintas.

## 8. Glosario (Módulo 2)

- **Environment**: unidad de configuración de GitHub asociada a un job (`environment.name`)
  que puede tener secrets propios y reglas de protección (reviewers requeridos, entre otras).
- **Environment secret**: un secret visible solo para los jobs que declaran ese ambiente.
- **Required reviewers**: regla de protección de un Environment que pausa el job hasta que
  alguien lo aprueba manualmente.
- **Rama `gh-pages`**: rama usada por `peaceiris/actions-gh-pages` para publicar contenido
  estático; GitHub Pages la sirve directamente cuando el Source está en "Deploy from a
  branch".
- **`destination_dir`**: subcarpeta dentro de `gh-pages` donde se publica un deploy —
  permite tener varios ambientes en el mismo sitio.
- **`keep_files: true`**: evita que un deploy borre lo publicado por otro ambiente en la
  misma rama `gh-pages`.
