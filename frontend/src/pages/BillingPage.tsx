import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Check, Sparkles, ArrowLeft, CreditCard } from 'lucide-react'
import toast from 'react-hot-toast'
import { MobileLayout } from '../components/Layouts'
import { Button, Badge, Input, Spinner, Reveal } from '../components/UI'
import { useBilling } from '../hooks/useBilling'
import { usePollUntil, type PollCheck } from '../hooks/usePollUntil'
import { billingService, type PlanSource } from '../services/billingService'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MP_PAYMENT_ID_RE = /^\d{1,24}$/

/** Checkout Pro hosts for Argentina (production and sandbox). Nothing else. */
const MP_CHECKOUT_HOSTS = new Set(['www.mercadopago.com.ar', 'sandbox.mercadopago.com.ar'])

/** Only ever redirect to Mercado Pago's own checkout over https. */
function isMercadoPagoUrl(raw: string): boolean {
  try {
    const u = new URL(raw)
    return u.protocol === 'https:' && MP_CHECKOUT_HOSTS.has(u.hostname)
  } catch {
    return false
  }
}

const SOURCE_LABEL: Record<PlanSource, string> = {
  default: 'Asignado',
  admin: 'Asignado',
  promo: 'Por código',
  mercadopago: 'Mercado Pago',
}

const formatArs = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 0 })

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function BillingPage() {
  const {
    state,
    plans,
    quote,
    loading,
    error,
    recargar,
    redeem,
    refreshState,
    messageFromError,
  } = useBilling()
  const [code, setCode] = useState('')
  const [redeeming, setRedeeming] = useState(false)
  const [paying, setPaying] = useState(false)

  // Back from Mercado Pago: /plan?pago=ok|pendiente|error&external_reference=<paymentId>&…
  const [searchParams, setSearchParams] = useSearchParams()
  const pago = searchParams.get('pago')
  const rawRef = searchParams.get('external_reference')
  const paymentRef = rawRef && UUID_RE.test(rawRef) ? rawRef : null
  // MP also appends its own payment id; the backend verifies it before use.
  const rawHint = searchParams.get('payment_id') ?? searchParams.get('collection_id')
  const paymentHint = rawHint && MP_PAYMENT_ID_RE.test(rawHint) ? rawHint : undefined
  const returning = pago === 'ok' || pago === 'pendiente'

  const clearReturnParams = useCallback(
    () => setSearchParams({}, { replace: true }),
    [setSearchParams],
  )

  // Plan snapshot taken on the first check when there's no payment id.
  const planBaseline = useRef<string | null>(null)

  // Wait for Pro to be granted. With our payment id we watch that exact
  // payment (the backend also reconciles with MP on each read); a payment held
  // for review stops the wait. Without it, only a *change* of plan counts —
  // already being Pro proves nothing about this payment.
  const paymentApplied = useCallback(async (): Promise<PollCheck> => {
    if (paymentRef) {
      const p = await billingService.getPayment(paymentRef, paymentHint)
      if (p.appliedAt !== null) return 'done'
      return p.needsSupport ? 'stop' : 'wait'
    }
    const s = await billingService.getState()
    const snapshot = `${s.effectivePlan}|${s.planExpiresAt ?? ''}`
    if (planBaseline.current === null) {
      planBaseline.current = snapshot
      return 'wait'
    }
    return s.effectivePlan === 'pro' && snapshot !== planBaseline.current ? 'done' : 'wait'
  }, [paymentRef, paymentHint])

  const pollStatus = usePollUntil(paymentApplied, {
    enabled: returning,
    runKey: `${pago}:${paymentRef}`,
    onDone: () => {
      toast.success('¡Pago acreditado! Ya tenés Pro.', { id: 'mp-return' })
      void refreshState()
      clearReturnParams()
    },
  })

  useEffect(() => {
    if (pago !== 'error') return
    toast.error('El pago no se completó. No se te cobró nada.', { id: 'mp-return' })
    clearReturnParams()
  }, [pago, clearReturnParams])

  // Admin-granted Pro without expiry: paying would add nothing (backend 409s).
  const permanentPro = state?.effectivePlan === 'pro' && !state.planExpiresAt

  const onCheckout = async () => {
    setPaying(true)
    try {
      const { initPoint } = await billingService.createCheckout()
      if (!isMercadoPagoUrl(initPoint)) throw new Error('URL de pago inválida')
      // Keep the spinner on while the browser navigates away.
      window.location.assign(initPoint)
    } catch (err) {
      toast.error(messageFromError(err, 'No se pudo iniciar el pago.'))
      setPaying(false)
    }
  }

  const onRedeem = async (e: FormEvent) => {
    e.preventDefault()
    if (!code.trim()) return
    setRedeeming(true)
    try {
      const next = await redeem(code)
      toast.success(
        next.effectivePlan === 'pro'
          ? '¡Listo! Ya tenés Pro.'
          : 'Código canjeado.',
      )
      setCode('')
    } catch (err) {
      toast.error(messageFromError(err, 'No se pudo canjear el código.'))
    } finally {
      setRedeeming(false)
    }
  }

  return (
    <MobileLayout>
      <div className="flex flex-col flex-1 px-4 pb-10">
        <Link
          to="/settings"
          className="inline-flex items-center gap-1 text-sm text-secondary hover:text-primary mt-4 w-fit"
        >
          <ArrowLeft size={16} aria-hidden="true" /> Ajustes
        </Link>
        <h1 className="text-xl font-bold text-primary mt-2 mb-4">Plan y límites</h1>

        {loading && (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        )}

        {!loading && error && (
          <div className="bg-surface border border-danger/30 rounded-2xl p-4 text-sm text-danger">
            {error}
            <button
              onClick={() => void recargar()}
              className="ml-2 underline hover:no-underline"
            >
              Reintentar
            </button>
          </div>
        )}

        {!loading && !error && state && (
          <div className="flex flex-col gap-4">
            {returning && pollStatus !== 'idle' && (
              <div
                role="status"
                className="bg-surface border border-accent/40 rounded-2xl p-4 text-sm text-secondary flex items-center gap-2"
              >
                {pollStatus === 'polling' && <Spinner size="sm" />}
                {pollStatus === 'stopped'
                  ? `Recibimos tu pago pero necesita una revisión manual. Escribinos indicando el código ${paymentRef ?? ''} y lo resolvemos.`
                  : pollStatus === 'timeout'
                  ? 'Tu pago se está acreditando, puede tardar unos minutos.'
                  : pago === 'pendiente'
                    ? 'Tu pago quedó pendiente. Te activamos Pro apenas se acredite.'
                    : 'Confirmando tu pago con Mercado Pago…'}
              </div>
            )}

            {/* Current plan + usage */}
            <Reveal>
              <section className="bg-surface border border-edge rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-secondary">Tu plan</span>
                  <Badge variant={state.effectivePlan === 'pro' ? 'primary' : 'neutral'}>
                    {state.effectivePlan === 'pro' ? 'Pro' : 'Free'}
                  </Badge>
                </div>

                {state.effectivePlan === 'pro' && (
                  <p className="text-xs text-muted mt-1">
                    {SOURCE_LABEL[state.planSource ?? 'default'] ?? 'Asignado'} · vence el{' '}
                    {formatDate(state.planExpiresAt)}
                  </p>
                )}

                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-secondary">Quests con IA hoy</span>
                    <span className="font-semibold text-primary">
                      {state.usage.questsToday} / {state.usage.questsPerDay}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 rounded-full bg-elevated overflow-hidden">
                    <div
                      className="h-full rounded-full bg-accent transition-[width] duration-500"
                      style={{
                        width: `${Math.min(
                          100,
                          state.usage.questsPerDay
                            ? (state.usage.questsToday / state.usage.questsPerDay) * 100
                            : 0,
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <ul className="mt-4 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-secondary">
                  <li>Archivos hasta {state.limits.maxUploadMb} MB</li>
                  <li>Instrucciones {state.limits.maxInstructionsChars} car.</li>
                  <li>
                    Modelo IA {state.limits.aiModelTier === 'full' ? 'avanzado' : 'estándar'}
                  </li>
                  <li>Parties hasta {state.limits.partySizeMax}</li>
                </ul>
              </section>
            </Reveal>

            {/* Redeem a code */}
            <Reveal delay={0.05}>
              <section className="bg-surface border border-edge rounded-2xl p-4">
                <h2 className="text-sm font-semibold text-primary flex items-center gap-1.5">
                  <Sparkles size={15} className="text-accent-light" aria-hidden="true" />
                  Canjear código
                </h2>
                <form onSubmit={onRedeem} className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <Input
                    id="promo-code"
                    aria-label="Código promocional"
                    placeholder="Ingresá tu código"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="flex-1"
                  />
                  <Button type="submit" isLoading={redeeming} disabled={!code.trim()}>
                    Canjear
                  </Button>
                </form>
              </section>
            </Reveal>

            {/* Plan comparison */}
            <Reveal delay={0.1}>
              <section className="grid gap-3 sm:grid-cols-2">
                {plans.map((p) => {
                  const current = p.id === state.effectivePlan
                  return (
                    <div
                      key={p.id}
                      className={`rounded-2xl border p-4 ${
                        current
                          ? 'border-accent bg-accent-bg'
                          : 'border-edge bg-surface'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-primary">{p.name}</span>
                        {current && <Badge variant="primary">Actual</Badge>}
                      </div>
                      <p className="text-xs text-secondary mt-1">{p.blurb}</p>
                      <ul className="mt-3 flex flex-col gap-1.5">
                        {p.perks.map((perk) => (
                          <li
                            key={perk}
                            className="flex items-start gap-2 text-xs text-secondary"
                          >
                            <Check
                              size={14}
                              className="mt-0.5 shrink-0 text-success"
                              aria-hidden="true"
                            />
                            {perk}
                          </li>
                        ))}
                      </ul>
                      {p.id === 'pro' && quote?.available && !permanentPro && (
                        <Button
                          type="button"
                          className="mt-4 w-full"
                          isLoading={paying}
                          startIcon={<CreditCard size={16} aria-hidden="true" />}
                          onClick={() => void onCheckout()}
                        >
                          {state.effectivePlan === 'pro'
                            ? 'Extender 30 días'
                            : 'Pagar con Mercado Pago'}{' '}
                          · ${formatArs(quote.amountArs)} ARS (USD {quote.usd})
                        </Button>
                      )}
                    </div>
                  )
                })}
              </section>
            </Reveal>

            <p className="text-xs text-muted text-center">
              {quote?.available
                ? `Pro se activa con un código promocional o pagando con Mercado Pago: ${quote.days} días por USD ${quote.usd}, cobrados en pesos al dólar oficial.`
                : 'Pro se activa con un código promocional.'}
            </p>
          </div>
        )}
      </div>
    </MobileLayout>
  )
}
