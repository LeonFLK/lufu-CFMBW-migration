import { lufuExamDataResult, handleIncludedLufu, lufuDataKeys, LufuData } from './handleLufus'
import exceljs from 'exceljs'
import path from 'path'

const dbLufuKeyMap: Record<keyof LufuData, string> = {
    'VC IN': 'CS',
    FVC: 'CV',
    'FEV 1': 'CD',
    'FEV 1 % FVC': 'CY',
    'R eff': 'DO',
    'SR eff': 'DK',
    FRCpleth: 'DE',
    RV: 'DH',
    TLC: 'DB',
    'MEF 75': 'CG',
    'MEF 50': 'CJ',
    'MEF 25': 'CM',
    PEF: 'CP',
}
export async function openWorkbook(): Promise<exceljs.Workbook> {
    const workbook = new exceljs.Workbook()
    const resolvedPath = path.resolve('./db/finished', 'CFMBWLUFU3.2.xlsx')
    const book = await workbook.xlsx.readFile(resolvedPath)
    return book
}
export function getDBRow(idColumn: exceljs.Column, id: string, date: Date): number | undefined {
    console.log(date)
    const splitDateDate: string[] = date.toISOString().split('-')
    const splitDateReduced = splitDateDate.length > 2 ? splitDateDate[2].split('T') : null
    const dateDay = Number(splitDateReduced ? splitDateReduced[0] : null)
    const dateMonth = Number(splitDateDate ? splitDateDate[1] : null)
    const dateYear = Number(splitDateDate ? splitDateDate[0] : null)
    const matchingRowIndex: number[] = []
    idColumn.eachCell({ includeEmpty: false }, (cell, rowNumber) => {
        if (rowNumber < 2) return
        const dateMatchRaw = idColumn.worksheet.getRow(rowNumber).getCell('H').value
        if (!dateMatchRaw) return
        const dateMatchDateTyped =
            dateMatchRaw instanceof Date ? (dateMatchRaw as Date) : new Date(dateMatchRaw.toString())
        const splitDateMatch: string[] = dateMatchDateTyped.toISOString().split('-')
        const splitReduced = splitDateMatch.length > 2 ? splitDateMatch[2].split('T') : null
        const matchDay = Number(splitReduced ? splitReduced[0] : null)
        const matchMonth = Number(splitDateMatch ? splitDateMatch[1] : null)
        const matchYear = Number(splitDateMatch ? splitDateMatch[0] : null)
        if (cell.value === id && dateDay === matchDay && dateMonth === matchMonth && dateYear === matchYear) {
            console.log(
                `Found Cell with Value ${cell.value} and matching date of ${dateMatchDateTyped} in Row Number: ${rowNumber} `,
            )
            matchingRowIndex.push(rowNumber)
        }
    })
    const resultingNumber = matchingRowIndex[0]
    return resultingNumber
}
export async function writeRow(rowIndex: number, data: LufuData): Promise<boolean> {
    const book = await openWorkbook()
    const table1 = book.getWorksheet('DatenMBW')
    try {
        Object.keys(data).forEach((value) => {
            const key = value as keyof LufuData
            if (lufuDataKeys.includes(key)) {
                const vorCell = table1.getRow(rowIndex).getCell(dbLufuKeyMap[key])
                vorCell.value = data[key].vor
                const vorCellCol = vorCell.fullAddress.col
                const percCell = table1.getRow(rowIndex).getCell(vorCellCol + 1)
                percCell.value = data[key].soll_perc
            }
        })
        const resolvedPath = path.resolve('./db/finished/CFMBWLUFU3.2.xlsx')
        console.log(resolvedPath)
        table1.removeConditionalFormatting('')
        await book.xlsx.writeFile(resolvedPath)
    } catch (err) {
        console.error(err)
        return false
    }
    return true
}
export async function accessDB(lufuResult: lufuExamDataResult): Promise<void> {
    const { data, lufuPath: filePath } = lufuResult
    const table1 = (await openWorkbook()).getWorksheet('DatenMBW')
    const idColumn = table1.getColumn('B')
    const matchingRow = getDBRow(idColumn, data.id, data.date)
    if (matchingRow) {
        const success = await writeRow(matchingRow, data)
        if (success) handleIncludedLufu(filePath)
        else throw new Error('couldnt handle db writing')
    }

    return
}
