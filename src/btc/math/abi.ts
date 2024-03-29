// SO IN TYPESCRIPT, WE CAN NOT USE TWO METHOD WITH THE SAME NAME. SO NOT ADDING THE TYPE TO THE HASH IS A DESIGN CHOICE.
import { bytes4 } from './bytes';

export type Selector = u32;

export function encodeSelector(name: string): Selector {
    const typed = Uint8Array.wrap(String.UTF8.encode(name));

    return bytes4(typed);
}
