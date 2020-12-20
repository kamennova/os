import { ProgramRunner } from "./ProgramRunner";
import { Program, Task } from "./types";

type Queue = Task[];
type QueueIndex = 0 | 1 | 2;

enum TaskStatus {
    Finished,
    NotFinished,
    Interrupted,
}

export class TaskPlanner {
    private readonly runner: ProgramRunner;
    private readonly logging: boolean;
    private queues: [Queue, Queue, Queue] = [[], [], []];
    private isRunning: boolean = false;
    private startTime: number;
    private addedTime: { [key: string]: number } = {};
    private runsHistory: { [key: string]: Array<{ start: number, end: number }> } = {};
    private shouldEnd = false;
    private onEnd: ((data: any) => void) | null = null;

    constructor(runner: ProgramRunner, logging: boolean = false, onEnd: ((data: any) => void) | undefined = undefined) {
        this.runner = runner;
        this.logging = logging;
        this.startTime = Date.now();

        if (onEnd !== undefined) {
            this.onEnd = onEnd;
        }
    }

    private static getRunsNum(queueIndex: QueueIndex): number {
        switch (queueIndex) {
            case 0:
                return 3;
            case 1:
                return 6;
            case 2:
                return 20;
        }
    }

    public allowEnd() {
        this.shouldEnd = true;
    }

    public acceptProgram(program: Program) {
        this.queues[0].push({ program });
        this.addedTime[program.id] = Date.now();
        this.runsHistory[program.id] = [];
        this.log('Accepted ' + program.id);

        if (!this.isRunning) {
            this.run();
        }
    }

    public async run() {
        this.isRunning = true;
        let qIndex: QueueIndex = 0;

        while (this.shouldRun()) {
            if (this.queues[qIndex].length > 0) {
                await this.runQueueCycle(qIndex);
            }

            qIndex = (qIndex as number === 2) ? 0 : (qIndex + 1) as QueueIndex;
        }

        this.isRunning = false;
        if (this.shouldEnd) {
            this.end();
        }
    }

    public end() {
        const endTime = Date.now();
        const total = endTime - this.startTime;
        const waste = (total - sum(Object.values(this.runsHistory).map(runs => sum(runs.map(r => r.end - r.start))))) / total;

        const medWaitTime = this.getMediumWaitTime();
        if (this.onEnd !== null) {
            this.onEnd({ medWaitTime, waste });
        }
    }

    private log(str: string) {
        if (this.logging) {
            console.log(str);
        }
    }

    private getMediumWaitTime() {
        const programs = Object.keys(this.runsHistory);

        return sum(programs.map(p => {
            const runs = this.runsHistory[p];
            const runTime = sum(runs.map(run => run.end - run.start));
            const finishTime = runs[runs.length - 1].end;

            return finishTime - this.addedTime[p] - runTime;
        })) / programs.length;
    }

    private async runQueueCycle(qIndex: QueueIndex) {
        const len = this.queues[qIndex].length;

        for (let i = 0; i < len; i++) {
            const task = this.queues[qIndex].pop() as Task;
            this.log('Start ' + task.program.id + ', est.time: ' + task.program.estDuration);
            const status = await this.runTaskCycle(task, qIndex);

            if (status === TaskStatus.Interrupted) {
                this.queues[qIndex].unshift(task);
            } else if (status === TaskStatus.NotFinished) {
                if (qIndex === 0) {
                    this.queues[1].push(task);
                } else {
                    this.queues[2].push(task);
                }
            }

            if (this.logging) {
                this.dumpState();
            }
        }
    }

    private dumpState() {
        console.log('------');
        console.log(
            this.queues.map((q, i) => `Q${i + 1}: [${q.map(t => t.program.id).join(', ')}] ${q.length}`).join(', ')
        );
        console.log('------');
    }

    private async runTaskCycle(task: Task, qIndex: QueueIndex): Promise<TaskStatus> {
        const runsNum = TaskPlanner.getRunsNum(qIndex);
        const queue1Len = this.queues[0].length;

        for (let i = 0; i < runsNum; i++) {
            this.log('running...');

            const start = Date.now();
            const isFinished = await this.runner.run(task.program);
            this.runsHistory[task.program.id].push({ start, end: Date.now() });

            if (isFinished) {
                this.log('Finished program ' + task.program.id);
                return TaskStatus.Finished;
            }

            if (qIndex !== 0 && this.queues[0].length > queue1Len) {
                this.log('New program in queue 1, breaking');
                return TaskStatus.Interrupted;
            }
        }

        return TaskStatus.NotFinished;
    }

    private shouldRun() {
        return this.queues[0].length > 0 || this.queues[1].length > 0 || this.queues[2].length > 0;
    }
}

const sum = (arr: number[]) => arr.length > 0 ? arr.reduce((acc, e) => acc + e) : 0;
