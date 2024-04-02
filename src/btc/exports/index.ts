import { ABIRegistry, Calldata } from '../universal/ABIRegistry';
import { Blockchain } from '../env';
import { Selector } from '../math/abi';
import { BytesWriter } from '../buffer/BytesWriter';
import { BTCContract } from '../contracts/BTCContract';
import { Address } from '../types/Address';
import { BytesReader } from '../buffer/BytesReader';

export function readMethod(method: Selector, contract: BTCContract | null, data: Uint8Array, caller: Address | null): Uint8Array {
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

export function readView(method: Selector, contract: BTCContract | null): Uint8Array {
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

export function getMethodABI(): Uint8Array {
    Blockchain.requireInitialization();

    return Blockchain.getMethodSelectors();
}

export function getRequiredStorage(): Uint8Array {
    Blockchain.requireInitialization();

    return Blockchain.writeRequiredStorage();
}

export function getModifiedStorage(): Uint8Array {
    Blockchain.requireInitialization();

    return Blockchain.storageToBytes();
}

export function loadStorage(data: Uint8Array): void {
    Blockchain.loadStorage(data);
}

export function purgeMemory(): void {
    Blockchain.purgeMemory();
}
