type Matrix = Array<number[]>;
type Coordinate = { row: number, col: number };

export const hungaryAlgo = (m: Matrix) => {
    const r1 = reduceRowsByMin(m);
    let curr = reduceColsByMin(r1);

    while (!isReady(curr)) {
        const [rows, cols] = crossOutZeros(curr);

        if (rows.length === m.length || cols.length === m.length) {
            console.log('Method failed!');
            return;
        }

        const free = getFreeCoordinates(curr, rows, cols);
        const withValues = free.map(({ row, col }) => ({ value: curr[row][col], coord: { row, col } }));
        const min = Math.min.apply(null, withValues.map(({ value }) => value));
        const m1 = extractFromCoords(curr, free, min);
        const intersected = makeCoords(rows, cols);
        curr = addToCoords(m1, intersected, min);
    }

    return solution(curr);
};

const solution = (m: Matrix): Coordinate[] => {
    const rowsI = getSinglesInRows(m);
    const colsI = getSinglesInCols(m);

    return rowsI;
};

const applyToCoords = (m: Matrix, coords: Coordinate[], f: (v: number) => number): Matrix => {
    const copy: Matrix = [...m];

    coords.forEach(({ row, col }) => copy[row][col] = f(m[row][col]));

    return copy;
};

const extractFromCoords = (m: Matrix, coords: Coordinate[], val: number): Matrix =>
    applyToCoords(m, coords, (elem) => elem - val);

const addToCoords = (m: Matrix, coords: Coordinate[], val: number): Matrix =>
    applyToCoords(m, coords, (elem) => elem + val);

const getFreeCoordinates = (m: Matrix, rows: number[], cols: number[]): Coordinate[] => {
    const freeCols: number[] = [];
    const freeRows: number[] = [];

    for (let i = 0; i < m.length; i++) {
        if (rows.indexOf(i) < 0) {
            freeRows.push(i);
        }

        if (cols.indexOf(i) < 0) {
            freeCols.push(i);
        }
    }

    return makeCoords(freeRows, freeCols);
};

const makeCoords = (rows: number[], cols: number[]): Coordinate[] => rows.map(
    row => cols.map(col => ({ row, col })))
    .reduce((acc, val) => acc.concat(val));

type Cross = { zeros: number, index: number };

/**
 * returns indexes of rows and cols with zeros crossed out most optimally
 * @param m
 */
const crossOutZeros = (m: Matrix): [number[], number[]] => {
    const crossOutStep = (rowsOut: number[], colsOut: number[]): [number[], number[]] => {
        if (rowsOut.length === m.length || colsOut.length === m.length) { // crossed out everything
            return [rowsOut, colsOut];
        }

        const row = findMaxZerosRow(m, rowsOut, colsOut);
        const col = findMaxZerosCol(m, rowsOut, colsOut);

        if ((row === undefined || row.zeros === 0) && (col === undefined || col.zeros === 0)) {
            return [rowsOut, colsOut];
        }

        if (shouldCrossOutRow(m, row, col)) {
            return crossOutStep([...rowsOut, row.index], colsOut);
        } else {
            return crossOutStep(rowsOut, [...colsOut, col.index]);
        }
    };

    return crossOutStep([], []);
};

const shouldCrossOutRow = (m: Matrix, row?: Cross, col?: Cross): boolean =>
    (col === undefined && row !== undefined) ||
    (row !== undefined && col !== undefined && (row.zeros > col.zeros ||
        row.zeros === col.zeros && includesCrossedOut(m, row, col)));

const includesCrossedOut = (m: Matrix, row: Cross, col: Cross) => m[row.index]
    .filter(e => e === 0).length > getCol(m, col.index).filter(e => e === 0).length;


const getCol = (m: Matrix, c: number): number[] => m.map(row => row[c]);

const findMaxZerosRow = (m: Matrix, rowsOut: number[], colsOut: number[]): Cross =>
    m.map(
        (row, index) => ({
            zeros: row.filter((e, eI) => e === 0 && colsOut.indexOf(eI) < 0 && rowsOut.indexOf(index) < 0).length,
            withCrossed: row.filter(e => e === 0).length,
            index
        })).sort((a, b) => a.zeros === b.zeros ? a.withCrossed - b.withCrossed : a.zeros - b.zeros)[m.length - 1];

const findMaxZerosCol = (m: Matrix, rowsOut: number[], colsOut: number[]) => findMaxZerosRow(rotateMatrix(m), colsOut, rowsOut);

const isReady = (m: Matrix): boolean => {
    const rowsI = getSinglesInRows(m);
    const colsI = getSinglesInCols(m);

    return !coordinatesOverlap([...rowsI, ...colsI]);
};

const coordinatesOverlap = (coords: Coordinate[]): boolean => {
    for (let i = 0; i < coords.length; i++) {
        if (coords.find(elem => elem.row === coords[i].row && elem.col !== coords[i].col ||
            elem.col === coords[i].col && elem.row !== coords[i].row)) {
            return true;
        }
    }

    return false;
};

const getSinglesInRows = (m: Matrix): Coordinate[] => m.map((row, i) => ({ row, i }))
    .filter(({ row }) => row.filter(elem => elem === 0).length === 1)
    .map(({ row, i }) => ({ row: i, col: row.indexOf(0) }));

const getSinglesInCols = (m: Matrix): Coordinate[] => getSinglesInRows(rotateMatrix(m))
    .map(({ row, col }) => ({ row: col, col: row }));

const reduceRowsByMin = (m: Matrix): Matrix => m.map(row => {
    const min = Math.min.apply(null, row);
    return row.map(elem => elem - min);
});

const reduceColsByMin = (m: Matrix): Matrix => rotateMatrix(reduceRowsByMin(rotateMatrix(m)));

/**
 * [[1, 2, 3],
 *  [4, 5, 6],
 *  [7, 8, 9]] to
 *
 * [[1, 4, 7],
 *  [2, 5, 8],
 *  [3, 6, 9]]
 *
 * @param m
 */
const rotateMatrix = (m: Matrix): Matrix => {
    const newMatrix = [];

    for (let i = 0; i < m.length; i++) {
        const row = [];

        for (let a = 0; a < m.length; a++) {
            row.push(m[a][i]);
        }

        newMatrix.push(row);
    }

    return newMatrix;
};
