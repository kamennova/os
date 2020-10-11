/**
 * everything 1 byte length
 */
export type ClassPageHeader = {
    class: number,
    firstFree: number,
    freeNum: number,
    next: number,
    prev: number,
};

export const DescOrder: Array<keyof ClassPageHeader> = [
    "class", "firstFree", "freeNum", "next", "prev"
];

/** 1 byte prev
 *  1 byte next
 */
export type FreeClassBlock = {
    next: number,
    prev: number,
}

export const BlockOrder: Array<keyof FreeClassBlock> = [
    "next", "prev"
];

export const FREE_BLOCK_POINTERS_SIZE = 1,
    MAX_DESC_BLOCK_SIZE = 16,
    PAGE_DESC_SIZE = DescOrder.length,
    PAGE_SIZE = 32,
    BLOCK_CLASSES = [8, 16];

export type Address = number;
