# UNLaM careers — sources

Fecha de consulta: 2026-10-01.

## Revisión trimestral — BLOQUEADA por egress de red

Todo el dominio `unlam.edu.ar` y sus subdominios de facultad (`ingenieria.`,
`derecho.`, `economicas.`, `humanidades.`, `salud.`, `artesymedios.`) están
bloqueados por la política de egress de esta sesión (`WebFetch` devuelve
`EGRESS_BLOCKED` para cada uno de los 6 `careersSourceUrls`; un proxy lector
externo, `r.jina.ai`, también está bloqueado; no hay `curl` disponible en
este entorno para esta tarea). El mismo bloqueo afectó, en la misma sesión,
a las otras 6 universidades del catálogo (ver sus `.sources.md`), confirmando
que es una restricción de red de la sesión y no algo específico de
`unlam.edu.ar`.

Por la regla del plan — "un fetch fallido significa 'no se pudo verificar',
nunca evidencia de baja" — y porque la única evidencia disponible
(`WebSearch`, fragmentos indexados por el buscador, no una descarga directa
de la página) es sustancialmente más débil que el método `curl` usado en
`unc.sources.md`/`unlp.sources.md`/`unr.sources.md`, **no se aplicó ningún
cambio a `unlam.json` este trimestre.** Las 34 carreras existentes quedan
exactamente igual.

## Candidatas encontradas por WebSearch — NO aplicadas, pendientes de verificación directa

Una revisión preliminar por `WebSearch` (evidencia indirecta, nunca usada
para editar el catálogo) sugiere que las siguientes carreras podrían existir
en la oferta de UNLaM y no estar en `unlam.json`. Quedan señaladas para que
la próxima revisión las confirme con una descarga real de la página oficial
antes de agregarlas:

- Posible carrera de grado **Arquitectura** (Departamento de Ingeniería e
  Investigaciones Tecnológicas) — candidata URL:
  `https://ingenieria.unlam.edu.ar/index.php?seccion=3&idArticulo=369`.
- Posible **Tecnicatura en Animación y Arte Digital** (Escuela de Artes y
  Medios de Comunicación) — candidata URL:
  `https://artesymedios.unlam.edu.ar/animacion-y-arte-digital/`.
- Posible **Tecnicatura en Artes Audiovisuales** (misma escuela) — candidata
  URL: `https://artesymedios.unlam.edu.ar/artes-audiovisuales/`.
- Posible **Tecnicatura Universitaria en Comercio Electrónico** (misma
  escuela) — candidata URL:
  `https://artesymedios.unlam.edu.ar/comercio_electronico/`.
- Posible **Tecnicatura Universitaria en Producción Musical** (misma
  escuela) — candidata URL: `https://artesymedios.unlam.edu.ar/produccion-musical/`.

Ninguna de estas se agregó: sin poder descargar la página oficial y
confirmar nombre/facultad/nivel/estado vigente con una fuente primaria, el
riesgo de incorporar un dato incorrecto al catálogo (que luego se aplica a
producción vía `careers:sync`) es mayor que el de esperar un trimestre más.

Explícitamente **no** se consideró la mencionada "Ingeniería en Agrimensura"
ni como candidata: la cobertura de prensa encontrada la describe siempre en
tiempo futuro ("incorporará", "también se estudiará"), sin página propia ni
fecha de inscripción — encaja con la exclusión de carreras "próximamente".

## Las 3 carreras marcadas como sensibles — SIN CAMBIOS

No se tocó ninguna de las tres carreras de UNLaM referenciadas en
`official-subjects.ts` (no hubo evidencia verificable para tocarlas, y de
todos modos no se aplicó ningún cambio al archivo este trimestre):

- "Ingeniería en Informática"
- "Tecnicatura Universitaria en Web"
- "Tecnicatura en Desarrollo de Aplicaciones Móviles"

## Fuentes bloqueadas (no se pudo verificar por descarga directa)

Las 6 `careersSourceUrls` de `unlam.json` (y cualquier otra URL
`*.unlam.edu.ar`) dieron `EGRESS_BLOCKED` con `WebFetch` en esta sesión:

- `https://ingenieria.unlam.edu.ar/index.php?seccion=3&idArticulo=10`
- `https://derecho.unlam.edu.ar/index.php?seccion=3&idArticulo=366`
- `https://economicas.unlam.edu.ar/index.php?seccion=3&idArticulo=7`
- `https://humanidades.unlam.edu.ar/index.php?seccion=3&idArticulo=12`
- `https://salud.unlam.edu.ar/index.php?seccion=3&idArticulo=13`
- `https://artesymedios.unlam.edu.ar/carreras/`

## Recomendación

Repetir esta revisión en una sesión con acceso de red real a
`unlam.edu.ar` y sus subdominios, siguiendo el método `curl`/`WebFetch`
directo usado en `unc.sources.md`/`unlp.sources.md`/`unr.sources.md`, y
resolver ahí las 5 carreras candidatas listadas arriba.
