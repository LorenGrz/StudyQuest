1) Lenguajes

a) ¿Qué es un paradigma de programación?
Un paradigma de programación es un marco conceptual o forma de pensar cómo resolver problemas
mediante programas. Define qué elementos son importantes para modelar la solución: funciones,
instrucciones, objetos, hechos, reglas, relaciones, etc.

Para parcial: un paradigma es una manera de organizar y razonar una solución de programación.

b) ¿Cuál es la diferencia entre un paradigma declarativo y otro
procedimental?
En un paradigma procedimental se describe cómo resolver el problema paso a paso. El programa se
piensa como una secuencia de instrucciones, con variables, asignaciones, ciclos y estructuras de
control.

En un paradigma declarativo se describe qué se quiere obtener o qué relaciones son verdaderas, sin
detallar tanto el algoritmo paso a paso. El motor del lenguaje se encarga de buscar o reducir la solución.

Ejemplo:

• Procedimental: C, Pascal.
• Declarativo: Haskell, Prolog.

c) ¿Existen lenguajes híbridos que tienen características
declarativas y procedimentales? Enumere 2
Sí. Un lenguaje híbrido permite programar usando características de más de un paradigma.

Ejemplos posibles:

• Python: permite estilo imperativo, orientado a objetos y también funciones de estilo funcional.
• JavaScript: permite estilo imperativo, orientado a objetos/prototipos y funcional.

También podrían mencionarse Scala, Kotlin, C# o Ruby.

d) ¿En los lenguajes procedimentales existen estructuras de
control que permiten hacer ciclos y verificar condiciones?
Sí. Los lenguajes procedimentales suelen tener estructuras de control para decidir y repetir
instrucciones.

Ejemplos:

if (edad >= 18) {
  // condición
}

while (i < 10) {
  // ciclo
}

for (int i = 0; i < 10; i++) {
  // ciclo
}

Para parcial: sí, usan condicionales como if y ciclos como for, while o do while.

e) ¿El lenguaje elegido para el trabajo práctico tiene motor de
inferencia? ¿Qué hace un motor de inferencia?
Depende del lenguaje elegido. Una respuesta segura sería:

Si el lenguaje elegido fue Prolog: sí, Prolog tiene un motor de inferencia. El motor de inferencia toma
una base de conocimiento formada por hechos y reglas, y responde consultas intentando demostrar si
son verdaderas o buscando valores que hagan verdadera una relación.

Ejemplo:

padre(juan, maria).
padre(maria, ana).
abuelo(X, Y) :- padre(X, Z), padre(Z, Y).

Consulta:

abuelo(juan, ana).

El motor de inferencia intenta probarlo usando las reglas y hechos disponibles.

Para parcial: un motor de inferencia deriva conclusiones a partir de una base de conocimiento.

2) Funcional

a) Dominio e imagen de las funciones

esMayor = (>= 18)

esMayor = (>= 18)

Esta función compara un valor contra 18. Como usa >=, el valor debe ser ordenable, y como 18 es
número, se restringe a números ordenables.

Tipo posible:

esMayor :: (Ord a, Num a) => a -> Bool

En el contexto de edad:

esMayor :: Edad -> Bool

• Dominio: edades / números.
•

Imagen: booleanos (True o False).

promociona alumno = not (esMenorAOcho (nota alumno))

promociona alumno = not (esMenorAOcho (nota alumno))

Si nota alumno devuelve una nota y esMenorAOcho devuelve un booleano, entonces not niega
ese booleano.

Tipo posible:

promociona :: Alumno -> Bool

• Dominio: alumnos.
Imagen: booleanos.
•

También puede escribirse con composición:

promociona = not . esMenorAOcho . nota

b) ¿Qué es la transparencia referencial?
La transparencia referencial significa que una expresión puede reemplazarse por su valor sin cambiar
el comportamiento del programa.

Ejemplo:

doble 4

si reduce a 8, entonces puedo reemplazar doble 4 por 8 en cualquier parte del programa.

Esto se cumple cuando no hay efectos colaterales ni dependencia de estado externo. Para el mismo
input, la función siempre produce el mismo output.

c) ¿Cómo se utiliza el Pattern Matching?
El pattern matching se usa definiendo funciones por patrones. Haskell intenta hacer coincidir el valor
recibido con los patrones escritos, de arriba hacia abajo.

Ejemplo:

factorial 0 = 1
factorial n = n * factorial (n - 1)

Si se evalúa factorial 0, matchea con el primer patrón. Si se evalúa factorial 5, matchea con
n.

También sirve para descomponer estructuras:

edad (_, e) = e
head' (x:_) = x

d) ¿Existe la asignación destructiva = en el lenguaje funcional?
No. En Haskell el = no representa asignación destructiva como en lenguajes imperativos. No significa
“guardar en memoria y después modificar”. Representa una igualdad definicional o matemática.

Ejemplo:

x = 5

No puedo hacer luego:

x = x + 1

como si x fuera una celda de memoria mutable. En funcional, una variable es una incógnita o nombre
asociado a un valor, no una posición de memoria que va cambiando.

e) Diferencias entre T-upla y DATA en Haskell
Una tupla es un tipo compuesto genérico y posicional.

type Persona = (String, Int)

El problema es que se pierde semántica: hay que recordar que el primer elemento es el nombre y el
segundo la edad.

Un data permite crear un tipo propio más expresivo del dominio.

data Persona = Persona {
  nombre :: String,
  edad :: Int}

Diferencias principales:

• La tupla es rápida para salir del paso, pero menos expresiva.
• data define un tipo propio del dominio.
• data permite constructores.
• Con record syntax, data genera funciones de acceso como nombre y edad.
• Con data el tipo de las funciones queda más claro: Persona -> Bool en lugar de

(String, Int) -> Bool.

f) ¿Qué significa inferencia de tipos sobre una función dada?
La inferencia de tipos es la capacidad de Haskell de deducir automáticamente el tipo de una expresión
o función a partir de su definición.

Ejemplo:

doble x = 2 * x

Como usa *, Haskell deduce que x debe ser numérico.

Tipo inferido:

doble :: Num a => a -> a

Para parcial: inferir tipos es determinar dominio e imagen de una función mirando las operaciones que
usa.

g) ¿Cómo se realiza una extensión de clases en Haskell?
Se realiza haciendo que un tipo sea instancia de una typeclass. Puede hacerse automáticamente con
deriving o manualmente con instance.

Ejemplo con deriving:

data Estudiante = UnEstudiante {
  nombre :: String,
  legajo :: String,
  nota :: Int
} deriving (Show, Eq)

Con eso, Estudiante pasa a poder mostrarse por consola (Show) y compararse por igualdad (Eq).

Ejemplo manual:

instance Ord Estudiante where
  estudiante1 > estudiante2 = nota estudiante1 > nota estudiante2

h) ¿A qué se llama Aplicación Parcial y para qué se utiliza?
La aplicación parcial consiste en invocar una función con menos parámetros de los que espera. El
resultado es otra función.

Ejemplo:

(>= 18) :: (Ord a, Num a) => a -> Bool

Se fijó el valor 18, y queda una función que recibe una edad y responde si cumple la condición.

Otros ejemplos:

doble = (2 *)
esMayor = (>= 18)
alMenosCero = max 0

Se utiliza para construir funciones nuevas a partir de funciones más generales, escribiendo menos
código y con mayor declaratividad.

i) ¿Qué son las Type Classes? Dé un ejemplo de Ord, Num y Eq
Una typeclass agrupa tipos que comparten una interfaz, es decir, un conjunto de operaciones que
pueden realizar.

Num

Agrupa tipos numéricos. Permite usar operaciones como +, -, *.

(+) :: Num a => a -> a -> a

Ejemplo:

doble :: Num a => a -> a
doble = (2 *)

Eq

Agrupa tipos comparables por igualdad.

(==) :: Eq a => a -> a -> Bool

Ejemplo:

esCero x = x == 0

Ord

Agrupa tipos que tienen orden.

(>) :: Ord a => a -> a -> Bool
max :: Ord a => a -> a -> a

j) ¿A qué se denomina Orden Superior? ¿Para qué se usa MAP,
ALL y ANY?
Una función es de orden superior cuando recibe funciones como parámetro o devuelve funciones
como resultado.

map

Transforma todos los elementos de una lista.

map :: (a -> b) -> [a] -> [b]

Ejemplo:

map (*2) [1,2,3]
-- [2,4,6]

all

Indica si todos los elementos cumplen una condición.

all :: (a -> Bool) -> [a] -> Bool

Ejemplo:

all even [2,4,6]
-- True

any

Indica si al menos un elemento cumple una condición.

any :: (a -> Bool) -> [a] -> Bool

Ejemplo:

any even [1,3,4]
-- True

3) Lógico

a) ¿En un predicado lógico se cumple la existencialidad y la
unicidad?
No de la misma manera que en una función matemática o de Haskell.

En Haskell, una función debe cumplir unicidad: para un mismo input hay una sola imagen. En Prolog,
un predicado representa una relación y puede tener cero, una o muchas soluciones.

Ejemplo:

escribio(neilGaiman, sandman).
escribio(neilGaiman, buenosPresagios).

Consulta:

escribio(neilGaiman, Obra).

Puede devolver más de una obra. Por eso no hay unicidad funcional. La existencia aparece como
consulta: Prolog puede responder si existe o no algún valor que satisface la relación.

b) ¿A qué se llama evaluación LAZY? ¿Se aplica en Prolog?
La evaluación lazy o diferida consiste en retrasar la evaluación de una expresión hasta que sea
necesaria.

En Haskell se aplica claramente. Por ejemplo, se puede trabajar con listas infinitas si solo se necesita
una parte:

head [1..]

Prolog no se caracteriza por evaluación lazy como Haskell. Prolog usa un motor de resolución basado
en unificación y backtracking. Puede generar respuestas bajo demanda cuando se piden más soluciones,
pero no es el mismo concepto que la evaluación lazy de Haskell.

Para parcial: lazy es evaluación diferida. Es propia de Haskell; Prolog trabaja con resolución,
unificación y backtracking.

c) ¿A qué se denomina Hechos y Reglas? ¿Cuál es la diferencia
en aridad?
Un hecho es una afirmación verdadera en la base de conocimiento.

escribio(alanMoore, watchmen).

Una regla define una relación como verdadera si se cumplen otras condiciones.

esAutorDeComic(Autor) :- escribio(Autor, Obra), esComic(Obra).

La aridad es la cantidad de argumentos de un predicado.

esComic(watchmen).          % aridad 1
escribio(alanMoore, watchmen). % aridad 2

• Aridad 1: suele representar una propiedad.
• Aridad mayor a 1: suele representar una relación.

d) ¿Cuál es la diferencia entre consultas individuales y
existenciales?
Una consulta individual tiene todos sus argumentos instanciados. Pregunta si una relación concreta es
verdadera o falsa.

escribio(alanMoore, watchmen).

Una consulta existencial contiene variables libres y pregunta qué valores hacen verdadera una
relación.

escribio(Autor, watchmen).

Prolog puede responder:

Autor = alanMoore.

e) ¿Existe la asignación destructiva = en el lenguaje lógico?
No. En Prolog el = no es asignación destructiva. Se usa para unificación.

Ejemplo:

X = juan.

No significa “guardar juan en una celda mutable”, sino ligar la variable X con el átomo juan.

Para aritmética se usa is:

X is 2 + 3.

Resultado:

X = 5.

f) ¿A qué se denomina Orden Superior en el paradigma lógico?
En Prolog, se habla de orden superior cuando se usan predicados que reciben otros predicados,
consultas o condiciones como parte de su lógica.

Ejemplos típicos:

findall(Elemento, Consulta, Lista).
forall(Generador, Condicion).

No es idéntico a Haskell, donde las funciones son valores de primer orden y se pasan directamente
como parámetros a map, filter, etc. En Prolog se usa más como manipulación de consultas,
predicados o metas.

g) ¿Existe el concepto de Pattern Matching en el paradigma
lógico? ¿Cómo es usado?
Sí. En Prolog se usa a través de la unificación. Prolog intenta hacer coincidir términos con patrones.

Ejemplo:

carta(Numero, Palo) = carta(1, espada).

Resultado:

Numero = 1,
Palo = espada.

También se usa en reglas:

numeroDeCarta(carta(Numero, _), Numero).

El patrón carta(Numero, _) permite extraer el número de una carta.

h) ¿Qué significa que un predicado es inversible?
Un predicado es inversible cuando puede usarse con variables libres en distintas posiciones y Prolog
puede ligarlas para encontrar soluciones.

Ejemplo:

escribio(alanMoore, watchmen).

Consultas posibles:

escribio(alanMoore, Obra).
escribio(Autor, watchmen).
escribio(Autor, Obra).

Si Prolog puede responder ligando esas variables, el predicado es inversible.

No todos los predicados son inversibles. Por ejemplo, is no es inversible si la variable que debe usarse
para calcular no está ligada.

i) ¿A qué se denomina Unificación?
La unificación es el mecanismo por el cual Prolog intenta hacer coincidir dos términos, ligando
variables cuando sea necesario.

Ejemplo:

persona(Nombre, Edad) = persona(juan, 20).

Resultado:

Nombre = juan,
Edad = 20.

Si los términos no pueden coincidir, la unificación falla.

j) Dé dos ejemplos de predicados usando conjunciones y
disyunciones

Conjunción

En Prolog la conjunción se escribe con coma , y significa “y”.

artistaDeComic(Autor) :- escribio(Autor, Obra), esComic(Obra).

Se lee: Autor es artista de comic si escribió una obra y esa obra es comic.

Disyunción

La disyunción se escribe con ; y significa “o”.

esFamoso(Autor) :- escribio(Autor, sandman); escribio(Autor, watchmen).

También puede expresarse con dos reglas:

esFamoso(Autor) :- escribio(Autor, sandman).
esFamoso(Autor) :- escribio(Autor, watchmen).

4) Ejercicio funcional: turnos médicos

Enunciado modelado
Se quiere responder consultas del estilo:

1. ¿Es cierto que un doctor atendió a un paciente determinado?
2. ¿Quién o quiénes atendieron a un paciente?
3. ¿Qué paciente fue curado/atendido por cierto doctor?
4. ¿Es cierto que cierto doctor atendió a algún paciente, sin importar cuál?
5. ¿Es cierto que cierto paciente existe?

Como el enunciado muestra Paciente, Doctor, Diagnostico y un Turno, modelamos cada
atención como un turno.

type Paciente = String
type Doctor = String
type Diagnostico = String

data Turno = UnTurno {
  paciente :: Paciente,
  doctores :: [Doctor],
  diagnostico :: Diagnostico
} deriving (Show, Eq)

Base de datos de ejemplo:

todosLosTurnos :: [Turno]
todosLosTurnos = [
  UnTurno "ana" ["perez", "gomez"] "gripe",
  UnTurno "luis" ["perez"] "fractura",
  UnTurno "maria" ["lopez"] "alergia",
  UnTurno "sofia" ["gomez", "lopez"] "control"
  ]

i) ¿Es cierto que un doctor atendió a un paciente determinado?
atendio :: Doctor -> Paciente -> [Turno] -> Bool
atendio unDoctor unPaciente turnos =
  any (atendioEnTurno unDoctor unPaciente) turnos

atendioEnTurno :: Doctor -> Paciente -> Turno -> Bool
atendioEnTurno unDoctor unPaciente unTurno =
  paciente unTurno == unPaciente && elem unDoctor (doctores unTurno)

Ejemplo:

atendio "perez" "ana" todosLosTurnos
-- True

ii) ¿Quién o quiénes atendieron a un paciente?
doctorxsDe :: Paciente -> [Turno] -> [Doctor]
doctorxsDe unPaciente turnos =
  concatMap doctores (filter ((== unPaciente) . paciente) turnos)

Ejemplo:

doctorxsDe "ana" todosLosTurnos
-- ["perez", "gomez"]

iii) ¿Qué paciente fue curado/atendido por cierto doctor?
Como el enunciado no define una propiedad específica para “curado”, tomamos “curado por doctor”
como “paciente atendido por ese doctor”.

pacientesDe :: Doctor -> [Turno] -> [Paciente]
pacientesDe unDoctor turnos =
  map paciente (filter (elem unDoctor . doctores) turnos)

Ejemplo:

pacientesDe "perez" todosLosTurnos
-- ["ana", "luis"]

iv) ¿Es cierto que cierto doctor atendió a algún paciente, sin
importar cuál?
atendioAlgo :: Doctor -> [Turno] -> Bool
atendioAlgo unDoctor turnos =
  any (elem unDoctor . doctores) turnos

Ejemplo:

atendioAlgo "lopez" todosLosTurnos
-- True

v) ¿Es cierto que cierto paciente existe?
existePaciente :: Paciente -> [Turno] -> Bool
existePaciente unPaciente turnos =
  elem unPaciente (map paciente turnos)

Ejemplo:

existePaciente "maria" todosLosTurnos
-- True

5) Reescritura del ejercicio 4 usando Prolog

Base de conocimiento
Representamos cada atención con un predicado turno/3:

% turno(Paciente, Doctores, Diagnostico).
turno(ana, [perez, gomez], gripe).
turno(luis, [perez], fractura).
turno(maria, [lopez], alergia).
turno(sofia, [gomez, lopez], control).

i) ¿Es cierto que un doctor atendió a un paciente determinado?
Predicado:

atendio(Doctor, Paciente) :-
    turno(Paciente, Doctores, _),
    member(Doctor, Doctores).

Consulta:

atendio(perez, ana).

Resultado esperado:

true.

Explicación: se busca un turno de ana y se verifica que perez pertenezca a la lista de doctores.

ii) ¿Quién o quiénes atendieron a un paciente?
Se usa el mismo predicado, dejando libre la variable Doctor.

Consulta:

atendio(Doctor, ana).

Resultados esperados:

Doctor = perez ;
Doctor = gomez.

Explicación: es una consulta existencial. Prolog liga Doctor con cada valor que satisface la relación.

iii) ¿Qué paciente fue curado/atendido por cierto doctor?
Se usa el mismo predicado, dejando libre la variable Paciente.

Consulta:

atendio(perez, Paciente).

Resultados esperados:

Paciente = ana ;
Paciente = luis.

Explicación: Prolog busca todos los pacientes cuyos turnos tengan a perez como doctor.

iv) ¿Es cierto que cierto doctor atendió a algún paciente, sin
importar cuál?
Consulta:

atendio(lopez, _).

Resultado esperado:

true.

Explicación: se usa variable anónima _ porque no importa qué paciente fue atendido; solo interesa que
exista alguno.

v) ¿Es cierto que cierto paciente existe?
Predicado:

existePaciente(Paciente) :-
    turno(Paciente, _, _).

Consulta:

existePaciente(maria).

Resultado esperado:

true.

También podría consultarse directamente:

turno(maria, _, _).

Resumen express de este parcial

• Paradigma: forma de pensar soluciones.
• Declarativo: describe qué se quiere obtener.
• Procedimental: describe cómo resolver paso a paso.
• Híbridos: Python, JavaScript, Scala, etc.
• Motor de inferencia: deriva conclusiones desde hechos y reglas.
• Transparencia referencial: reemplazar expresión por valor sin cambiar el programa.
• Pattern matching: hacer coincidir valores con patrones.
• En Haskell no hay asignación destructiva.
• Tupla: rápida, genérica, menos semántica.
• data: tipo propio, más expresivo.
Inferencia: Haskell deduce tipos.
•
• Typeclass: interfaz de operaciones para varios tipos.
• Aplicación parcial: pasar menos argumentos y obtener una función.
• Orden superior: funciones que reciben/devuelven funciones.
• Prolog no trabaja con unicidad funcional; trabaja con relaciones.
• Lazy es propio de Haskell; Prolog usa unificación y backtracking.
• = en Prolog es unificación, no asignación.
• is evalúa aritmética.
• Predicado inversible: puede ligar variables libres.
• Conjunción en Prolog: ,.
• Disyunción en Prolog: ;.

