import { Allocator } from "./Allocator";

const HEAP_SIZE_BYTES = 10;

const buffer = new ArrayBuffer(HEAP_SIZE_BYTES);
const allocator = new Allocator(buffer);
allocator.mem_dump();
const addr1 = allocator.mem_alloc(14);
allocator.set_data(2, addr1 + 3, 289);
allocator.mem_dump();
const addr2 = allocator.mem_realloc(addr1, 14);
allocator.mem_dump();
allocator.mem_free(addr2);
allocator.mem_dump();
