'use client'

interface UserAvatarProps {
  name?: string
  size?: 'sm' | 'md'
  avatarUrl?: string | null
}

function getInitials(name?: string): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function UserAvatar({ name, size = 'md', avatarUrl }: UserAvatarProps) {
  const sizeClass = size === 'sm' ? 'w-6 h-6 text-xs' : 'w-8 h-8 text-sm'
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={name ?? 'Avatar'}
        title={name}
        className={`${sizeClass} rounded-full object-cover shrink-0`}
      />
    )
  }
  return (
    <div
      title={name}
      className={`${sizeClass} rounded-full bg-blue-500 flex items-center justify-center text-white font-bold shrink-0`}
    >
      {getInitials(name)}
    </div>
  )
}
