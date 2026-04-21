import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  // Create marina
  const marina = await prisma.marina.upsert({
    where: { slug: 'lands-end' },
    update: {},
    create: {
      name: 'Jachthaven Lands End',
      slug: 'lands-end',
      gpsLat: 52.58038836,
      gpsLng: 5.75972931,
      settings: {
        address: 'Ketelhaven',
        phone: '',
        email: 'info@jachthavenlandsend.nl'
      }
    }
  })

  console.log(`Marina: ${marina.name} (${marina.id})`)

  // Create harbormaster user
  const passwordHash = await bcrypt.hash('nautartest2026', 12)
  const user = await prisma.user.upsert({
    where: { email: 'elmer@jachthavenlandsend.nl' },
    update: {},
    create: {
      email: 'elmer@jachthavenlandsend.nl',
      passwordHash,
      firstName: 'Elmer',
      lastName: 'Bakker',
      role: 'HARBORMASTER',
      marinaId: marina.id
    }
  })

  console.log(`User: ${user.firstName} ${user.lastName} (${user.role})`)

  // Create berths — steigers A, B, C, D
  const piers = [
    { pier: 'A', count: 10, length: 12, width: 4.5 },
    { pier: 'B', count: 15, length: 11, width: 4.0 },
    { pier: 'C', count: 20, length: 9, width: 3.5 },
    { pier: 'D', count: 25, length: 8, width: 3.2 }
  ]

  const statuses = ['FREE', 'OCCUPIED', 'SEASONAL', 'STORAGE', 'TEMPORARY'] as const

  for (const p of piers) {
    for (let i = 1; i <= p.count; i++) {
      const code = `${p.pier}${String(i).padStart(2, '0')}-${p.length}m`
      const statusIdx = (i * 7 + p.pier.charCodeAt(0)) % 10
      const status = statusIdx < 2 ? 'FREE' : statusIdx < 5 ? 'OCCUPIED' : statusIdx < 7 ? 'SEASONAL' : statusIdx < 9 ? 'STORAGE' : 'TEMPORARY'

      await prisma.berth.upsert({
        where: { id: `${marina.id}-${code}` },
        update: {},
        create: {
          id: `${marina.id}-${code}`,
          marinaId: marina.id,
          code,
          pier: p.pier,
          length: p.length,
          width: p.width,
          status
        }
      })
    }
  }

  const berthCount = await prisma.berth.count({ where: { marinaId: marina.id } })
  console.log(`Berths created: ${berthCount}`)

  console.log('\nSeed complete! Login with:')
  console.log('Email: elmer@jachthavenlandsend.nl')
  console.log('Password: nautartest2026')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
