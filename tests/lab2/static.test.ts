import { PagedAllocator } from "../../lab2/PagedAllocator";
import { ClassPageHeader, PAGE_SIZE } from "../../lab2/struct";

test('get block class', () => {
    expect(PagedAllocator['getBlockClass'](16)).toBe(1);
    expect(PagedAllocator['getBlockClass'](8)).toBe(0);
});

test('get block page address', () => {
    expect(PagedAllocator['getBlockAddressInPage'](3, 0)).toBe(3 * 8);
    expect(PagedAllocator['getBlockAddressInPage'](0, 1)).toBe(0);
});

test('get page index', () => {
    expect(PagedAllocator['getPageIndexByAddress'](0)).toBe(0);
    expect(PagedAllocator['getPageIndexByAddress'](PAGE_SIZE * 3)).toBe(3);
});

test('page description to array', () => {
    const desc: ClassPageHeader = {
        class: 0,
        next: 2,
        firstFree: 1,
        freeNum: 5,
        prev: 0,
    };
    expect(PagedAllocator['pageDescToArray'](desc)).toEqual([0, 1, 5, 2, 0]);
});
