import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Check, Sparkles, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { MobileLayout } from '../components/Layouts'
import { Button, Badge, Input, Spinner, Reveal } from '../components/UI'
import { useBilling } from '../hooks/useBilling'

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function BillingPage() {
  const { state, plans, loading, error, recargar, redeem, messageFromError } =
    useBilling()
  const [code, setCode] = useState('')
  const [redeeming, setRedeeming] = useState(false)

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
                    {state.planSource === 'promo' ? 'Por código' : 'Asignado'} · vence el{' '}
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
                    placeholder="STUDYQUEST-PRO-30"
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
                    </div>
                  )
                })}
              </section>
            </Reveal>

            <p className="text-xs text-muted text-center">
              Pro se activa con un código. Todavía no hay pago online.
            </p>
          </div>
        )}
      </div>
    </MobileLayout>
  )
}
