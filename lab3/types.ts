export type Program = {
    id: string;
    estDuration: number;
};

export type Task = {
    program: Program;
}

export const QUANTUM = 600;
export const PACE = 10;
