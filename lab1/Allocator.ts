import { fill_string } from "../helpers";

const WORD_SIZE_BITS = 8;
const HEADER_SIZE_BYTES = 3;

type Address = number;

type BlockHeader = {
    size: number, // in bytes
    is_free: boolean,
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
export class Allocator {
    static getSizeBytes = (bits: number): number => Math.ceil(bits / WORD_SIZE_BITS);
    view: DataView;

    topBlock: Address | null = null;
    heapStart: Address = 0;
    heapSize: number;

    constructor(buffer: ArrayBuffer) {
        this.view = new DataView(buffer);
        this.heapSize = buffer.byteLength;
    }

    mem_realloc(addr: Address, size_bits: number): Address | null {
        const new_addr = this.mem_alloc(size_bits);

        if (new_addr !== null) {
            this.mem_copy(addr, new_addr);
            this.mem_free(addr);
        }

        return new_addr;
    }

    mem_copy(src: Address, dest: Address) {
        const data = this.get_block(src).data;
        const block_size = this.get_block(dest).header.size;

        this.set_data(block_size, dest + 3, data);
    }

    mem_free(addr: Address): void {
        const block = this.get_block(addr);

        this.set_data(block.header.size, addr + 3, 0);
        this.view.setInt8(addr + 1, 1);
    };

    mem_dump(): void {
        console.log("=====MEM DUMP=====");
        console.log(`SIZE: ${this.heapSize}B FREE: ${this.heapSize - this.heapStart}B`);

        if (this.topBlock == null) {
            console.log('No blocks created yet');
        } else {
            let curr_addr = this.topBlock;
            console.log('ADR SIZE      STATE   PREV DATA');

            while (curr_addr !== null) {
                const block = this.get_block(curr_addr);
                console.log(` ${curr_addr} | ${block.header.size} + 3 B | ${block.header.is_free ? 'free ' : 'taken'}` +
                    ` | ${block.header.prev} | ${block.data}`);

                curr_addr = block.header.prev;
            }
        }

        console.log("==================");
    }

    has_free_space(size_bits: number): boolean {
        return this.heapStart + size_bits + HEADER_SIZE_BYTES <= this.heapSize;
    }

    mem_alloc(size_bits: number): Address | null {
        console.log('Allocating ' + size_bits + ' bits');

        const size = Allocator.getSizeBytes(size_bits);

        if (this.has_free_space(size)) {
            const alloc_addr = this.heapStart;

            this.create_block(alloc_addr, size, this.topBlock || 0);

            this.topBlock = alloc_addr;
            this.heapStart += size + HEADER_SIZE_BYTES;

            return alloc_addr;
        } else {
            const alloc_addr = this.find_free_block(size);

            if (alloc_addr == null) {
                return null;
            }

            this.allocate(alloc_addr);

            return alloc_addr;
        }
    }

    create_block(addr: Address, size: number, prev: Address = 0): void {
        this.view.setInt8(addr, size); // set size
        this.view.setInt8(addr + 1, 0); // set is free
        this.view.setInt8(addr + 2, prev);
    }

    allocate(addr: Address): void {
        this.view.setInt8(addr + 1, 0); // set is free
    }

    get_block(addr: Address): Block | null {
        const size = this.view.getInt8(addr);

        if (size == 0) {
            return null;
        }

        return {
            header: {
                size,
                is_free: this.view.getInt8(addr + 1) == 1,
                prev: addr == 0 ? null : this.view.getInt8(addr + 2),
            },
            data: this.get_data(size, addr + 3),
        };
    }

    set_data(size: number, data_addr: Address, data: number) {
        const num_str = data.toString(2);
        const filled = fill_string(num_str, size * WORD_SIZE_BITS, '0');

        for (let i = 0; i < size; i++) {
            const piece_start = size * WORD_SIZE_BITS - WORD_SIZE_BITS * (i + 1);
            const piece = filled.slice(piece_start, piece_start + WORD_SIZE_BITS);

            const num = parseInt(piece, 2);

            this.view.setInt8(data_addr + size - 1 - i, num);
        }
    }

    get_data(size: number, data_addr: Address): number {
        let data = 0;

        for (let i = 0; i < size; i++) {
            data += this.view.getInt8(data_addr + size - 1 - i) * Math.pow(256, i);
        }

        return data;
    }

    find_free_block(size: number): Address | null {
        if (this.topBlock == null) {
            return null; // no blocks have been created yet
        }

        let curr_addr = this.topBlock;

        while (curr_addr !== null) {

            const block = this.get_block(curr_addr);

            if (block.header.is_free && block.header.size >= size) {
                return curr_addr;
            }

            curr_addr = block.header.prev;
        }

        return null;
    };
}
