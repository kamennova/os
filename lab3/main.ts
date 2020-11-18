import { timeout } from "../common/helpers";
import { ProgramRunner } from "./ProgramRunner";
import { TaskPlanner } from "./TaskPlanner";
import { Program } from "./types";

const runner = new ProgramRunner();
const planner = new TaskPlanner(runner, true);

const generateProgs = async () => {
    const startTime = Date.now();
    const duration = 200000;
    let i = 0;

    while ((Date.now() - startTime) < duration ) {
        i++;
        const time1 = Math.random() * 4000,
            time2 = Math.floor(Math.random() * 10000);

        await timeout(time1);
        const pr: Program = { estDuration: time2, id: i.toString() };
        planner.acceptProgram(pr);
    }
};

generateProgs();
