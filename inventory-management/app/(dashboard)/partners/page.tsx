import { createClient } from '@/lib/supabase/server'
import { PartnersPageClient } from '@/components/partners/partners-page-client'
import type { Partner } from '@/types'

export default async function PartnersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const search = typeof params.search === 'string' ? params.search : ''
  const type = typeof params.type === 'string' ? params.type : ''

  const supabase = await createClient()

  let query = supabase
    .from('partners')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (search) {
    query = query.or(
      `name.ilike.%${search}%,contact_name.ilike.%${search}%,phone.ilike.%${search}%`
    )
  }

  if (type && type !== 'all') {
    query = query.eq('type', type)
  }

  const { data: rawPartners } = await query
  const partners: Partner[] = (rawPartners ?? []) as Partner[]

  return <PartnersPageClient partners={partners} />
}
