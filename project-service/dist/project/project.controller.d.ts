import { ProjectService } from './project.service';
export declare class ProjectController {
    private readonly projectService;
    constructor(projectService: ProjectService);
    list(tenantId: string, page?: string, limit?: string): Promise<{
        items: ({
            _count: {
                members: number;
            };
        } & {
            tenantId: string;
            name: string;
            description: string | null;
            logoUrl: string | null;
            slogan: string | null;
            location: string | null;
            startDate: Date | null;
            endDate: Date | null;
            justificativa: string | null;
            objetivos: string | null;
            metodologia: string | null;
            descricaoProduto: string | null;
            premissas: string | null;
            restricoes: string | null;
            limitesAutoridade: string | null;
            semestre: string | null;
            ano: number | null;
            departamentos: string[];
            id: string;
            status: import("../../lib/generated/prisma").$Enums.ProjectStatus;
            deletedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
        })[];
        total: number;
        page: number;
        limit: number;
    }>;
    getUserProjects(userId: string, tenantId: string): Promise<({
        project: {
            name: string;
            id: string;
            status: import("../../lib/generated/prisma").$Enums.ProjectStatus;
        };
    } & {
        startDate: Date;
        endDate: Date | null;
        id: string;
        active: boolean;
        hourlyRate: number | null;
        role: string | null;
        userId: string;
        projectId: string;
        departmentId: string | null;
        remuneracao: number | null;
        horasDiarias: number | null;
        order: number;
    })[]>;
    findOne(id: string, tenantId: string): Promise<{
        members: {
            startDate: Date;
            endDate: Date | null;
            id: string;
            active: boolean;
            hourlyRate: number | null;
            role: string | null;
            userId: string;
            projectId: string;
            departmentId: string | null;
            remuneracao: number | null;
            horasDiarias: number | null;
            order: number;
        }[];
        macroFases: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            projectId: string;
            fase: string;
            dataLimite: string | null;
            custo: string | null;
        }[];
        stakeholders: ({
            stakeholder: {
                tenantId: string;
                name: string;
                logoUrl: string | null;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                company: string | null;
                competence: string | null;
                email: string | null;
                phone: string | null;
                cep: string | null;
                logradouro: string | null;
                numero: string | null;
                complemento: string | null;
                bairro: string | null;
                cidade: string | null;
                estado: string | null;
                notes: string | null;
                isActive: boolean;
            };
        } & {
            id: string;
            createdAt: Date;
            projectId: string;
            order: number;
            stakeholderId: string;
        })[];
    } & {
        tenantId: string;
        name: string;
        description: string | null;
        logoUrl: string | null;
        slogan: string | null;
        location: string | null;
        startDate: Date | null;
        endDate: Date | null;
        justificativa: string | null;
        objetivos: string | null;
        metodologia: string | null;
        descricaoProduto: string | null;
        premissas: string | null;
        restricoes: string | null;
        limitesAutoridade: string | null;
        semestre: string | null;
        ano: number | null;
        departamentos: string[];
        id: string;
        status: import("../../lib/generated/prisma").$Enums.ProjectStatus;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    create(body: unknown, tenantId: string): Promise<{
        tenantId: string;
        name: string;
        description: string | null;
        logoUrl: string | null;
        slogan: string | null;
        location: string | null;
        startDate: Date | null;
        endDate: Date | null;
        justificativa: string | null;
        objetivos: string | null;
        metodologia: string | null;
        descricaoProduto: string | null;
        premissas: string | null;
        restricoes: string | null;
        limitesAutoridade: string | null;
        semestre: string | null;
        ano: number | null;
        departamentos: string[];
        id: string;
        status: import("../../lib/generated/prisma").$Enums.ProjectStatus;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    update(id: string, tenantId: string, body: unknown): Promise<{
        tenantId: string;
        name: string;
        description: string | null;
        logoUrl: string | null;
        slogan: string | null;
        location: string | null;
        startDate: Date | null;
        endDate: Date | null;
        justificativa: string | null;
        objetivos: string | null;
        metodologia: string | null;
        descricaoProduto: string | null;
        premissas: string | null;
        restricoes: string | null;
        limitesAutoridade: string | null;
        semestre: string | null;
        ano: number | null;
        departamentos: string[];
        id: string;
        status: import("../../lib/generated/prisma").$Enums.ProjectStatus;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    remove(id: string, tenantId: string): Promise<void>;
    getMembers(id: string, tenantId: string): Promise<{
        startDate: Date;
        endDate: Date | null;
        id: string;
        active: boolean;
        hourlyRate: number | null;
        role: string | null;
        userId: string;
        projectId: string;
        departmentId: string | null;
        remuneracao: number | null;
        horasDiarias: number | null;
        order: number;
    }[]>;
    addMember(projectId: string, tenantId: string, body: {
        userId: string;
        role?: string;
        departmentId?: string;
        hourlyRate?: number;
    }): Promise<{
        startDate: Date;
        endDate: Date | null;
        id: string;
        active: boolean;
        hourlyRate: number | null;
        role: string | null;
        userId: string;
        projectId: string;
        departmentId: string | null;
        remuneracao: number | null;
        horasDiarias: number | null;
        order: number;
    }>;
    removeMember(projectId: string, userId: string, tenantId: string): Promise<void>;
    reorderMembers(projectId: string, tenantId: string, body: {
        orderedUserIds: string[];
    }): Promise<void>;
    listMacroFases(id: string, tenantId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        projectId: string;
        fase: string;
        dataLimite: string | null;
        custo: string | null;
    }[]>;
    upsertMacroFases(projectId: string, tenantId: string, body: {
        fases: {
            fase: string;
            dataLimite?: string;
            custo?: string;
        }[];
    }): Promise<import("../../lib/generated/prisma").Prisma.BatchPayload>;
}
