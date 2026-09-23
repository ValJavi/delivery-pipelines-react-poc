---
marp: true
theme: default
paginate: true
---

# CI/CD con GitHub Actions
### Módulo 2: Ambientes, secrets y aprobaciones

Bootcamp — Módulo CI/CD

---

## Agenda

1. ¿Por qué un solo ambiente no alcanza?
2. Modelo de ramas por ambiente
3. Deploy real a un ambiente de desarrollo
4. Secrets por ambiente
5. Producción con aprobación manual

---

## ¿Por qué un solo ambiente no alcanza?

- El Módulo 1 publica a producción apenas se mergea a `main`.
- Un proyecto real necesita probar cambios en un ambiente de menor riesgo primero.
- Si algo se rompe, se rompe en staging — no en producción.

---

## Modelo de ramas por ambiente

```
feature/mi-cambio  →  (PR)  →  develop  →  (PR)  →  main
```

- **`develop`**: staging/desarrollo.
- **`main`**: producción.
- Una feature branch **nunca** se mergea directo a `main`.

---

## Deploy real a `develop`

- `actions/deploy-pages` (Módulo 1) solo soporta **un** sitio por repo.
- Solución: `peaceiris/actions-gh-pages`, publicando a subcarpetas de una rama `gh-pages`.

---

## Deploy real a `develop`: el job

```yaml
  deploy-develop:
    needs: build
    if: github.ref == 'refs/heads/develop' && github.event_name == 'push'
    permissions: { contents: write }
    environment: { name: develop, url: https://.../develop/ }
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run build -- --base=/repo/develop/
      - uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
          destination_dir: develop
          keep_files: true
```

---

## Deploy: detalles importantes

- `--base=/repo/develop/` — assets servidos desde una subcarpeta necesitan ese prefijo.
- `destination_dir: develop` — publica en una subcarpeta, no en la raíz.
- `keep_files: true` — **crítico**: sin esto, cada deploy borra lo publicado por el otro
  ambiente.
- `permissions: contents: write` reemplaza a `pages: write` / `id-token: write`.

---

## Secrets por ambiente

- Un Environment de GitHub puede tener secrets propios (Settings → Environments →
  `develop` → Environment secrets).
- Solo los jobs que declaran ese `environment.name` pueden leerlos.

```yaml
      - name: Check develop secret
        env:
          DEVELOP_API_KEY: ${{ secrets.DEVELOP_API_KEY }}
        run: |
          if [ -z "$DEVELOP_API_KEY" ]; then
            echo "::error::DEVELOP_API_KEY no está configurado"
            exit 1
          fi
```

**Ejercicio:** typo en la referencia al secret (no en el secret real) → rojo. Corregilo → verde.

---

## Secrets: el gotcha

- Un secret mal referenciado **no da error de "no existe"**.
- Se resuelve como string vacío en tiempo de ejecución.
- Por eso conviene chequearlo explícitamente, con un mensaje de error claro.

---

## Producción con aprobación manual

- Settings → Environments → `production` → **Required reviewers**.
- El job `deploy` queda **"Waiting"** hasta que un reviewer lo aprueba.
- No hace falta cambiar el YAML — ya declara `environment: { name: production }`.

---

## Un detalle contraintuitivo

- No podés aprobar tu propio Pull Request.
- **Sí podés** aprobar tu propio deploy, si sos reviewer del Environment.
- Son dos mecanismos de GitHub distintos, con reglas independientes.

---

## Resultado esperado

Al final de la clase, cada estudiante tiene:

- Rama `develop` con su propio sitio de staging publicado.
- Un secret configurado por ambiente, con su propio ciclo rojo → verde.
- `production` protegido con aprobación manual antes de cada deploy.

---

# Gracias
### Preguntas
