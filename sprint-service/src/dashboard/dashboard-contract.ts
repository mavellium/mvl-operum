import { z } from 'zod'
const count = z.number().int().nonnegative()
const amount = z.number().nonnegative()
const date = z.string().datetime().nullable()
const person = z.object({ id: z.string(), name: z.string(), cargo: z.string().nullable(), avatarUrl: z.string().nullable() })
const metrics = z.object({ horasTotais: amount, custoTotal: amount, cardsTotal: count, cardsConcluidos: count, cardsAtrasados: count })
const overdue = z.object({ id: z.string(), title: z.string(), color: z.string(), endDate: date, sprint: z.object({ id: z.string(), name: z.string() }).nullable(), sprintColumn: z.object({ title: z.string() }).nullable(), responsibles: z.array(z.object({ user: z.object({ id: z.string(), name: z.string(), avatarUrl: z.string().nullable() }) })) })
export const GlobalDashboardSchema = z.object({
  kpis: z.object({ totalSprints: count, totalCards: count, horasTotais: amount, custoTotal: amount }),
  userMetrics: z.array(person.extend({ horasTotais: amount, custoTotal: amount })),
  memberMetrics: z.array(person.merge(metrics)),
  overdueCards: z.array(overdue),
  sprintMetrics: z.array(z.object({ id: z.string(), name: z.string(), cardsTotal: count, cardsConcluidos: count, horasTotais: amount, custoTotal: amount })),
})
export const SprintDashboardSchema = z.object({
  sprint: z.object({ id: z.string(), projectId: z.string().nullable(), name: z.string(), status: z.string(), startDate: date, endDate: date, qualidade: z.number().nullable(), dificuldade: z.number().nullable() }),
  metrics,
  userMetrics: z.array(person.extend({ horas: amount, custo: amount })),
  cardsByColumn: z.array(z.object({ name: z.string(), count })),
  overdueCards: z.array(overdue),
  feedbacks: z.array(z.object({ id: z.string(), userName: z.string(), avatarUrl: z.string().nullable(), qualidade: z.number(), dificuldade: z.number(), tarefasRealizadas: z.string().nullable(), dificuldades: z.string().nullable() })),
  avgQualidade: z.number().nullable(), avgDificuldade: z.number().nullable(),
})
export type GlobalDashboardData = z.infer<typeof GlobalDashboardSchema>
export type SprintDashboardData = z.infer<typeof SprintDashboardSchema>
