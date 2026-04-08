import { useTranslations } from 'next-intl'
import { LoginForm } from '@/components/login-form'
import { LanguageSwitcher } from '@/components/language-switcher'

export default function LoginPage() {
  const t = useTranslations('login')

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        backgroundColor: '#0f0f1a',
      }}
    >
      <div style={{ width: '100%', maxWidth: '420px' }}>
        {/* Language switcher */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
          <LanguageSwitcher />
        </div>

        {/* Logo / Brand */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              backgroundColor: '#6c63ff',
              marginBottom: '16px',
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <h1
            style={{
              fontSize: '24px',
              fontWeight: 700,
              color: '#e8e8f0',
              margin: '0 0 8px',
            }}
          >
            WB Kommo
          </h1>
          <p style={{ fontSize: '14px', color: '#8888aa', margin: 0 }}>
            {t('subtitle')}
          </p>
        </div>

        {/* Card */}
        <div
          style={{
            backgroundColor: '#16213e',
            borderRadius: '16px',
            border: '1px solid #2a2a45',
            padding: '36px 32px',
          }}
        >
          <LoginForm />
        </div>
      </div>
    </main>
  )
}
