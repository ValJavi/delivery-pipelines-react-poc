# Guía del profesor — Módulo 2

> Guion para dictar la clase de ambientes, secrets y aprobaciones. Continúa directamente
> después de [02-guia-profesor.md](02-guia-profesor.md). El repo real
> [`delivery-pipelines-react-poc`](https://github.com/ValJavi/delivery-pipelines-react-poc)
> sigue siendo material del profesor — los estudiantes trabajan íntegramente desde
> [04-guia-estudiante-modulo2.md](04-guia-estudiante-modulo2.md).

## Objetivo de la clase

Que el estudiante entienda por qué un pipeline de un solo ambiente (el del Módulo 1) no
alcanza en un proyecto real, y construya el modelo que sí se usa en la práctica: ramas por
ambiente, secrets scoped por ambiente, y una aprobación manual antes de producción.

## Prerrequisitos

- Cada estudiante debe haber terminado el Módulo 1 completo, con su pipeline
  `lint → test → build → deploy` funcionando y el sitio publicado.
- De tu lado, el repo de demo ya tiene esto construido — podés reproducirlo en vivo citando
  los PRs reales de abajo.

## Duración estimada

~2h10 (puede dividirse en 2 sesiones).

| Bloque | Tema | Demo | Ejercicio del estudiante | Total |
|---|---|---|---|---|
| 1 | Por qué un solo ambiente no alcanza + modelo de ramas (secc. 1-2) | 10 min | 10 min | 20 min |
| 2 | Deploy real a `develop` (secc. 3) | 15 min | 20 min | 35 min |
| 3 | Secrets por ambiente (secc. 4) | 10 min | 20 min | 30 min |
| 4 | Producción con aprobación manual (secc. 5) | 15 min | 20 min | 35 min |
| 5 | Cierre | 10 min | — | 10 min |

## Diferencia con el patrón del Módulo 1

En el Módulo 1, cada etapa seguía el mismo patrón verde → rojo → verde. Acá no es así: la
mayoría de las secciones son de **configuración** (ambientes, secrets, reviewers) sin un bug
intencional — el foco es que el estudiante configure bien algo nuevo, no que debuguee. El
único ciclo rojo → verde de este módulo está en la sección de secrets (Bloque 3), con un
secret mal referenciado. Aclaralo al empezar la clase para que no esperen un bug en cada
bloque.

## Bloque 1: Modelo de ramas (PR #10)

- Preguntar a la clase: ¿qué pasaría si alguien mergea un cambio roto directo a `main` en su
  trabajo? Llevar la conversación a por qué casi todo proyecto real tiene un ambiente
  intermedio.
- Mostrar el modelo `feature/* → develop → main` (sección 2 de la guía del estudiante).
- Mostrar en el repo real la rama `develop` y cómo cada feature se mergea primero ahí antes de
  promoverse a `main`.
- Dar paso al **Ejercicio 1** (crear la rama `develop`) antes de seguir.

## Bloque 2: Deploy real a `develop` (PR #10)

- Mostrar el job `deploy-develop` en `.github/workflows/ci.yml` — `feat: add develop
  environment with real deploy to GitHub Pages subpath`.
- Explicar el problema que resuelve: el mecanismo del Módulo 1
  (`actions/configure-pages` + `actions/deploy-pages`) solo permite un sitio publicado por
  repo. La solución acá es `peaceiris/actions-gh-pages`, publicando a subcarpetas de una
  rama `gh-pages` (`destination_dir` + `keep_files: true`).
- **Punto clave para remarcar**: `keep_files: true` es lo que evita que el deploy de un
  ambiente borre el del otro — sin eso, cada deploy empieza de cero.
- Mostrar el cambio de `--base` en el build de `deploy-develop` (`--base=/repo/develop/`) y
  por qué hace falta: los assets de un sitio servido desde una subcarpeta necesitan ese
  prefijo distinto al de la raíz.
- Mostrar el cambio de **Settings → Pages → Source** a "Deploy from a branch" (`gh-pages`).
- Dar paso al **Ejercicio 2** (sección 3 de la guía del estudiante).

## Bloque 3: Secrets por ambiente (PRs #14 y #15)

- Explicar el concepto de secrets scoped a un Environment (Settings → Environments →
  `develop` → Environment secrets) antes de tocar código.
- Mostrar el step "Check develop secret" agregado al job `deploy-develop`, que lee
  `secrets.DEVELOP_API_KEY` y falla explícitamente si está vacío.
- PR #14 (bug, mensaje de commit "fix: adjust develop secret check" a propósito — mismo
  patrón del Módulo 1 de que el bug suene a fix): typo en la referencia al secret
  (`secrets.DEVELP_API_KEY` en vez de `secrets.DEVELOP_API_KEY`) → el chequeo falla con el
  mensaje de error, aunque el secret real sigue bien configurado.
- PR #15 (fix): corrige la referencia → vuelve a verde.
- **Punto clave para remarcar**: un secret mal referenciado no da un error de "no existe" —
  se resuelve como string vacío. Por eso el chequeo explícito con `exit 1` importa: sin él,
  el fallo aparecería más adelante, en un paso que ni siquiera menciona el secret.
- Dar paso al **Ejercicio 3** (sección 4 de la guía del estudiante) — es el único ciclo
  rojo → verde de este módulo.

## Bloque 4: Producción con aprobación manual (PR #16)

- Mostrar **Settings → Environments → production → Required reviewers** — configuración
  manual, no YAML (igual que branch protection en el Módulo 1).
- Mergear el PR de promoción `develop → main` en vivo y mostrar cómo el job `deploy` queda en
  estado **"Waiting"** en la pestaña Actions, en vez de correr directo.
- Aprobarlo en vivo y mostrar que recién ahí corre y publica.
- **Pregunta para la clase**: ¿por qué acá sí podés aprobar tu propio deploy, si no podés
  aprobar tu propio Pull Request? Discutir que son dos mecanismos separados de GitHub, con
  reglas independientes — Required reviewers de un Environment no tiene la restricción de
  autoaprobación que sí tiene la revisión de PRs.
- Dar paso al **Ejercicio 4** (sección 5 de la guía del estudiante).

## Cierre

- Repasar el diagrama de ramas y el workflow completo (secciones 2 y 6 de la guía del
  estudiante) con toda la clase.
- Repasar la sección 7 ("Lecciones aprendidas") del Módulo 2.
- Confirmar que cada estudiante tiene: rama `develop` con su propio sitio publicado, secret
  configurado y funcionando, y el ambiente `production` con aprobación manual activa.

## Preguntas frecuentes anticipadas

- **"¿Por qué no usamos `actions/deploy-pages` para los dos ambientes, como en el Módulo
  1?"** — Porque ese mecanismo solo soporta un despliegue de Pages por repo. Para tener dos
  sitios visibles a la vez (desarrollo y producción) hace falta un mecanismo que soporte
  subcarpetas, de ahí `peaceiris/actions-gh-pages`.
- **"¿Por qué el secret no da error de 'no existe' cuando está mal escrito?"** — Es una
  decisión de diseño de GitHub Actions: una referencia a un secret inexistente se resuelve
  como string vacío en tiempo de ejecución, no como error de sintaxis. Por eso el módulo
  enseña a chequearlo explícitamente.
- **"¿Puedo aprobar mi propio deploy a producción?"** — Sí, si sos uno de los reviewers
  configurados en el Environment. Es distinto a la revisión de Pull Requests, donde GitHub sí
  bloquea la autoaprobación.
