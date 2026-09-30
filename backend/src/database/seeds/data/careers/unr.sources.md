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
