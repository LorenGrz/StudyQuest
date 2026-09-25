Aquí está el texto reformateado, limpio y listo para copiar y pegar en Word:

Paradigmas de Programación — Repaso
General

1) General
a) Dos diferencias entre lenguajes de programación y paradigmas

• Nivel de abstracción / Concepto vs. Implementación: Un paradigma es un modelo, enfoque o

filosofía de desarrollo que determina cómo se estructura el pensamiento para resolver un
problema (un plano mental). Un lenguaje de programación es una herramienta concreta, con
sintaxis y semántica específicas, utilizada para escribir código siguiendo uno o más paradigmas.

• Cardinalidad y Relación: Los paradigmas son conceptos universales y abstractos (no se
"ejecutan"). Los lenguajes son tecnologías tangibles. Un lenguaje puede adoptar un único
paradigma (puro) o múltiples (multiparadigma), pero un paradigma existe de forma
independiente a cualquier lenguaje.

b) Dos paradigmas vistos en clase y ejemplos de lenguajes

• Paradigma Funcional: Centrado en la evaluación de funciones matemáticas puras, evitando el

cambio de estado y los datos mutables. Ejemplo: Haskell (puro).

• Paradigma Lógico: Basado en la lógica de predicados de primer orden. Los programas se

estructuran mediante hechos y reglas, y el motor de inferencia busca soluciones por unificación
y backtracking. Ejemplo: Prolog.

c) ¿Existen lenguajes híbridos? Enumere dos.

Sí, existen. Se los conoce como lenguajes multiparadigma. Son lenguajes diseñados para combinar
características de diferentes enfoques (por ejemplo, Objetos + Funcional) para dar mayor flexibilidad al
desarrollador.

Ejemplos: Python (soporta imperativo, objetos y elementos funcionales) y JavaScript (soporta
prototipos/objetos y funcional).

d) Ejemplo de función partida

Una función partida (o definida por tramos) es aquella que posee diferentes fórmulas de resolución
según el valor o las condiciones de sus argumentos de entrada.

Ejemplo en Haskell:

funcionPartida :: Int -> Int
funcionPartida x
  | x > 0     = x * 2
  | otherwise = 0

2) Funcional
a) Dominio e imagen de las siguientes funciones

Asumiendo que largoDeListon es una constante numérica:

• meAlcanza largo = largo <= largoDeListon

• Dominio: El tipo del parámetro largo. Debe pertenecer a la clase Ord (ej: Float,

Int).
Imagen: Bool (True o False), ya que usa un operador de comparación (<=).

•

• cuantoMeSobra cantidad = largoDeListon – cantidad

• Dominio: El tipo del parámetro cantidad. Debe pertenecer a la clase Num, ya que se

aplica una resta.
Imagen: El mismo tipo numérico que la entrada (Float, Int, etc.).

•

b) ¿Para qué se utiliza la Unicidad y la Existencia?

• Existencia ( ):∃  Verifica si al menos un elemento de un conjunto cumple una condición. En

Haskell se implementa con any.

• Unicidad ( !):∃

 Asegura que exactamente uno (y solo uno) de los elementos cumple la

condición. En Haskell se resuelve filtrando la lista y verificando que su longitud sea
exactamente 1: length (filter condicion lista) == 1.

c) ¿Qué implica el principio de sustitución?

Derivado de la Transparencia Referencial, implica que el valor de una expresión depende únicamente
de sus argumentos y no del momento o contexto de ejecución. Por ende, cualquier expresión puede ser
sustituida por su resultado en cualquier parte del programa sin alterar su comportamiento. No existen
los "efectos colaterales".

d) ¿Qué es el Pattern Matching?

El Pattern Matching (emparejamiento de patrones) es un mecanismo que permite deconstruir datos y
ramificar la ejecución de una función según la "forma" o estructura del argumento de entrada. Permite
verificar si un valor coincide con una estructura dada (un valor directo, una tupla, una lista vacía [], o
una cabeza y cola (x:xs)) y, de ser así, ligar variables a sus partes internas.

e) Tres tipos de datos usados en Haskell

• Int / Integer: Enteros (de precisión fija o arbitraria).
• Bool: Valores lógicos (True o False).
• Char: Un único carácter unicode (ej: 'a').

f) ¿Qué significa inferencia de tipos sobre una función dada?

Es la capacidad del compilador (como GHC) de deducir automáticamente el tipo más genérico y seguro
de una función, analizando las operaciones que se aplican sobre sus variables de entrada, sin necesidad
de que el programador declare explícitamente la firma de tipos.

g) Diferencia entre declarar una Tupla y un Data

• Tupla: Es un tipo de dato anónimo y estructural. Se define agrupando componentes por
posición (Valor1, Valor2). No tiene nombre propio; su identidad está dada por la
estructura y orden de sus tipos (ej: (String, Int)).

• Data (Tipos algebraicos de datos): Es un tipo nominativo y explícito. Permite crear un tipo

con nombre propio (ej: data Persona = ...) y definir constructores con
etiquetas/nombres de campos (Record Syntax), ganando expresividad, tipado semántico y
control sobre el dominio del problema.

h) Diferencia entre Aplicación Parcial y Composición de Funciones

• Aplicación Parcial: Consiste en pasarle a una función menos argumentos de los que requiere
formalmente. Debido al currying, esto devuelve una nueva función que espera los parámetros
restantes. (Ej: sumar 3 devuelve una función que suma 3 a lo que reciba.)

• Composición de Funciones (.): Es el acto de combinar dos o más funciones para crear una
nueva, donde la salida de una se convierte en la entrada de la otra (matemáticamente f(g(x))).
(Ej: esPar . longitud toma una lista, calcula su tamaño y verifica si es par.)

i) ¿A qué se denomina Recursividad? Ejemplo.

Es una técnica donde una función se define en términos de sí misma, llamándose a sí misma dentro de
su propio cuerpo para resolver subproblemas más pequeños, hasta alcanzar un caso base que detiene la
recursión.

Ejemplo (Factorial):

factorial :: Int -> Int
factorial 0 = 1                      -- Caso Base
factorial n = n * factorial (n - 1)  -- Caso Recursivo

j) ¿A qué se denomina Orden Superior? Dos funciones.

Una función es de Orden Superior si cumple al menos una de estas condiciones: recibe una o más
funciones como parámetros, o devuelve una función como resultado.

• map: Recibe una función y una lista; aplica la función a cada elemento.
• filter: Recibe un predicado (a -> Bool) y una lista; devuelve los elementos que cumplen

la condición.

3) Lógico
a) Diferencia entre un predicado y una función de Haskell

• Una función de Haskell toma valores de entrada y, mediante un mapeo determinista, genera un

único valor de salida. Trabaja de forma direccional (Entrada → Salida).

• Un predicado lógico no produce un valor de salida; expresa una relación entre términos que
puede ser verdadera o falsa. Además, es inversible: sus argumentos no tienen dirección fija,
permitiendo usar un parámetro tanto para validar (dato fijo) como para generar (variable libre).

b) ¿A qué se llama evaluación EAGER?

La evaluación Eager (o ansiosa/estricta) es una estrategia donde los argumentos de una función son
calculados por completo antes de que la función sea ejecutada. Es el opuesto de la evaluación perezosa
(Lazy Evaluation) de Haskell. Los paradigmas Imperativo y de Objetos suelen ser puramente Eager.

c) ¿A qué se denomina Átomo, Hechos y Reglas?

Son los componentes esenciales de una base de conocimientos en Prolog:

• Átomo: Identificador constante que empieza con minúscula (ej: juan, sabana). Representa

una entidad concreta del universo del discurso.

• Hechos: Afirmaciones incondicionales que establecen una relación entre términos, siempre

verdaderas (ej: habita(leon, sabana).).

• Reglas: Afirmaciones condicionales con una cabeza (conclusión) y un cuerpo (condiciones). Se
lee: "la cabeza es verdadera si el cuerpo es verdadero" (ej: abuelo(X, Y) :- padre(X,
Z), padre(Z, Y).).

d) Diferencia entre consultas individuales y existenciales

• Consultas Individuales (verificación): Se pasan únicamente constantes. El motor responde de
forma booleana (true o false), verificando si esa tupla pertenece a la relación. (Ej: ?-
habita(leon, sabana).)

• Consultas Existenciales (generación): Se pasa al menos una Variable (con mayúscula). El

motor busca qué elementos pueden unificar con esa variable para hacer verdadera la consulta,
devolviendo los valores encontrados. (Ej: ?- habita(X, sabana).)

e) ¿Cómo se mezcla la aritmética en Prolog? ¿Cómo se usa el =?

Prolog no es un lenguaje de cálculo nativo, por lo que la aritmética requiere un tratamiento especial:

• El operador = realiza unificación: intenta igualar estructuras sin resolver la matemática. X = 2

+ 2 da como resultado la estructura X = 2 + 2, no 4.

• Para evaluar expresiones aritméticas, se utiliza el operador is, que evalúa la expresión de la
derecha y unifica el resultado numérico con el término de la izquierda. (Ej: X is 2 + 2.
asigna 4 a X.)

f) ¿Cómo se relacionan los functores con el orden superior de funcional?

• Un functor en Prolog es un constructor de datos compuestos: un átomo que agrupa otros

términos (ej: fecha(2, junio, 2026)). No es código ejecutable, sino una estructura de
datos polimórfica.

• Relación conceptual: Ambos permiten modelar abstracciones complejas envolviendo lógica o

datos. Sin embargo, el verdadero equivalente al "Orden Superior" en Prolog no son los
functores, sino predicados como forall/2, findall/3 o maplist/2, que reciben otros
predicados como argumentos para operar sobre ellos.

