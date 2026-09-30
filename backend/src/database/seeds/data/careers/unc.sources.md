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
