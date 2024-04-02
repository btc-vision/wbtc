import { ICBRC20 } from './interfaces/ICBRC20';
import { u256 } from 'as-bignum/assembly';
import { Address, PotentialAddress } from '../types/Address';
import { BytesWriter } from '../buffer/BytesWriter';
import { Calldata } from '../universal/ABIRegistry';
import { BTCContract } from './BTCContract';
import { AddressMemoryMap } from '../memory/AddressMemoryMap';
import { Revert } from '../types/Revert';
import { SafeMath } from '../types/SafeMath';
import { Blockchain } from '../env';
import { MemorySlotData } from '../memory/MemorySlot';
import { encodeSelector, Selector } from '../math/abi';
import { MultiAddressMemoryMap } from '../memory/MultiAddressMemoryMap';

export abstract class CBRC20 extends BTCContract implements ICBRC20 {
    public readonly decimals: u8 = 18;

    public readonly name: string = `CBRC20`;
    public readonly symbol: string = `CBRC20`;

    protected readonly allowanceMap: MultiAddressMemoryMap<Address, Address, MemorySlotData<u256>>;
    protected readonly balanceOfMap: AddressMemoryMap<Address, MemorySlotData<u256>>;

    protected constructor(self: Address, owner: Address) {
        super(self, owner);

        this.allowanceMap = new MultiAddressMemoryMap<Address, Address, MemorySlotData<u256>>(0, self);
        this.balanceOfMap = new AddressMemoryMap<Address, MemorySlotData<u256>>(1, self);

        this._totalSupply = Blockchain.getStorageAt(self, 2, u256.Zero, u256.Zero);
    }

    public _totalSupply: MemorySlotData<u256>;

    public get totalSupply(): u256 {
        return this._totalSupply;
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
        const resp = this._balanceOf(callData.readAddress());

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
        this.defineMethodSelector('allowance');
        this.defineMethodSelector('approve');
        this.defineMethodSelector('balanceOf');
        this.defineMethodSelector('burn');
        this.defineMethodSelector('mint');
        this.defineMethodSelector('transfer');
        this.defineMethodSelector('transferFrom');

        this.defineGetterSelector('decimals');
        this.defineGetterSelector('name');
        this.defineGetterSelector('symbol');
        this.defineGetterSelector('totalSupply');
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

    protected _balanceOf(owner: string): u256 {
        if (!this.balanceOfMap.has(owner)) return u256.Zero;

        return this.balanceOfMap.get(owner);
    }

    protected _burn(caller: Address, to: Address, value: u256): boolean {
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

        this._totalSupply = SafeMath.sub(this._totalSupply, value);
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

        this._totalSupply = SafeMath.add(this._totalSupply, value);
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

        return true;
    }

    protected _transferFrom(caller: Address, from: string, to: string, value: u256): boolean {
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

        return true;
    }
}
