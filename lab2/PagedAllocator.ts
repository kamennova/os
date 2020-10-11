import { Allocator } from "../common/Allocator";
import {
    Address,
    BLOCK_CLASSES,
    BlockOrder,
    ClassPageHeader,
    DescOrder,
    FreeClassBlock,
    MAX_DESC_BLOCK_SIZE,
    PAGE_DESC_SIZE,
    PAGE_SIZE
} from "./struct";

export class PagedAllocator implements Allocator<number[]> {
    public static readonly EmptyLink = -1;
    private static getBlockIndex = (addr: Address, classIndex: number) =>
        (addr - PAGE_SIZE) / BLOCK_CLASSES[classIndex];
    private static getBlockPageAddr = (index: number, classIndex: number) => index * BLOCK_CLASSES[classIndex];
    private view: DataView;
    private freePages: number[];
    private descPointers: Array<number | null>;
    private classPages: { [key: number]: Address | null };
    private readonly maxDescBlockSize: number;

    constructor(buffer: ArrayBuffer, maxDescBlockSize = MAX_DESC_BLOCK_SIZE) {
        this.maxDescBlockSize = maxDescBlockSize;
        this.view = new DataView(buffer);

        const pagesNum = Math.floor(buffer.byteLength / PAGE_SIZE);

        this.freePages = [];
        for (let i = 0; i < pagesNum; i++) {
            this.freePages.push(i);
        }

        this.descPointers = [];
        for (let i = 0; i < pagesNum; i++) {
            this.descPointers.push(null);
        }

        this.classPages = {};
        BLOCK_CLASSES.forEach((_elem, i) => this.classPages[i] = null);

        console.log('---Allocator info---');
        console.log('Pages num:', pagesNum, '| Space, bytes:', buffer.byteLength);
        console.log('--------------------');
    }

    private static getBlockClass(size: number) {
        let classIndex = 0;

        for (let i = 0; i < BLOCK_CLASSES.length; i++) {
            if (size <= BLOCK_CLASSES[i]) {
                classIndex = i;
                break;
            }
        }

        return classIndex;
    }

    private static getPageIndexByAddress(addr: Address): number {
        return Math.floor(addr / PAGE_SIZE);
    }

    private static isSetLink(link: Address): boolean {
        return link !== PagedAllocator.EmptyLink;
    }

    private static pageDescToArray(desc: ClassPageHeader): number[] {
        return DescOrder.map((key) => desc[key]);
    }

    public memAlloc(size: number): Address | null {
        if (size <= PAGE_SIZE / 2) {
            return this.allocateInClassBlock(PagedAllocator.getBlockClass(size));
        } else {
            return this.allocateInPages(Math.ceil(size / PAGE_SIZE));
        }
    }

    public memRealloc(addr: Address, size: number): Address | null {
        const newAddr = this.memAlloc(size);

        if (newAddr === null) {
            return null;
        }

        this.memCopy(addr, newAddr, size);
        this.memFree(addr);

        return newAddr;
    }

    public memFree(addr: Address) {
        const pageIndex = PagedAllocator.getPageIndexByAddress(addr),
            descAddr = this.getDescAddressOrThrowError(pageIndex);

        if (descAddr >= 0) {
            this.freeClassBlock(addr);
        } else {
            this.freeWholePages(pageIndex);
        }
    }

    public memDump(): void {
        console.log("====Mem dump====");

        let freeBytes = 0;

        Object.entries(this.classPages).forEach(([classIndex]) => {
            const freeBlocks = this.getFreeBlocksNum(Number(classIndex));
            freeBytes += freeBlocks * BLOCK_CLASSES[Number(classIndex)];
            console.log(`Free class ${classIndex} (${BLOCK_CLASSES[Number(classIndex)]}b) blocks:`, freeBlocks);
        });

        console.log('Whole block pages:', this.descPointers.filter(elem => elem !== null && elem < 0).length);
        console.log("Free pages ", this.freePages.length,
            "| Free memory, bytes:", freeBytes + this.freePages.length * PAGE_SIZE);
    }

    public setData(addr: Address, data: number[], size: number): void {
        switch (size) {
            case 1:
                return void this.view.setInt8(addr, data[0]);
            default:
                return void this.setLongData(addr, data, size);

        }
    }

    public getData(addr: Address, size: number): number[] {
        switch (size) {
            case 1:
                return [this.view.getInt8(addr)];
            default:
                return this.getLongData(addr, size);
        }
    }

    private getNewPageId(): number {
        const pageIds = this.descPointers.filter(el => el !== null && el < 0) as number[];

        return pageIds.length > 0 ? Math.min.apply(null, pageIds) - 1 : -1;
    }

    private isDescInSamePage(classIndex: number): boolean {
        const blockSize = BLOCK_CLASSES[classIndex];
        return blockSize >= PAGE_DESC_SIZE && blockSize <= this.maxDescBlockSize;
    }

    private availableBlocksNum(classIndex: number) {
        return Math.floor(PAGE_SIZE / BLOCK_CLASSES[classIndex]) -
            (this.isDescInSamePage(classIndex) ? 1 : 0);
    }

    private memCopy(oldAddr: Address, newAddr: Address, newSize: number): void {
        const data = this.getBlockData(oldAddr);
        this.setData(newAddr, data, newSize);
    }

    private getBlockData(addr: Address): number[] {
        const pageIndex = PagedAllocator.getPageIndexByAddress(addr),
            descAddr = this.getDescAddressOrThrowError(pageIndex);

        if (descAddr < 0) {
            const pages = this.getWholePageIndexes(pageIndex);
            return pages.map(index => this.getData(index * PAGE_SIZE, PAGE_SIZE))
                .reduce((acc, val) => acc.concat(val)); // flatten
        } else {
            const classIndex = this.getDescProperty("class", descAddr);
            return this.getData(addr, BLOCK_CLASSES[classIndex]);
        }
    }

    private freeClassBlock(addr: Address): void {
        const pageIndex = PagedAllocator.getPageIndexByAddress(addr),
            descAddr = this.getDescAddressOrThrowError(pageIndex),
            classIndex = this.getDescProperty('class', descAddr),
            blockIndex = PagedAllocator.getBlockIndex(addr, classIndex),
            freeNum = this.getDescProperty("freeNum", descAddr);

        this.clearData(addr, BLOCK_CLASSES[classIndex]); // clear block

        if (this.availableBlocksNum(classIndex) === freeNum + 1) {
            this.freeClassPage(pageIndex, classIndex);
        } else {
            this.addBlockToBlockList(addr, classIndex);

            if (freeNum === 0) { // page wasn't in classPages list
                this.addPageToPageList(pageIndex, classIndex);
            }

            this.setDescProperty("freeNum", descAddr, freeNum + 1);
            this.setDescProperty("firstFree", descAddr, blockIndex);
        }
    }

    private freeClassPage(pageIndex: number, classIndex: number) {
        const descAddr = this.getDescAddressOrThrowError(pageIndex),
            freeNum = this.getDescProperty("freeNum", descAddr);

        if (freeNum > 0) { // page is in classPages list
            this.excludePageFromPageList(pageIndex, classIndex);
        }

        // clear desc
        if (this.isDescInSamePage(classIndex)) {
            this.clearData(descAddr, PAGE_DESC_SIZE);
        } else {
            this.memFree(descAddr);
        }

        this.freePages.push(pageIndex);
    }

    private clearData(addr: Address, size: number) {
        for (let i = 0; i < size; i++) {
            this.setData(addr + i, [0], 1);
        }
    }

    private addBlockToBlockList(addr: Address, classIndex: number) {
        const pageIndex = PagedAllocator.getPageIndexByAddress(addr),
            descAddr = this.getDescAddressOrThrowError(pageIndex),
            firstFree = this.getDescProperty("firstFree", descAddr),
            freeNum = this.getDescProperty("freeNum", descAddr),
            next = freeNum === 0 ? PagedAllocator.EmptyLink : firstFree;

        this.setBlockProperty("prev", addr, PagedAllocator.EmptyLink);
        this.setBlockProperty("next", addr, next);

        if (PagedAllocator.isSetLink(next)) {
            const nextAddr = PagedAllocator.getBlockPageAddr(next, classIndex) + PAGE_SIZE * pageIndex;
            this.setBlockProperty("prev", nextAddr, PagedAllocator.getBlockIndex(addr, classIndex));
        }
    }

    private getLongData(addr: Address, size: number): number[] {
        const data = [];

        for (let i = 0; i < size; i++) {
            data.push(this.view.getInt8(addr + i));
        }

        return data;
    }

    private setLongData(addr: Address, data: number[], size: number) {
        for (let i = 0; i < size && i < data.length; i++) {
            this.view.setInt8(addr + i, data[i]);
        }
    }

    private getFreeBlocksNum(classIndex: number): number {
        let curr = this.classPages[classIndex],
            totalNum = 0;

        while (curr !== null) {
            const descAddr = this.getDescAddressOrThrowError(curr);

            totalNum += this.getDescProperty("freeNum", descAddr);
            const next = this.getDescProperty("next", descAddr);

            if (!PagedAllocator.isSetLink(next)) {
                break;
            }

            curr = next;
        }

        return totalNum;
    }

    private getFirstFreeBlockOfClass(classIndex: number): Address | null {
        const pageIndex = this.classPages[classIndex];

        if (pageIndex == null) {
            return null;
        }

        const pageDescAddr = this.descPointers[pageIndex];

        if (pageDescAddr === null) {
            throw Error('can not be null');
        }

        return PAGE_SIZE * pageIndex +
            this.getDescProperty("firstFree", pageDescAddr) * BLOCK_CLASSES[classIndex];
    }

    private allocateInClassBlock(classIndex: number): Address | null {
        const addr = this.getFreeBlockAddress(classIndex);

        if (addr === null) {
            return null;
        }

        this.occupyClassBlock(addr, classIndex);

        return addr;
    }

    private getFreeBlockAddress(classIndex: number): Address | null {
        const freeBlock = this.getFirstFreeBlockOfClass(classIndex);

        if (freeBlock !== null) {
            return freeBlock;
        } else if (this.freePages.length !== 0) {
            return this.getAddressInNewClassPage(classIndex);
        } else if (classIndex !== BLOCK_CLASSES.length - 1) {
            return this.getFreeBlockAddress(classIndex + 1);
        }

        console.log('No free space to accomodate ' + classIndex + ' class block');

        return null;
    }

    /**
     * 1) update page free blocks counter
     * 2) update firstFree
     * 3) if no free left, update list (physical and virtual)
     */
    private occupyClassBlock(addr: Address, classIndex: number): void {
        const pageIndex = PagedAllocator.getPageIndexByAddress(addr),
            descAddr = this.getDescAddressOrThrowError(pageIndex);

        const freeNum = this.getDescProperty("freeNum", descAddr);
        this.setDescProperty("freeNum", descAddr, freeNum - 1);

        if (freeNum === 1) { // no free blocks left
            this.excludePageFromPageList(pageIndex, classIndex);
        } else {
            this.updateFirstFree(descAddr, addr);
        }

        this.excludeBlockFromBlockList(addr, classIndex);
    }

    /**
     * Page is excluded from classPages list if it is fully occupied or if it's fully freed.
     */
    private excludePageFromPageList(pageIndex: number, classIndex: number): void {
        const descAddr = this.getDescAddressOrThrowError(pageIndex),
            next = this.getDescProperty("next", descAddr),
            prev = this.getDescProperty("prev", descAddr);

        if (this.classPages[classIndex] === pageIndex) {
            this.classPages[classIndex] = (PagedAllocator.isSetLink(next) ? next : null);
        }

        if (PagedAllocator.isSetLink(next)) { // update next's prev
            this.setDescProperty("prev", this.getDescAddressOrThrowError(next), prev);
        }

        if (PagedAllocator.isSetLink(prev)) { // update next's prev
            this.setDescProperty("next", this.getDescAddressOrThrowError(prev), next);
        }
    }

    private updateFirstFree(descAddr: number, oldFirstAddr: Address): void {
        const next = this.getBlockProperty("next", oldFirstAddr);
        this.setDescProperty("firstFree", descAddr, next);
    }

    private excludeBlockFromBlockList(addr: Address, classIndex: number) {
        const next = this.getBlockProperty("next", addr),
            pageIndex = PagedAllocator.getPageIndexByAddress(addr);

        if (PagedAllocator.isSetLink(next)) {
            const nextAddr = pageIndex * PAGE_SIZE + BLOCK_CLASSES[classIndex] * next;
            this.setBlockProperty("prev", nextAddr, PagedAllocator.EmptyLink);
        }

        this.setBlockProperty("next", addr, PagedAllocator.EmptyLink);
    }

    private getDescAddressOrThrowError(pageIndex: number): number {
        const addr = this.descPointers[pageIndex];

        if (addr === null) {
            throw Error('error');
        }

        return addr;
    }

    private getDescProperty(propName: keyof ClassPageHeader, descAddr: Address): number {
        if (propName === "next" || propName === "prev") {
            return this.view.getInt8(descAddr + DescOrder.indexOf(propName))
        } else {
            return this.view.getUint8(descAddr + DescOrder.indexOf(propName));
        }
    }

    private setDescProperty(propName: keyof ClassPageHeader, descAddr: Address, num: number): void {
        if (propName === "next" || propName === "prev") {
            this.view.setInt8(descAddr + DescOrder.indexOf(propName), num);
        } else {
            this.view.setUint8(descAddr + DescOrder.indexOf(propName), num);
        }
    }

    private getBlockProperty(propName: keyof FreeClassBlock, addr: Address): number {
        return this.view.getInt8(addr + BlockOrder.indexOf(propName));
    }

    private setBlockProperty(propName: keyof FreeClassBlock, addr: Address, num: number): void {
        this.view.setInt8(addr + BlockOrder.indexOf(propName), num);
    }

    private getAddressInNewClassPage(classIndex: number): Address {
        const pageIndex = this.freePages[0];
        const firstFreeIndex = this.createClassPage(classIndex);

        return pageIndex * PAGE_SIZE + BLOCK_CLASSES[classIndex] * firstFreeIndex;
    }

    private createClassPage(classIndex: number): number {
        const pageIndex = this.freePages.shift();

        if (pageIndex === undefined) {
            throw Error('free pages can not be 0');
        }

        this.writeBlocks(classIndex, pageIndex);
        const desc = this.writeDescription(classIndex, pageIndex);

        this.addPageToPageList(pageIndex, classIndex);

        return desc.firstFree;
    }

    private addPageToPageList(pageIndex: number, classIndex: number): void {
        const next = this.classPages[classIndex];

        if (next !== null) {
            // update next's prev
            const nextAddr = this.getDescAddressOrThrowError(next);
            this.setDescProperty("prev", nextAddr, pageIndex);

            // set this page's next
            const descAddr = this.getDescAddressOrThrowError(pageIndex);
            this.setDescProperty("next", descAddr, next);
        }

        this.classPages[classIndex] = pageIndex;
    }

    private writeBlocks(classIndex: number, pageIndex: number): void {
        const blockSize = BLOCK_CLASSES[classIndex],
            blocksNum = Math.floor((PAGE_SIZE) / blockSize);

        for (let i = 0; i < blocksNum; i++) {
            const addr = pageIndex * PAGE_SIZE + blockSize * i;

            this.setBlockProperty("prev", addr, i === 0 ? PagedAllocator.EmptyLink : i - 1);
            this.setBlockProperty("next", addr,
                i === blocksNum - 1 ? PagedAllocator.EmptyLink : i + 1);
        }
    }

    private writeDescription(classIndex: number, pageIndex: number): ClassPageHeader {
        const blockSize = BLOCK_CLASSES[classIndex],
            blocksNum = Math.floor(PAGE_SIZE / blockSize),
            inSamePage = this.isDescInSamePage(classIndex),
            firstClassPage = this.classPages[classIndex],
            desc = {
                class: classIndex,
                firstFree: inSamePage ? 1 : 0,
                freeNum: inSamePage ? blocksNum - 1 : blocksNum,
                next: firstClassPage !== null ? firstClassPage : PagedAllocator.EmptyLink,
                prev: PagedAllocator.EmptyLink,
            };

        const addr = inSamePage ? pageIndex * PAGE_SIZE : this.memAlloc(PAGE_DESC_SIZE);

        if (addr !== null) {
            this.setData(addr, PagedAllocator.pageDescToArray(desc), PAGE_DESC_SIZE);
        }

        this.descPointers[pageIndex] = addr;

        return desc;
    }

    private allocateInPages(pages: number): Address | null {
        if (this.freePages.length < pages) {
            return null;
        }

        return this.createWholePages(pages);
    }

    private createWholePages(num: number): Address { // todo?
        const pageIndexes = this.freePages.splice(0, num);
        const pageId = this.getNewPageId();
        pageIndexes.forEach(index => this.descPointers[index] = pageId);

        return pageIndexes[0] * PAGE_SIZE;
    }

    private freeWholePages(pageIndex: number): void {
        const pageIndexes = this.getWholePageIndexes(pageIndex);

        pageIndexes.forEach(index => {
            if (index === null) return;

            this.clearData(PAGE_SIZE * index, PAGE_SIZE);
            this.freePages.push(index);
            this.descPointers[index] = null;
        });
    }

    private getWholePageIndexes(pageIndex: number): number[] {
        const pageId = this.descPointers[pageIndex];
        return this.descPointers.map((pointer, i) => pointer === pageId ? i : null)
            .filter(el => el !== null) as number[];
    }
}
