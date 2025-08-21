/**
 * Script simple para cargar productos y mostrarlos en el div ContenedorDeSaldos
 */

// Variable global para guardar los resultados
let resultadosProductos = [];

/**
 * Extrae el ID del archivo de una URL de Google Drive
 * @param {string} url - URL de Google Drive
 * @returns {string} - ID del archivo extraído
 */
function extraerIdDeGoogleDrive(url) {
  // Buscar el patrón /d/{ID} en URLs de Google Drive
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (match) return match[1];

  // Buscar el patrón id={ID} en URLs de Google Drive
  const idMatch = url.match(/[?&]id=([a-zA-Z0-9-_]+)/);
  if (idMatch) return idMatch[1];

  // Si no se encuentra patrón, asumir que ya es un ID
  return url;
}

/**
 * Cache para almacenar imágenes en base64
 */
const imageCache = new Map();

/**
 * Convierte una imagen de Google Drive a base64 usando un proxy CORS
 * @param {string} imageId - ID de la imagen de Google Drive
 * @returns {Promise<string>} - Imagen en formato base64
 */
async function obtenerImagenBase64(imageId) {
  // Verificar si ya está en cache
  if (imageCache.has(imageId)) {
    return imageCache.get(imageId);
  }

  const urls = [
    `https://lh3.googleusercontent.com/d/${imageId}=s500`,
    `https://drive.google.com/uc?export=view&id=${imageId}`,
    `https://drive.google.com/thumbnail?id=${imageId}&sz=w500`,
  ];

  const proxies = [
    "https://api.allorigins.win/raw?url=",
    "https://cors-anywhere.herokuapp.com/",
    "https://corsproxy.io/?",
    "", // Sin proxy como último recurso
  ];

  for (const proxy of proxies) {
    for (const url of urls) {
      try {
        const proxyUrl = proxy + encodeURIComponent(url);
        console.log(`Intentando cargar imagen: ${proxyUrl}`);

        const response = await fetch(proxyUrl, {
          method: "GET",
          headers: {
            Accept: "image/*",
          },
        });

        if (response.ok) {
          const blob = await response.blob();
          const base64 = await blobToBase64(blob);

          // Guardar en cache
          imageCache.set(imageId, base64);
          console.log(`Imagen cargada exitosamente: ${imageId}`);
          return base64;
        }
      } catch (error) {
        console.warn(`Error con proxy ${proxy}: ${error.message}`);
      }
    }
  }

  // Si todas las opciones fallan, retornar una imagen placeholder
  console.error(`No se pudo cargar la imagen con ID: ${imageId}`);
  return "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZW4gbm8gZGlzcG9uaWJsZTwvdGV4dD48L3N2Zz4=";
}

/**
 * Convierte un Blob a base64
 * @param {Blob} blob - Blob a convertir
 * @returns {Promise<string>} - String base64
 */
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Función principal que carga los productos y los muestra
 */
async function cargarProductos() {
  try {
    console.log("Obteniendo productos...");

    // Actualizar mensaje de carga
    const mensajeCarga = document.getElementById("mensajeCarga");
    if (mensajeCarga) {
      mensajeCarga.querySelector("h5").textContent =
        "Conectando con Google Drive...";
      mensajeCarga.querySelector("p").textContent =
        "Obteniendo lista de productos disponibles";
    }

    // Guardar los resultados de obtenerSaldos() en la variable
    resultadosProductos = await obtenerSaldos();

    console.log("Productos obtenidos:", resultadosProductos);

    // Actualizar mensaje para indicar que se están procesando las imágenes
    if (mensajeCarga) {
      mensajeCarga.querySelector("h5").textContent = "Procesando imágenes...";
      mensajeCarga.querySelector("p").textContent =
        "Preparando la galería de productos";
    }

    // Mostrar en el div ContenedorDeSaldos
    insertarProductosEnHTML();
  } catch (error) {
    console.error("Error al cargar productos:", error);
    document.getElementById("ContenedorDeSaldos").innerHTML =
      '<div class="col-12 text-center py-5">' +
      '<div class="alert alert-danger" role="alert">' +
      '<h4 class="alert-heading">¡Error al cargar productos!</h4>' +
      '<p class="mb-0">No se pudieron cargar los productos: ' +
      error.message +
      "</p>" +
      "<hr>" +
      '<p class="mb-0">Por favor, intente refrescar la página o contacte al administrador.</p>' +
      "</div>" +
      "</div>";
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

  // Usar título si existe, sino usar descripción
  const nombreProducto = producto.titulo || producto.descripcion;
  mensaje += `📦 *${nombreProducto}*\n`;

  // Si hay título Y descripción, agregar la descripción como subtítulo
  if (producto.titulo && producto.descripcion) {
    mensaje += `📝 ${producto.descripcion}\n`;
  }

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

    // Alternar color de fondo entre bg-white y bg-light
    const bgColor = index % 2 === 0 ? "bg-white" : "bg-light";

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
                        <div class="${bgColor} rounded shadow position-relative" style="z-index: 1">
                            <div class="border-bottom py-4 px-5 mb-4">
                                <h4 class="text-primary mb-1">${
                                  producto.titulo || ""
                                }</h4>
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
                                <div class="d-flex gap-2 mt-4">
                                    <a href="${generarEnlaceWhatsApp(
                                      producto
                                    )}" target="_blank" class="btn btn-primary py-2 px-4">Pedir</a>
                                    <button onclick="abrirModalImagenes(${index})" class="btn btn-primary py-2 px-4">Ver imágenes</button>
                                </div>
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

  // Mostrar mensaje de éxito temporal
  setTimeout(() => {
    const primerProducto = document.querySelector(
      "#ContenedorDeSaldos .col-lg-4"
    );
    if (primerProducto) {
      const mensajeExito = document.createElement("div");
      mensajeExito.className =
        "alert alert-success alert-dismissible fade show position-fixed";
      mensajeExito.style.cssText =
        "top: 20px; right: 20px; z-index: 1050; min-width: 300px;";
      mensajeExito.innerHTML = `
        <i class="fa fa-check-circle me-2"></i>
        <strong>¡Productos cargados!</strong> Se encontraron ${resultadosProductos.length} productos disponibles.
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
      `;
      document.body.appendChild(mensajeExito);

      // Auto-remover después de 4 segundos
      setTimeout(() => {
        if (mensajeExito.parentNode) {
          mensajeExito.remove();
        }
      }, 4000);
    }
  }, 500);
}

/**
 * Abre el modal con las imágenes del producto
 * @param {number} productoIndex - Índice del producto en el array
 */
async function abrirModalImagenes(productoIndex) {
  const producto = resultadosProductos[productoIndex];

  if (!producto || !producto.imagenes || producto.imagenes.length === 0) {
    alert("Este producto no tiene imágenes disponibles");
    return;
  }

  // Crear o actualizar el modal
  crearModalImagenes();

  // Mostrar loading
  document.getElementById(
    "modalImagenesTitle"
  ).textContent = `Cargando imágenes: ${
    producto.titulo || producto.descripcion
  }`;
  document.getElementById("modalImagenesBody").innerHTML = `
    <div class="text-center">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Cargando...</span>
      </div>
      <p class="mt-2">Cargando imágenes...</p>
    </div>
  `;

  // Mostrar el modal inmediatamente
  const modal = new bootstrap.Modal(document.getElementById("modalImagenes"));
  modal.show();

  try {
    // Cargar todas las imágenes en paralelo
    const imagenesPromises = producto.imagenes.map(async (url, imgIndex) => {
      const imageId = extraerIdDeGoogleDrive(url);
      const base64Image = await obtenerImagenBase64(imageId);

      return {
        index: imgIndex,
        base64: base64Image,
        imageId: imageId,
      };
    });

    const imagenesBase64 = await Promise.all(imagenesPromises);

    // Generar HTML para las imágenes usando base64
    const imagenesHTML = imagenesBase64
      .map(
        ({ index, base64, imageId }) => `
      <div class="col-md-6 col-lg-4 mb-3">
        <img src="${base64}"
             data-image-id="${imageId}"
             class="img-fluid rounded shadow-sm cursor-pointer"
             alt="Imagen ${index + 1} de ${
          producto.titulo || producto.descripcion
        }"
             onclick="ampliarImagen('${base64}')"
             style="cursor: pointer; transition: transform 0.2s;"
             onmouseover="this.style.transform='scale(1.05)'"
             onmouseout="this.style.transform='scale(1)'">
      </div>
    `
      )
      .join("");

    // Actualizar contenido del modal con las imágenes cargadas
    document.getElementById("modalImagenesTitle").textContent = `Imágenes: ${
      producto.titulo || producto.descripcion
    }`;
    document.getElementById("modalImagenesBody").innerHTML = `
      <div class="row">
        ${imagenesHTML}
      </div>
    `;
  } catch (error) {
    console.error("Error cargando imágenes:", error);
    document.getElementById("modalImagenesBody").innerHTML = `
      <div class="text-center text-danger">
        <p>Error al cargar las imágenes</p>
        <p>Por favor, intenta de nuevo más tarde</p>
      </div>
    `;
  }
}

/**
 * Crea el modal de imágenes si no existe
 */
function crearModalImagenes() {
  // Verificar si el modal ya existe
  if (document.getElementById("modalImagenes")) {
    return;
  }

  // Crear el HTML del modal
  const modalHTML = `
    <div class="modal fade" id="modalImagenes" tabindex="-1" aria-labelledby="modalImagenesTitle" aria-hidden="true">
      <div class="modal-dialog modal-xl">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="modalImagenesTitle">Imágenes del Producto</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body" id="modalImagenesBody">
            <!-- Las imágenes se insertan aquí dinámicamente -->
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Insertar el modal en el DOM
  document.body.insertAdjacentHTML("beforeend", modalHTML);
}

/**
 * Amplía una imagen en un modal secundario
 * @param {string} imageBase64 - Imagen en formato base64
 */
function ampliarImagen(imageBase64) {
  // Crear modal para imagen ampliada si no existe
  if (!document.getElementById("modalImagenAmpliada")) {
    const modalAmpliadaHTML = `
      <div class="modal fade" id="modalImagenAmpliada" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-lg">
          <div class="modal-content bg-transparent border-0">
            <div class="modal-body p-0 text-center">
              <img id="imagenAmpliada" src="" class="img-fluid rounded" style="max-height: 85vh; max-width: 100%;">
              <button type="button" class="btn-close position-absolute top-0 end-0 m-3 bg-white rounded-circle"
                      data-bs-dismiss="modal" aria-label="Close" style="opacity: 0.9; z-index: 1000;"></button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML("beforeend", modalAmpliadaHTML);
  }

  // Usar la imagen en base64
  document.getElementById("imagenAmpliada").src = imageBase64;
  const modalAmpliada = new bootstrap.Modal(
    document.getElementById("modalImagenAmpliada")
  );
  modalAmpliada.show();
}

// Ejecutar automáticamente cuando se carga la página
document.addEventListener("DOMContentLoaded", function () {
  cargarProductos();
});
