import React from 'react'

const API_ORIGIN = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null
  // Already absolute (http/https/blob/data) — leave as-is
  if (/^(https?:|blob:|data:)/.test(url)) return url
  // Relative path from the backend (e.g. /uploads/...) — prepend origin
  return `${API_ORIGIN}${url}`
}

export interface AvatarWithBorderProps {
  displayName: string
  avatarUrl?: string | null
  borderImageUrl?: string | null
  size?: 'sm' | 'md' | 'lg'
  glowColor?: string
  className?: string
  style?: React.CSSProperties
}

export function AvatarWithBorder({
  displayName,
  avatarUrl,
  borderImageUrl,
  size = 'md',
  glowColor,
  className = '',
  style,
}: AvatarWithBorderProps) {
  const resolvedAvatar = resolveMediaUrl(avatarUrl)
  const resolvedBorder = resolveMediaUrl(borderImageUrl)

  const getAvatarClass = () => {
    switch (size) {
      case 'sm':
        return 'avatar-placeholder-sm'
      case 'lg':
        return 'avatar-placeholder-lg'
      case 'md':
      default:
        return 'avatar-placeholder'
    }
  }

  return (
    <div
      className={`avatar-border-wrap avatar-border-wrap-${size} ${className}`}
      style={style}
    >
      {/* ─── Avatar image or initial fallback ─── */}
      {resolvedAvatar ? (
        <img
          src={resolvedAvatar}
          alt={displayName}
          className={`avatar-img avatar-img-${size}`}
          style={glowColor ? { boxShadow: `0 0 16px ${glowColor}` } : {}}
          onError={(e) => {
            // If image fails to load, hide it and let the fallback show
            ;(e.currentTarget as HTMLImageElement).style.display = 'none'
          }}
        />
      ) : (
        <div
          className={getAvatarClass()}
          style={glowColor ? { boxShadow: `0 0 16px ${glowColor}` } : {}}
        >
          {displayName.charAt(0).toUpperCase()}
        </div>
      )}

      {/* ─── Border overlay ─── */}
      {resolvedBorder && (
        <img
          src={resolvedBorder}
          alt=""
          className="avatar-border-overlay"
          aria-hidden="true"
        />
      )}
    </div>
  )
}
