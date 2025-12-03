import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { runTask } from '../dist/runner/index.js'

const argv = yargs(hideBin(process.argv)).option('task',{type:'string',demandOption:true}).option('args',{type:'string',default:'{}'}).argv
const name = argv.task
const args = JSON.parse(argv.args)
const result = await runTask({ name, args })
process.stdout.write(JSON.stringify(result,null,2)+"\n")