import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SettingsPageClient } from '@/components/settings/settings-page-client'
import type { Category, StorageLocation, Setting, CustomField } from '@/types'

export default async function SettingsPage() {
  const supabase = await createClient()

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', authUser.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    redirect('/')
  }

  // Fetch all settings data
  const [categoriesResult, locationsResult, settingsResult, customFieldsResult] =
    await Promise.all([
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('storage_locations').select('*').order('sort_order'),
      supabase.from('settings').select('*').order('key'),
      supabase.from('custom_fields').select('*').order('sort_order'),
    ])

  return (
    <SettingsPageClient
      initialCategories={(categoriesResult.data ?? []) as Category[]}
      initialLocations={(locationsResult.data ?? []) as StorageLocation[]}
      initialSettings={(settingsResult.data ?? []) as Setting[]}
      initialCustomFields={(customFieldsResult.data ?? []) as CustomField[]}
    />
  )
}
