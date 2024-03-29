// SO IN TYPESCRIPT, WE CAN NOT USE TWO METHOD WITH THE SAME NAME. SO NOT ADDING THE TYPE TO THE HASH IS A DESIGN CHOICE.
import { bytes32, bytes4 } from './bytes';
import { Sha256 } from './sha256';
import { MemorySlotPointer } from '../memory/MemorySlotPointer';

export type Selector = u32;

export function encodeSelector(name: string): Selector {
    const typed = Uint8Array.wrap(String.UTF8.encode(name));
    const hash = Sha256.hash(typed);

    return bytes4(hash);
}

export function encodePointer(str: string): MemorySlotPointer {
    const typed = Uint8Array.wrap(String.UTF8.encode(str));
    const hash = Sha256.hash(typed);

    return bytes32(hash);
}
