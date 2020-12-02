import { hungaryAlgo } from "./MatrixAlgo";

const readline = require("readline");
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question("Enter matrix with size from 10 to 30: ", (input: string) => {
    console.log(`Solution is ${hungaryAlgo([])}`);
    rl.close();
});

rl.on("close", function () {
    process.exit(0);
});
