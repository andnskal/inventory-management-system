// This route is intentionally left minimal.
// PDF generation is handled client-side via window.print() on the report preview.
// This endpoint exists as a placeholder for future server-side PDF generation if needed.

import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  return Response.json({
    message:
      'PDF 다운로드는 브라우저의 인쇄 기능(Ctrl+P)을 사용해주세요. 보고서 미리보기 화면에서 "PDF로 저장" 버튼을 클릭하세요.',
  })
}
