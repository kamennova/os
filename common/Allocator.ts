import { Address } from "./types";

export interface Allocator<Data> {
    getData(addr: Address, size: number): Data;

    setData(addr: Address, data: Data, size: number): void;

    memAlloc(size: number): Address | null;

    memRealloc(addr: Address, size: number): Address | null;

    memFree(addr: Address): void;
}
