import { Spinner } from '../../components/UI'

interface ProfileMedalsProps {
  achievements: any[]
  loading: boolean
}

export function ProfileMedals({ achievements, loading }: ProfileMedalsProps) {
  return (
    <section>
      <h3 className="text-base font-bold text-secondary uppercase tracking-[1px] pb-2">
        Medallas
      </h3>
      {loading ? (
        <div className="flex justify-center items-center min-h-[120px]">
          <Spinner size="sm" />
        </div>
      ) : achievements.length === 0 ? (
        <div className="text-center py-8 px-5">
          <p className="text-sm font-semibold text-primary">
            No hay logros disponibles aún
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(90px,1fr))] gap-2.5">
          {achievements.map((a) => (
            <div
              key={a.id}
              className={`flex flex-col items-center gap-1.5 px-2 py-3.5 rounded-lg border border-[var(--overlay-border)] bg-surface text-center transition-all duration-[250ms] ease cursor-default ${a.unlocked ? "border-[rgba(124,58,237,0.4)] bg-[rgba(124,58,237,0.06)] shadow-[0_0_12px_rgba(124,58,237,0.15)] hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(124,58,237,0.25)]" : "opacity-60 grayscale-[0.8]"}`}
              title={
                a.unlocked
                  ? `${a.name} — ${a.description}`
                  : `🔒 ${a.name} — ${a.description}`
              }
            >
              <span className="text-[28px] leading-none">{a.icon}</span>
              <span className="text-[11px] font-semibold text-secondary leading-[1.3] overflow-hidden text-ellipsis line-clamp-2">{a.name}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
