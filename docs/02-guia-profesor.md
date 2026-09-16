# Guía del profesor

> Guion para dictar la clase de CI/CD. El repo real
> [`delivery-pipelines-react-poc`](https://github.com/ValJavi/delivery-pipelines-react-poc)
> (con las 4 etapas construidas y su historial completo de PRs) es **material del
> profesor**, no algo que se comparte con los estudiantes — sirve como tu propio guion
> probado, con commits y PRs reales para citar mientras armás la demo en vivo (ya sea
> reproduciendo este mismo repo frente a la clase, o mostrando sus pantallas como apoyo).
> Los estudiantes trabajan íntegramente desde
> [01-guia-estudiante.md](01-guia-estudiante.md), que incluye el ejemplo de código de cada
> job y el ejercicio para aplicarlo a continuación — no necesitan (ni deberían necesitar)
> acceso a este repo.

## Objetivo de la clase

Que el estudiante entienda, viendo un ciclo real **verde → rojo → verde** en GitHub Actions,
cómo se construye un pipeline de CI/CD incrementalmente, etapa por etapa, y qué significa cada
color en la práctica (no solo en teoría).

## Prerrequisitos

- Cuenta de GitHub (personal, puede ser gratuita) — vos y cada estudiante.
- Node.js 20+ instalado.
- Cada estudiante debe llegar con el proyecto base ya armado — sección "Antes de empezar" de
  la guía del estudiante trae los comandos exactos (`npm create vite@latest`, instalar
  Vitest/RTL, etc.). Pedíselos como tarea previa para no perder tiempo de clase en setup.
- De tu lado, tené preparado (o ya construido, como en `delivery-pipelines-react-poc`) tu
  propio repo de demo con las 4 etapas, para mostrar cada paso en vivo antes de que los
  estudiantes lo repliquen.

## Preparar las slides

Las slides de apoyo están en [03-slides.md](03-slides.md), en formato
[Marp](https://marp.app/). Para mostrarlas en clase tenés dos opciones:

- **VS Code (más simple):** instalá la extensión "Marp for VS Code", abrí `03-slides.md` y
  activá la vista previa (ícono de Marp arriba a la derecha, o `Ctrl+Shift+V`). Desde ahí podés
  presentar directamente o exportar a PDF/PPTX.
- **HTML ya generado:** `03-slides.html` (en esta misma carpeta) ya está exportado. Abrilo con
  doble clic o desde terminal (`open docs/03-slides.html`), andá a pantalla completa (`F` o el
  ícono de la esquina inferior) y navegá con las flechas ← →. Si editás `03-slides.md` después,
  regenerá el HTML con `npx @marp-team/marp-cli@latest 03-slides.md -o 03-slides.html`.

## Duración estimada

~2h15 (puede dividirse en 2 sesiones). Cada bloque incluye tiempo para que los estudiantes
hagan el ejercicio correspondiente antes de pasar al siguiente — no se dejan los ejercicios
para el final.

| Bloque | Tema | Demo | Ejercicio del estudiante | Total |
|---|---|---|---|---|
| 1 | Intro + conceptos (secc. 1-3 de la guía) | 10 min | — | 10 min |
| 2 | Etapa lint (secc. 4) | 10 min | 15 min | 25 min |
| 3 | Etapa test (secc. 5) | 10 min | 15 min | 25 min |
| 4 | Etapa build (secc. 6) | 10 min | 15 min | 25 min |
| 5 | Etapa deploy (secc. 7) | 15 min | 15 min | 30 min |
| 6 | Branch protection (secc. 8) | 5 min | 10 min | 15 min |
| 7 | Cierre | 5 min | — | 5 min |

## Patrón que se repite en cada etapa

Para cada etapa del pipeline se siguió **siempre el mismo patrón de 3 commits/PRs**, y así
conviene mostrarlo en clase:

1. **Agregar el job solo** (sin bugs) → el pipeline queda en verde.
2. **Introducir un bug intencional** relacionado a esa etapa → el pipeline se pone en rojo.
   (Nota: el mensaje de commit del bug suena a "fix", a propósito — así se ve en el repo real
   cómo un commit bien intencionado puede introducir una regresión.)
3. **Corregir el bug** → el pipeline vuelve a verde.

Esto es más pedagógico que arrancar directamente en rojo: el estudiante ve primero cómo se ve
"todo bien", y recién después qué cambia cuando algo se rompe.

## Bloque 2: Lint (PR #1)

- Mostrar `.github/workflows/ci.yml` con solo el job `lint` (`b2aab1f — feat: add lint job to
  CI workflow`, corrido directo sobre `main`).
- Mostrar el PR #1: agrega `greeting` a `App.jsx` pero sin usarlo (`3a94eff`) → ESLint falla
  por variable no usada → el check `lint` se pone en rojo en el PR.
- Mostrar el commit de fix en el mismo PR (`5c29fdb — fix: use greeting variable instead of
  leaving it unused`) → el check vuelve a verde → se mergea.
- **Pregunta para la clase**: ¿por qué ESLint marca error justamente ahí? Discutir reglas de
  lint como "documentación ejecutable" del estilo del equipo.
- Dar paso al **Ejercicio 1** (sección 4 de la guía del estudiante) en su propio repo antes de
  seguir al bloque de test.

## Bloque 3: Test (PRs #2 y #3)

- PR #2: agrega Vitest + React Testing Library y el job `test` (`needs: lint`).
- PR #3: introduce un typo en el texto esperado (`TD Bootcmap!` en vez de `TD Bootcamp!`,
  commit `fb4c6c4`) → el test que verifica el texto renderizado falla → rojo.
- Mismo PR, commit de fix (`27bb0ac`) → vuelve a verde.
- **Punto clave para remarcar**: el job `test` tiene `needs: lint` — si lint fallara, test ni
  arrancaría. Mostrar esa dependencia en el YAML.
- Dar paso al **Ejercicio 2** (sección 5 de la guía del estudiante).

## Bloque 4: Build (PRs #4 y #5)

- PR #4: agrega el job `build` (`needs: test`) que corre `npm run build` y sube `dist/` como
  artifact.
- PR #5: el bug es en `vite.config.js`, no en el código de la app —
  `build.rollupOptions.input` apuntando a un HTML inexistente (`fc016b5`) → `build` falla, pero
  **lint y test siguen en verde**, porque esa opción solo la usa Rollup al empaquetar.
- Fix en el mismo PR (`12a1ffe`) → verde de nuevo.
- **Punto clave para remarcar**: no todos los bugs son bugs de código de app — un archivo de
  configuración de build puede romper una sola etapa sin tocar las anteriores. Buen momento
  para hablar de "aislamiento de fallos" por etapa.
- Dar paso al **Ejercicio 3** (sección 6 de la guía del estudiante).

## Bloque 5: Deploy (PRs #6, #7, #8)

- PR #6: agrega el job `deploy` (`needs: build`), con `if: github.ref == 'refs/heads/main' &&
  github.event_name == 'push'` — solo corre en pushes directos a `main`.
- **Antes de mostrar el bug**, explicar la decisión de diseño: ¿por qué no correr deploy en
  cada PR? (Real-world: no querés publicar cada branch en producción). Discutir el trade-off:
  el estado rojo de este bug **no se va a ver en el PR**, solo después de mergear.
- PR #7 (bug): typo en el path del artifact (`path: disttt` en vez de `path: dist`,
  `77e3c0e`). Mergear el PR y mostrar en vivo cómo el job `deploy` falla en `main` (no en el
  PR).
- PR #8 (fix, en una rama nueva porque la de PR #7 ya estaba mergeada):
  `feature/fix-deploy-path-typo`, commit `be60ea3` corrige el path → mergear → deploy corre
  verde en `main` → mostrar el sitio publicado: `https://valjavi.github.io/delivery-pipelines-react-poc/`.
- **Gotcha a mencionar**: si tenés un cambio local sin commitear en `ci.yml`, no vas a poder
  cambiar de rama hasta descartarlo o commitearlo — buen momento para hablar de por qué "commit
  chico y frecuente" ayuda a no bloquearte.
- Dar paso al **Ejercicio 4** (sección 7 de la guía del estudiante). Es el bloque más largo:
  ayudá a resolver dudas de `base` en `vite.config.js` y de habilitar Pages en Settings antes
  de que se traben.

## Bloque 6: Branch protection

- Mostrar Settings → Branches → regla sobre `main` con "Require status checks to pass before
  merging" y los checks `lint`, `test`, `build` tildados.
- Mostrar en vivo qué pasa si intentás mergear un PR con un check todavía corriendo o en rojo:
  GitHub bloquea el botón de merge.
- **Nota**: esta configuración se hace manualmente desde la UI de GitHub, no por API — es
  información de cuenta/repositorio, no algo que un pipeline deba automatizar.
- Dar paso al **Ejercicio 5 (bonus)** (sección 8 de la guía del estudiante).

## Cierre

- Repasar el diagrama del pipeline completo (sección 2 de la guía del estudiante) y la
  sección 9 ("Lecciones aprendidas") con toda la clase.
- Confirmar que cada estudiante terminó con su propio repo, con las 4 etapas funcionando y
  el sitio publicado en su propia URL de GitHub Pages.
- No hace falta compartir el repo de demo del profesor — cada estudiante ya construyó el
  suyo siguiendo la guía.

## Preguntas frecuentes anticipadas

- **"¿Por qué el fix de deploy tuvo que ir en una rama nueva?"** — Porque la rama del PR #7 ya
  estaba mergeada y cerrada; una vez mergeado un PR, esa rama ya cumplió su función. Los
  cambios nuevos van en una rama nueva creada desde el `main` actualizado.
- **"¿Por qué el deploy no se ve romperse en el PR como las otras etapas?"** — Por el `if:`
  que lo gatea solo a pushes en `main`. Es una decisión correcta para el mundo real, pero
  cambia cuándo se ve el estado rojo.
