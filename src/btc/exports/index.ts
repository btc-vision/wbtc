import { ABIRegistry, Calldata } from '../universal/ABIRegistry';
import { Blockchain } from '../env';
import { Selector } from '../math/abi';
import { BytesWriter } from '../buffer/BytesWriter';
import { OP_NET } from '../contracts/OP_NET';
import { Address } from '../types/Address';
import { BytesReader } from '../buffer/BytesReader';

export function readMethod(method: Selector, contract: OP_NET | null, data: Uint8Array, caller: Address | null): Uint8Array {
    Blockchain.requireInitialization();

    const methodToCall = ABIRegistry.hasMethodBySelector(method, contract);
    if (!methodToCall) {
        throw new Error(`Method not found for selector ${method}`);
    }

    const calldata: Calldata = new BytesReader(data);
    const result: BytesWriter = methodToCall.callMethod(method, calldata, caller);

    return result.getBuffer();
}

export function INIT(owner: Address, contractAddress: Address): void {
    Blockchain.init(owner, contractAddress);
}

export function readView(method: Selector, contract: OP_NET | null): Uint8Array {
    Blockchain.requireInitialization();

    const methodToCall = ABIRegistry.hasSelectorForView(method, contract);
    if (!methodToCall) {
        throw new Error(`View not found for selector ${method}`);
    }

    const result: BytesWriter = methodToCall.callView(method);

    return result.getBuffer();
}

export function getViewABI(): Uint8Array {
    Blockchain.requireInitialization();

    return Blockchain.getViewSelectors();
}

export function getEvents(): Uint8Array {
    Blockchain.requireInitialization();

    return Blockchain.getEvents();
}

export function getMethodABI(): Uint8Array {
    Blockchain.requireInitialization();

    return Blockchain.getMethodSelectors();
}

export function getWriteMethods(): Uint8Array {
    Blockchain.requireInitialization();

    return Blockchain.getWriteMethods();
}

export function getModifiedStorage(): Uint8Array {
    Blockchain.requireInitialization();

    return Blockchain.storageToBytes();
}

export function initializeStorage(): Uint8Array {
    Blockchain.requireInitialization();

    return Blockchain.initializedStorageToBytes();
}

export function loadStorage(data: Uint8Array): void {
    Blockchain.loadStorage(data);
}

export function growMemory(pages: i32): i32 {
    return Blockchain.growMemory(pages);
}

export function allocateMemory(size: usize): usize {
    return Blockchain.allocateMemory(size);
}

export function deallocateMemory(pointer: i32): void {
    return Blockchain.deallocateMemory(pointer);
}

export function isInitialized(): boolean {
    return Blockchain.isInitialized;
}

export function purgeMemory(): void {
    Blockchain.purgeMemory();
}
