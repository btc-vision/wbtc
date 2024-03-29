import { ABIRegistry, Calldata } from '../universal/ABIRegistry';
import { Blockchain } from '../env';
import { Selector } from '../math/abi';
import { BytesWriter } from '../buffer/BytesWriter';

export function read(method: Selector, calldata: Calldata): Uint8Array {
    Blockchain.requireInitialization();

    const methodToCall = ABIRegistry.hasMethodBySelector(method, null);
    if (!methodToCall) {
        throw new Error(`Method not found for selector ${method}`);
    }

    const result: BytesWriter = methodToCall.callMethod(method, calldata);

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
