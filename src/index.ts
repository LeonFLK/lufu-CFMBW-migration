import * as lufu from './handleLufus'
import * as db from './handleDB'
import fs from 'fs'

async function loop(): Promise<void> {
    const dirfiles = fs.readdirSync('./lufu')
    const totalFiles = dirfiles.filter((val) => val.endsWith('Ite')).length
    for (let i = 0; i < totalFiles; i++) {
        try {
            const lufuOne = lufu.getNextLufuData(i)
            await db.accessDB(lufuOne)
        } catch (err) {
            console.error(err)
        }
    }
}

loop().then(() => console.info('Successfully worked through the lufus!'))
