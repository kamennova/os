import { Allocator } from "../common/Allocator";
import { fillString } from "../common/helpers";
import { Address } from "../common/types";

const HEADER_SIZE_BYTES = 3;

type BlockHeader = {
    size: number, // in bytes
    isFree: boolean,
    prev: Address | null,
}

type Block = {
    header: BlockHeader,
    data: number | null,
}

/**
 * Blocks structure in memory buffer:
 * 1 byte - size
 * 1 byte - is free
 * 1 byte - previous block address
 * n bytes - data
 */
export class SimpleAllocator implements Allocator<number>{
    static getSizeBytes = (bits: number): number => Math.ceil(bits / 8);

    view: DataView;

    topBlock: Address | null = null;
    stackStart: Address = 0;
    stackSize: number;

    constructor(buffer: ArrayBuffer) {
        this.view = new DataView(buffer);
        this.stackSize = buffer.byteLength;
    }

    public memRealloc(addr: Address, sizeBits: number): Address | null {
        const newAddr = this.memAlloc(sizeBits);

        if (newAddr !== null) {
            console.log('Reallocating', newAddr);
            this.memCopy(addr, newAddr);
            this.memFree(addr);
        }

        return newAddr;
    }

    public memFree(addr: Address): void {
        const block = this.getBlock(addr);
        const prev = this.getBlock(block.header.prev);
        const next = this.getBlockNext(addr);

        if (prev !== null && next !== null && prev.header.isFree && next.header.isFree) {
            const newBlockSize = prev.header.size + block.header.size + next.header.size + HEADER_SIZE_BYTES * 2;
            this.expandBlock(block.header.prev, newBlockSize);
        } else if (prev !== null && prev.header.isFree) {
            const newBlockSize = prev.header.size + block.header.size + HEADER_SIZE_BYTES;
            this.expandBlock(block.header.prev, newBlockSize);
        } else if (next !== null && next.header.isFree) {
            const newBlockSize = block.header.size + next.header.size + HEADER_SIZE_BYTES;
            this.expandBlock(addr, newBlockSize);
        } else {
            this.setBlockData(block.header.size, addr, 0);
            this.setIsFree(addr, true);
        }
    };

    public expandBlock(addr: Address, newSize): void {
        this.setSize(addr, newSize);
        this.setBlockData(newSize, addr, 0);
        this.setIsFree(addr, true);

        const next = addr + HEADER_SIZE_BYTES + newSize;
        this.setPrev(next, addr);
    }

    public memDump(): void {
        console.log("=====MEM DUMP=====");
        console.log(`SIZE: ${this.stackSize}B FREE: ${this.stackSize - this.stackStart}B`);

        if (this.topBlock == null) {
            console.log('No blocks created yet');
        } else {
            this.dumpBlocks();
        }

        console.log("==================");
    }

    public memAlloc(sizeBits: number): Address | null {
        console.log('Allocating ' + sizeBits + ' bits');
        const size = Allocator.getSizeBytes(sizeBits);

        const freeBlockAddr = this.findFreeBlock(size);

        if (freeBlockAddr !== null) {
            return this.allocateInBlock(freeBlockAddr, size);
        }

        return this.allocateInNewBlock(size);
    }

    public setBlockData(size: number, addr: Address, data: number) {
        const data_addr = addr + 3;

        const num_str = data.toString(2);
        const filled = fillString(num_str, size * 8, '0');

        for (let i = 0; i < size; i++) {
            const piece_start = (size - i - 1) * 8;
            const piece = filled.slice(piece_start, piece_start + 8);

            const num = parseInt(piece, 2);

            this.view.setInt8(data_addr + size - 1 - i, num);
        }
    }

    public getData(size: number, addr: Address): number {
        const data_addr = addr + 3;

        let data = 0;

        for (let i = 0; i < size; i++) {
            data += this.view.getInt8(data_addr + size - 1 - i) * Math.pow(256, i);
        }

        return data;
    }

    private dumpBlocks(): void {
        console.log('ADR SIZE        STATE   PREV DATA');

        let currAddr = this.topBlock;

        while (currAddr !== null) {
            const block = this.getBlock(currAddr);

            const str = `${fillString(currAddr.toString(), 2, ' ')} | ` +
                `${fillString(block.header.size.toString(), 3, ' ')} + 3 B | ` +
                `${block.header.isFree ? 'free ' : 'taken'} | ` +
                `${fillString(block.header.prev == null ? '-' : block.header.prev.toString(), 2, ' ')} | ` +
                `${block.data}`;

            console.log(str);

            currAddr = block.header.prev;
        }
    }

    private getBlockNext(addr: Address): Block | null {
        let currAddr = this.topBlock;

        while (currAddr !== null) {
            const block = this.getBlock(currAddr);

            if (block.header.prev === addr) {
                return block;
            }

            currAddr = block.header.prev;
        }

        return null;
    }

    private getBlockNextAddress(addr: Address): Address | null {
        let currAddr = this.topBlock;

        while (currAddr !== null) {
            const block = this.getBlock(currAddr);

            if (block.header.prev === addr) {
                return currAddr;
            }

            currAddr = block.header.prev;
        }

        return null;
    }

    private memCopy(src: Address, dest: Address) {
        const data = this.getBlock(src).data;
        const blockSize = this.getBlock(dest).header.size;

        this.setBlockData(blockSize, dest, data);
    }

    private stackHasFreeSpace(sizeBits: number): boolean {
        return this.stackStart + sizeBits + HEADER_SIZE_BYTES <= this.stackSize;
    }

    private allocateInBlock(addr: Address, size: number): Address | null {
        const block = this.getBlock(addr);

        if (block.header.size > size + HEADER_SIZE_BYTES) {
            this.splitBlock(addr, block.header.size, size);
        }

        this.allocate(addr);

        return addr;
    }

    private allocateInNewBlock(size): Address | null {
        if (!this.stackHasFreeSpace(size)) {
            return null;
        }

        const addr = this.stackStart;

        this.createBlock(addr, size, this.topBlock || 0);
        this.updatePointers(addr, size);
        this.setIsFree(addr, false);

        return addr;
    }

    private splitBlock(addr: Address, oldSize: number, splitSize: number) {
        this.view.setInt8(addr, splitSize); // set updated size in block

        const newBlockAddr = addr + HEADER_SIZE_BYTES + splitSize;
        const newBlockSize = oldSize - splitSize - HEADER_SIZE_BYTES;

        this.createBlock(newBlockAddr, newBlockSize, addr);

        const nextAddr = this.getBlockNextAddress(addr);

        if (nextAddr !== null) {
            this.setPrev(nextAddr, newBlockAddr);
        }
    }

    private createBlock(addr: Address, size: number, prev: Address = 0): void {
        this.setSize(addr, size);
        this.setIsFree(addr, true);
        this.setPrev(addr, prev);
    }

    private updatePointers(topAddr: Address, topSize: number) {
        this.topBlock = topAddr;
        this.stackStart += topSize + HEADER_SIZE_BYTES;
    }

    private setSize(addr: Address, size: number): void {
        this.view.setInt8(addr, size);
    }

    private setIsFree(addr: Address, isFree: boolean): void {
        this.view.setInt8(addr + 1, isFree ? 1 : 0);
    }

    private setPrev(addr: Address, prev: Address): void {
        this.view.setInt8(addr + 2, prev);
    }

    private allocate(addr: Address): void {
        this.view.setInt8(addr + 1, 0); // set is free
    }

    private getBlock(addr: Address): Block | null {
        const size = this.view.getInt8(addr);

        if (size == 0) {
            return null;
        }

        return {
            header: {
                size,
                isFree: this.view.getInt8(addr + 1) == 1,
                prev: addr == 0 ? null : this.view.getInt8(addr + 2),
            },
            data: this.getData(size, addr),
        };
    }

    private findFreeBlock(size: number): Address | null {
        if (this.topBlock == null) {
            return null; // no blocks have been created yet
        }

        let bestBlock = null,
            blockAddress = null,
            currAddr = this.topBlock;

        while (currAddr !== null) {
            const block = this.getBlock(currAddr);

            if (block.header.isFree && block.header.size >= size &&
                (bestBlock == null || bestBlock.header.size > block.header.size)) {
                bestBlock = block;
                blockAddress = currAddr;
            }

            currAddr = block.header.prev;
        }

        return blockAddress;
    };
}
