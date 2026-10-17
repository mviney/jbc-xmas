import { useEffect, useRef } from 'react'

type TurnstileRenderOptions = {
    sitekey: string
    action: string
    callback: (token: string) => void
    'expired-callback': () => void
    'error-callback': () => void
}

type TurnstileApi = {
    render: (container: HTMLElement, options: TurnstileRenderOptions) => string
    remove: (widgetId: string) => void
}

declare global {
    interface Window {
        turnstile?: TurnstileApi
    }
}

type TurnstileWidgetProps = {
    siteKey: string
    resetNonce: number
    onToken: (token: string) => void
    onError: () => void
}

export function TurnstileWidget({ siteKey, resetNonce, onToken, onError }: TurnstileWidgetProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const onTokenRef = useRef(onToken)
    const onErrorRef = useRef(onError)

    useEffect(() => {
        onTokenRef.current = onToken
        onErrorRef.current = onError
    }, [onError, onToken])

    useEffect(() => {
        let disposed = false
        let widgetId: string | undefined
        let script = document.querySelector<HTMLScriptElement>('#cloudflare-turnstile-script')

        const renderWidget = () => {
            if (disposed || !containerRef.current || !window.turnstile) return

            widgetId = window.turnstile.render(containerRef.current, {
                sitekey: siteKey,
                action: 'signup',
                callback: (token) => onTokenRef.current(token),
                'expired-callback': () => onTokenRef.current(''),
                'error-callback': () => {
                    onTokenRef.current('')
                    onErrorRef.current()
                },
            })
        }

        const handleScriptError = () => onErrorRef.current()

        if (window.turnstile) {
            renderWidget()
        } else {
            if (!script) {
                script = document.createElement('script')
                script.id = 'cloudflare-turnstile-script'
                script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
                script.async = true
                script.defer = true
                document.head.append(script)
            }
            script.addEventListener('load', renderWidget)
            script.addEventListener('error', handleScriptError)
        }

        return () => {
            disposed = true
            script?.removeEventListener('load', renderWidget)
            script?.removeEventListener('error', handleScriptError)
            if (widgetId && window.turnstile) window.turnstile.remove(widgetId)
        }
    }, [resetNonce, siteKey])

    return <div className="turnstile-widget" ref={containerRef} aria-label="Security verification" />
}