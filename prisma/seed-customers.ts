import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const marina = await prisma.marina.findFirst()
  if (!marina) { console.error('No marina found'); return }

  const customers = [
    { name: 'Dhr. P. van Dam', email: 'p.vandam@email.nl', phone: '06-12345678', contractType: 'YEAR' },
    { name: 'Mw. L. Hendriks', email: 'l.hendriks@email.nl', phone: '06-23456789', contractType: 'YEAR' },
    { name: 'Dhr. J. ter Horst', email: 'j.terhorst@email.nl', phone: '06-34567890', contractType: 'YEAR' },
    { name: 'Mw. M. Holwerda', email: 'm.holwerda@email.nl', phone: '06-45678901', contractType: 'SUMMER' },
    { name: 'Dhr. A. Szepan', email: 'a.szepan@email.de', phone: '+49-171-1234567', contractType: 'YEAR' },
    { name: 'Dhr. F. Durieux', email: 'f.durieux@email.nl', phone: '06-56789012', contractType: 'YEAR' },
    { name: 'Mw. J. Eden', email: 'j.eden@email.nl', phone: '06-67890123', contractType: 'SUMMER' },
    { name: 'Dhr. B. Bax', email: 'b.bax@email.nl', phone: '06-78901234', contractType: 'YEAR' },
    { name: 'Dhr. G. Schaefer', email: 'g.schaefer@email.de', phone: '+49-172-2345678', contractType: 'YEAR' },
    { name: 'Mw. I. Bruggink', email: 'i.bruggink@email.nl', phone: '06-89012345', contractType: 'TEMPORARY' },
  ]

  const boats = [
    { name: 'SY Goedewind', type: 'Zeilboot', length: 10.3, width: 3.4, registration: 'NED-1234' },
    { name: 'MY Saltwater', type: 'Motorjacht', length: 12.5, width: 4.2, registration: 'NED-5678' },
    { name: 'Enjoy', type: 'Motorboot', length: 8.5, width: 3.0, registration: 'NED-9012' },
    { name: 'Noordster', type: 'Zeilboot', length: 11.0, width: 3.6, registration: 'NED-3456' },
    { name: 'Mara Zwo', type: 'Motorjacht', length: 9.2, width: 3.3, registration: 'DEU-7890' },
    { name: 'Vrije Vogel', type: 'Zeilboot', length: 10.8, width: 3.5, registration: 'NED-1122' },
    { name: 'Storm', type: 'Motorboot', length: 7.8, width: 2.8, registration: 'NED-3344' },
    { name: 'Papillon', type: 'Zeilboot', length: 11.5, width: 3.7, registration: 'NED-5566' },
    { name: 'Lazy Lady', type: 'Motorjacht', length: 8.0, width: 3.1, registration: 'DEU-7788' },
    { name: 'Flow', type: 'Zeilboot', length: 9.5, width: 3.2, registration: 'NED-9900' },
  ]

  const berths = await prisma.berth.findMany({ where: { marinaId: marina.id }, orderBy: { code: 'asc' }, take: 10 })

  for (let i = 0; i < customers.length; i++) {
    const c = customers[i]
    const customer = await prisma.customer.create({
      data: {
        marinaId: marina.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        contractType: c.contractType,
      }
    })

    const b = boats[i]
    const boat = await prisma.boat.create({
      data: {
        marinaId: marina.id,
        customerId: customer.id,
        name: b.name,
        type: b.type,
        length: b.length,
        width: b.width,
        registration: b.registration,
      }
    })

    // Link first 10 berths to customers and boats
    if (berths[i]) {
      await prisma.berth.update({
        where: { id: berths[i].id },
        data: {
          customerId: customer.id,
          boatId: boat.id,
          status: 'OCCUPIED',
          type: c.contractType === 'YEAR' ? 'JAARPLAATS' : c.contractType === 'SUMMER' ? 'SEIZOEN' : 'PASSANT'
        }
      })
    }

    console.log(`${customer.name} → ${boat.name} → ${berths[i]?.code || 'no berth'}`)
  }

  console.log('\nCustomers + boats seeded!')
}

main().catch(console.error).finally(() => prisma.$disconnect())
