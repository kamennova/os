import { timeout } from "../common/helpers";
import { ProgramRunner } from "./ProgramRunner";
import { TaskPlanner } from "./TaskPlanner";
import { PACE, Program } from "./types";

const runner = new ProgramRunner();

const generateProgs = async (intensity: number): Promise<{ medWaitTime: number, waste: number, progNum: number }> => new Promise(
    async (resolve, reject) => {
        const progNum = 50;
        const planner = new TaskPlanner(runner, false, (data) => resolve({ ...data, progNum }));
        const interval = intensity / progNum;

        const start = Date.now();
        for (let i = 0; i < progNum; i++) {
            i++;
            const time2 = 5000 + Math.floor(Math.random() * 5000);

            await timeout(interval / PACE);
            const pr: Program = { estDuration: time2, id: i.toString() };
            planner.acceptProgram(pr);
        }
        const end = Date.now();
        console.log('Programs per milisecond: ', progNum / (end - start) * PACE);

        planner.allowEnd();
    });

const getData = async (intensityMin: number, step: number, num: number) => {
    for (let i = 0; i < num; i++) {
        const { medWaitTime, progNum, waste } = await generateProgs(intensityMin - step * i);
        console.log(progNum, medWaitTime, waste);
    }
};

getData(35000, 5000, 6);

