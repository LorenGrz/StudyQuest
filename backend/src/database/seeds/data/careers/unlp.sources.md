# UNLP careers — sources

Fecha de consulta: 2026-09-29.

Método: `curl -sL -A "Mozilla/5.0" <url>`. UNLP publica un buscador central de
"Carreras de Grado y Pregrado" (`post_type=carrera` en su WordPress) que lista
**todas** las carreras vigentes con nombre oficial y enlace propio a la
facultad, paginado de a 20:

https://unlp.edu.ar/?s=&post_type=carrera&tipobuscadorcgyp=all&facultadbuscadorcgyp=all&duracionbuscadorcgyp=all&areadisciplinarbuscadorcgyp=all

El filtro "Tipo" del buscador solo ofrece Ingeniería / Licenciatura / Otras
Profesiones / Profesorado / Tecnicatura (sin "Posgrado"), y el título de la
página es "Carreras de Grado y Pregrado" — confirma que el listado no incluye
posgrados. Se recorrieron las 8 páginas (`&paged=1..8`) hasta la última
(`paged=8` con 10 resultados, el resto con 20): **150 carreras** en total,
sin duplicados tras normalizar.

El filtro por facultad (`facultadbuscadorcgyp`) tiene un bug de datos: para
Psicología y Trabajo Social devuelve 0 resultados aunque sí tienen carreras
listadas en el buscador general. Por eso la facultad de cada carrera se
determinó por el **dominio** del enlace oficial (cada facultad de la UNLP
tiene su propio subdominio), no por ese filtro:

| Dominio                                   | Facultad                                                                                                                   |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `fba.unlp.edu.ar`, `www2.fba.unlp.edu.ar` | Facultad de Artes (nombre actual de la ex Facultad de Bellas Artes — confirmado por `<title>` de `fba.unlp.edu.ar`)        |
| `ic.info.unlp.edu.ar`                     | Facultad de Informática (Ingeniería en Computación, carrera conjunta con la Facultad de Ingeniería)                        |
| `ing.unlp.edu.ar`                         | Facultad de Ingeniería                                                                                                     |
| `jursoc.unlp.edu.ar`                      | Facultad de Ciencias Jurídicas y Sociales                                                                                  |
| `perio.unlp.edu.ar`                       | Facultad de Periodismo y Comunicación Social                                                                               |
| `trabajosocial.unlp.edu.ar`               | Facultad de Trabajo Social                                                                                                 |
| `www.agro.unlp.edu.ar`                    | Facultad de Ciencias Agrarias y Forestales                                                                                 |
| `www.econo.unlp.edu.ar`                   | Facultad de Ciencias Económicas (incluye Ciencia de Datos en Organizaciones, carrera conjunta con Facultad de Informática) |
| `www.exactas.unlp.edu.ar`                 | Facultad de Ciencias Exactas                                                                                               |
| `www.fahce.unlp.edu.ar`                   | Facultad de Humanidades y Ciencias de la Educación                                                                         |
| `www.fau.unlp.edu.ar`                     | Facultad de Arquitectura y Urbanismo                                                                                       |
| `www.fcaglp.unlp.edu.ar`                  | Facultad de Ciencias Astronómicas y Geofísicas                                                                             |
| `www.fcnym.unlp.edu.ar`                   | Facultad de Ciencias Naturales y Museo                                                                                     |
| `www.fcv.unlp.edu.ar`                     | Facultad de Ciencias Veterinarias                                                                                          |
| `www.folp.unlp.edu.ar`                    | Facultad de Odontología                                                                                                    |
| `www.info.unlp.edu.ar`                    | Facultad de Informática                                                                                                    |
| `www.med.unlp.edu.ar`                     | Facultad de Ciencias Médicas                                                                                               |
| `www.psico.unlp.edu.ar`                   | Facultad de Psicología                                                                                                     |

## Nivel (`grado` / `pregrado`)

`pregrado` para nombres que contienen "Tecnicatura", "Técnico Superior" o
"Analista" (analista programador/TIC son títulos de 3 años, equivalentes a
tecnicatura, según la consigna). El resto (Licenciatura, Ingeniería,
Profesorado, Abogacía, Escribanía, Medicina, Contador Público, Arquitectura,
Odontología, Farmacia, Medicina Veterinaria, Microbiología) es `grado`.

Caso especial: "Licenciatura en Gestión de Recursos para Instituciones
Universitarias (sólo para trabajadores no docentes)" — el buscador la titula
como Licenciatura, pero la página de la Facultad de Ciencias Jurídicas y
Sociales (`jursoc.unlp.edu.ar/.../carreras.html`) describe la misma carrera
como "TÉCNICO GESTIÓN DE RECURSOS PARA INSTITUCIONES UNIVERSITARIAS" y la
llama explícitamente "capacitación de pre-grado". Se usó el nombre y nivel de
la página de la facultad (`pregrado`) en vez del título del buscador.

## Múltiples orientaciones bajo un mismo título

Las carreras de Artes con orientación ("Licenciatura en Música or.
Composición/Dirección Coral/Dirección Orquestal/Educación Musical/Guitarra/
Música Popular/Piano", igual para Profesorado en Música, y "Licenciatura en
Artes Plásticas or. Cerámica/Dibujo/Escenografía/Escultura/Grabado/
Muralismo/Pintura", igual para Profesorado en Artes Plásticas) son títulos
oficiales **distintos** listados así por el propio buscador de la UNLP (cada
orientación tiene su propia resolución de plan de estudios), no una
invención: se mantienen como carreras separadas.

## URLs corregidas (enlace del buscador → 404; reemplazado por el enlace

vigente de la misma facultad, verificado con `curl`)

- "Licenciatura en Gestión de Recursos para Instituciones Universitarias":
  `jursoc.unlp.edu.ar/index.php/carreras-ingreso.html` → 404. Reemplazado por
  `jursoc.unlp.edu.ar/index.php/estudiantes/informacion/carreras.html` (misma
  página que Abogacía/Escribanía/Martillero, que sí resuelve).
- Odontología: `folp.unlp.edu.ar/plandeestudios` → 404. Reemplazado por
  `folp.unlp.edu.ar/caratulacar/` (enlazada como "Carrera Odontología" desde
  la home de `folp.unlp.edu.ar`).
- Tecnicatura Universitaria en Asistencia Odontológica y Tecnicatura
  Universitaria en Prótesis de Laboratorio Odontológico:
  `folp.unlp.edu.ar/asistenciaodontologica` y `.../protesisdelaboratorio` → 404. Ambas reemplazadas por `folp.unlp.edu.ar/tecuniversitarias/` (hub de
  tecnicaturas de la facultad, con el plan de estudios de cada una).

Todas las URLs de `unlp.json` se verificaron una por una con
`curl -sL -o /dev/null -w "%{http_code}" -A "Mozilla/5.0"` (200 en todas).

## 2026-10-01 — revisión trimestral: BLOQUEADA por egress de red

Intento de revisión trimestral programada. El dominio `unlp.edu.ar` **y todos
sus subdominios de facultad** (`www.info.unlp.edu.ar`, `ing.unlp.edu.ar`,
`fba.unlp.edu.ar`, etc.) estaban bloqueados a nivel de proxy de salida de red
de la sesión de este agente: toda solicitud, incluyendo la página de
búsqueda de carreras (`unlp.edu.ar/?s=&post_type=carrera&...`) y páginas de
carrera ya verificadas en 2026-09-29 (p. ej. `unlp.edu.ar/carrera/arquitectura/`,
`www.info.unlp.edu.ar/analista-programador-universitario/`), devolvió
`EGRESS_BLOCKED` ("Access to unlp.edu.ar is blocked by the network egress
proxy") antes de llegar siquiera a hacer la petición HTTP. No fue un error
puntual de una página (403/anti-bot/timeout) sino un bloqueo de dominio
completo para esta sesión.

Siguiendo la regla del proyecto de que un fetch fallido significa "no se
pudo verificar" (nunca "discontinuada"), **no se modificó `unlp.json`**: no
se agregó, renombró, movió, cambió de nivel ni retiró ninguna carrera, y no
se corrigió ninguna `sourceUrl`, porque ninguna página pudo re-verificarse
en esta sesión.

Como chequeo secundario de menor confianza (no cuenta como evidencia válida
para editar el catálogo, ya que no son páginas oficiales de unlp.edu.ar) se
usó búsqueda web general:

- No se encontró ninguna mención de una carrera nueva de Inteligencia
  Artificial en la Facultad de Informática o de Ingeniería de la UNLP para
  2026 (sí existen en otras universidades, p. ej. UNI Perú, UNL).
- No se encontró ninguna mención de discontinuación/cierre de carreras de
  la UNLP para 2025–2026.
- Prensa (universidadeshoy.com.ar, 0221.com.ar, diariohoy.net, mid-2026)
  reporta que la Facultad de Ciencias Médicas está **en proceso** de crear
  una "Licenciatura en Enfermería", todavía sin acreditación CONEAU —
  consistente con la regla de excluir carreras "próximamente"/sin título
  aprobado. No se agrega hasta poder verificarla en una página oficial de
  `med.unlp.edu.ar` y confirmar que ya está dictándose como carrera de grado
  (no solo "en creación").

Ninguna de las seis carreras referenciadas en `official-subjects.ts`
("Analista Programador Universitario", "Analista en Tecnologías de la
Información y la Comunicación", "Ciencia de Datos en Organizaciones",
"Ingeniería en Computación", "Licenciatura en Informática", "Licenciatura en
Sistemas") fue tocada.

Pendiente: repetir esta revisión trimestral la próxima vez que el egress de
red hacia `unlp.edu.ar` esté disponible para el agente.
