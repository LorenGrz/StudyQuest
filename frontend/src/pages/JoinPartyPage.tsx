import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MobileLayout } from '../components/Layouts'
import { Spinner } from '../components/UI'
import { partyService } from '../services/partyService'
import { usePartyStore } from '../store/partyStore'

const JoinPartyPage = () => {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { setActiveParty } = usePartyStore()
  const [status, setStatus] = useState<'joining' | 'error'>('joining')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!token) {
      navigate('/dashboard')
      return
    }
    partyService.joinByInvite(token)
      .then((party) => {
        setActiveParty(party)
        navigate(`/party/${party.id}`, { replace: true })
      })
      .catch((err) => {
        const msg = err?.response?.data?.message ?? 'El enlace es inválido o ya expiró'
        setErrorMsg(msg)
        setStatus('error')
      })
  }, [token, navigate, setActiveParty])

  return (
    <MobileLayout>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        gap: '20px',
        textAlign: 'center',
        padding: '32px',
      }}>
        {status === 'joining' ? (
          <>
            <Spinner size="lg" />
            <p style={{ fontSize: '18px', fontWeight: 700 }}>Uniéndote a la party...</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Validando tu invitación</p>
          </>
        ) : (
          <>
            <span style={{ fontSize: '48px' }}>😕</span>
            <p style={{ fontSize: '18px', fontWeight: 700 }}>No pudimos unirte</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{errorMsg}</p>
            <button
              style={{
                marginTop: '8px',
                background: 'var(--accent)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                padding: '10px 24px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              onClick={() => navigate('/dashboard')}
            >
              Ir al Dashboard
            </button>
          </>
        )}
      </div>
    </MobileLayout>
  )
}

export default JoinPartyPage
