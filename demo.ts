import fs from "node:fs/promises"
import path from "node:path"

const __dirname = new URL("./", import.meta.url).pathname

const CATEGORIAS = {
  imagenes: ['.jpg', '.png', '.gif'],
  documentos: ['.md', '.docx', '.txt'],
  codigo: ['.js', '.ts', '.html', '.css']
};

async function organizarCarpeta(ruta: string) {

  try {
    const archivos = await fs.readdir(ruta, { withFileTypes: true })
    const mappedFiles = archivos.map((archivo) => {
      const extension = path.extname(archivo.name)
      const nombreSinExtension = path.basename(archivo.name, extension)
      return {
        nombre: archivo.name,
        extension,
        nombreSinExtension,
        esFile: archivo.isFile(),
      }
    }
    )

    const categoryWithFiles = Object.entries(CATEGORIAS).map(async ([categoria, extensiones]) => {
      const archivosCategoria = mappedFiles.filter(archivo => extensiones.includes(archivo.extension))
      // carpeta destino
      const documentsPath = path.join(ruta, categoria)
      await fs.mkdir(documentsPath, { recursive: true }) // Crear carpeta si no existe

      // Mover archivos a la carpeta destino
      for (const archivo of archivosCategoria) {
        const origen = path.join(ruta, archivo.nombre);
        const destino = path.join(documentsPath, archivo.nombre);
        await fs.rename(origen, destino); // Ahora sí esperamos ✋
      }

      return {
        categoria,
        archivos: archivosCategoria.map(archivo => archivo.nombre)
      }
    })

    const archivosSinCategoria = mappedFiles.filter(archivo => {
      const esArchivoCategoria = Object.values(CATEGORIAS).some(extensiones => extensiones.includes(archivo.extension))
      return archivo.esFile && !esArchivoCategoria
    }).map(archivo => archivo.nombre)

    console.log("Archivos organizados por categoría:")
    for (const { categoria, archivos } of await Promise.all(categoryWithFiles)) {
      console.log(`\n${categoria}:`)
      console.log(archivos.join(", "))
    }

    if (archivosSinCategoria.length > 0) {
      console.log("\nArchivos sin categoría:")
      console.log(archivosSinCategoria.join(", "))
    }
  } catch (error) {
    console.error("Error leyendo carpeta", error)
  }
}

organizarCarpeta(__dirname)
