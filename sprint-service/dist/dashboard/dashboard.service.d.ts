export declare class DashboardService {
    getMetrics(sprintId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        sprintId: string;
        horas: number;
        tarefasPendentes: number;
        custoTotal: number;
        rankingPosicao: number;
    }[]>;
    upsertMetric(sprintId: string, userId: string, data: {
        horas?: number;
        tarefasPendentes?: number;
        custoTotal?: number;
        rankingPosicao?: number;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        sprintId: string;
        horas: number;
        tarefasPendentes: number;
        custoTotal: number;
        rankingPosicao: number;
    }>;
    getFeedbacks(sprintId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        qualidade: number;
        dificuldade: number;
        sprintId: string;
        tarefasRealizadas: string | null;
        dificuldades: string | null;
    }[]>;
    upsertFeedback(sprintId: string, userId: string, data: {
        tarefasRealizadas?: string;
        dificuldades?: string;
        qualidade: number;
        dificuldade: number;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        qualidade: number;
        dificuldade: number;
        sprintId: string;
        tarefasRealizadas: string | null;
        dificuldades: string | null;
    }>;
}
