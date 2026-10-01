# UNSAM careers — sources

Fecha de consulta: 2026-10-01.

## Bloqueo de red: no se pudo completar la verificación de esta revisión

**Esta revisión trimestral no pudo ejecutar su método habitual.** El entorno
de esta sesión bloquea *todo* el acceso HTTP(S) saliente a nivel de proxy de
egreso, no solo a `unsam.edu.ar`:

- `WebFetch` sobre las 11 páginas de `careersSourceUrls` de `unsam.json`
  (`www.unsam.edu.ar/escuelas/ecyt/carreras-grado.php`,
  `.../ecyt/carreras-pregrado.php`, `.../eh/carreras-grado.php`,
  `.../eidaes/carreras-grado.php`, `.../epyg/carreras-grado.php`,
  `.../ehys/oferta.php`, `.../eayp/grado.php`, `.../ebyn/oferta.php`,
  `www.unsam.edu.ar/escuelas/eeyn`, `.../institutos/icrm/oferta.php`) y sobre
  `https://ibeninson.cnea.edu.ar/carreras/` devolvieron todas el mismo error
  `EGRESS_BLOCKED` ("Access to <domain> is blocked by the network egress
  proxy"). Dos dominios de control totalmente ajenos a UNSAM/CNEA
  (`https://www.google.com`, `https://web.archive.org/...`) fallaron igual
  (`EGRESS_BLOCKED` / "Claude Code is unable to fetch from web.archive.org").
- `curl -sS --cacert /root/.ccr/ca-bundle.crt -A "Mozilla/5.0"
  https://www.unsam.edu.ar/escuelas/ecyt/carreras-grado.php` (vía el proxy de
  la sesión) devolvió `CONNECT tunnel failed, response 403` — una denegación
  de política de organización a nivel de proxy ("connect_rejected ... policy"
  según `/root/.ccr/__agentproxy/status`), no un bloqueo anti-bot específico
  de `unsam.edu.ar` (ver `/root/.ccr/README.md`: "403 / 407 from the
  proxy... do not retry or route around it — report the blocked host").

Como el bloqueo es indiscriminado (afecta dominios de control que nada tienen
que ver con UNSAM/CNEA), se trata como una restricción del entorno de
ejecución de esta sesión, no como una señal real sobre el estado de las 11
páginas de `careersSourceUrls` ni de los 54 `sourceUrl` individuales de
`unsam.json`. Siguiendo la regla del plan ("si una página fuente no carga,
tratarlo como 'no se pudo verificar' — no marcar como discontinuada ninguna
carrera ausente de esa página"), **no se marcó ninguna carrera como nueva,
renombrada, movida de facultad, con nivel cambiado ni discontinuada, y no se
corrigió ningún `sourceUrl`,** porque no se pudo leer el contenido real de
ninguna página oficial de `unsam.edu.ar` ni de `ibeninson.cnea.edu.ar` esta
vez.

**`unsam.json` no se modificó en esta revisión.**

### Verificación secundaria (best-effort, no autoritativa)

La herramienta `WebSearch` (que no pasa por el proxy de egreso bloqueado de
esta sesión, porque corre del lado del servidor y devuelve fragmentos de un
índice de búsqueda, no el HTML completo de la página) sí funcionó. Se usó
solo como señal de humo, no como fuente verificada, priorizando las 4
carreras marcadas como sensibles en el encargo de esta revisión (referenciadas
por nombre en `official-subjects.ts`, todas de la Escuela de Ciencia y
Tecnología):

- **"Licenciatura en Ciencia de Datos"**, **"Licenciatura en Desarrollo de
  Software"**, **"Tecnicatura Universitaria en Programación Informática"** y
  **"Tecnicatura Universitaria en Redes Informáticas"**: los resultados de
  búsqueda siguen mostrando esos 4 nombres bajo dominios oficiales de
  `unsam.edu.ar/escuelas/ecyt/...` (p. ej. `.../775/ecyt/desarrollo-software`,
  `.../109/ciencia/redes-informaticas`, `.../661/ciencia/ciencia-de-datos`,
  y listados de "Tecnicatura ... Programación Informática" entre la oferta de
  ECyT), consistente con el `name`/`faculty` ya presentes en `unsam.json`. Sin
  discrepancia aparente. **No se tocó ninguno de los 4 nombres.**
- `ibeninson.cnea.edu.ar/carreras/`: la búsqueda muestra que el instituto
  sigue ofreciendo únicamente "Ingeniería Nuclear con Orientación en
  Aplicaciones" (grado) y "Tecnicatura Universitaria en Aplicaciones
  Nucleares" (pregrado) — coincide con las 2 carreras ya en `unsam.json` para
  "Instituto de Tecnología Nuclear Dan Beninson". Los demás resultados de esa
  búsqueda son posgrados (Doctorado en Tecnología Nuclear, especializaciones)
  y diplomaturas sin título de grado, correctamente excluidos.
- Señales **no concluyentes**, no usadas para cambiar el catálogo: la
  búsqueda también devolvió menciones antiguas (subdominios de archivo
  `2018.unsam.edu.ar`, `2022.unsam.edu.ar`, y agregadores de terceros como
  `universidades.com.ar`/`universidadesba.com.ar`, ninguno de ellos la página
  vigente de `www.unsam.edu.ar`) de un "Ciclo de Licenciatura en Tecnología e
  Instrumentación Biomédica" y un "Ciclo de Licenciatura en Diagnóstico por
  Imágenes" (ciclos de complementación curricular para técnicos ya
  graduados) y de una "Tecnicatura Universitaria en Electromedicina" cuya
  inscripción un agregador de terceros describe como "temporalmente
  suspendida". Ninguna de las tres aparece citada desde la página vigente de
  `www.unsam.edu.ar/escuelas/ecyt/carreras-grado.php` o
  `carreras-pregrado.php` en los resultados de búsqueda, y el plan exige
  evidencia de una página oficial vigente, no de espejos de archivo o sitios
  de terceros. **No se agregaron** al catálogo; quedan para que la próxima
  revisión con acceso real a `unsam.edu.ar` confirme si siguen vigentes como
  carrera de grado/pregrado dictada por la ECyT.

Esta señal secundaria es insuficiente para justificar ningún cambio al
archivo según las reglas del plan ("aplicar solo los cambios que se puedan
justificar desde las páginas oficiales efectivamente leídas"), así que
**`unsam.json` no se modificó en esta revisión.**

### Qué queda pendiente

La próxima revisión trimestral de UNSAM debería repetirse desde un entorno
con acceso de red real a `unsam.edu.ar` y `ibeninson.cnea.edu.ar`, usando el
mismo método que `unc.sources.md` / `unlp.sources.md` / `unr.sources.md`
(fetch de las 11 páginas de `careersSourceUrls` + verificación uno por uno de
los 54 `sourceUrl` de `unsam.json` con `curl -sL -o /dev/null -w
"%{http_code}"`), y resolver en particular si el "Ciclo de Licenciatura en
Tecnología e Instrumentación Biomédica", el "Ciclo de Licenciatura en
Diagnóstico por Imágenes" y la "Tecnicatura Universitaria en Electromedicina"
señalados arriba siguen dictándose como carrera de grado/pregrado vigente de
la Escuela de Ciencia y Tecnología.
