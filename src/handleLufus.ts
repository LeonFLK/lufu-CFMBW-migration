import fs from 'fs'
import path from 'path'

export interface LufuValue {
    vor: string
    soll_perc: string
}
export type filePath = string
export type mbwPseudo = string
export interface LufuData {
    'VC IN': LufuValue
    FVC: LufuValue
    'FEV 1': LufuValue
    'FEV 1 % FVC': LufuValue
    'R eff': LufuValue
    'SR eff': LufuValue
    FRCpleth: LufuValue
    RV: LufuValue
    TLC: LufuValue
    'MEF 75': LufuValue
    'MEF 50': LufuValue
    'MEF 25': LufuValue
    PEF: LufuValue
}
export const lufuDataKeys: (keyof LufuData)[] = [
    'VC IN',
    'FVC',
    'FEV 1',
    'FEV 1 % FVC',
    'R eff',
    'SR eff',
    'FRCpleth',
    'RV',
    'TLC',
    'MEF 75',
    'MEF 50',
    'MEF 25',
    'PEF',
]
export interface LufuExaminationData extends LufuData {
    id: mbwPseudo
    date: Date
}
export interface lufuExamDataRawResult {
    data: string[]
    lufuPath: filePath
}
export interface lufuExamDataResult {
    data: LufuExaminationData
    lufuPath: filePath
}
export function getId(lufuDataPoints: string[]): mbwPseudo {
    const nameSection = lufuDataPoints.find((val) => val.startsWith('Name'))
    if (!nameSection) throw new Error('No Surname Section in Lufu Examination File!')
    const name = nameSection.split('\t').at(1)
    if (!name) throw new Error('Lufu Examination File has no patient Surname!!')

    const vornameSection = lufuDataPoints.find((val) => val.startsWith('Vorname'))
    if (!vornameSection) throw new Error('No Name Section in Lufu Examination File!')
    const vorname = vornameSection.split('\t').at(1)
    if (!vorname) throw new Error('Lufu Examination File has no Name!!')

    const birthdaySection = lufuDataPoints.find((val) => val.startsWith('Geburtsdatum'))
    if (!birthdaySection) throw new Error('No Birthday Section in Lufu Examination File!')
    const birthday = birthdaySection.split('\t').at(1)
    if (!birthday) throw new Error('Lufu Examination File has no Name!!')

    const mbwId = `${name.slice(0, 3)}${vorname.slice(0, 3)}${birthday.split('.').join('')}`.toUpperCase()
    return mbwId
}
export function getDate(lufuDataPoints: string[]): Date {
    const dateSection = lufuDataPoints.find((val) => val.startsWith('Datum'))
    if (!dateSection) throw new Error('No Date Section in Lufu Examination File!')
    console.log(dateSection)
    const date = dateSection.split('\t').at(3)
    if (!date) throw new Error('Lufu Examination File has no Date!!')
    const splitDate = date.split('.')
    splitDate[2] = `20${splitDate[2]}`
    const dateResult = new Date(splitDate.reverse().join('.'))
    dateResult.setHours(dateResult.getHours() + 4)
    return dateResult
}
export function getLufuData(lufuDataPoints: string[]): LufuData {
    const tempDataObject: { [key: string]: LufuValue } = {}
    const vcinIndex = lufuDataPoints.findIndex((v) => v.startsWith('VC IN'))
    for (let i = vcinIndex; i < vcinIndex + 19; i++) {
        if (
            i !== vcinIndex + 4 &&
            i !== vcinIndex + 9 &&
            i !== vcinIndex + 11 &&
            i !== vcinIndex + 12 &&
            i !== vcinIndex + 16 &&
            i !== vcinIndex + 17
        ) {
            const tempLufuSplitString = lufuDataPoints[i].split('\t')
            const lufuKey = tempLufuSplitString.at(0)
            if (!lufuKey || !lufuDataKeys.includes(lufuKey as keyof LufuData))
                throw new Error('No Lufu Measurement key found')
            const tempVor = tempLufuSplitString.at(-2)
            const tempSoll_Perc = tempLufuSplitString.at(-1)
            if (!tempVor && !tempSoll_Perc) break
            const tempLufuValue: LufuValue = { vor: tempVor || '', soll_perc: tempSoll_Perc || '' }
            tempDataObject[lufuKey] = tempLufuValue
        }
    }
    return tempDataObject as unknown as LufuData
}

export function readNextLufuFile(index: number): lufuExamDataRawResult {
    const dirfiles = fs.readdirSync('./lufu').filter((val) => val.endsWith('Ite'))
    const lufuFile = dirfiles[index]
    if (!lufuFile) throw new Error('no files found!!!')
    const resolvedPath = path.resolve('./lufu/', lufuFile)
    const data = fs.readFileSync(resolvedPath, 'utf-8')
    return { data: data.split('\r'), lufuPath: resolvedPath }
}

export function extractLufuData(lufuDataStringArray: string[]): LufuExaminationData {
    const examId: mbwPseudo = getId(lufuDataStringArray)
    const examDate: Date = getDate(lufuDataStringArray)
    const examMeasurements: LufuData = getLufuData(lufuDataStringArray)
    return { id: examId, date: examDate, ...examMeasurements }
}

export function getNextLufuData(index: number): lufuExamDataResult {
    const { data, lufuPath } = readNextLufuFile(index)
    const returnData = extractLufuData(data)
    return { data: returnData, lufuPath }
}

export function handleIncludedLufu(file: filePath): void {
    fs.rename(file, `${file}processed`, (err) => {
        if (err) throw err
        console.log('Rename complete!')
    })
}
