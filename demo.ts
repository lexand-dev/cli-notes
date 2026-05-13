import fs from "node:fs/promises"

const __dirname = new URL("./base.ts", import.meta.url).pathname

const writeFile = async () => {
  await fs.writeFile(__dirname, `console.log("Hellow my Lion, you are INSANE!!")`)
}

writeFile()
