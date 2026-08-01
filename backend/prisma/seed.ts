import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  const hash = await bcrypt.hash('test1234', 12)
  const user = await prisma.user.upsert({
    where: { email: 'testi@skrm.fi' },
    update: {},
    create: {
      email: 'testi@skrm.fi',
      passwordHash: hash,
      name: 'Testi Käyttäjä',
      username: 'testikäyttäjä',
    },
  })
  console.log('✅ Testikäyttäjä luotu:', user.email)
}

main().catch(console.error).finally(() => prisma.$disconnect())