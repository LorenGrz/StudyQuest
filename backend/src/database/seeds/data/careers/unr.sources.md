# UNR careers — sources

Fecha de consulta: 2026-09-29.

Método: `curl -sL -A "Mozilla/5.0" <url>`. UNR publica un buscador central de
carreras y diplomaturas (tabla `ninja_table`, una fila por carrera) con nivel,
unidad académica, nombre, plan de estudios (PDF) y web propia:

https://unr.edu.ar/buscador-de-carreras-y-diplomaturas/

Se filtraron las filas con `NIVEL` = `GRADO`, `PROFESORADO DE GRADO` o
`TECNICATURA / PREGRADO` (se excluyó `DIPLOMATURA DE PREGRADO`: son cursos
de extensión cortos — p. ej. "100 Años de Historia de Rosario", "Curaduría
en Artes Visuales" — no carreras universitarias de grado/pregrado). Total:
108 filas antes de depurar, **100 carreras** finales tras las correcciones
de abajo.

## Depuración de la tabla oficial

La tabla de UNR tiene algunos datos inconsistentes/duplicados que se
corrigieron contrastando cada caso con la página oficial de la carrera
(`curl` + `<title>`):

- **"Notariado" (Facultad de Derecho)** excluida: la tabla la marca `GRADO`,
  pero (a) su `plan_url` en la tabla es un enlace de Google Drive
  **idéntico** al de "Licenciatura en Ciencia de Datos" de otra facultad
  (error de copiado en la fuente), y (b) la propia web de la Facultad de
  Derecho (`www.fder.unr.edu.ar`) la lista bajo el menú de **posgrado**,
  junto con el Doctorado en Derecho, no en el de carreras de grado. Sin un
  plan de estudios de grado verificable, se excluye en vez de adivinar.
- **4 filas "PROFESORADO DE GRADO EN CIENCIA POLÍTICA / COMUNICACIÓN SOCIAL /
  RELACIONES INTERNACIONALES / TRABAJO SOCIAL"** excluidas: reutilizan
  exactamente la misma URL de plan y de web que las Licenciaturas homónimas
  (mismo folleto duplicado 2 veces en la tabla), ninguna búsqueda
  (DuckDuckGo, sitio de la facultad) encontró una carrera separada con ese
  nombre. Se tratan como duplicado/bug de la fuente, no como carrera real.
- **"Licenciatura en Seguridad Ciudadana" y "Licenciatura en Turismo"**
  aparecen 2 veces cada una (carreras compartidas entre Ciencia Política y
  Derecho/Económicas respectivamente) con el mismo nombre y plan: se
  dejó una sola fila, con la facultad que administra la página oficial de la
  carrera (Facultad de Ciencia Política y Relaciones Internacionales para
  ambas, confirmado por `<title>` de sus páginas).
- **"Batería"** (Tecnicatura, Facultad de Humanidades y Artes) aparecía 2
  veces (fila duplicada exacta en la tabla): se dejó una sola.
- Varios nombres de la tabla eran abreviados o combinaban varias
  orientaciones en una sola fila (p. ej. "LICENCIATURA EN FLAUTA - OBOE -
  CLARINETE..." o "TECNICATURA EN REACIONES DE TRABAJO", con error de
  tipeo). Se reemplazó cada nombre por el título real de la página oficial
  de la carrera (`<title>`/`<h1>`), por ejemplo: "Licenciatura en Vientos
  (Flauta, Clarinete, Saxofón, Fagot, Oboe, Trompeta, Trombón, Trompa)",
  "Tecnicatura en Relaciones del Trabajo", "Tecnicatura Universitaria en
  Administración Pública" (la tabla omitía "Universitaria").

## Nivel (`grado` / `pregrado`)

Las filas de nivel `TECNICATURA / PREGRADO` son `pregrado`. Además, dos
carreras que la tabla clasifica como `GRADO` son en realidad tecnicaturas
según su propia página oficial y se pasaron a `pregrado`: "Tecnicatura
Universitaria en Acompañamiento y Cuidado de las Personas Mayores" (Facultad
de Ciencias del Movimiento Humano y el Cuidado) y "Tecnicatura Universitaria
en Acompañamiento Terapéutico" (Facultad de Psicología, cuyo nombre real
según la propia facultad incluye "Universitaria", ausente en la tabla).
`PROFESORADO DE GRADO` y el resto de `GRADO` quedan como `grado`.

## Facultad de Ciencias del Movimiento Humano y el Cuidado

La tabla la llama "CIENCIAS DE MOVIMIENTO HUMANO Y DEL CUIDADO"; el nombre
oficial completo, confirmado por el `<title>` de sus páginas
(`famhyc.unr.edu.ar`), es "Facultad de Ciencias del Movimiento Humano y el
Cuidado".

## URLs

Las URLs de la tabla de UNR usan mayúsculas y son **sensibles a
mayúsculas/minúsculas** en el servidor real (varias rutas `/wp-content/
uploads/...PDF` en mayúsculas devuelven 404; la misma ruta en minúsculas
devuelve 200). Se normalizaron a minúsculas (excepto los IDs de archivo de
Google Drive, que sí son sensibles a mayúsculas/minúsculas y se dejaron tal
cual). `fder.unr.edu.ar` sin `www` no resuelve DNS; se usó `www.fder.unr.edu.ar`.
Se reemplazaron los enlaces a PDF de plan de estudios por la página oficial
de la carrera (más estable) cuando la propia facultad la ofrecía con el
nombre real de la carrera en el `<title>`.

Todas las URLs de `unr.json` se verificaron una por una con
`curl -sL -o /dev/null -w "%{http_code}" -A "Mozilla/5.0"` (200 en todas).

## 2026-10-01 — revisión trimestral

Intento de re-verificar `https://unr.edu.ar/buscador-de-carreras-y-diplomaturas/`
y las 100 `sourceUrl` individuales de `unr.json`: **bloqueado a nivel de red**
en este entorno. Tanto `curl` directo como la herramienta WebFetch devolvieron
`EGRESS_BLOCKED` para `unr.edu.ar` y cualquier subdominio (`fceia.unr.edu.ar`,
etc.); se confirmó que el bloqueo no es específico de UNR probando dominios
no relacionados (`www.google.com`, `www.uba.ar`, `www.unlp.edu.ar`,
`archive.org`), que fallaron igual — es un bloqueo de egress general de la
sesión, no un 403/anti-bot propio de UNR. Por la regla del proyecto ("a
page/step that fails to load means 'could not verify' — never mark something
as discontinued just because a fetch failed"), **no se tocó ninguna fila por
esta causa** y no se reemplazó ninguna `sourceUrl`.

Como mitigación se usó búsqueda web (snippets de prensa y de las propias
páginas de UNR indexadas) en vez de fetch directo, para cotejar lo que ya
está en `unr.json` contra noticias oficiales/prensa recientes:

- Las "seis nuevas carreras para 2026" anunciadas por la UNR (nota oficial
  `unr.edu.ar/nueva-sesion-del-consejo-superior-3/` y cobertura de prensa:
  La Capital, Rosario3, Infobae) son: Profesorado Universitario en Educación
  Física, Licenciatura en Actividad Física y Deporte, Licenciatura en
  Sistemas Integrales de Cuidado y Tecnicatura Universitaria en
  Acompañamiento y Cuidado de las Personas Mayores (las 4 de la nueva
  Facultad de Ciencias del Movimiento Humano y el Cuidado, con clases desde
  abril 2026), más Tecnicatura Universitaria en Acompañamiento Terapéutico
  (Facultad de Psicología) y Licenciatura en Terapia Ocupacional (Facultad
  de Ciencias Médicas, carrera histórica suspendida desde 1977 que se
  reabre). **Las 6 ya estaban presentes en `unr.json` con la misma facultad
  y el mismo nombre** — no se agregó nada.
- No se encontró ninguna mención de prensa ni de UNR sobre cierre/
  discontinuación de carreras de grado/pregrado para 2025-2026.
- Las 3 carreras referenciadas en `official-subjects.ts` ("Licenciatura en
  Ciencia de Datos", "Licenciatura en Ciencias de la Computación",
  "Tecnicatura Universitaria en Inteligencia Artificial") se cotejaron contra
  páginas de FCEyE/FCEIA indexadas y notas de prensa (La Capital,
  versionrosario.com.ar, FCEIA): mismo nombre, misma facultad que en
  `unr.json`. **No se modificaron.**
- URL de "Tecnicatura Universitaria en Inteligencia Artificial": un snippet
  de búsqueda mostró una URL alternativa en `web.fceia.unr.edu.ar` con una
  ruta distinta (`.../licenciatura-en-ciencias-de-la-computaci%C3%B3n/194-
  grado/carreras-de-pregrado/2165-...html`) a la que está en `unr.json`
  (`.../carreras/carreras-de-pregrado/2165-...html`). Ambas apuntan al mismo
  ID de artículo de Joomla (2165) y podrían ser dos rutas de menú válidas
  para la misma página; sin poder hacer `curl`/fetch para comprobar el
  código HTTP de ninguna de las dos, **no se cambió** la URL existente
  (regla: nunca reemplazar sin confirmar que la actual está rota).

**Resultado: sin cambios en `unr.json`.** No se pudo hacer la verificación
completa fila por fila de esta revisión por el bloqueo de red; queda
pendiente para la próxima sesión en la que `unr.edu.ar` sea alcanzable.
