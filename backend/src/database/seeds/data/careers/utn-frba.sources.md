# UTN FRBA careers — sources

Fecha de consulta: 2026-10-01.

## Revisión trimestral — BLOQUEADA por egress de red

`frba.utn.edu.ar` y `sceu.frba.utn.edu.ar` están bloqueados por la política
de egress de esta sesión: `WebFetch` devolvió `EGRESS_BLOCKED` para ambos
`careersSourceUrls`, y `curl` confirmó un `403`/`connect_rejected` a nivel de
proxy (política de organización, no un anti-bot propio del sitio). El mismo
bloqueo afectó, en la misma sesión, a las otras 6 universidades del catálogo
(ver sus `.sources.md`), confirmando que es una restricción de red de la
sesión y no algo específico de UTN FRBA.

Por la regla del plan — "un fetch fallido significa 'no se pudo verificar',
nunca evidencia de baja" — y porque la única evidencia disponible
(`WebSearch`, fragmentos indexados, no una descarga directa de la página) es
sustancialmente más débil que el método `curl`/`WebFetch` directo usado para
las demás universidades, **no se aplicó ningún cambio a `utn-frba.json` este
trimestre.** Las 22 carreras existentes quedan exactamente igual.

## Candidatas encontradas por WebSearch — NO aplicadas, pendientes de verificación directa

Una revisión preliminar por `WebSearch` (evidencia indirecta, nunca usada
para editar el catálogo) sugiere que las siguientes tecnicaturas de la SCEU
podrían existir y no estar en `utn-frba.json`. Quedan señaladas para que la
próxima revisión las confirme con una descarga real de la página oficial
(y, en el caso de la primera, con el criterio de exclusión de cursos cortos
sin título universitario) antes de agregarlas:

- Posible **Tecnicatura Universitaria en Ciberseguridad** (SCEU) — candidata
  URL: `https://sceu.frba.utn.edu.ar/e-learning/detalle/carrera/2844/tecnicatura-universitaria-en-ciberseguridad`.
- Posible **Tecnicatura en Ciencia de Datos e IA** (SCEU) — candidata URL:
  `https://sceu.frba.utn.edu.ar/e-learning/detalle/carrera/2859/tecnicatura-en-ciencia-de-datos-e-ia`.

Además, sin confirmación directa, quedan sin resolver (ni agregadas ni
descartadas) estas ambigüedades encontradas por WebSearch, para la próxima
revisión:

- Tecnicatura Universitaria en Gestión de Gobierno Electrónico (id 2254) y
  Tecnicatura Universitaria en Gestión de Tecnología Educativa (id 2256) —
  páginas indexadas, sin corroboración independiente de que sigan activas.
- Licenciatura en Tecnología Educativa (id 1235) vs. un segundo id 2856
  ("licenciatura-en-tecnologias-educativas-inclusivas") cuyo título indexado
  también resuelve a "Licenciatura en Tecnología Educativa" — no está claro
  si son el mismo plan con dos ids históricos o dos carreras distintas.
- Tecnicatura Universitaria en Ciudades Inteligentes (id 2851) — carrera real
  de UTN pero de un consorcio multi-regional (otras Facultades Regionales
  también la listan en el mismo `centrodeelearning.com`); sin poder verificar
  si pertenece específicamente a la oferta de FRBA.
- Licenciatura en Negocios Digitales (id 2842) y Licenciatura en Comercio
  Electrónico (id 2857) — indexadas, pero con conteos de "carrera" totales
  inconsistentes entre búsquedas (14/15/16/17) y mencionadas también en un
  posteo de 2023 sobre "carreras nuevas", lo que deja dudas sobre si siguen
  vigentes o fueron reemplazadas.

Ninguna de estas se agregó: sin poder descargar la página oficial y
confirmar nombre/nivel/estado vigente con una fuente primaria, el riesgo de
incorporar un dato incorrecto al catálogo (que luego se aplica a producción
vía `careers:sync`) es mayor que el de esperar un trimestre más.

## Las 2 carreras marcadas como sensibles — SIN CAMBIOS

No se tocó ninguna de las dos carreras de UTN FRBA referenciadas en
`official-subjects.ts` (no hubo evidencia verificable para tocarlas, y de
todos modos no se aplicó ningún cambio al archivo este trimestre):

- "Ingeniería en Sistemas de Información"
- "Tecnicatura Universitaria en Programación"

## Fuentes bloqueadas (no se pudo verificar por descarga directa)

- `https://frba.utn.edu.ar/carreras-de-grado/` — `EGRESS_BLOCKED` / 403
  (política de proxy).
- `https://sceu.frba.utn.edu.ar/e-learning/listado/Tipo%5Bcarrera%5D` —
  misma causa.
- Por extensión, las 22 `sourceUrl` individuales ya presentes en
  `utn-frba.json` (todas en estos dos dominios) tampoco se pudieron
  reverificar este trimestre.

## Recomendación

Repetir esta revisión en una sesión con acceso de red real a
`frba.utn.edu.ar` y `sceu.frba.utn.edu.ar`, siguiendo el método
`curl`/`WebFetch` directo usado en
`unc.sources.md`/`unlp.sources.md`/`unr.sources.md`, y resolver ahí las
candidatas y ambigüedades listadas arriba.
