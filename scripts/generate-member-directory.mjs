import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sourcePath = resolve(projectRoot, 'members-2026-10-03.json')
const outputPath = resolve(projectRoot, 'src/generated/memberDirectory.ts')

const records = JSON.parse(await readFile(sourcePath, 'utf8'))
if (!Array.isArray(records)) {
    throw new TypeError('Member source must contain an array of records.')
}

const members = records
    .filter((record) => !record.leftClubDate)
    .map((record) => ({
        id: String(record.id || record.abfNumber || record.nationalNumber || record.name),
        name: String(record.name ?? [record.firstName, record.lastName].filter(Boolean).join(' ') ?? '').trim(),
        abfNumber: String(record.abfNumber ?? record.nationalNumber ?? '').trim(),
    }))
    .filter((member) => member.name)
    .sort((left, right) => left.name.localeCompare(right.name))

await mkdir(dirname(outputPath), { recursive: true })
await writeFile(
    outputPath,
    `export type MemberLookupEntry = { id: string; name: string; abfNumber: string }\n\nexport const memberDirectory: MemberLookupEntry[] = ${JSON.stringify(members, null, 2)}\n`,
)

console.log(`Generated ${members.length} active member lookup records.`)