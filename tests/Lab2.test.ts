import { clearBuffer } from "../common/helpers";
import { PagedAllocator } from "../lab2/PagedAllocator";
import { BLOCK_CLASSES, PAGE_DESC_SIZE, PAGE_SIZE } from "../lab2/struct";

const buffer1 = new ArrayBuffer(PAGE_SIZE),
    view1 = new DataView(buffer1);
const buffer2 = new ArrayBuffer(PAGE_SIZE * 2),
    view2 = new DataView(buffer2);

test('get free block address', () => {
    const allocator = new PagedAllocator(buffer1);

    expect(allocator['getFreeBlockAddress'](0)).toBe(8);
    clearBuffer(view1);
});

test('page desc to array', () => {
    const desc = {
        class: 0,
        firstFree: 1,
        freeNum: 7,
        next: PagedAllocator.EmptyLink,
        prev: 0,
    };

    expect(PagedAllocator['pageDescToArray'](desc)).toEqual([0, 1, 7, -1, 0]);
});

test('get & set data', () => {
    const allocator = new PagedAllocator(buffer1);

    const data1 = [0, 1, 2, 3, 4];
    const data2 = [12, 11, 10, 9, 8];

    allocator.setData(0, data1, 5);
    allocator.setData(8, data2, 5);
    expect(allocator.getData(0, 5)).toEqual(data1);
    expect(allocator.getData(8, 5)).toEqual(data2);
    clearBuffer(view1);
});

test('write description', () => {
    const allocator = new PagedAllocator(buffer1);

    allocator['writeDescription'](0, 0);
    expect(allocator.getData(0, PAGE_DESC_SIZE)).toEqual([0, 1, 3, -1, -1]);
    clearBuffer(view1);
});

test('mem alloc, desc in other page', () => {
    const allocator = new PagedAllocator(buffer2, 8);

    allocator.memAlloc(16);
    expect(allocator['freePages'].length).toBe(0);
    expect(allocator['classPages'][BLOCK_CLASSES.indexOf(8)]).toBe(1);

    clearBuffer(view2);
});

test('get free block address, in old page, in new page', () => {
    const allocator = new PagedAllocator(buffer2);

    allocator.memAlloc(8);
    expect(allocator['getFreeBlockAddress'](0)).toBe(16);
    expect(allocator['getFreeBlockAddress'](1)).toBe(PAGE_SIZE + 16);

    clearBuffer(view2);
});

test('get free blocks num', () => {
    const allocator = new PagedAllocator(buffer2);

    allocator.memAlloc(8);
    // -2 blocks for desc and allocated 1
    expect(allocator['getFreeBlocksNum'](BLOCK_CLASSES.indexOf(8))).toBe(PAGE_SIZE / 8 - 2);

    allocator.memAlloc(8);
    expect(allocator['getFreeBlocksNum'](BLOCK_CLASSES.indexOf(8))).toBe(PAGE_SIZE / 8 - 3);

    allocator.memAlloc(16);
    expect(allocator['getFreeBlocksNum'](BLOCK_CLASSES.indexOf(16))).toBe(PAGE_SIZE / 16 - 2);

    clearBuffer(view2);
});

test('mem free, free page fully, desc in same page', () => {
    const allocator = new PagedAllocator(buffer1);

    const addr = allocator.memAlloc(8);
    if (addr !== null) allocator.memFree(addr);

    expect(allocator['classPages'][BLOCK_CLASSES.indexOf(8)]).toBe(null);
    expect(allocator.getData(0, PAGE_DESC_SIZE)).toEqual([0, 0, 0, 0, 0]); // desc freed
    expect(allocator['freePages'].length).toBe(1);

    clearBuffer(view1);
});

test('mem free, free page fully, desc in other page', () => {
    const allocator = new PagedAllocator(buffer2, 8);

    const addr = allocator.memAlloc(16);
    if (addr !== null) allocator.memFree(addr);

    expect(allocator['classPages'][BLOCK_CLASSES.indexOf(8)]).toBe(null);
    expect(allocator.getData(PAGE_SIZE + 8, PAGE_DESC_SIZE)).toEqual([0, 0, 0, 0, 0]); // desc freed
    expect(allocator['freePages'].length).toBe(2);

    clearBuffer(view2);
});

test('mem realloc', () => {
    const allocator = new PagedAllocator(buffer2),
        addr = allocator.memAlloc(8);

    if (addr === null) throw Error('address shoouldnt be null');
    allocator.setData(addr, [2], 8);
    const newAddr = allocator.memRealloc(addr, 16);

    if (newAddr === null) throw Error('address shoouldnt be null');
    expect(allocator.getData(newAddr, 16)[0]).toBe(2);
    expect(allocator['freePages'].length).toBe(1); // first page is freed

    clearBuffer(view2);
});

test('mem alloc & free page-size', () => {
    const allocator = new PagedAllocator(buffer2);

    const addr = allocator.memAlloc(PAGE_SIZE * 2);
    if (addr === null) throw Error('Address should not be null');

    expect(addr).toBe(0);
    expect(allocator['freePages'].length).toBe(0);
    expect(allocator['descPointers']).toEqual([-1, -1]);

    allocator.memFree(addr);
    expect(allocator['freePages'].length).toBe(2);
    expect(allocator['descPointers']).toEqual([null, null]);

    clearBuffer(view2);
});

test('get new page id', () => {
    const allocator = new PagedAllocator(buffer2);

    expect(allocator['getNewPageId']()).toBe(-1);
    const addr = allocator.memAlloc(PAGE_SIZE);
    expect(allocator['getNewPageId']()).toBe(-2);

    if (addr === null) throw Error('Address should not be null');
    allocator.memFree(addr);
    expect(allocator['getNewPageId']()).toBe(-1);

    clearBuffer(view2);
});

test('mem realloc, whole page', () => {
    const allocator = new PagedAllocator(buffer2);
    const addr = allocator.memAlloc(PAGE_SIZE);

    if (addr === null) throw Error('Address should not be null');
    allocator.setData(addr, [1, 2, 3], 3);

    const newAddr = allocator.memRealloc(addr, PAGE_SIZE);
    if (newAddr === null) throw Error('New address should not be null');
    expect(newAddr).toBe(PAGE_SIZE);
    expect(allocator['freePages'].length).toBe(1);
    expect(allocator.getData(addr, 3)).toEqual([0, 0, 0]);
    expect(allocator.getData(newAddr, 3)).toEqual([1, 2, 3]);

    clearBuffer(view1);
});

test('links', () => {
    const allocator = new PagedAllocator(buffer2);
    const addr = allocator.memAlloc(8);
    if (addr === null) throw Error('Address should not be null');
    expect(allocator['getBlockProperty']('prev', 16)).toBe(PagedAllocator.EmptyLink);
    expect(allocator['getBlockProperty']('next', 24)).toBe(PagedAllocator.EmptyLink);
    clearBuffer(view2);
});
