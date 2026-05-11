import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { getLogger } from './logger'
import { addNote, getAllNotes, findNotes, removeNote, clearNotes } from './db'

const logger = getLogger('cli')

yargs(hideBin(process.argv))
  .command('new <note>', 'create a new note', yargs => {
    return yargs.positional('note', {
      describe: 'The content of the note you want to create',
      type: 'string'
    })
  }, async (argv: any) => {
    const tags = argv.tags ?? argv.t
    try {
      const note = await addNote(String(argv.note), tags)
      console.log('Note created:')
      console.log(note)
    } catch (err: any) {
      logger.error(err)
      process.exitCode = 1
    }
  })
  .option('tags', {
    alias: 't',
    type: 'string',
    description: 'tags to add to the note'
  })
  .command('all', 'get all notes', () => { }, async (argv: any) => {
    try {
      const notes = await getAllNotes()
      console.log(JSON.stringify(notes, null, 2))
    } catch (err: any) {
      logger.error(err)
      process.exitCode = 1
    }
  })
  .command('find <filter..>', 'get matching notes', yargs => {
    return yargs.positional('filter', {
      describe: 'The search term to filter notes by, will be applied to note.content',
      type: 'string',
      array: true
    })
  }, async (argv: any) => {
    try {
      let filterVal: string
      if (Array.isArray(argv.filter)) {
        // join variadic positional args into a single search string
        filterVal = argv.filter.join(' ').trim()
      } else {
        filterVal = String(argv.filter)
      }

      const notes = await findNotes(filterVal)
      console.log(JSON.stringify(notes, null, 2))
    } catch (err: any) {
      logger.error(err)
      process.exitCode = 1
    }
  })
  .command('remove <id>', 'remove a note by id', yargs => {
    return yargs.positional('id', {
      type: 'number',
      description: 'The id of the note you want to remove'
    })
  }, async (argv: any) => {
    try {
      const id = Number(argv.id)
      const ok = await removeNote(id)
      if (ok) console.log(`Removed note ${id}`)
      else console.log(`Note ${id} not found`)
    } catch (err: any) {
      logger.error(err)
      process.exitCode = 1
    }
  })
  .command('web [port]', 'launch website to see notes', yargs => {
    return yargs
      .positional('port', {
        describe: 'port to bind on',
        default: 5000,
        type: 'number'
      })
  }, async (argv: any) => {
    const port = Number(argv.port || 5000)
    // If Bun.serve is available, use it. Otherwise, inform the user.
    if (typeof (globalThis as any).Bun === 'undefined' || typeof (globalThis as any).Bun.serve !== 'function') {
      logger.error('Bun.serve is not available in this runtime. Run this command with Bun to launch the web server.')
      process.exit(1)
      return
    }

    const serve = (globalThis as any).Bun.serve
    logger.info(`Starting web server on port ${port}`)

    serve({
      port,
      fetch: async (req: Request) => {
        const url = new URL(req.url)
        if (url.pathname === '/api/notes') {
          try {
            const notes = await getAllNotes()
            return new Response(JSON.stringify(notes), { headers: { 'Content-Type': 'application/json' } })
          } catch (err: any) {
            return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
          }
        }

        // serve a small HTML page
        const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Notes</title>
    <style>body{font-family:sans-serif;padding:20px}pre{background:#f6f8fa;padding:10px}</style>
  </head>
  <body>
    <h1>Notes</h1>
    <div id="notes">Loading...</div>
    <script>
      async function load(){
        const res = await fetch('/api/notes')
        const notes = await res.json()
        const el = document.getElementById('notes')
        el.innerHTML = '<pre>' + JSON.stringify(notes, null, 2) + '</pre>'
      }
      load()
    </script>
  </body>
</html>`
        return new Response(html, { headers: { 'Content-Type': 'text/html' } })
      }
    })
  })
  .command('clean', 'remove all notes', () => { }, async (argv: any) => {
    try {
      await clearNotes()
      console.log('All notes removed')
    } catch (err: any) {
      logger.error(err)
      process.exitCode = 1
    }
  })
  .demandCommand(1)
  .parse()
