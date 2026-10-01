# UNC careers — sources

Fecha de consulta: 2026-09-29.

Método: `curl -sL -A "Mozilla/5.0" <url>`. Las páginas por facultad de UNC
(`derecho.unc.edu.ar`, `psicologia.unc.edu.ar`, `faud.unc.edu.ar`,
`fcm.unc.edu.ar`) que en una investigación anterior (rama `feature/catalog-unc`,
2026-09-27) devolvían el challenge anti-bot Anubis respondieron `200` normal
esta vez con el mismo user-agent — se verificó cada URL usada acá
individualmente antes de incluirla.

En vez de recorrer facultad por facultad, se usó la guía central de oferta
académica de la UNC (tal como sugiere el plan), que lista **todas** las
carreras de grado y pregrado vigentes con nombre oficial, facultad y enlace
propio:

- Grado (99 carreras): https://www.unc.edu.ar/acad%C3%A9micas/guia-de-carreras-de-grado-0
  — sección "Carreras de Grado por orden alfabético", HTML con
  `<div class="carrera"><a href="...">Nombre | Facultad</a></div>` por carrera.
  La propia página dice "Actualmente, la UNC ofrece cerca de 100 carreras de
  Grado"; el parseo dio exactamente 99.
- Pregrado (6 carreras de Facultad, más 8 de colegios preuniversitarios
  excluidas — ver abajo): https://www.unc.edu.ar/acad%C3%A9micas/carreras-de-pregrado-de-la-unc-0
  — sección "Carreras de Pregrado por Unidad Académica", agrupada por
  `<h2 class="naranja">Unidad Académica</h2>` + lista de carreras.

## Confirma que "Ingeniería en Sistemas de Información" no existe en la UNC

La guía central de grado no lista ninguna carrera con ese nombre. La única
carrera de informática/computación de la FCEFyN es "Ingeniería en
Computación" (incluida). Coincide con lo ya documentado en
`feature/catalog-unc` (`catalog/unc.sources.md`).

## Excluidas: colegios preuniversitarios

La página de pregrado también lista 8 tecnicaturas dictadas por el
**Colegio Nacional de Monserrat** y la **Escuela Superior de Comercio Manuel
Belgrano** (colegios preuniversitarios de la UNC, de nivel secundario/terciario,
no facultades): Martillero y Corredor Público, Comunicador Visual, Técnico
Superior en Bromatología (Monserrat); Técnico Superior Universitario en
Comercialización, en Administración de Cooperativas y Mutuales, en Gestión
Financiera, en Recursos Humanos, y Analista Universitario de Sistemas
Informáticos (Belgrano). Se excluyen del catálogo porque no son carreras de
grado/pregrado universitario dictadas por una Facultad, aunque la propia UNC
las liste en la misma página.

## URLs corregidas (enlace roto en la guía central → enlace vigente de la

misma facultad, verificado con `curl`)

- Tecnicatura en Laboratorio Clínico e Histopatológico (Facultad de Ciencias
  Médicas): `tecnologia.fcm.unc.edu.ar/tec-en-laboratorio/` → 404. Reemplazado
  por `tecnologia.fcm.unc.edu.ar/laboratorio-clinico-e-histopatologia/`
  (enlazada desde la home de `tecnologia.fcm.unc.edu.ar`).
- Bibliotecólogo (Escuela de Bibliotecología, Facultad de Filosofía y
  Humanidades): `blogs.ffyh.unc.edu.ar/ingreso/bibliotecologia/` → 404.
  Reemplazado por `sitio.ffyh.unc.edu.ar/bibliotecologia/` (enlazada desde la
  home de `sitio.ffyh.unc.edu.ar`).
- Técnico Mecánico Electricista (Facultad de Ciencias Exactas, Físicas y
  Naturales): `.../tecnico-mecanico-electricista/` → 404. Reemplazado por
  `.../carrera-tecnicatura-en-mecanica-electricista/` (enlazada desde la
  página de la Escuela de Ingeniería Mecánica Electricista).
- Dos tecnicaturas de la Facultad de Ciencias Agropecuarias
  (`agro.unc.edu.ar/~alumnos/?page_id=...`) solo resolvían por `http://`;
  se verificó que el mismo contenido está disponible por `https://` y se usó
  esa versión.

Todas las URLs de `unc.json` se verificaron una por una con
`curl -sL -o /dev/null -w "%{http_code}" -A "Mozilla/5.0"` (200 en todas).

## 2026-10-01 — revisión trimestral: bloqueada por política de red de la sesión, no por Anubis

Intento de re-verificación trimestral de las dos URLs centrales
(`guia-de-carreras-de-grado-0`, `carreras-de-pregrado-de-la-unc-0`) y de las
subpáginas de facultad. A diferencia de las veces anteriores, esta vez **no**
fue el challenge anti-bot Anubis el que bloqueó el acceso: en esta sesión,
todo el tráfico HTTPS saliente pasa por un proxy de egress de la
organización que rechazó la conexión a **cualquier** dominio, incluido
`unc.edu.ar` y sus subdominios, con `403` en el `CONNECT` ("organization
policy") — se confirmó que el bloqueo no era específico de UNC probando
también contra un dominio neutral (`example.com`), que dio el mismo `403`.
Se probó tanto con el fetcher de la herramienta (`EGRESS_BLOCKED`) como con
`curl -A "Mozilla/5.0"` directo (`CONNECT tunnel failed, response 403`). La
documentación del proxy indica explícitamente no reintentar ni rodear un
403/407 de política, así que no se insistió ni se buscaron vías alternativas
(cache, proxies, etc.).

Como no se pudo cargar ninguna página de `unc.edu.ar` esta vez — ni las dos
guías centrales ni las subpáginas de facultad —, **no se hizo ningún cambio
en `unc.json`**: según la regla del proyecto, una página que no carga
significa "no se pudo verificar", nunca "la carrera ya no existe". El
archivo queda exactamente igual que el 2026-09-29 (106 carreras: 99 grado +
7 pregrado).

Como evidencia secundaria (no usada para editar `unc.json`, solo para
contexto de la próxima revisión), una búsqueda web indirecta:

- Reconfirma indirectamente que "Ingeniería en Sistemas de Información" no
  es un nombre de carrera de la UNC (los resultados sobre ese término
  remiten a "Ingeniería en Computación" de FCEFyN y a la tecnicatura
  terciaria "Analista Universitario en Sistemas Informáticos" de la Escuela
  Superior de Comercio Manuel Belgrano — la misma tecnicatura de colegio
  preuniversitario ya excluida — , no a una carrera de grado nueva). No es
  una verificación directa de la página oficial, así que se mantiene como
  indicio, no como confirmación.
- Encontró coberturas de prensa (y una nota en `unc.edu.ar/comunicación`,
  no accedida directamente por el mismo bloqueo de red) sobre 12 nuevas
  "tecnicaturas a distancia" anunciadas por la UNC (programa "EDUCA a
  Distancia"), entre ellas una Tecnicatura en Educación en Computación
  (Facultad de Matemática, Astronomía, Física y Computación) y otras de
  Derecho y Ciencias Económicas. Al momento de este anuncio (difundido
  dic-2025) estaban pendientes de aprobación por el Consejo Superior durante
  2026, con inscripción recién en el segundo semestre de 2026 y inicio de
  clases estimado para el primer semestre de 2027 — es decir, "próximamente"
  por las reglas del proyecto, así que no corresponde agregarlas todavía.
  **Revisar en la próxima consulta trimestral** si ya están aprobadas y
  listadas en la guía central, con nombre oficial definitivo y facultad.

Ítems marcados para no tocar sin evidencia propia (sin cambios esta vez,
nombres igual que el 2026-09-29): "Ingeniería en Computación", "Licenciatura
en Ciencias de la Computación" (ambas en `official-subjects.ts`), y
"Analista en Computación" (título intermedio, sigue sin figurar en
`unc.json` a propósito).

Próxima revisión: repetir el fetch de las dos guías centrales (y, si hace
falta, las subpáginas de facultad con `curl -A "Mozilla/5.0"`) en una sesión
sin este bloqueo de egress, y hacer la comparación completa pendiente de
esta vez.
