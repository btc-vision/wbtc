import {
    Address,
    ADDRESS_BYTE_LENGTH,
    BytesWriter,
    NetEvent,
} from '@btc-vision/btc-runtime/runtime';
import { u256 } from 'as-bignum/assembly';

export class WithdrawalRequestEvent extends NetEvent {
    constructor(amount: u256, address: Address) {
        const data: BytesWriter = new BytesWriter(ADDRESS_BYTE_LENGTH + 32);
        data.writeAddress(address);
        data.writeU256(amount);

        super('WithdrawalRequest', data);
    }
}
