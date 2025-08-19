/**
 * Script simple para cargar productos y mostrarlos en el div ContenedorDeSaldos
 */

// Variable global para guardar los resultados
let resultadosProductos = [];

/**
 * Función principal que carga los productos y los muestra
 */
async function cargarProductos() {
  try {
    console.log("Obteniendo productos...");

    // Guardar los resultados de obtenerSaldos() en la variable
    resultadosProductos = await obtenerSaldos();

    console.log("Productos obtenidos:", resultadosProductos);

    // Mostrar en el div ContenedorDeSaldos
    insertarProductosEnHTML();
  } catch (error) {
    console.error("Error al cargar productos:", error);
    document.getElementById("ContenedorDeSaldos").innerHTML =
      '<div class="col-12"><p class="text-danger">Error al cargar productos: ' +
      error.message +
      "</p></div>";
  }
}

/**
 * Genera el enlace de WhatsApp con los detalles del producto
 * @param {Object} producto - Objeto con los datos del producto
 * @returns {string} - URL de WhatsApp con el mensaje
 */
function generarEnlaceWhatsApp(producto) {
  const numeroWhatsApp = "525527730286"; // Mismo número que otros botones en la página

  // Crear el mensaje con los detalles del producto
  let mensaje = `¡Hola! Me interesa el siguiente producto:\n\n`;
  mensaje += `📦 *${producto.descripcion}*\n`;
  mensaje += `💰 Precio: $${producto.precio.toFixed(2)}\n`;

  if (producto.detalles && producto.detalles.length > 0) {
    mensaje += `\n✅ *Características:*\n`;
    producto.detalles.forEach((detalle, index) => {
      mensaje += `${index + 1}. ${detalle}\n`;
    });
  }

  mensaje += `\n¿Podrían darme más información y disponibilidad?`;

  // Codificar el mensaje para URL
  const mensajeCodificado = encodeURIComponent(mensaje);

  // Retornar la URL completa de WhatsApp
  return `https://wa.me/${numeroWhatsApp}?text=${mensajeCodificado}`;
}

/**
 * Inserta los productos en el div ContenedorDeSaldos con el formato HTML solicitado
 */
function insertarProductosEnHTML() {
  const contenedor = document.getElementById("ContenedorDeSaldos");

  if (!contenedor) {
    console.error('No se encontró el div con id "ContenedorDeSaldos"');
    return;
  }

  if (!resultadosProductos || resultadosProductos.length === 0) {
    contenedor.innerHTML =
      '<div class="col-12"><p>No se encontraron productos.</p></div>';
    return;
  }

  // Generar HTML para cada producto
  let htmlCompleto = "";

  resultadosProductos.forEach((producto, index) => {
    // Crear el delay de animación
    const delay = (0.3 + index * 0.1).toFixed(1);

    // Formatear precio con decimales
    const precioConDecimales = producto.precio.toFixed(2);

    // Generar HTML para los detalles
    let detallesHTML = "";
    if (producto.detalles && producto.detalles.length > 0) {
      producto.detalles.forEach((detalle) => {
        detallesHTML += `
                                <div class="d-flex justify-content-between mb-3">
                                    <span>${detalle}</span>
                                    <i class="fa fa-check text-primary pt-1"></i>
                                </div>`;
      });
    }

    // Crear el HTML del producto
    const productoHTML = `
                    <div class="col-lg-4 wow slideInUp" data-wow-delay="${delay}s">
                        <div class="bg-white rounded shadow position-relative" style="z-index: 1">
                            <div class="border-bottom py-4 px-5 mb-4">
                                <small class="text-uppercase">${
                                  producto.descripcion
                                }</small>
                            </div>
                            <div class="p-5 pt-0">
                                <h1 class="display-5 mb-3">
                                    <small class="align-top" style="font-size: 22px; line-height: 45px;">$</small>
                                    ${precioConDecimales}
                                </h1>
                                ${detallesHTML}
                                <a href="${generarEnlaceWhatsApp(
                                  producto
                                )}" target="_blank" class="btn btn-primary py-2 px-4 mt-4">Pedir</a>
                            </div>
                        </div>
                    </div>`;

    htmlCompleto += productoHTML;
  });

  // Insertar todo el HTML en el contenedor
  contenedor.innerHTML = htmlCompleto;

  console.log(
    `Se insertaron ${resultadosProductos.length} productos en el HTML`
  );
}

// Ejecutar automáticamente cuando se carga la página
document.addEventListener("DOMContentLoaded", function () {
  cargarProductos();
});
