/**
 * Client XML-RPC léger pour Odoo — zero-dependency (fetch + XML manuelle)
 * Supporte : authenticate, search_read
 * Parse : int, string, boolean, array, struct, double, Many2one [id, name], Many2many [ids]
 */

// ─── XML value encoding ────────────────────────────────────────────────────────

function encodeValue(val: unknown): string {
  if (val === null || val === undefined) return '<value><boolean>0</boolean></value>'
  if (typeof val === 'boolean') return `<value><boolean>${val ? 1 : 0}</boolean></value>`
  if (typeof val === 'number') {
    if (Number.isInteger(val)) return `<value><int>${val}</int></value>`
    return `<value><double>${val}</double></value>`
  }
  if (typeof val === 'string') return `<value><string>${escapeXml(val)}</string></value>`
  if (Array.isArray(val)) {
    const items = val.map(encodeValue).join('')
    return `<value><array><data>${items}</data></array></value>`
  }
  if (typeof val === 'object') {
    const members = Object.entries(val as Record<string, unknown>)
      .map(([k, v]) => `<member><name>${escapeXml(k)}</name>${encodeValue(v)}</member>`)
      .join('')
    return `<value><struct>${members}</struct></value>`
  }
  return `<value><string>${escapeXml(String(val))}</string></value>`
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

function buildRequest(method: string, params: unknown[]): string {
  const paramsXml = params.map(p => `<param>${encodeValue(p)}</param>`).join('')
  return `<?xml version="1.0"?><methodCall><methodName>${method}</methodName><params>${paramsXml}</params></methodCall>`
}

// ─── XML response parsing ──────────────────────────────────────────────────────

function parseXmlValue(xml: string, pos: number): { value: unknown; end: number } {
  // Skip whitespace
  while (pos < xml.length && /\s/.test(xml[pos])) pos++

  // Expect <value>
  const valueStart = xml.indexOf('<value', pos)
  if (valueStart === -1) throw new Error('Expected <value> tag')
  pos = xml.indexOf('>', valueStart) + 1

  // Skip whitespace
  while (pos < xml.length && /\s/.test(xml[pos])) pos++

  // Check what type tag follows
  if (xml.startsWith('<int>', pos) || xml.startsWith('<i4>', pos)) {
    const tag = xml.startsWith('<int>', pos) ? 'int' : 'i4'
    const start = pos + tag.length + 2
    const end = xml.indexOf(`</${tag}>`, start)
    const val = parseInt(xml.substring(start, end), 10)
    pos = xml.indexOf('</value>', end) + 8
    return { value: val, end: pos }
  }

  if (xml.startsWith('<double>', pos)) {
    const start = pos + 8
    const end = xml.indexOf('</double>', start)
    const val = parseFloat(xml.substring(start, end))
    pos = xml.indexOf('</value>', end) + 8
    return { value: val, end: pos }
  }

  if (xml.startsWith('<boolean>', pos)) {
    const start = pos + 9
    const end = xml.indexOf('</boolean>', start)
    const val = xml.substring(start, end).trim() === '1'
    pos = xml.indexOf('</value>', end) + 8
    return { value: val, end: pos }
  }

  if (xml.startsWith('<string>', pos)) {
    const start = pos + 8
    const end = xml.indexOf('</string>', start)
    const val = unescapeXml(xml.substring(start, end))
    pos = xml.indexOf('</value>', end) + 8
    return { value: val, end: pos }
  }

  if (xml.startsWith('<nil', pos)) {
    pos = xml.indexOf('</value>', pos) + 8
    if (pos < 8) pos = xml.indexOf('/>', pos) + 2 // self-closing <nil/>
    return { value: null, end: pos }
  }

  if (xml.startsWith('<array>', pos)) {
    pos = xml.indexOf('<data>', pos) + 6
    const arr: unknown[] = []
    while (!xml.startsWith('</data>', pos)) {
      while (pos < xml.length && /\s/.test(xml[pos])) pos++
      if (xml.startsWith('</data>', pos)) break
      const result = parseXmlValue(xml, pos)
      arr.push(result.value)
      pos = result.end
    }
    pos = xml.indexOf('</value>', pos) + 8
    return { value: arr, end: pos }
  }

  if (xml.startsWith('<struct>', pos)) {
    pos += 8
    const obj: Record<string, unknown> = {}
    while (!xml.startsWith('</struct>', pos)) {
      while (pos < xml.length && /\s/.test(xml[pos])) pos++
      if (xml.startsWith('</struct>', pos)) break
      // <member>
      pos = xml.indexOf('<name>', pos) + 6
      const nameEnd = xml.indexOf('</name>', pos)
      const name = xml.substring(pos, nameEnd)
      pos = nameEnd + 7
      const result = parseXmlValue(xml, pos)
      obj[name] = result.value
      pos = result.end
      // skip </member>
      const memberEnd = xml.indexOf('</member>', pos)
      if (memberEnd !== -1 && memberEnd < pos + 20) pos = memberEnd + 9
    }
    pos = xml.indexOf('</value>', pos) + 8
    return { value: obj, end: pos }
  }

  // Plain text value (no type tag) — treat as string
  const endTag = xml.indexOf('</value>', pos)
  const val = unescapeXml(xml.substring(pos, endTag).trim())
  pos = endTag + 8
  return { value: val, end: pos }
}

function unescapeXml(s: string): string {
  return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
}

function parseResponse(xml: string): unknown {
  // Check for fault
  if (xml.includes('<fault>')) {
    const faultStart = xml.indexOf('<fault>')
    const { value } = parseXmlValue(xml, faultStart + 7)
    const fault = value as Record<string, unknown>
    throw new Error(`XML-RPC Fault: ${fault.faultString || JSON.stringify(fault)}`)
  }

  // Extract first param value
  const paramStart = xml.indexOf('<param>')
  if (paramStart === -1) throw new Error('No <param> in XML-RPC response')
  const { value } = parseXmlValue(xml, paramStart + 7)
  return value
}

// ─── XML-RPC caller ────────────────────────────────────────────────────────────

async function xmlrpcCall(url: string, method: string, params: unknown[]): Promise<unknown> {
  const body = buildRequest(method, params)
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/xml' },
    body,
  })
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${await res.text()}`)
  }
  const xml = await res.text()
  return parseResponse(xml)
}

// ─── Public API ────────────────────────────────────────────────────────────────

export interface OdooConfig {
  url: string   // e.g. "https://instance.odoo.com"
  db: string
  user: string  // email
  apiKey: string
}

/**
 * Authenticate to Odoo and return the user ID (uid).
 */
export async function odooAuthenticate(config: OdooConfig): Promise<number> {
  const endpoint = `${config.url}/xmlrpc/2/common`
  const uid = await xmlrpcCall(endpoint, 'authenticate', [
    config.db, config.user, config.apiKey, {},
  ])
  if (!uid || typeof uid !== 'number') {
    throw new Error('Authentication failed: invalid credentials or database')
  }
  return uid
}

/**
 * Execute search_read on an Odoo model.
 */
export async function odooSearchRead(
  config: OdooConfig,
  uid: number,
  model: string,
  domain: unknown[],
  fields: string[],
  limit?: number,
): Promise<Record<string, unknown>[]> {
  const endpoint = `${config.url}/xmlrpc/2/object`
  const kwargs: Record<string, unknown> = { fields }
  if (limit) kwargs.limit = limit

  const result = await xmlrpcCall(endpoint, 'execute_kw', [
    config.db, uid, config.apiKey,
    model, 'search_read', [domain], kwargs,
  ])

  if (!Array.isArray(result)) {
    throw new Error(`search_read returned non-array: ${typeof result}`)
  }
  return result as Record<string, unknown>[]
}
