import { Address } from '../btc/types/Address';
import { OP_0 } from '../btc/contracts/OP_0';
import { Calldata } from '../btc/universal/ABIRegistry';
import { BytesWriter } from '../btc/buffer/BytesWriter';
import { encodeSelector, Selector } from '../btc/math/abi';
import { u256 } from 'as-bignum/assembly';
import { StoredU256 } from '../btc/storage/StoredU256';
import { Blockchain } from '../btc/env';
import { AddressMemoryMap } from '../btc/memory/AddressMemoryMap';
import { MemorySlotData } from '../btc/memory/MemorySlot';
import { Revert } from '../btc/types/Revert';
import { SafeMath } from '../btc/types/SafeMath';
import { StakeEvent } from './events/StakeEvent';
import { ClaimEvent } from './events/ClaimEvent';
import { UnstakeEvent } from './events/UnstakeEvent';

export abstract class StackingOP0 extends OP_0 {
    private static readonly MINIMUM_STAKING_AMOUNT: u256 = u256.fromU32(10000); // 0.0001 WBTC
    private static readonly MINIMUM_STAKING_DURATION: u256 = u256.fromU32(1); //576
    private static readonly DURATION_MULTIPLIER: u256 = u256.fromU32(1); //2016
    private static readonly MAXIMUM_DURATION_MULTIPLIER: u256 = u256.fromU32(50); // 50x reward

    protected readonly stakingBalances: AddressMemoryMap<Address, MemorySlotData<u256>>;
    protected readonly stakingStartBlock: AddressMemoryMap<Address, MemorySlotData<u256>>;

    protected constructor(self: Address, owner: Address, maxSupply: u256) {
        super(self, owner, maxSupply);

        const rewardPool: u256 = Blockchain.getStorageAt(self, 4, u256.Zero, u256.Zero);
        this._rewardPool = new StoredU256(self, 4, u256.Zero, rewardPool);

        const totalStaked: u256 = Blockchain.getStorageAt(self, 5, u256.Zero, u256.Zero);
        this._totalStaked = new StoredU256(self, 5, u256.Zero, totalStaked);

        this.stakingBalances = new AddressMemoryMap<Address, MemorySlotData<u256>>(6, self, u256.Zero);
        this.stakingStartBlock = new AddressMemoryMap<Address, MemorySlotData<u256>>(7, self, u256.Zero);
    }

    public _rewardPool: StoredU256;

    public get rewardPool(): u256 {
        return this._rewardPool.value;
    }

    public _totalStaked: StoredU256;

    public get totalStaked(): u256 {
        return this._totalStaked.value;
    }

    public stake(callData: Calldata): BytesWriter {
        const staker: Address = Blockchain.callee();
        const amount: u256 = callData.readU256();

        if (amount < StackingOP0.MINIMUM_STAKING_AMOUNT) {
            throw new Revert('Too low');
        }

        const currentStaked: u256 = this.stakingBalances.get(staker);

        // Transfer WBTC from staker to contract
        const success = this._transfer(this.address, amount);
        if (!success) {
            throw new Revert('Transfer failed');
        }

        // Claim if possible
        this.claimReward(staker);

        const newBalance: u256 = SafeMath.sub(amount, currentStaked);

        // Record staking balance and start block
        this.stakingBalances.set(staker, newBalance);
        this.stakingStartBlock.set(staker, Blockchain.blockNumber);

        // @ts-ignore
        this._totalStaked += newBalance;

        this.createStakeEvent(newBalance);

        this.response.writeBoolean(true);
        return this.response;
    }

    public claim(callData: Calldata): BytesWriter {
        const staker: Address = Blockchain.callee();

        const success = this.claimReward(staker);
        if (!success) {
            throw new Revert('Claim failed');
        }

        this.response.writeBoolean(true);
        return this.response;
    }

    public unstake(callData: Calldata): BytesWriter {
        const staker: Address = callData.readAddress();

        const amount: u256 = this.stakingBalances.get(staker);
        if (amount.isZero()) {
            throw new Revert('No staked amount');
        }

        const duration: u256 = SafeMath.sub(Blockchain.blockNumber, this.stakingStartBlock.get(staker));
        if (duration < StackingOP0.MINIMUM_STAKING_DURATION) {
            throw new Revert('Too early');
        }

        // Claim if possible
        this.claimReward(staker);

        // Transfer WBTC from contract to staker
        const success = this._transfer(staker, amount);
        if (!success) {
            throw new Revert('Transfer failed');
        }

        // Reset staking balance and start block
        this.stakingBalances.set(staker, u256.Zero);
        this.stakingStartBlock.set(staker, u256.Zero);

        // @ts-ignore
        this._totalStaked -= amount;

        this.createUnstakeEvent(amount);

        this.response.writeBoolean(true);
        return this.response;
    }

    public override mint(callData: Calldata): BytesWriter {
        const resp = this._mint(callData.readAddress(), callData.readU256());
        const feeRecipients: Map<Address, u256> = callData.readAddressValueTuple();
        const stackingReward: u256 = callData.readU256();

        // Give fees to fee recipients
        const keys = feeRecipients.keys();
        for (let i = 0; i < keys.length; i++) {
            const key: Address = keys[i];
            const value: u256 = feeRecipients.get(key);

            this._mint(key, value);
        }

        // @ts-ignore
        this._rewardPool += stackingReward;

        this.response.writeBoolean(resp);

        return this.response;
    }

    public override burn(callData: Calldata): BytesWriter {
        const resp = this._burn(callData.readAddress(), callData.readU256());
        const feeRecipients: Map<Address, u256> = callData.readAddressValueTuple();
        const stackingReward: u256 = callData.readU256();

        // Give fees to fee recipients
        const keys = feeRecipients.keys();
        for (let i = 0; i < keys.length; i++) {
            const key: Address = keys[i];
            const value: u256 = feeRecipients.get(key);

            this._mint(key, value);
        }

        // @ts-ignore
        this._rewardPool += stackingReward;

        this.response.writeBoolean(resp);

        return this.response;
    }

    public stakedAmount(calldata: Calldata): BytesWriter {
        const staker: Address = calldata.readAddress();
        const amount: u256 = this.stakingBalances.get(staker);

        this.response.writeU256(amount);

        return this.response;
    }

    public stakedReward(calldata: Calldata): BytesWriter {
        const staker: Address = calldata.readAddress();
        const amount: u256 = this.stakingBalances.get(staker);
        const startBlock: u256 = this.stakingStartBlock.get(staker);
        const endBlock: u256 = Blockchain.blockNumber;

        const duration: u256 = SafeMath.sub(endBlock, startBlock);
        const reward: u256 = this.calculateReward(amount, duration);

        this.response.writeU256(reward);

        return this.response;
    }

    public callMethod(method: Selector, calldata: Calldata): BytesWriter {
        switch (method) {
            case encodeSelector('mint'): {
                return this.mint(calldata);
            }
            case encodeSelector('burn'): {
                return this.burn(calldata);
            }
            case encodeSelector('stake'): {
                return this.stake(calldata);
            }
            case encodeSelector('unstake'): {
                return this.unstake(calldata);
            }
            case encodeSelector('stakedAmount'): {
                return this.stakedAmount(calldata);
            }
            case encodeSelector('stakedReward'): {
                return this.stakedReward(calldata);
            }
            default: {
                return super.callMethod(method, calldata);
            }
        }
    }

    public callView(method: Selector): BytesWriter {
        switch (method) {
            case encodeSelector('rewardPool'): {
                this.response.writeU256(this.rewardPool);
                return this.response;
            }
            case encodeSelector('totalStaked'): {
                this.response.writeU256(this.totalStaked);
                return this.response;
            }
            default: {
                return super.callView(method);
            }
        }
    }

    public defineSelectors(): void {
        super.defineSelectors();

        this.defineMethodSelector('stake', true);
        this.defineMethodSelector('unstake', true);
        this.defineMethodSelector('stakedAmount', false);
        this.defineMethodSelector('stakedReward', false);

        this.defineGetterSelector('rewardPool', false);
        this.defineGetterSelector('totalStaked', false);
    }

    private claimReward(staker: Address): bool {
        if (!this.stakingStartBlock.has(staker)) return false;
        if (!this.stakingBalances.has(staker)) return false;

        const startBlock: u256 = this.stakingStartBlock.get(staker);
        const endBlock: u256 = Blockchain.blockNumber;
        const duration: u256 = SafeMath.sub(endBlock, startBlock);
        if (duration < StackingOP0.MINIMUM_STAKING_DURATION) {
            return false;
        }

        const currentStaked: u256 = this.stakingBalances.get(staker);
        let reward: u256 = this.calculateReward(currentStaked, duration);
        if (reward > this.rewardPool) {
            reward = this.rewardPool;
        }

        if (reward <= u256.Zero) {
            return false;
        }

        if (this._rewardPool.value < reward) {
            return false;
        }

        if (this._totalStaked.value < currentStaked) {
            return false;
        }

        // Transfer reward from contract to staker
        const success = this._transfer(staker, reward);
        if (!success) {
            return false;
        }

        // @ts-ignore
        this._rewardPool -= reward;

        // Reset staking balance and start block
        this.stakingStartBlock.set(staker, Blockchain.blockNumber);

        this.createClaimEvent(reward);

        return true;
    }

    private calculateReward(stakedAmount: u256, stakedDuration: u256): u256 {
        if (this.totalStaked.isZero()) return u256.Zero;

        const stakeProportion: u256 = SafeMath.div(stakedAmount, this.totalStaked);
        let durationMultiplier: u256 = SafeMath.div(stakedDuration, StackingOP0.DURATION_MULTIPLIER);
        if (durationMultiplier > StackingOP0.MAXIMUM_DURATION_MULTIPLIER) {
            durationMultiplier = StackingOP0.MAXIMUM_DURATION_MULTIPLIER;
        }

        return SafeMath.mul(SafeMath.mul(this.rewardPool, stakeProportion), durationMultiplier);
    }

    private createStakeEvent(value: u256): void {
        const burnEvent = new StakeEvent(value);

        this.emitEvent(burnEvent);
    }

    private createClaimEvent(value: u256): void {
        const event = new ClaimEvent(value);

        this.emitEvent(event);
    }

    private createUnstakeEvent(value: u256): void {
        const event = new UnstakeEvent(value);

        this.emitEvent(event);
    }
}
