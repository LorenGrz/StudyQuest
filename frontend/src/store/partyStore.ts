import { create } from 'zustand'
import type { Party } from '../services/partyService'

interface PartyState {
  activeParty: Party | null
  setActiveParty: (party: Party | null) => void
}

export const usePartyStore = create<PartyState>()((set) => ({
  activeParty: null,
  setActiveParty: (party) => set({ activeParty: party }),
}))
