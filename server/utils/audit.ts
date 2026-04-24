import { prisma } from './prisma'

export interface AuditInput {
  marinaId: string
  userId?: string | null
  entity: string
  entityId?: string | null
  action: string
  diff?: unknown
}

export async function logAudit(input: AuditInput) {
  try {
    await prisma.auditLog.create({
      data: {
        marinaId: input.marinaId,
        userId: input.userId || null,
        entity: input.entity,
        entityId: input.entityId || null,
        action: input.action,
        diff: input.diff ? (input.diff as any) : undefined
      }
    })
  }
  catch (e) {
    console.error('audit log failed', e)
  }
}
