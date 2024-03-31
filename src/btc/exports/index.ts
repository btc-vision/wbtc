import { ABIRegistry, Calldata } from '../universal/ABIRegistry';
import { Blockchain } from '../env';
import { Selector } from '../math/abi';
import { BytesWriter } from '../buffer/BytesWriter';
import { BTCContract } from '../contracts/BTCContract';
import { Address } from '../types/Address';

export function readMethod(method: Selector, contract: BTCContract | null, calldata: Calldata, caller: Address | null): Uint8Array {
    Blockchain.requireInitialization();

    const methodToCall = ABIRegistry.hasMethodBySelector(method, contract);
    if (!methodToCall) {
        throw new Error(`Method not found for selector ${method}`);
    }

    const result: BytesWriter = methodToCall.callMethod(method, calldata, caller);

    return result.getBuffer();
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
