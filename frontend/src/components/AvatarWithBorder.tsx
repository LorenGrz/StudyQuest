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
        // avatar-placeholder-sm
        return 'w-9 h-9 rounded-full bg-gradient-to-br from-accent to-blue-600 flex items-center justify-center font-bold text-sm text-white'
      case 'lg':
        // avatar-placeholder (lg uses same base but larger — we treat lg as the big variant)
        return 'w-16 h-16 rounded-full bg-gradient-to-br from-accent to-blue-600 flex items-center justify-center font-extrabold text-lg text-white'
      case 'md':
      default:
        // avatar-placeholder
        return 'w-11 h-11 rounded-full bg-gradient-to-br from-accent to-blue-600 flex items-center justify-center font-extrabold text-lg text-white'
    }
  }

  const wrapSizeClass =
    size === 'sm'
      ? 'w-[52px] h-[52px]' // avatar-border-wrap-sm
      : size === 'lg'
        ? 'w-[92px] h-[92px]' // avatar-border-wrap-lg
        : 'w-16 h-16' // avatar-border-wrap-md

  const imgSizeClass =
    size === 'sm'
      ? 'w-9 h-9' // avatar-img-sm
      : size === 'lg'
        ? 'w-16 h-16' // avatar-img-lg
        : 'w-11 h-11' // avatar-img-md

  return (
    <div
      // avatar-border-wrap + avatar-border-wrap-{size}
      className={`relative inline-flex items-center justify-center ${wrapSizeClass} ${className}`}
      style={style}
    >
      {/* ─── Avatar image or initial fallback ─── */}
      {resolvedAvatar ? (
        <img
          src={resolvedAvatar}
          alt={displayName}
          // avatar-img + avatar-img-{size}
          className={`rounded-full object-cover shrink-0 ${imgSizeClass}`}
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
          // avatar-border-overlay
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
          aria-hidden="true"
        />
      )}
    </div>
  )
}
