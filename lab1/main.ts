import { SimpleAllocator } from "./Allocator";

const HEAP_SIZE_BYTES = 20;

const buffer = new ArrayBuffer(HEAP_SIZE_BYTES);
const allocator = new SimpleAllocator(buffer);
const addr1 = allocator.memAlloc(24);
const addr2 = allocator.memAlloc(45);
const addr3 = allocator.memAlloc(14);
allocator.memDump();
allocator.memFree(addr3);
allocator.memFree(addr1);
allocator.memDump();
allocator.memAlloc(3);
allocator.memDump();
allocator.memAlloc(3);
allocator.memRealloc(0, 12);
allocator.memDump();
