import { PagedAllocator } from "./PagedAllocator";
import { PAGE_SIZE } from "./struct";

const buffer = new ArrayBuffer(128);
const allocator = new PagedAllocator(buffer);

const addr1 = allocator.memAlloc(8);
const addr2 = allocator.memAlloc(16);
const addr3 = allocator.memAlloc(PAGE_SIZE * 2);

allocator.memDump();

if (addr1 === null || addr2 === null || addr3 === null) throw Error('should not be null');

allocator.memFree(addr1);
allocator.memRealloc(addr2, 8);
allocator.memDump();

allocator.memFree(addr3);
allocator.memDump();
