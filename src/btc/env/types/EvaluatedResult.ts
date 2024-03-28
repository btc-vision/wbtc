import { MemorySlotPointer } from '../../memory/MemorySlotPointer';
import { Address } from '../../types/Address';

export interface EvaluatedResult {
    slots: Map<Address, Set<MemorySlotPointer>>,
    gas: u64
}
