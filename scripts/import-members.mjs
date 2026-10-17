import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const projectUrl = process.env.VITE_SUPABASE_URL
const adminKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY

if (!projectUrl || !adminKey) {
    throw new Error('Set VITE_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local before importing members.')
}

const records = JSON.parse(await readFile(resolve('members-2026-10-03.json'), 'utf8'))
if (!Array.isArray(records)) {
    throw new TypeError('Member source must contain an array of records.')
}

const members = records
    .map((record) => ({
        id: String(record.id || record.abfNumber || record.nationalNumber || record.name),
        name: String(record.name ?? [record.firstName, record.lastName].filter(Boolean).join(' ') ?? '').trim(),
        abf_number: String(record.abfNumber ?? record.nationalNumber ?? '').trim(),
        active: !record.leftClubDate,
    }))
    .filter((member) => member.name)

const supabase = createClient(projectUrl, adminKey, {
    auth: { persistSession: false, autoRefreshToken: false },
})

for (let offset = 0; offset < members.length; offset += 500) {
    const batch = members.slice(offset, offset + 500)
    const { error } = await supabase.from('members').upsert(batch, { onConflict: 'id' })
    if (error) throw error
}

console.log(`Imported ${members.length} member records.`)