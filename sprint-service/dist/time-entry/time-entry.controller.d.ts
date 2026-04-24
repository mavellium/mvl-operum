import { TimeEntryService } from './time-entry.service';
export declare class TimeEntryController {
    private readonly timeEntryService;
    constructor(timeEntryService: TimeEntryService);
    listByCard(cardId: string): Promise<{
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        description: string | null;
        cardId: string;
        startedAt: Date;
        endedAt: Date | null;
        duration: number;
        isRunning: boolean;
        isManual: boolean;
    }[]>;
    listByUser(userId: string): Promise<{
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        description: string | null;
        cardId: string;
        startedAt: Date;
        endedAt: Date | null;
        duration: number;
        isRunning: boolean;
        isManual: boolean;
    }[]>;
    start(cardId: string, userId: string, body: {
        description?: string;
    }): Promise<{
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        description: string | null;
        cardId: string;
        startedAt: Date;
        endedAt: Date | null;
        duration: number;
        isRunning: boolean;
        isManual: boolean;
    }>;
    stop(id: string, userId: string): Promise<{
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        description: string | null;
        cardId: string;
        startedAt: Date;
        endedAt: Date | null;
        duration: number;
        isRunning: boolean;
        isManual: boolean;
    }>;
    createManual(cardId: string, userId: string, body: {
        startedAt: string;
        endedAt: string;
        description?: string;
    }): Promise<{
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        description: string | null;
        cardId: string;
        startedAt: Date;
        endedAt: Date | null;
        duration: number;
        isRunning: boolean;
        isManual: boolean;
    }>;
    remove(id: string): Promise<void>;
}
