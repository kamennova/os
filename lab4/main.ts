import { generateMatrix, hungaryAlgo } from "./MatrixAlgo";

const Values: any = {};
const CheckSize = 200;

for (let size = 10; size <= 30; size += 5) {
    Values[size.toString()] = 0;

    for (let i = 0; i < CheckSize; i++) {
        const m = generateMatrix(size);
        const { conflict } = hungaryAlgo(m);

        if (conflict > 0) {
            Values[size.toString()]++;
        }
    }
}


const result = Object.keys(Values).map(key => ({ [key]: Math.floor(Values[key] / CheckSize * 100) }));
console.log(result);
