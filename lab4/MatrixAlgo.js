"use strict";
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
exports.__esModule = true;
exports.getProbability = void 0;
exports.getProbability = function (mSize) {
    hungaryAlgo([[7, 3, 6, 9, 5], [7, 5, 7, 5, 6], [7, 6, 8, 8, 9], [3, 1, 6, 5, 7], [2, 4, 9, 9, 5]]);
    return 0.6;
};
var hungaryAlgo = function (m) {
    console.log(m);
    var r1 = reduceRowsByMin(m);
    var curr = reduceColsByMin(r1);
    console.log(curr);
    console.log(isReady(curr));
    // curr = [[2, 4, 3, 0, 4], [0, 0, 0, 2, 1], [2, 1, 1, 1, 0], [4, 4, 1, 2, 0], [7, 3, 0, 0, 4]];
    var i = 0;
    while (!isReady(curr) && i < 3) {
        console.log(curr);
        i++;
        var _a = crossOutZeros(curr), rows = _a[0], cols = _a[1];
        if (rows.length === m.length || cols.length === m.length) {
            console.log('Method failed!');
            return;
        }
        console.log(rows, cols);
        var free = getFreeCoordinates(curr, rows, cols);
        console.log(free);
        var withValues = free.map(function (_a) {
            var row = _a.row, col = _a.col;
            return ({ value: curr[row][col], coord: { row: row, col: col } });
        });
        console.log(withValues);
        var min = Math.min.apply(null, withValues.map(function (_a) {
            var value = _a.value;
            return value;
        }));
        console.log(min);
        var m1 = extractFromCoords(curr, free, min);
        console.log(m1);
        var intersected = makeCoords(rows, cols);
        console.log(intersected);
        curr = addToCoords(m1, intersected, min);
        console.log(curr);
        console.log(isReady(curr));
    }
};
var applyToCoords = function (m, coords, f) {
    var copy = __spreadArrays(m);
    coords.forEach(function (_a) {
        var row = _a.row, col = _a.col;
        return copy[row][col] = f(m[row][col]);
    });
    return copy;
};
var extractFromCoords = function (m, coords, val) {
    return applyToCoords(m, coords, function (elem) { return elem - val; });
};
var addToCoords = function (m, coords, val) {
    return applyToCoords(m, coords, function (elem) { return elem + val; });
};
var getFreeCoordinates = function (m, rows, cols) {
    var freeCols = [];
    var freeRows = [];
    for (var i = 0; i < m.length; i++) {
        if (rows.indexOf(i) < 0) {
            freeRows.push(i);
        }
        if (cols.indexOf(i) < 0) {
            freeCols.push(i);
        }
    }
    return makeCoords(freeRows, freeCols);
};
var makeCoords = function (rows, cols) { return rows.map(function (row) { return cols.map(function (col) { return ({ row: row, col: col }); }); })
    .reduce(function (acc, val) { return acc.concat(val); }); };
/**
 * returns indexes of rows and cols with zeros crossed out most optimally
 * @param m
 */
var crossOutZeros = function (m) {
    var crossOutStep = function (rowsOut, colsOut) {
        if (rowsOut.length === m.length || colsOut.length === m.length) { // crossed out everything
            console.log('finished');
            return [rowsOut, colsOut];
        }
        var row = findMaxZerosRow(m, rowsOut, colsOut);
        var col = findMaxZerosCol(m, rowsOut, colsOut);
        console.log('---', row, col);
        if ((row === undefined || row.zeros === 0) && (col === undefined || col.zeros === 0)) {
            return [rowsOut, colsOut];
        }
        if (shouldCrossOutRow(m, row, col)) {
            console.log('cross out row');
            return crossOutStep(__spreadArrays(rowsOut, [row.index]), colsOut);
        }
        else {
            console.log('cross out col');
            return crossOutStep(rowsOut, __spreadArrays(colsOut, [col.index]));
        }
    };
    return crossOutStep([], []);
};
var shouldCrossOutRow = function (m, row, col) {
    return (col === undefined && row !== undefined) ||
        (row !== undefined && col !== undefined && (row.zeros > col.zeros ||
            row.zeros === col.zeros && includesCrossedOut(m, row, col)));
};
var includesCrossedOut = function (m, row, col) {
    console.log('here', m[row.index].filter(function (e) { return e === 0; }).length, getCol(m, col.index).filter(function (e) { return e === 0; }).length);
    return m[row.index].filter(function (e) { return e === 0; }).length > getCol(m, col.index).filter(function (e) { return e === 0; }).length;
};
var getCol = function (m, c) { return m.map(function (row) { return row[c]; }); };
var findMaxZerosRow = function (m, rowsOut, colsOut) {
    return m.map(function (row, index) { return ({
        zeros: row.filter(function (e, eI) { return e === 0 && colsOut.indexOf(eI) < 0 && rowsOut.indexOf(index) < 0; }).length,
        withCrossed: row.filter(function (e) { return e === 0; }).length,
        index: index
    }); }).sort(function (a, b) { return a.zeros === b.zeros ? a.withCrossed - b.withCrossed : a.zeros - b.zeros; })[m.length - 1];
};
var crossOutRow = function (m, i) { return m.splice(i, 1); };
var crossOutCol = function (m, i) { return rotateMatrix(crossOutRow(rotateMatrix(m), i)); };
var findMaxZerosCol = function (m, rowsOut, colsOut) { return findMaxZerosRow(rotateMatrix(m), colsOut, rowsOut); };
var isReady = function (m) {
    var rowsI = getSinglesInRows(m);
    var colsI = getSinglesInCols(m);
    return !coordinatesOverlap(__spreadArrays(rowsI, colsI));
};
var coordinatesOverlap = function (coords) {
    var _loop_1 = function (i) {
        if (coords.find(function (elem) { return elem.row === coords[i].row && elem.col !== coords[i].col ||
            elem.col === coords[i].col && elem.row !== coords[i].row; })) {
            return { value: true };
        }
    };
    for (var i = 0; i < coords.length; i++) {
        var state_1 = _loop_1(i);
        if (typeof state_1 === "object")
            return state_1.value;
    }
    return false;
};
var getSinglesInRows = function (m) { return m.map(function (row, i) { return ({ row: row, i: i }); })
    .filter(function (_a) {
    var row = _a.row;
    return row.filter(function (elem) { return elem === 0; }).length === 1;
})
    .map(function (_a) {
    var row = _a.row, i = _a.i;
    return ({ row: i, col: row.indexOf(0) });
}); };
var getSinglesInCols = function (m) { return getSinglesInRows(rotateMatrix(m))
    .map(function (_a) {
    var row = _a.row, col = _a.col;
    return ({ row: col, col: row });
}); };
var reduceRowsByMin = function (m) { return m.map(function (row) {
    var min = Math.min.apply(null, row);
    return row.map(function (elem) { return elem - min; });
}); };
var reduceColsByMin = function (m) { return rotateMatrix(reduceRowsByMin(rotateMatrix(m))); };
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
var rotateMatrix = function (m) {
    var newMatrix = [];
    for (var i = 0; i < m.length; i++) {
        var row = [];
        for (var a = 0; a < m.length; a++) {
            row.push(m[a][i]);
        }
        newMatrix.push(row);
    }
    return newMatrix;
};
