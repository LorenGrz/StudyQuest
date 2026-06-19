import type { Party } from '../../services/partyService'

interface PartyRoomHeaderProps {
  party: Party | null
}

export function PartyRoomHeader({ party }: PartyRoomHeaderProps) {
  if (!party) return null
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <h1 className="text-lg font-bold text-primary truncate">
          {party.name ?? party.subject?.name ?? 'Party'}
        </h1>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${
            party.status === 'active'
              ? 'bg-success/10 border-success/30 text-success'
              : party.status === 'waiting' || party.status === 'forming'
                ? 'bg-warning/10 border-warning/30 text-warning'
                : 'bg-surface border-edge text-secondary'
          }`}>
            {party.status === 'active' ? 'Activa' : party.status === 'waiting' ? 'Esperando' : party.status === 'forming' ? 'Armando' : 'Finalizada'}
          </span>
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-surface border border-edge text-secondary">
            {party.isPrivate ? '🔒 Privada' : '🌎 Pública'}
          </span>
        </div>
      </div>
      <span className="shrink-0 text-sm font-semibold text-secondary">
        👥 {party.members?.length ?? 0}
      </span>
    </div>
  )
}
