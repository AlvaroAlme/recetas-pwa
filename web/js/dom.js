/**
 * @file Ayudante para crear HTML desde JavaScript SIN innerHTML.
 *
 * Los nombres de productos y recetas pueden venir de Claude o de un ticket
 * manipulado. Si los meto con innerHTML, un nombre como
 * "<img src=x onerror=alert(1)>" se ejecutaría (XSS, ARQUITECTURA §9.7).
 * Con createElement y textos normales, el navegador lo enseña como texto y
 * nunca lo interpreta como HTML.
 */

/**
 * Crea un elemento con sus atributos y sus hijos.
 *
 * Ejemplo:
 *   el('button', { class: 'boton', type: 'button', onclick: guardar }, 'Guardar')
 *   → <button class="boton" type="button">Guardar</button> (y el clic llama a guardar)
 *
 * @param {string} etiqueta 'div', 'button', 'li'…
 * @param {Record<string, any>} [atributos] Los que empiezan por "on" son
 *   eventos (onclick → click). true pone el atributo vacío (hidden, disabled);
 *   false, null o undefined no lo ponen.
 * @param {...(Node | string | number | null | undefined | false | Array<any>)} hijos
 *   Elementos o textos. Los textos se meten como TEXTO, nunca como HTML.
 *   Los null, undefined y false se ignoran (útil para poner algo solo a veces).
 * @returns {HTMLElement}
 */
export function el(etiqueta, atributos = {}, ...hijos) {
  const elemento = document.createElement(etiqueta);

  for (const [nombre, valor] of Object.entries(atributos)) {
    if (valor === false || valor === null || valor === undefined) continue;
    if (nombre.startsWith('on')) {
      elemento.addEventListener(nombre.slice(2), valor);
    } else {
      elemento.setAttribute(nombre, valor === true ? '' : String(valor));
    }
  }

  const validos = hijos.flat().filter((hijo) => hijo !== null && hijo !== undefined && hijo !== false);
  elemento.append(...validos.map((hijo) => (hijo instanceof Node ? hijo : String(hijo))));
  return elemento;
}
