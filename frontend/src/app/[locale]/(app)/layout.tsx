'use client'

import { useEffect, useState } from 'react'
import { useRouter } from '@/i18n/navigation'
import { getUser, clearSession, isImpersonating, StoredUser } from '@/lib/auth'
import { ImpersonationBanner } from '@/components/impersonation-banner'
import { AppSidebar } from '@/components/app-sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<StoredUser | null>(null)

  useEffect(() => {
    const stored = getUser()
    if (!stored) {
      router.replace('/login')
      return
    }
    setUser(stored)
  }, [router])

  if (!user) return null

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0f0f1a' }}>
      {/* Sidebar */}
      <AppSidebar
        user={user}
        onLogout={() => {
          clearSession()
          router.replace('/login')
        }}
      />

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {isImpersonating() && <ImpersonationBanner />}
        <main style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
