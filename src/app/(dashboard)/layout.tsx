import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/shared/Sidebar'
import { getPendingAlertsCount } from '@/lib/actions/alerts'
import type { Profile } from '@/types/database'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, role, created_at')
    .eq('id', user.id)
    .single<Profile>()

  const role = profile?.role ?? 'reader'
  const email = profile?.email ?? user.email ?? ''

  const { count: alertCount } = await getPendingAlertsCount()

  return (
    <div className="flex h-full">
      <Sidebar role={role} userEmail={email} alertCount={alertCount} />
      <main className="flex-1 ml-60 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-6 py-8">{children}</div>
      </main>
    </div>
  )
}
