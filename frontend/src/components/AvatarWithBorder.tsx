import React from 'react'

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

  const getWrapperClass = () => {
    return `avatar-border-wrap avatar-border-wrap-${size} ${className}`
  }

  return (
    <div className={getWrapperClass()} style={style}>
      {/* ─── Avatar Base ─── */}
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={displayName}
          className={`avatar-img avatar-img-${size}`}
          style={glowColor ? { boxShadow: `0 0 16px ${glowColor}` } : {}}
        />
      ) : (
        <div
          className={getAvatarClass()}
          style={glowColor ? { boxShadow: `0 0 16px ${glowColor}` } : {}}
        >
          {displayName.charAt(0).toUpperCase()}
        </div>
      )}

      {/* ─── Border Overlay ─── */}
      {borderImageUrl && (
        <img
          src={`http://localhost:3000${borderImageUrl}`}
          alt=""
          className="avatar-border-overlay"
        />
      )}
    </div>
  )
}
