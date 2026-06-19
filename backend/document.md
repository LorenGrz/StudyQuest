Informe de Paradigmas de Programación

Orientados a Objetos

Universidad Nacional de San Martin (UNSAM)

Escuela de Ciencia y Tecnología (ECyT)

Tecnicatura en

Programación Informática

Paradigmas de Programación

Alumno: Julian Barberis

Docente: Gaston Aguilera

________________________________________________________________________________________________

Introducción al Paradigma

La Programación Orientada a Objetos (POO) es un paradigma o modelo de programación que organiza
el diseño de software en torno a datos u "objetos", en lugar de funciones y lógica pura. Surgió como
una respuesta a la creciente complejidad del software en los paradigmas estructurados, ofreciendo
una forma más intuitiva de modelar problemas del mundo real. Al dividir un sistema complejo en
entidades modulares e independientes, la POO facilita la creación de código más seguro, mantenible y
escalable.

Conceptos Base: Clases y Objetos

  Clase: Actúa como un molde, plantilla o plano arquitectónico. Define las características (atributos o
propiedades) y los comportamientos (métodos o funciones) que tendrán las entidades creadas a
partir de ella.

  Objeto (Instancia): Es la materialización de una clase en la memoria del sistema durante la
ejecución. Cada objeto posee su propio estado (los valores específicos de sus atributos) pero
comparte la estructura y el comportamiento definidos por su clase.

Los 4 Pilares de la POO

Para que un lenguaje o diseño sea considerado verdaderamente orientado a objetos, debe basarse en cuatro
principios fundamentales:

1.  Encapsulamiento

Es la práctica de agrupar los datos (atributos) y los métodos que operan sobre esos datos en una
sola unidad (la clase), restringiendo el acceso directo a los componentes internos del objeto. Esto
protege el estado interno de modificaciones accidentales o no autorizadas, exponiendo solo lo
necesario a través de una interfaz pública controlada.

2.  Abstracción

Consiste en aislar un elemento de su contexto o del resto de los elementos que lo acompañan.
Consiste en modelar solo las características y comportamientos relevantes de una entidad para el
problema específico que se está resolviendo, ocultando los detalles de implementación más
complejos.

________________________________________________________________________________________________
2

Informe de POO – Paradigmas de Programación

________________________________________________________________________________________________

3.  Herencia

Es el mecanismo mediante el cual una clase (denominada subclase o clase hija) deriva de otra
(superclase o clase padre). La subclase hereda los atributos y métodos de la superclase, pudiendo
añadir los suyos propios o modificar los heredados. Esto fomenta enormemente la reutilización de
código y la creación de jerarquías lógicas.

4.  Polimorfismo

Es la capacidad que tienen los objetos de diferentes clases de responder al mismo mensaje (o llamada
a método) de distintas maneras, según su propia implementación específica. Permite que el código
sea agnóstico respecto al tipo exacto del objeto con el que está interactuando, siempre y cuando
comparta una superclase o interfaz común.

Ventajas y Desventajas

Ventajas:

o  Reutilización de código: Gracias a la herencia y la modularidad, se evita reescribir la misma

lógica.

o  Mantenibilidad: Los errores son más fáciles de localizar y corregir, ya que el código está

encapsulado en objetos específicos.

o  Escalabilidad: Añadir nuevas funcionalidades suele ser tan sencillo como crear nuevas

clases que extiendan o interactúen con las existentes.

o  Modelado natural: Facilita la transición desde la conceptualización humana de un problema

hasta su representación en código.

Desventajas:

o  Curva de aprendizaje: Comprender correctamente los patrones de diseño y los cuatro

pilares exige más esfuerzo inicial que la programación estructurada.

o  Rendimiento y tamaño: Las aplicaciones orientadas a objetos suelen ser más extensas en

líneas de código y pueden requerir más recursos de memoria debido a la creación constante
de instancias y punteros.

o  Riesgo de sobre diseño: Es común caer en la trampa de crear jerarquías de clases

innecesariamente profundas o abstractas.

________________________________________________________________________________________________
3

Informe de POO – Paradigmas de Programación

________________________________________________________________________________________________

Conclusión

El paradigma de Programación Orientada a Objetos sigue siendo el estándar principal en la industria del
desarrollo de software moderno. Lenguajes como Kotlin demuestran cómo los principios clásicos de
abstracción, encapsulamiento, herencia y polimorfismo pueden aplicarse mediante sintaxis limpia y segura.
Dominar la POO no solo implica conocer la sintaxis de un lenguaje, sino desarrollar la capacidad de pensar y
abstraer problemas en términos de entidades colaborativas.

________________________________________________________________________________________________
4

Informe de POO – Paradigmas de Programación

