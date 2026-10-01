# UBA careers — sources

Fecha de consulta: 2026-10-01.

## Bloqueo de red: no se pudo completar la verificación de esta revisión

**Esta revisión trimestral no pudo ejecutar su método habitual.** El entorno
de esta sesión bloquea *todo* el acceso HTTP(S) saliente a nivel de proxy de
egreso, no solo a `uba.ar`:

- `WebFetch` sobre `https://www.uba.ar/carreras/1`..`13`, sobre varias
  subdominios de facultad usados como `sourceUrl` en `uba.json`
  (`www.fi.uba.ar`, `exactas.uba.ar`) y sobre dominios de control totalmente
  ajenos a UBA (`https://www.google.com`, `https://example.com`) devolvieron
  todos el mismo error `EGRESS_BLOCKED` ("Access to <domain> is blocked by the
  network egress proxy").
- `curl -sS https://www.uba.ar/carreras/1` (vía el proxy de la sesión)
  devolvió `CONNECT tunnel failed, response 403` — una denegación de política
  de organización a nivel de proxy, no un bloqueo anti-bot específico de
  `uba.ar` (ver `/root/.ccr/README.md`: "403 / 407 from the proxy... do not
  retry or route around it — report the blocked host").

Como el bloqueo es indiscriminado (afecta dominios de control que nada tienen
que ver con UBA), se trata como una restricción del entorno de ejecución de
esta sesión, no como una señal real sobre el estado de las 13 páginas de
`careersSourceUrls` ni de los ~115 `sourceUrl` individuales de `uba.json`.
Siguiendo la regla del plan ("si una página fuente no carga, tratarlo como
'no se pudo verificar' — no marcar como discontinuada ninguna carrera ausente
de esa página"), **no se marcó ninguna carrera como nueva, renombrada, movida
de facultad, con nivel cambiado, discontinuada, ni se corrigió ningún
`sourceUrl`,** porque no se pudo leer el contenido real de ninguna página
oficial de `uba.ar` esta vez.

### Verificación secundaria (best-effort, no autoritativa)

La herramienta `WebSearch` (que no pasa por el proxy de egreso bloqueado de
esta sesión, porque corre del lado del servidor) sí funcionó. Se usó solo
como señal de humo, no como fuente verificada, para las 3 carreras marcadas
como sensibles en el plan de esta revisión (referenciadas por nombre en
`official-subjects.ts`):

- **"Ingeniería en Informática"** (Facultad de Ingeniería): los resultados de
  búsqueda (incluyendo `fi.uba.ar/grado/carreras/ingenieria-en-informatica` y
  planes de estudio en `cms.fi.uba.ar`) siguen usando ese nombre y esa
  facultad. Sin discrepancia aparente.
- **"Licenciatura en Ciencias de Datos"** (Facultad de Ciencias Exactas y
  Naturales): la búsqueda muestra **dos variantes** convivendo en dominios
  oficiales de `exactas.uba.ar`: `exactas.uba.ar/ensenanza/carreras-de-grado/ciencias-de-datos/`
  (coincide con el `sourceUrl` y el nombre actual del JSON, plural "Ciencias
  de Datos") y `ingresantes.exactas.uba.ar/licenciatura-en-ciencia-de-datos/`
  (singular "Ciencia de Datos", igual que la cobertura de prensa de 2020 sobre
  el lanzamiento de la carrera). **No se tocó el nombre**: es una de las 3
  carreras marcadas como sensibles, los resultados de búsqueda son
  contradictorios entre sí y no equivalen a leer la página oficial completa,
  así que no hay evidencia suficientemente sólida para un cambio. Queda
  anotado para que la próxima revisión (con acceso real a la web) lo
  resuelva leyendo directamente `exactas.uba.ar/ensenanza/carreras-de-grado/ciencias-de-datos/`.
- **"Licenciatura en Ciencias de la Computación"** (Facultad de Ciencias
  Exactas y Naturales): los resultados (`ingresantes.exactas.uba.ar/licenciatura-en-ciencias-de-la-computacion/`,
  `computacion.dc.uba.ar`) siguen usando ese nombre y esa facultad. Sin
  discrepancia aparente.

Esta señal secundaria es insuficiente para justificar ningún cambio al
archivo según las reglas del plan ("aplicar solo los cambios que se puedan
justificar desde las páginas oficiales efectivamente leídas"), así que
**`uba.json` no se modificó en esta revisión.**

### Qué queda pendiente

La próxima revisión trimestral de UBA debería repetirse desde un entorno con
acceso de red real a `uba.ar` y subdominios, usando el mismo método que
`unc.sources.md` / `unlp.sources.md` / `unr.sources.md` (fetch de las 13
páginas de `https://www.uba.ar/carreras/1..13` + verificación uno por uno de
los ~115 `sourceUrl` de `uba.json` con `curl -sL -o /dev/null -w
"%{http_code}"`), y resolver en particular la discrepancia singular/plural de
"Ciencia(s) de Datos" señalada arriba.
