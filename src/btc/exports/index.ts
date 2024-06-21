import { ABIRegistry, Calldata } from '../universal/ABIRegistry';
import { Blockchain } from '../env';
import { Selector } from '../math/abi';
import { BytesWriter } from '../buffer/BytesWriter';
import { OP_NET } from '../contracts/OP_NET';
import { BytesReader } from '../buffer/BytesReader';

export function readMethod(method: Selector, contract: OP_NET | null, data: Uint8Array): Uint8Array {
    const methodToCall = ABIRegistry.hasMethodBySelector(method, contract);
    if (!methodToCall) {
        throw new Error(`Method not found for selector ${method}`);
    }

    const calldata: Calldata = new BytesReader(data);
    const result: BytesWriter = methodToCall.callMethod(method, calldata);

    return result.getBuffer();
}

export function readView(method: Selector, contract: OP_NET | null): Uint8Array {
    const methodToCall = ABIRegistry.hasSelectorForView(method, contract);
    if (!methodToCall) {
        throw new Error(`View not found for selector ${method}`);
    }

    const result: BytesWriter = methodToCall.callView(method);
    return result.getBuffer();
}


export function getEvents(): Uint8Array {
    return Blockchain.getEvents();
}

export function getViewABI(): Uint8Array {
    return Blockchain.getViewSelectors();
}

export function getMethodABI(): Uint8Array {
    return Blockchain.getMethodSelectors();
}

export function getWriteMethods(): Uint8Array {
    return Blockchain.getWriteMethods();
}

export function getModifiedStorage(): Uint8Array {
    return Blockchain.storageToBytes();
}

export function initializeStorage(): Uint8Array {
    return Blockchain.initializedStorageToBytes();
}

export function loadStorage(data: Uint8Array): void {
    Blockchain.loadStorage(data);
}

export function loadCallsResponse(data: Uint8Array): void {
    Blockchain.loadCallsResponse(data);
}

export function getCalls(): Uint8Array {
    return Blockchain.getCalls();
}

export function setEnvironment(data: Uint8Array): void {
    Blockchain.setEnvironment(data);
}

export function purgeMemory(): void {
    Blockchain.purgeMemory();
}
