import { u256 } from 'as-bignum/assembly';
import { StackingOP20 } from './StackingOP20';
import { WithdrawalRequestEvent } from '../events/WithdrawalRequestEvent';
import {
    Address,
    AddressMemoryMap,
    Blockchain,
    BytesWriter,
    Calldata,
    encodeSelector,
    MemorySlotData,
    Revert,
    SafeMath,
    Selector,
} from '@btc-vision/btc-runtime/runtime';

@final
export class wBTC extends StackingOP20 {
    protected readonly pendingWithdrawals: AddressMemoryMap<Address, MemorySlotData<u256>>;

    constructor() {
        super(u256.fromU64(2100000000000000), 8, 'Wrapped Bitcoin', 'WBTC');

        this.pendingWithdrawals = new AddressMemoryMap<Address, MemorySlotData<u256>>(Blockchain.nextPointer, u256.Zero);
    }

    public override callMethod(method: Selector, calldata: Calldata): BytesWriter {
        switch (method) {
            case encodeSelector('requestWithdrawal'):
                return this.requestWithdrawal(calldata);
            case encodeSelector('withdrawableBalanceOf'):
                return this.withdrawableBalanceOf(calldata);
            default:
                return super.callMethod(method, calldata);
        }
    }

    protected override _burn(value: u256, onlyOwner: boolean = true): boolean {
        if (u256.eq(value, u256.Zero)) {
            throw new Revert(`No tokens`);
        }

        const callee: Address = Blockchain.callee();
        if (onlyOwner) this.onlyOwner(callee);

        const caller = Blockchain.caller();
        if (this._totalSupply.value < value) throw new Revert(`Insufficient total supply.`);
        if (!this.pendingWithdrawals.has(caller)) throw new Revert('Empty');

        const balance: u256 = this.pendingWithdrawals.get(caller);
        if (balance < value) throw new Revert(`Insufficient balance`);

        const newBalance: u256 = SafeMath.sub(balance, value);
        this.pendingWithdrawals.set(caller, newBalance);

        // @ts-ignore
        this._totalSupply -= value;

        this.createBurnEvent(value);
        return true;
    }

    protected createWithdrawalRequestEvent(value: u256, address: Address): void {
        const withdrawalRequest: WithdrawalRequestEvent = new WithdrawalRequestEvent(value, address);

        this.emitEvent(withdrawalRequest);
    }

    private requestWithdrawal(calldata: Calldata): BytesWriter {
        const amount: u256 = calldata.readU256();

        return this._requestWithdrawal(amount);
    }

    private withdrawableBalanceOf(calldata: Calldata): BytesWriter {
        const address: Address = calldata.readAddress();

        const balance = this._withdrawableBalanceOf(address);
        const writer: BytesWriter = new BytesWriter();
        writer.writeU256(balance);

        return writer;
    }

    private _withdrawableBalanceOf(address: Address): u256 {
        if (this.pendingWithdrawals.has(address)) {
            return this.pendingWithdrawals.get(address);
        }

        return u256.Zero;
    }

    private _requestWithdrawal(requestedAmount: u256): BytesWriter {
        const callee: Address = Blockchain.callee();
        const currentBalance: u256 = this._balanceOf(callee);
        if (currentBalance < requestedAmount) {
            throw new Revert('Insufficient funds');
        }

        let currentPendingBalance: u256 = u256.Zero;
        if (this.pendingWithdrawals.has(callee)) {
            currentPendingBalance = this.pendingWithdrawals.get(callee);
        }

        const balanceLeft: u256 = SafeMath.sub(currentBalance, requestedAmount);
        this.balanceOfMap.set(callee, balanceLeft);

        let total = SafeMath.add(requestedAmount, currentPendingBalance);
        this.pendingWithdrawals.set(callee, total);

        this.createWithdrawalRequestEvent(requestedAmount, callee);

        const writer: BytesWriter = new BytesWriter();
        writer.writeBoolean(true);

        return writer;
    }

}
