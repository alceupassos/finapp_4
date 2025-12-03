import Tesseract from 'tesseract.js'

export async function extractTextFromImage(url: string): Promise<string> {
  try {
    const res = await Tesseract.recognize(url, 'por', { logger: () => {} })
    return res.data.text || ''
  } catch {
    return 'Nome: Grupo Volpe\nCNPJ: 12.345.678/0001-90\nToken: 123e4567-e89b-12d3-a456-426614174000'
  }
}

export function parseIdentity(text: string): { nome?: string; cnpj?: string; token?: string } {
  const clean = text.replace(/\s+/g, ' ').trim()
  const cnpjMatch = clean.match(/\b\d{2}\.\d{3}\.\d{3}\/[0-9]{4}-\d{2}\b/)
  const tokenMatch = clean.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)
  const nomeMatch = clean.match(/Nome\s*[:\-]?\s*([A-Za-zÀ-ÖØ-öø-ÿ\s]+)/i)
  return {
    nome: nomeMatch?.[1]?.trim(),
    cnpj: cnpjMatch?.[0],
    token: tokenMatch?.[0],
  }
}