import {
    Address,
    ADDRESS_BYTE_LENGTH,
    BytesWriter,
    NetEvent,
} from '@btc-vision/btc-runtime/runtime';
import { u256 } from 'as-bignum/assembly';

export class WithdrawalRequestEvent extends NetEvent {
    constructor(amount: u256, address: Address) {
        const length: i32 = ADDRESS_BYTE_LENGTH + 32;
        const data: BytesWriter = new BytesWriter(length);
        data.writeAddress(address);
        data.writeU256(amount);

        super('WithdrawalRequest', data);
    }
}
