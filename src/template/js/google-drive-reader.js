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
   * Descarga el contenido de un archivo JSON desde Google Drive
   * @param {string} fileId - ID del archivo
   * @returns {Promise<Object>} - Contenido del archivo JSON parseado
   */
  async downloadJsonFile(fileId) {
    try {
      const response = await fetch(
        `${this.baseUrl}/files/${fileId}?alt=media&key=${this.apiKey}`
      );

      if (!response.ok) {
        throw new Error(`Error al descargar archivo: ${response.status}`);
      }

      const jsonText = await response.text();
      return JSON.parse(jsonText);
    } catch (error) {
      console.error("Error al descargar archivo JSON:", error);
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

      // Descargar y parsear el archivo JSON
      const jsonData = await this.downloadJsonFile(dataJsonFile.id);

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
    "https://drive.google.com/drive/folders/1LV0GvH6elctNgadaXyZhD5QYGZOUweBp?usp=sharing";

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
