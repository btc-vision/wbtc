import { IOP_0 } from './interfaces/IOP_0';
import { u256 } from 'as-bignum/assembly';
import { Address, PotentialAddress } from '../types/Address';
import { BytesWriter } from '../buffer/BytesWriter';
import { Calldata } from '../universal/ABIRegistry';
import { OP_NET } from './OP_NET';
import { AddressMemoryMap } from '../memory/AddressMemoryMap';
import { Revert } from '../types/Revert';
import { SafeMath } from '../types/SafeMath';
import { Blockchain } from '../env';
import { MemorySlotData } from '../memory/MemorySlot';
import { encodeSelector, Selector } from '../math/abi';
import { MultiAddressMemoryMap } from '../memory/MultiAddressMemoryMap';
import { StoredU256 } from '../storage/StoredU256';
import { MintEvent } from '../../contract/events/MintEvent';
import { TransferEvent } from '../../contract/events/TransferEvent';
import { BurnEvent } from '../../contract/events/BurnEvent';

export abstract class OP_0 extends OP_NET implements IOP_0 {
    public readonly decimals: u8 = 8;

    public readonly name: string = `OP_20`;
    public readonly symbol: string = `OP`;

    protected readonly allowanceMap: MultiAddressMemoryMap<Address, Address, MemorySlotData<u256>>;
    protected readonly balanceOfMap: AddressMemoryMap<Address, MemorySlotData<u256>>;

    protected constructor(self: Address, owner: Address) {
        super(self, owner);

        this.allowanceMap = new MultiAddressMemoryMap<Address, Address, MemorySlotData<u256>>(1, self, u256.Zero);
        this.balanceOfMap = new AddressMemoryMap<Address, MemorySlotData<u256>>(2, self, u256.Zero);

        const supply: u256 = Blockchain.getStorageAt(self, 3, u256.Zero, u256.Zero);
        this._totalSupply = new StoredU256(self, 3, u256.Zero, supply);
    }

    public _totalSupply: StoredU256;

    public get totalSupply(): u256 {
        return this._totalSupply.value;
    }

    /** METHODS */
    public allowance(callData: Calldata): BytesWriter {
        const resp = this._allowance(callData.readAddress(), callData.readAddress());

        this.response.writeU256(resp);

        return this.response;
    }

    public approve(callData: Calldata, caller: Address): BytesWriter {
        const resp = this._approve(caller, callData.readAddress(), callData.readU256());

        this.response.writeBoolean(resp);

        return this.response;
    }

    public balanceOf(callData: Calldata): BytesWriter {
        const address: Address = callData.readAddress();
        const resp = this._balanceOf(address);

        this.response.writeU256(resp);

        return this.response;
    }

    public burn(callData: Calldata, caller: Address): BytesWriter {
        const resp = this._burn(caller, callData.readAddress(), callData.readU256());

        this.response.writeBoolean(resp);

        return this.response;
    }

    public mint(callData: Calldata, caller: Address): BytesWriter {
        const resp = this._mint(caller, callData.readAddress(), callData.readU256());

        this.response.writeBoolean(resp);

        return this.response;
    }

    public transfer(callData: Calldata, caller: Address): BytesWriter {
        const resp = this._transfer(caller, callData.readAddress(), callData.readU256());

        this.response.writeBoolean(resp);

        return this.response;
    }

    public transferFrom(callData: Calldata, caller: Address): BytesWriter {
        const resp = this._transferFrom(caller, callData.readAddress(), callData.readAddress(), callData.readU256());

        this.response.writeBoolean(resp);

        return this.response;
    }

    public defineSelectors(): void {
        this.defineMethodSelector('allowance', false);
        this.defineMethodSelector('approve', true);
        this.defineMethodSelector('balanceOf', false);
        this.defineMethodSelector('burn', true);
        this.defineMethodSelector('mint', true);
        this.defineMethodSelector('transfer', true);
        this.defineMethodSelector('transferFrom', true);

        this.defineGetterSelector('decimals', false);
        this.defineGetterSelector('name', false);
        this.defineGetterSelector('symbol', false);
        this.defineGetterSelector('totalSupply', false);
    }

    public callMethod(method: Selector, calldata: Calldata, _caller: PotentialAddress = null): BytesWriter {
        switch (method) {
            case encodeSelector('allowance'):
                return this.allowance(calldata);
            case encodeSelector('approve'):
                return this.approve(calldata, _caller as Address);
            case encodeSelector('balanceOf'):
                return this.balanceOf(calldata);
            case encodeSelector('burn'):
                return this.burn(calldata, _caller as Address);
            case encodeSelector('mint'):
                return this.mint(calldata, _caller as Address);
            case encodeSelector('transfer'):
                return this.transfer(calldata, _caller as Address);
            case encodeSelector('transferFrom'):
                return this.transferFrom(calldata, _caller as Address);
            default:
                return super.callMethod(method, calldata, _caller);
        }
    }

    public callView(method: Selector): BytesWriter {
        switch (method) {
            case encodeSelector('decimals'):
                this.response.writeU8(this.decimals);
                break;
            case encodeSelector('name'):
                this.response.writeString(this.name);
                break;
            case encodeSelector('symbol'):
                this.response.writeString(this.symbol);
                break;
            case encodeSelector('totalSupply'):
                this.response.writeU256(this.totalSupply);
                break;
            default:
                return super.callView(method);
        }

        return this.response;
    }

    /** REDEFINED METHODS */
    protected _allowance(owner: string, spender: string): u256 {
        const senderMap = this.allowanceMap.get(owner);
        if (!senderMap.has(spender)) throw new Revert();

        return senderMap.get(spender);
    }

    protected _approve(caller: Address, spender: string, value: u256): boolean {
        const senderMap = this.allowanceMap.get(caller);
        senderMap.set(spender, value);

        return true;
    }

    protected _balanceOf(owner: Address): u256 {
        const hasAddress = this.balanceOfMap.has(owner);
        if (!hasAddress) return u256.Zero;

        return this.balanceOfMap.get(owner);
    }

    protected _burn(caller: Address, to: Address, value: u256): boolean {
        if (this._totalSupply.value < value) throw new Revert('Insufficient total supply');

        if (!this.balanceOfMap.has(to)) throw new Revert();

        if (caller === to) {
            throw new Revert(`Cannot burn tokens for ${to} from ${to} account`);
        }

        if (u256.eq(value, u256.Zero)) {
            throw new Revert(`Cannot burn 0 tokens`);
        }

        const balance: u256 = this.balanceOfMap.get(to);
        if (balance < value) throw new Revert(`Insufficient balance`);

        const newBalance: u256 = SafeMath.sub(balance, value);
        this.balanceOfMap.set(to, newBalance);

        // @ts-ignore
        this._totalSupply -= value;

        this.createBurnEvent(value);
        return true;
    }

    protected _mint(caller: Address, to: Address, value: u256): boolean {
        if (this.isSelf(caller)) throw new Revert('Can not mint from self account');

        this.onlyOwner(caller);

        if (!this.balanceOfMap.has(to)) {
            this.balanceOfMap.set(to, value);
        } else {
            const toBalance: u256 = this.balanceOfMap.get(to);
            const newToBalance: u256 = SafeMath.add(toBalance, value);

            this.balanceOfMap.set(to, newToBalance);
        }

        // @ts-ignore
        this._totalSupply += value;

        this.createMintEvent(to, value);
        return true;
    }

    protected _transfer(caller: Address, to: string, value: u256): boolean {
        if (!this.balanceOfMap.has(caller)) throw new Revert();

        if (this.isSelf(caller)) throw new Revert('Can not transfer from self account');

        if (caller === to) {
            throw new Revert(`Cannot transfer tokens to ${to} from ${to} account`);
        }

        if (u256.eq(value, u256.Zero)) {
            throw new Revert(`Cannot transfer 0 tokens`);
        }

        const balance: u256 = this.balanceOfMap.get(caller);
        if (balance < value) throw new Revert(`Insufficient balance`);

        const newBalance: u256 = SafeMath.sub(balance, value);
        this.balanceOfMap.set(caller, newBalance);

        if (!this.balanceOfMap.has(to)) {
            this.balanceOfMap.set(to, value);
        } else {
            const toBalance: u256 = this.balanceOfMap.get(to);
            const newToBalance: u256 = SafeMath.add(toBalance, value);

            this.balanceOfMap.set(to, newToBalance);
        }

        this.createTransferEvent(caller, to, value);

        return true;
    }

    protected _transferFrom(caller: Address, from: Address, to: Address, value: u256): boolean {
        if (!this.allowanceMap.has(from)) throw new Revert();

        const fromAllowanceMap = this.allowanceMap.get(from);
        const allowed: u256 = fromAllowanceMap.get(caller);
        if (allowed < value) throw new Revert(`Insufficient allowance`);

        if (this.isSelf(caller)) throw new Revert('Can not transfer from self account');

        const senderMap = this.allowanceMap.get(from);
        if (!senderMap.has(caller)) throw new Revert();

        const allowance: u256 = senderMap.get(caller);
        if (allowance < value) throw new Revert(`Insufficient allowance`);

        const balance: u256 = this.balanceOfMap.get(from);
        if (balance < value) throw new Revert(`Insufficient balance`);

        const newAllowance: u256 = SafeMath.sub(allowance, value);
        const newBalance: u256 = SafeMath.sub(balance, value);

        senderMap.set(caller, newAllowance);
        this.balanceOfMap.set(from, newBalance);

        if (!this.balanceOfMap.has(to)) {
            this.balanceOfMap.set(to, value);
        } else {
            const toBalance: u256 = this.balanceOfMap.get(to);
            const newToBalance: u256 = SafeMath.add(toBalance, value);

            this.balanceOfMap.set(to, newToBalance);
        }

        this.createTransferEvent(from, to, value);

        return true;
    }

    private createMintEvent(owner: Address, value: u256): void {
        const mintEvent = new MintEvent(owner, value);

        this.emitEvent(mintEvent);
    }

    private createTransferEvent(from: Address, to: Address, value: u256): void {
        const transferEvent = new TransferEvent(from, to, value);

        this.emitEvent(transferEvent);
    }

    private createBurnEvent(value: u256): void {
        const burnEvent = new BurnEvent(value);

        this.emitEvent(burnEvent);
    }
}
