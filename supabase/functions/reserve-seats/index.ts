import { createClient } from 'jsr:@supabase/supabase-js@2'

const allowedHostnames = new Set(
    (Deno.env.get('TURNSTILE_ALLOWED_HOSTNAMES') ?? '')
        .split(',')
        .map((hostname) => hostname.trim().toLowerCase())
        .filter(Boolean),
)

function requestHostname(request: Request): string | null {
    const origin = request.headers.get('origin')
    if (!origin) return null

    try {
        return new URL(origin).hostname.toLowerCase()
    } catch {
        return null
    }
}

function supabaseSecretKey(): string | null {
    const secretKeysJson = Deno.env.get('SUPABASE_SECRET_KEYS')
    if (secretKeysJson) {
        try {
            const secretKeys: unknown = JSON.parse(secretKeysJson)
            if (secretKeys && typeof secretKeys === 'object' && !Array.isArray(secretKeys)) {
                const defaultKey = (secretKeys as Record<string, unknown>).default
                if (typeof defaultKey === 'string' && defaultKey.length > 0) return defaultKey
            }
        } catch { }
    }

    return Deno.env.get('SUPABASE_SECRET_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || null
}

function jsonResponse(request: Request, body: unknown, status: number): Response {
    const hostname = requestHostname(request)
    const headers = new Headers({
        'Content-Type': 'application/json',
        'Vary': 'Origin',
    })

    if (hostname && allowedHostnames.has(hostname)) {
        headers.set('Access-Control-Allow-Origin', request.headers.get('origin')!)
        headers.set('Access-Control-Allow-Headers', 'authorization, apikey, content-type, x-client-info')
        headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
    }

    return new Response(status === 204 ? null : JSON.stringify(body), { status, headers })
}

Deno.serve(async (request) => {
    if (request.method === 'OPTIONS') {
        return jsonResponse(request, {}, 204)
    }
    if (request.method !== 'POST') {
        return jsonResponse(request, { error: 'method_not_allowed' }, 405)
    }

    const hostname = requestHostname(request)
    if (!hostname || !allowedHostnames.has(hostname)) {
        return jsonResponse(request, { error: 'origin_not_allowed' }, 403)
    }

    let payload: Record<string, unknown>
    try {
        const parsed: unknown = await request.json()
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return jsonResponse(request, { error: 'invalid_request' }, 400)
        }
        payload = parsed as Record<string, unknown>
    } catch {
        return jsonResponse(request, { error: 'invalid_request' }, 400)
    }

    const token = payload.turnstileToken
    const secret = Deno.env.get('TURNSTILE_SECRET')
    if (typeof token !== 'string' || token.length === 0 || token.length > 2048 || !secret) {
        return jsonResponse(request, { error: 'security_verification_failed' }, 403)
    }

    let verification: {
        success?: boolean
        action?: string
        hostname?: string
        'error-codes'?: string[]
    }
    let siteverifyResponseOk = false
    try {
        const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            signal: AbortSignal.timeout(10_000),
            body: new URLSearchParams({ secret, response: token }),
        })
        siteverifyResponseOk = response.ok
        verification = await response.json()
    } catch {
        return jsonResponse(request, { error: 'security_verification_unavailable' }, 503)
    }

    if (verification['error-codes']?.some((code) => ['invalid-input-secret', 'missing-input-secret'].includes(code))) {
        return jsonResponse(request, { error: 'security_verification_misconfigured' }, 503)
    }
    if (!siteverifyResponseOk) {
        return jsonResponse(request, { error: 'security_verification_unavailable' }, 503)
    }

    if (
        verification.success !== true ||
        verification.action !== 'signup' ||
        verification.hostname?.toLowerCase() !== hostname
    ) {
        return jsonResponse(request, { error: 'security_verification_failed' }, 403)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey = supabaseSecretKey()
    if (!supabaseUrl || !serviceKey) {
        return jsonResponse(request, { error: 'reservation_service_unavailable' }, 503)
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    })
    const { error } = await supabase.rpc('reserve_seats', {
        p_member_id: payload.memberId,
        p_member_ticket_number: payload.memberTicketNumber,
        p_table_number: payload.tableNumber,
        p_dietary_requirements: payload.dietaryRequirements,
        p_dietary_notes: payload.dietaryNotes,
        p_guest_name: payload.guestName,
        p_guest_ticket_number: payload.guestTicketNumber,
        p_guest_dietary_requirements: payload.guestDietaryRequirements,
        p_guest_dietary_notes: payload.guestDietaryNotes,
    })

    if (error) {
        const status = ['member_already_registered', 'ticket_already_registered', 'table_full'].includes(error.message)
            ? 409
            : error.message === 'member_not_found' || error.message === 'table_not_found' || error.message === 'invalid_reservation'
                ? 400
                : 500
        return jsonResponse(request, { error: error.message }, status)
    }

    return jsonResponse(request, { success: true }, 200)
})