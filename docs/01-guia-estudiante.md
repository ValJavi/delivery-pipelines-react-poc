# Guía del estudiante: construí tu propio pipeline de CI/CD

Esta guía te lleva, sección por sección, a construir un pipeline de CI/CD completo con
GitHub Actions sobre tu propio proyecto React. Cada sección tiene tres partes:

1. **Concepto** — qué problema resuelve esta etapa.
2. **Ejemplo** — el código real de esa etapa, explicado línea por línea.
3. **Ejercicio** — lo implementás vos en tu propio repositorio, lo rompés a propósito, y lo
   arreglás.

No hace falta ningún repo de ejemplo externo — todo el código que necesitás está en esta
guía.

## Antes de empezar

- Cuenta de GitHub.
- Node.js 20+ instalado.
- Conocimientos básicos de git (branch, commit, push, Pull Request).

### Creá el proyecto base

```bash
npm create vite@latest mi-proyecto -- --template react
cd mi-proyecto
npm install
```

Esto te deja un proyecto React con Vite y ESLint ya configurados — vas a tener un archivo
`eslint.config.js` y un script `"lint": "eslint ."` en tu `package.json`.

El scaffold **no** trae testing configurado, así que agregá Vitest y React Testing Library:

```bash
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom
```

Agregá el script `test` en `package.json` (junto a `dev`, `build`, `lint`):

```json
"scripts": {
  "test": "vitest run"
}
```

Creá `src/setupTests.js`:

```js
import "@testing-library/jest-dom/vitest";
```

Y agregá la config de test a `vite.config.js`:

```js
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
  },
})
```

Antes de seguir, corré `npm run lint` y `npm test` localmente y confirmá que ambos pasan sin
errores. Recién ahí subí este scaffold a un repo nuevo en GitHub — es la base sobre la que
vas a ir agregando cada job de esta guía.

---

## 1. ¿Qué es CI/CD?

- **Integración Continua (CI):** cada vez que subís código (push o Pull Request), un sistema
  automático valida que ese código cumple ciertas reglas: que respeta el estilo (lint), que no
  rompe la funcionalidad existente (tests), y que compila sin errores (build).
- **Entrega/Despliegue Continuo (CD):** una vez que el código pasó todas las validaciones y
  fue mergeado a la rama principal, se publica automáticamente (deploy), sin pasos manuales.

**¿Por qué importa?** Sin esto, cada persona valida "a mano" antes de mergear (o no lo hace),
y los errores se detectan tarde. CI/CD mueve esa validación lo más temprano posible.

## 2. Anatomía de un pipeline

Vamos a construir un pipeline de 4 etapas, donde cada una depende de que la anterior haya
pasado:

```
lint  →  test  →  build  →  deploy
```

- **lint**: ¿el código respeta las reglas de estilo/calidad?
- **test**: ¿el comportamiento sigue siendo el esperado?
- **build**: ¿el proyecto compila y genera los artefactos finales?
- **deploy**: ¿se publica esa build en algún lado accesible?

Si una etapa falla, las siguientes ni se ejecutan.

## 3. La estructura básica de un workflow de GitHub Actions

Todo pipeline vive en un archivo YAML dentro de `.github/workflows/`, por ejemplo
`.github/workflows/ci.yml`. Su esqueleto es siempre parecido:

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
      - run: <comando a ejecutar>
```

Elemento por elemento:

| Elemento | Qué hace |
|---|---|
| `name:` | Nombre del workflow, se ve en la pestaña Actions de GitHub |
| `on:` | Qué evento lo dispara. `push` y `pull_request` cubren "cada vez que subo código" y "cada vez que abro/actualizo un PR" |
| `jobs:` | Las etapas del pipeline. Cada una corre en una máquina virtual limpia |
| `runs-on:` | Qué sistema operativo usa esa máquina virtual (`ubuntu-latest` es el estándar) |
| `steps:` | Los pasos del job, en orden |
| `actions/checkout@v4` | Descarga el código de tu repo dentro de la máquina virtual (sin esto, no hay código para trabajar) |
| `actions/setup-node@v4` | Instala Node.js en la versión indicada |
| `npm ci` | Instala las dependencias exactas del `package-lock.json` (más rápido y confiable que `npm install` en CI) |

A partir de acá vamos a ir agregando un job por sección, siempre dentro de este mismo
archivo `ci.yml`.

---

## 4. Etapa 1: Lint

**Concepto:** el linter (ESLint) revisa que el código siga reglas de estilo y buenas
prácticas (variables no usadas, imports rotos, etc.) sin necesidad de ejecutarlo.

**Ejemplo — job de lint:**

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
```

El único paso nuevo respecto al esqueleto de la sección 3 es `npm run lint`, que ejecuta el
script `lint` definido en tu `package.json` (normalmente `eslint .`).

### Ejercicio 1

1. En tu repo, creá `.github/workflows/ci.yml` con el job `lint` de arriba. Hacé commit y
   push directo a `main`. Andá a la pestaña **Actions** y confirmá que corre en verde.
2. Creá una rama nueva. Introducí a propósito un error de lint (por ejemplo, declarar una
   variable y no usarla en ningún lado). Abrí un Pull Request y confirmá que el check `lint`
   se pone en **rojo**.
3. En la misma rama, corregí el error (usá la variable, o borrala). Confirmá que el check
   vuelve a **verde** y mergeá el PR.

**Checklist:**
- [ ] El job `lint` corre en cada push y PR.
- [ ] Viste el estado rojo en un PR real.
- [ ] El PR quedó mergeado en verde.

---

## 5. Etapa 2: Test

**Concepto:** los tests automatizados verifican que el comportamiento del código sigue
siendo el esperado, más allá de si el estilo es correcto. Usamos Vitest (el test runner) y
React Testing Library (para testear componentes React).

**Ejemplo — job de test:**

```yaml
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
```

(Este bloque va debajo del job `lint`, dentro del mismo `jobs:`.)

Lo nuevo acá es `needs: lint` — le dice a GitHub Actions "no corras este job hasta que
`lint` haya terminado y pasado". Así encadenamos las etapas.

### Ejercicio 2

1. Agregá el job `test` a tu `ci.yml`. Asegurate de tener al menos un test simple con React
   Testing Library (por ejemplo, que verifique que un texto se renderiza en pantalla). Push a
   `main` y confirmá que corre en verde.
2. En un PR, rompé el test a propósito (cambiá el texto esperado en el test, o el texto real
   del componente, para que no coincidan). Confirmá que `test` falla y que `lint` **no** se ve
   afectado.
3. Corregí el test y mergeá.

**Checklist:**
- [ ] `test` tiene `needs: lint` en el YAML.
- [ ] Rompiste específicamente el test (no el lint) y confirmaste que solo `test` se puso en
      rojo.

---

## 6. Etapa 3: Build

**Concepto:** el build genera los archivos finales (HTML/JS/CSS optimizados) que se van a
publicar. Que el código pase lint y tests no garantiza que compile — por eso es una etapa
aparte.

**Ejemplo — job de build:**

```yaml
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
```

Lo nuevo:
- `npm run build` ejecuta Vite y genera la carpeta `dist/`.
- `actions/upload-artifact@v4` guarda esa carpeta como un "artifact" descargable desde la
  corrida de GitHub Actions — útil para inspeccionarla, y necesario si otro job (como el
  deploy) la va a necesitar más adelante.

### Ejercicio 3

1. Agregá el job `build` a tu `ci.yml`. Push a `main` y confirmá que corre en verde, y que
   podés ver el artifact `dist` en la corrida.
2. En un PR, rompé el build **sin tocar el código de la app** — modificá `vite.config.js`
   para que apunte a un archivo de entrada que no existe, por ejemplo:
   ```js
   export default defineConfig({
     plugins: [react()],
     build: {
       rollupOptions: {
         input: 'index-que-no-existe.html',
       },
     },
   })
   ```
   Confirmá que `lint` y `test` siguen en verde, y que solo `build` falla.
3. Sacá ese bloque `build` de `vite.config.js` (o corregí la ruta) y confirmá que vuelve a
   verde. Mergeá.

**Checklist:**
- [ ] Lograste romper `build` sin romper `lint` ni `test`.
- [ ] Entendés por qué: `rollupOptions.input` solo lo usa `vite build`, no el linter ni
      Vitest.

---

## 7. Etapa 4: Deploy a GitHub Pages

**Concepto:** una vez que el código pasó lint, test y build, lo publicamos automáticamente.
Vamos a usar GitHub Pages, que sirve el contenido de `dist/` en una URL pública
(`tu-usuario.github.io/tu-repo/`).

### 7.1 Ajuste necesario en Vite

GitHub Pages publica tu repo en una subcarpeta (`tu-usuario.github.io/tu-repo/`), no en la
raíz de un dominio. Vite necesita saber ese prefijo para que los `<script>`/`<link>`
generados apunten a la ruta correcta — si no, la página carga en blanco. Agregá esto a
`vite.config.js`:

```js
export default defineConfig({
  base: '/nombre-de-tu-repo/',
  plugins: [react()],
  // ...el resto de tu config
})
```

### 7.2 El job de deploy

```yaml
  deploy:
    needs: build
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    permissions:
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
      - id: deployment
        uses: actions/deploy-pages@v4
```

Lo nuevo:
- `if: github.ref == 'refs/heads/main' && github.event_name == 'push'` — este job **solo
  corre cuando se hace push directo a `main`**, es decir, después de mergear un PR. En
  cualquier otro caso (un PR, una feature branch) el job aparece como *skipped*, no como
  fallido. Es la práctica correcta en el mundo real: no querés publicar cada branch a
  producción.
- `permissions: { pages: write, id-token: write }` — el token que usa el job necesita estos
  permisos para poder publicar en Pages.
- `environment: { name: github-pages, url: ... }` — asocia la corrida a un "ambiente" de
  GitHub, lo que te deja ver la URL publicada directamente desde la corrida.
- `actions/configure-pages`, `actions/upload-pages-artifact`, `actions/deploy-pages` — el
  trío de acciones oficiales de GitHub para publicar en Pages usando Actions (no el método
  viejo de una rama `gh-pages`).

**Antes de habilitarlo**, andá a **Settings → Pages** de tu repo y elegí
**Source: GitHub Actions**.

### Ejercicio 4

1. Agregá el `base` a `vite.config.js` y el job `deploy` a tu `ci.yml`. Mergeá a `main` y
   confirmá que el sitio se publica y carga correctamente en
   `tu-usuario.github.io/tu-repo/`.
2. En una rama nueva, rompé algo del job de deploy — por ejemplo, un typo en el `path` del
   artifact (`path: disttt` en vez de `path: dist`). Mergeá a `main` y confirmá que el job
   `deploy` falla **en `main`**, no en el PR.
   - **Pensalo antes de mirar la respuesta:** ¿por qué no se vio el error en el PR, como sí
     pasó en las etapas anteriores?
   - Respuesta: por el `if:` que gatea este job solo a pushes en `main`. En el PR, el job
     directamente no corre (aparece *skipped*), así que no hay dónde ver el rojo hasta que
     se mergea.
3. En una rama nueva (no reutilices la anterior, ya que su PR ya fue mergeado), corregí el
   typo y mergeá. Confirmá que el sitio vuelve a desplegarse bien.

**Checklist:**
- [ ] El sitio carga correctamente (no en blanco) en tu URL de GitHub Pages.
- [ ] Entendés por qué el bug de este ejercicio no se vio en rojo dentro del PR.

### El workflow completo hasta acá

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

  deploy:
    needs: build
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    permissions:
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
      - id: deployment
        uses: actions/deploy-pages@v4
```

Compará este archivo con el tuyo — si algo no coincide, revisalo antes de seguir.

---

## 8. Branch protection: evitar que se mergee código roto

**Concepto:** hasta ahora, nada te impide mergear un PR aunque algún check esté en rojo (o
todavía corriendo). Branch protection es una regla a nivel repositorio que lo bloquea.

**Cómo configurarlo** (esto se hace en la interfaz de GitHub, no en un archivo YAML):

1. Andá a **Settings → Branches** en tu repo.
2. Agregá una regla para la rama `main`.
3. Activá **"Require status checks to pass before merging"**.
4. Seleccioná los checks `lint`, `test` y `build` (van a aparecer en la lista una vez que
   hayan corrido al menos una vez).
5. Guardá.

### Ejercicio 5 (bonus)

1. Configurá la regla como se indica arriba.
2. Abrí un PR con un check fallando (o mientras todavía están corriendo) y confirmá que el
   botón de merge queda bloqueado.
3. Corregí el problema, esperá a que los checks pasen, y confirmá que ahora sí podés
   mergear.

**Checklist:**
- [ ] Viste el botón de merge bloqueado por un check en rojo o corriendo.
- [ ] La regla solo exige los checks que realmente existen en tu workflow.

---

## 9. Lecciones aprendidas (para tener en cuenta)

- **Un bug de configuración no es lo mismo que un bug de código de la app** — como viste en
  el Ejercicio 3, se puede romper solo una etapa (`build`) sin tocar las anteriores. Sirve
  para razonar en qué capa está realmente un problema.
- **No todo bug se ve en el PR** — si un job está gateado con `if:` (como `deploy`), su
  estado rojo puede aparecer recién después de mergear, en `main`.

## 10. Glosario rápido

- **Workflow**: el archivo YAML completo que define el pipeline.
- **Job**: una etapa del pipeline (lint, test, build, deploy...).
- **Step**: un paso individual dentro de un job.
- **Runner**: la máquina virtual donde corre un job (`ubuntu-latest` en nuestros ejemplos).
- **Artifact**: un archivo o carpeta generado por un job que se puede descargar o pasar a
  otro job.
- **Status check**: el resultado (✅/❌) de un job, asociado a un commit/PR.
- **Branch protection**: reglas de GitHub sobre qué se necesita para poder mergear a una
  rama.
