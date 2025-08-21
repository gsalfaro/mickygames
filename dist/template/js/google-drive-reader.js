/**
 * Script para leer carpetas de Google Drive y extraer información de productos
 * Requiere autenticación con Google Drive API
 */

class GoogleDriveReader {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = "https://www.googleapis.com/drive/v3";
  }

  /**
   * Extrae el ID de la carpeta desde una URL de Google Drive
   * @param {string} url - URL de la carpeta de Google Drive
   * @returns {string} - ID de la carpeta
   */
  extractFolderId(url) {
    const match = url.match(/\/folders\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
  }

  /**
   * Obtiene la lista de archivos y carpetas dentro de una carpeta
   * @param {string} folderId - ID de la carpeta
   * @returns {Promise<Array>} - Lista de archivos y carpetas
   */
  async getFilesInFolder(folderId) {
    try {
      const response = await fetch(
        `${this.baseUrl}/files?q='${folderId}'+in+parents&key=${this.apiKey}&fields=files(id,name,mimeType,webContentLink,webViewLink)`
      );

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const data = await response.json();
      return data.files || [];
    } catch (error) {
      console.error("Error al obtener archivos:", error);
      throw error;
    }
  }

  /**
   * Obtiene las subcarpetas de una carpeta principal
   * @param {string} folderId - ID de la carpeta principal
   * @returns {Promise<Array>} - Lista de subcarpetas
   */
  async getSubfolders(folderId) {
    const files = await this.getFilesInFolder(folderId);
    return files.filter(
      (file) => file.mimeType === "application/vnd.google-apps.folder"
    );
  }

  /**
   * Descarga el contenido de un archivo JSON desde Google Drive usando URL directa
   * @param {string} fileUrl - URL directa del archivo (webContentLink)
   * @returns {Promise<Object>} - Contenido del archivo JSON parseado
   */
  async downloadJsonFile(fileUrl) {
    try {
      return await this.downloadJsonFileWithProxy(fileUrl);
    } catch (error) {
      console.error("Error al descargar archivo JSON:", error);
      throw error;
    }
  }

  /**
   * Descarga usando proxy CORS para evitar bloqueos
   * @param {string} fileUrl - URL del archivo
   * @returns {Promise<Object>} - Contenido del archivo JSON parseado
   */
  async downloadJsonFileWithProxy(fileUrl) {
    try {
      // Lista de proxies CORS públicos (usar con cuidado en producción)
      const corsProxies = [
        //"https://api.allorigins.win/get?url=",
        "https://api.codetabs.com/v1/proxy?quest=",
      ];

      let lastError;

      for (const proxy of corsProxies) {
        try {
          const proxyUrl = proxy + encodeURIComponent(fileUrl);
          const response = await fetch(proxyUrl);

          if (!response.ok) {
            throw new Error(`Proxy error: ${response.status}`);
          }

          let jsonText;
          const responseText = await response.text();

          // allorigins.win devuelve un objeto con la propiedad 'contents'
          if (proxy.includes("allorigins.win")) {
            const proxyResponse = JSON.parse(responseText);
            jsonText = proxyResponse.contents;
          } else {
            jsonText = responseText;
          }

          return JSON.parse(jsonText);
        } catch (proxyError) {
          console.warn(`Proxy ${proxy} falló:`, proxyError);
          lastError = proxyError;
          continue;
        }
      }

      throw lastError || new Error("Todos los proxies CORS fallaron");
    } catch (error) {
      console.error("Error al descargar archivo JSON con proxy:", error);
      throw error;
    }
  }

  /**
   * Descarga usando XMLHttpRequest como alternativa a fetch
   * @param {string} fileUrl - URL del archivo
   * @returns {Promise<Object>} - Contenido del archivo JSON parseado
   */
  async downloadJsonFileWithXHR(fileUrl) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", fileUrl, true);
      xhr.setRequestHeader("Accept", "application/json, text/plain, */*");

      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            try {
              const jsonData = JSON.parse(xhr.responseText);
              resolve(jsonData);
            } catch (parseError) {
              reject(new Error("Error parsing JSON: " + parseError.message));
            }
          } else {
            reject(new Error(`XHR Error: ${xhr.status}`));
          }
        }
      };

      xhr.onerror = function () {
        reject(new Error("XHR Network Error"));
      };

      xhr.send();
    });
  }

  /**
   * Descarga el contenido de un archivo JSON usando el ID del archivo
   * @param {string} fileId - ID del archivo
   * @returns {Promise<Object>} - Contenido del archivo JSON parseado
   */
  async downloadJsonFileById(fileId) {
    try {
      // Usar URL de descarga directa construida con el ID
      const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;

      // Intentar descarga directa primero
      try {
        const response = await fetch(downloadUrl, {
          method: "GET",
          mode: "cors",
          headers: {
            Accept: "application/json, text/plain, */*",
          },
          credentials: "omit",
        });

        if (!response.ok) {
          throw new Error(
            `Error al descargar archivo por ID: ${response.status}`
          );
        }

        const jsonText = await response.text();
        return JSON.parse(jsonText);
      } catch (corsError) {
        console.warn(
          "CORS error con descarga directa, intentando con proxy..."
        );
        // Si falla por CORS, usar proxy
        return await this.downloadJsonFileWithProxy(downloadUrl);
      }
    } catch (error) {
      console.error("Error al descargar archivo JSON por ID:", error);
      throw error;
    }
  }

  /**
   * Verifica si un archivo es una imagen basándose en su tipo MIME
   * @param {string} mimeType - Tipo MIME del archivo
   * @returns {boolean} - True si es una imagen
   */
  isImageFile(mimeType) {
    return mimeType && mimeType.startsWith("image/");
  }

  /**
   * Convierte un ID de archivo de Google Drive a URL de descarga directa (tamaño original)
   * @param {string} fileId - ID del archivo
   * @returns {string} - URL de descarga directa del archivo original
   */
  getDirectDownloadUrl(fileId) {
    // URL de descarga directa del archivo original
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
  }

  /**
   * Procesa una subcarpeta individual para extraer data.json e imágenes
   * @param {string} subfolderId - ID de la subcarpeta
   * @returns {Promise<Object>} - Objeto con la información del producto
   * Estructura: { titulo, descripcion, precio, detalles, imagenes }
   */
  async processSubfolder(subfolderId) {
    try {
      const files = await this.getFilesInFolder(subfolderId);

      // Buscar el archivo data.json
      const dataJsonFile = files.find(
        (file) => file.name.toLowerCase() === "data.json"
      );

      if (!dataJsonFile) {
        console.warn(`No se encontró data.json en la carpeta ${subfolderId}`);
        return null;
      }

      // Verificar que tenga URL de descarga
      if (!dataJsonFile.webContentLink) {
        console.warn(
          `El archivo data.json no tiene URL de descarga disponible en la carpeta ${subfolderId}`
        );
        return null;
      }

      // Descargar y parsear el archivo JSON usando múltiples métodos de fallback
      let jsonData;
      try {
        // Intento 1: Usar webContentLink
        jsonData = await this.downloadJsonFile(dataJsonFile.webContentLink);
      } catch (error) {
        console.warn(
          `Error con webContentLink, intentando con ID del archivo...`
        );
        try {
          // Intento 2: Usar ID del archivo con URL de descarga directa
          jsonData = await this.downloadJsonFileById(dataJsonFile.id);
        } catch (idError) {
          console.warn(
            `Error con ID, intentando XMLHttpRequest como último recurso...`
          );
          try {
            // Intento 3: Usar XMLHttpRequest con webContentLink
            jsonData = await this.downloadJsonFileWithXHR(
              dataJsonFile.webContentLink
            );
          } catch (xhrError) {
            console.error(
              `Error descargando data.json con todos los métodos:`,
              { webContentLink: error, byId: idError, xhr: xhrError }
            );
            throw new Error(`No se pudo descargar data.json: ${error.message}`);
          }
        }
      }

      // Buscar todas las imágenes
      const imageFiles = files.filter((file) =>
        this.isImageFile(file.mimeType)
      );

      // Crear URLs de descarga directa (tamaño original)
      const imagenes = imageFiles.map((image) =>
        this.getDirectDownloadUrl(image.id)
      );

      // Crear el objeto resultado
      return {
        titulo: jsonData.titulo || "",
        descripcion: jsonData.descripcion || "",
        precio: parseFloat(jsonData.precio) || 0,
        detalles: Array.isArray(jsonData.detalles) ? jsonData.detalles : [],
        imagenes: imagenes, // URLs de descarga directa (tamaño original)
      };
    } catch (error) {
      console.error(`Error procesando subcarpeta ${subfolderId}:`, error);
      return null;
    }
  }

  /**
   * Función principal para leer toda la carpeta de Google Drive
   * @param {string} driveUrl - URL de la carpeta de Google Drive
   * @returns {Promise<Array>} - Array de objetos con información de productos
   */
  async readDriveFolder(driveUrl) {
    try {
      // Extraer ID de la carpeta principal
      const mainFolderId = this.extractFolderId(driveUrl);
      if (!mainFolderId) {
        throw new Error("URL de Google Drive inválida");
      }

      console.log(`Procesando carpeta principal: ${mainFolderId}`);

      // Obtener todas las subcarpetas
      const subfolders = await this.getSubfolders(mainFolderId);
      console.log(`Encontradas ${subfolders.length} subcarpetas`);

      // Procesar cada subcarpeta
      const productos = [];
      for (const subfolder of subfolders) {
        console.log(`Procesando subcarpeta: ${subfolder.name}`);
        const producto = await this.processSubfolder(subfolder.id);

        if (producto) {
          productos.push(producto);
          console.log(`✓ Producto procesado: ${producto.descripcion}`);
        } else {
          console.log(`✗ Error procesando subcarpeta: ${subfolder.name}`);
        }
      }

      return productos;
    } catch (error) {
      console.error("Error en readDriveFolder:", error);
      throw error;
    }
  }
}

/**
 * Función de conveniencia para usar el script
 * @param {string} apiKey - Clave de API de Google
 * @param {string} driveUrl - URL de la carpeta de Google Drive
 * @returns {Promise<Array>} - Array de productos
 */
async function leerCarpetaGoogleDrive(apiKey, driveUrl = null) {
  // URL por defecto si no se proporciona
  const url =
    driveUrl ||
    "https://drive.google.com/drive/folders/1W8JRJdGEftF6E-RtJ1YlwcDOBQtZP1_W";

  const reader = new GoogleDriveReader(apiKey);
  return await reader.readDriveFolder(url);
}

// Ejemplo de uso
async function obtenerSaldos() {
  try {
    // Reemplaza 'TU_API_KEY' con tu clave de API de Google
    const apiKey = "AIzaSyDd5J8Ooe2iVTpQXXkOg9pP427tS-zKPBw";
    const productos = await leerCarpetaGoogleDrive(apiKey);

    console.log("Productos encontrados:", productos.length);
    console.log("Productos:", productos);

    return productos;
  } catch (error) {
    console.error("Error:", error);
  }
}

// Exportar para uso en módulos
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    GoogleDriveReader,
    leerCarpetaGoogleDrive,
    obtenerSaldos,
  };
}
