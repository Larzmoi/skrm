import { Router, Response } from 'express'
import { prisma } from '../db/prisma'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()

// GET /presets?search= — myyjän omat pohjatuotteet, suosikit ensin, sitten viimeksi
// käytetyt (nulls last), sitten aakkosjärjestys. search suodattaa nimestä JA description-
// kentästä (fyysinen sijainti, ks. schema.prisma-kommentti) - sama haku kattaa molemmat
// koska CLAUDE.md "WhatsApp-palaute 2026-09-02" kohta 2 nimenomaan pyysi sijainnin näkymistä
// haussa, ei pelkkää nimihakua.
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : ''
  const presets = await prisma.productPreset.findMany({
    where: {
      sellerId: req.userId!,
      ...(search ? { OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ] } : {}),
    },
    orderBy: [
      { favorite: 'desc' },
      { lastUsedAt: { sort: 'desc', nulls: 'last' } },
      { name: 'asc' },
    ],
  })
  res.json(presets)
})

// POST /presets — yksittäisen pohjan luonti (manuaalinen lomake)
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { name, condition, category, alakategoria, tyyppi, imageUrl, description, startPrice } = req.body
  if (typeof name !== 'string' || !name.trim()) return res.status(400).json({ error: 'Nimi vaaditaan' })
  const preset = await prisma.productPreset.create({
    data: {
      name: name.trim(),
      condition: condition || null, category: category || null, alakategoria: alakategoria || null,
      tyyppi: tyyppi || null, imageUrl: imageUrl || null, description: description || null,
      startPrice: startPrice !== undefined && startPrice !== null && startPrice !== '' ? Number(startPrice) : null,
      sellerId: req.userId!,
    },
  })
  res.status(201).json(preset)
})

// POST /presets/bulk — monimuu-tuonti liitetystä tekstistä. Eri muoto kuin tuotteiden
// bulkkituonti (ei hintaa/määrää, joten €-merkki-tunnistusta ei tarvita tässä) - tyhjä rivi
// erottaa pohjat toisistaan eksplisiittisesti: 1. rivi nimi, 2. rivi kunto (valinnainen),
// loput rivit ennen seuraavaa tyhjää riviä = kuvaus/sijainti.
router.post('/bulk', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { text, category, alakategoria, tyyppi } = req.body
  if (typeof text !== 'string' || !text.trim()) return res.status(400).json({ error: 'Tekstiä ei annettu' })

  const blocks = text.split(/\n\s*\n/).map((b: string) => b.split('\n').map(l => l.trim()).filter(l => l.length > 0)).filter((b: string[]) => b.length > 0)
  if (blocks.length === 0) return res.status(400).json({ error: 'Ei tunnistettuja pohjia' })
  if (blocks.length > 2000) return res.status(400).json({ error: 'Kerralla voi tuoda enintään 2000 pohjaa' })

  const batchCategory = typeof category === 'string' && category ? category : null
  const batchAlakategoria = typeof alakategoria === 'string' && alakategoria ? alakategoria : null
  const batchTyyppi = typeof tyyppi === 'string' && tyyppi ? tyyppi : null

  let created = 0
  const results: any[] = []
  for (const lines of blocks) {
    const name = lines[0]
    const condition = lines[1] || null
    const description = lines.length > 2 ? lines.slice(2).join('\n') : null
    const preset = await prisma.productPreset.create({
      data: { name, condition, description, category: batchCategory, alakategoria: batchAlakategoria, tyyppi: batchTyyppi, sellerId: req.userId! },
    })
    created++
    results.push({ name: preset.name, id: preset.id })
  }
  res.status(201).json({ created, total: blocks.length, results })
})

// PUT /presets/:id — muokkaus (myös suosikkimerkinnän vaihto)
router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id)
  const preset = await prisma.productPreset.findUnique({ where: { id } })
  if (!preset || preset.sellerId !== req.userId) return res.status(403).json({ error: 'Ei oikeutta' })

  const updated = await prisma.productPreset.update({
    where: { id },
    data: {
      name: req.body.name !== undefined ? String(req.body.name).trim() : undefined,
      condition: req.body.condition !== undefined ? (req.body.condition || null) : undefined,
      category: req.body.category !== undefined ? (req.body.category || null) : undefined,
      alakategoria: req.body.alakategoria !== undefined ? (req.body.alakategoria || null) : undefined,
      tyyppi: req.body.tyyppi !== undefined ? (req.body.tyyppi || null) : undefined,
      imageUrl: req.body.imageUrl !== undefined ? (req.body.imageUrl || null) : undefined,
      description: req.body.description !== undefined ? (req.body.description || null) : undefined,
      startPrice: req.body.startPrice !== undefined ? (req.body.startPrice === null || req.body.startPrice === '' ? null : Number(req.body.startPrice)) : undefined,
      favorite: typeof req.body.favorite === 'boolean' ? req.body.favorite : undefined,
    },
  })
  res.json(updated)
})

// POST /presets/:id/use — merkitsee pohjan juuri käytetyksi (lastUsedAt = nyt), kutsutaan kun
// live-konsolissa luodaan Product pohjan perusteella - nostaa pohjan listan kärkeen seuraavalla
// haulla ilman että myyjän tarvitsee itse merkitä sitä suosikiksi.
router.post('/:id/use', authMiddleware, async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id)
  const preset = await prisma.productPreset.findUnique({ where: { id } })
  if (!preset || preset.sellerId !== req.userId) return res.status(403).json({ error: 'Ei oikeutta' })
  const updated = await prisma.productPreset.update({ where: { id }, data: { lastUsedAt: new Date() } })
  res.json(updated)
})

// DELETE /presets/:id
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id)
  const preset = await prisma.productPreset.findUnique({ where: { id } })
  if (!preset || preset.sellerId !== req.userId) return res.status(403).json({ error: 'Ei oikeutta' })
  await prisma.productPreset.delete({ where: { id } })
  res.json({ ok: true })
})

export default router
