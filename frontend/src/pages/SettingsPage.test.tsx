import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import SettingsPage from './SettingsPage'

vi.mock('../services/userService', () => ({
  userService: {
    getMe: vi.fn().mockResolvedValue({
      id: 'u1',
      username: 'tester',
      displayName: 'Tester',
      bio: 'hola',
      avatarUrl: null,
      activeCosmetics: undefined,
      stats: {},
    }),
    updateMe: vi.fn(),
    changePassword: vi.fn(),
    uploadAvatar: vi.fn(),
  },
}))

vi.mock('../store/authStore', () => {
  const user = {
    id: 'u1',
    username: 'tester',
    displayName: 'Tester',
    bio: 'hola',
    avatarUrl: null,
    stats: { level: 1, xp: 0 },
  }
  return {
    useAuthStore: (selector: (s: any) => any) =>
      selector({ user, setUser: vi.fn() }),
  }
})

function renderPage() {
  return render(
    <MemoryRouter>
      <SettingsPage />
    </MemoryRouter>,
  )
}

const renderSettings = renderPage

describe('SettingsPage', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.setAttribute('data-theme', 'dark')
  })

  it('renders the four tabs', () => {
    renderPage()
    for (const label of ['Perfil', 'Seguridad', 'Apariencia', 'Notificaciones']) {
      expect(screen.getByRole('tab', { name: label })).toBeInTheDocument()
    }
  })

  it('shows the password form on the Seguridad tab', () => {
    renderPage()
    fireEvent.click(screen.getByRole('tab', { name: 'Seguridad' }))
    expect(screen.getByLabelText('Contraseña actual')).toBeInTheDocument()
    expect(screen.getByLabelText('Nueva contraseña')).toBeInTheDocument()
    expect(screen.getByLabelText('Confirmar nueva contraseña')).toBeInTheDocument()
  })

  it('disables submit when passwords do not match', () => {
    renderPage()
    fireEvent.click(screen.getByRole('tab', { name: 'Seguridad' }))
    fireEvent.change(screen.getByLabelText('Contraseña actual'), {
      target: { value: 'oldpassword' },
    })
    fireEvent.change(screen.getByLabelText('Nueva contraseña'), {
      target: { value: 'newpassword' },
    })
    fireEvent.change(screen.getByLabelText('Confirmar nueva contraseña'), {
      target: { value: 'different' },
    })
    expect(screen.getByText('Las contraseñas no coinciden')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Cambiar contraseña' }),
    ).toBeDisabled()
  })

  it('keeps profile text on semantic theme colors', async () => {
    renderSettings()
    await userEvent.click(screen.getByRole('tab', { name: 'Apariencia' }))
    await userEvent.click(screen.getByRole('switch', { name: 'Cambiar tema' }))
    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
    expect(screen.getByText('Tema claro')).toHaveClass('text-primary')
  })

  it('toggles the theme and persists it', () => {
    renderPage()
    fireEvent.click(screen.getByRole('tab', { name: 'Apariencia' }))
    const toggle = screen.getByRole('switch', { name: 'Cambiar tema' })
    fireEvent.click(toggle)
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    expect(localStorage.getItem('studyquest-theme')).toBe('light')
    fireEvent.click(toggle)
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })
})
