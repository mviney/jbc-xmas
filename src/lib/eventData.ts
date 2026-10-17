import { supabase } from './supabase'

export type MemberLookupEntry = {
    id: string
    name: string
    abf_number: string
}

export type PublicAttendee = {
    id: string
    name: string
    table_number: number
    is_guest: boolean
    registered_by_attendee_id: string | null
}

export type ReservationInput = {
    memberId: string
    memberTicketNumber: string
    tableNumber: number
    dietaryRequirements: string[]
    dietaryNotes: string
    guestName: string | null
    guestTicketNumber: string | null
    guestDietaryRequirements: string[]
    guestDietaryNotes: string
}

export async function searchMembers(query: string): Promise<MemberLookupEntry[]> {
    const { data, error } = await supabase.rpc('search_members', { search_query: query })
    if (error) throw error
    return (data ?? []) as MemberLookupEntry[]
}

export async function getPublicAttendees(): Promise<PublicAttendee[]> {
    const { data, error } = await supabase.rpc('get_public_attendees')
    if (error) throw error
    return (data ?? []) as PublicAttendee[]
}

export async function reserveSeats(input: { reservation: ReservationInput; turnstileToken: string }): Promise<void> {
    const { error } = await supabase.functions.invoke('reserve-seats', {
        body: { ...input.reservation, turnstileToken: input.turnstileToken },
    })
    if (error) {
        if ('context' in error && error.context instanceof Response) {
            const result = await error.context.clone().json().catch(() => null) as { error?: string } | null
            if (result?.error) throw new Error(result.error)
        }
        throw error
    }
}