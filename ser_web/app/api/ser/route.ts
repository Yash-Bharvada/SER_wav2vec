export const runtime = 'nodejs'

export async function POST(req: Request) {
  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return new Response(JSON.stringify({ error: 'no file' }), { status: 400 })
  const backend = process.env.BACKEND_URL || process.env.NEXT_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'
  const fd = new FormData()
  fd.append('file', file, (file as any).name || 'audio.webm')
  try {
    const r = await fetch(backend + '/predict', { method: 'POST', body: fd })
    const text = await r.text()
    let data: any = null
    try { data = JSON.parse(text) } catch { data = null }
    if (!data) {
      return new Response(JSON.stringify({ error: 'invalid backend response', status: r.status, body: text?.slice(0, 500) }), { status: 502, headers: { 'content-type': 'application/json' } })
    }
    return new Response(JSON.stringify(data), { status: r.status, headers: { 'content-type': 'application/json' } })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'backend fetch failed', message: String(e?.message || e) }), { status: 502, headers: { 'content-type': 'application/json' } })
  }
}
