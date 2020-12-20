import { timeout } from "../common/helpers";
import { PACE, Program, QUANTUM } from "./types";

export class ProgramRunner {
    private readonly pace: number;

    constructor(pace: number = PACE) {
        this.pace = pace;
    }

    public async run(p: Program): Promise<boolean> {
        const isFinished = p.estDuration <= QUANTUM;
        p.estDuration -= QUANTUM;

        await timeout(this.getMs(Math.min(QUANTUM, p.estDuration)));

        return isFinished;
    }

    private getMs(ms: number) {
        return ms / this.pace;
    }
}
