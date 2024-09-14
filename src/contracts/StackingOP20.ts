import { u256 } from 'as-bignum/assembly';
import {
    Address,
    AddressMemoryMap,
    Blockchain,
    BytesWriter,
    Calldata,
    ClaimEvent,
    encodeSelector,
    Map,
    MemorySlotData,
    OP_20,
    Revert,
    SafeMath,
    Selector,
    StakeEvent,
    StoredU256,
    UnstakeEvent,
} from '@btc-vision/btc-runtime/runtime';

export abstract class StackingOP20 extends OP_20 {
    private static readonly MINIMUM_STAKING_AMOUNT: u256 = u256.fromU32(10000); // 0.0001 WBTC
    private static readonly MINIMUM_STAKING_DURATION: u256 = u256.fromU32(576);
    private static readonly DURATION_MULTIPLIER: u256 = u256.fromU32(2016);
    private static readonly MAXIMUM_DURATION_MULTIPLIER: u256 = u256.fromU32(50); // 50x reward

    protected readonly stakingBalances: AddressMemoryMap<Address, MemorySlotData<u256>>;
    protected readonly stakingStartBlock: AddressMemoryMap<Address, MemorySlotData<u256>>;

    protected constructor(maxSupply: u256, decimals: u8, name: string, symbol: string) {
        super(maxSupply, decimals, name, symbol);

        const rewardPointer = Blockchain.nextPointer;
        const rewardPool: u256 = Blockchain.getStorageAt(rewardPointer, u256.Zero, u256.Zero);
        this._rewardPool = new StoredU256(rewardPointer, u256.Zero, rewardPool);

        const stakedPointer = Blockchain.nextPointer;
        const totalStaked: u256 = Blockchain.getStorageAt(stakedPointer, u256.Zero, u256.Zero);
        this._totalStaked = new StoredU256(stakedPointer, u256.Zero, totalStaked);

        this.stakingBalances = new AddressMemoryMap<Address, MemorySlotData<u256>>(
            Blockchain.nextPointer,
            u256.Zero,
        );
        this.stakingStartBlock = new AddressMemoryMap<Address, MemorySlotData<u256>>(
            Blockchain.nextPointer,
            u256.Zero,
        );
    }

    protected _rewardPool: StoredU256;

    protected get rewardPool(): u256 {
        return this._rewardPool.value;
    }

    protected _totalStaked: StoredU256;

    protected get totalStaked(): u256 {
        return this._totalStaked.value;
    }

    public stake(callData: Calldata): BytesWriter {
        const staker: Address = Blockchain.txOrigin;
        const amount: u256 = callData.readU256();

        if (amount < StackingOP20.MINIMUM_STAKING_AMOUNT) {
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

        const newBalance: u256 = SafeMath.add(amount, currentStaked);

        // Record staking balance and start block
        this.stakingBalances.set(staker, newBalance);
        this.stakingStartBlock.set(staker, Blockchain.blockNumber);

        // @ts-ignore
        this._totalStaked += amount;

        this.createStakeEvent(amount);

        const response = new BytesWriter();
        response.writeBoolean(true);
        return response;
    }

    public claim(): BytesWriter {
        const staker: Address = Blockchain.txOrigin;

        const success = this.claimReward(staker);
        if (!success) {
            throw new Revert('Claim failed');
        }

        const response = new BytesWriter();
        response.writeBoolean(true);
        return response;
    }

    public unstake(): BytesWriter {
        const staker: Address = Blockchain.txOrigin;

        const amount: u256 = this.stakingBalances.get(staker);
        if (amount.isZero()) {
            throw new Revert('No staked amount');
        }

        const duration: u256 = SafeMath.sub(
            Blockchain.blockNumber,
            this.stakingStartBlock.get(staker),
        );
        if (duration < StackingOP20.MINIMUM_STAKING_DURATION) {
            throw new Revert('Too early');
        }

        // Claim if possible
        this.claimReward(staker);

        // Transfer WBTC from contract to staker
        const success = this._unsafeTransferFrom(this.address, staker, amount);
        if (!success) {
            throw new Revert('Transfer failed');
        }

        // Reset staking balance and start block
        this.stakingBalances.set(staker, u256.Zero);
        this.stakingStartBlock.set(staker, u256.Zero);

        // @ts-ignore
        this._totalStaked -= amount;

        this.createUnstakeEvent(amount);

        const response = new BytesWriter();
        response.writeBoolean(true);
        return response;
    }

    public override mint(callData: Calldata): BytesWriter {
        const mintTo: Address = callData.readAddress();
        const amount: u256 = callData.readU256();
        const feeRecipients: Map<Address, u256> = callData.readAddressValueTuple();
        const stackingReward: u256 = callData.readU256();

        this._mint(this.address, stackingReward);

        // Give fees to fee recipients
        const keys = feeRecipients.keys();
        for (let i = 0; i < keys.length; i++) {
            const key: Address = keys[i];
            const value: u256 = feeRecipients.get(key) || u256.Zero;

            this._mint(key, value);
        }

        // @ts-ignore
        this._rewardPool += stackingReward;

        const resp = this._mint(mintTo, amount);
        const response = new BytesWriter();
        response.writeBoolean(resp);

        return response;
    }

    public override burn(callData: Calldata): BytesWriter {
        const resp = this._burn(callData.readU256());
        if (!resp) {
            throw new Revert('Burn failed');
        }

        const response = new BytesWriter();
        response.writeBoolean(resp);

        return response;
    }

    public stakedAmount(calldata: Calldata): BytesWriter {
        const staker: Address = calldata.readAddress();
        const amount: u256 = this.stakingBalances.get(staker);

        const response = new BytesWriter();
        response.writeU256(amount);
        return response;
    }

    public stakedReward(calldata: Calldata): BytesWriter {
        const staker: Address = calldata.readAddress();
        const amount: u256 = this.stakingBalances.get(staker);
        const startBlock: u256 = this.stakingStartBlock.get(staker);
        const endBlock: u256 = Blockchain.blockNumber;

        const duration: u256 = SafeMath.sub(endBlock, startBlock);
        const reward: u256 = this.calculateReward(amount, duration);

        const response = new BytesWriter();
        response.writeU256(reward);

        return response;
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
                return this.unstake();
            }
            case encodeSelector('claim'): {
                return this.claim();
            }
            case encodeSelector('stakedAmount'): {
                return this.stakedAmount(calldata);
            }
            case encodeSelector('stakedReward'): {
                return this.stakedReward(calldata);
            }
            case encodeSelector('stakedAt'): {
                return this.stakedAt(calldata);
            }
            default: {
                return super.callMethod(method, calldata);
            }
        }
    }

    public callView(method: Selector): BytesWriter {
        const response = new BytesWriter();

        switch (method) {
            case encodeSelector('rewardPool'): {
                response.writeU256(this.rewardPool);
                return response;
            }
            case encodeSelector('totalStaked'): {
                response.writeU256(this.totalStaked);
                return response;
            }
            default: {
                return super.callView(method);
            }
        }
    }

    private stakedAt(calldata: Calldata): BytesWriter {
        const staker: Address = calldata.readAddress();
        const startBlock: u256 = this.stakingStartBlock.get(staker);

        const response = new BytesWriter();
        response.writeU256(startBlock);
        return response;
    }

    private claimReward(staker: Address): bool {
        if (!this.stakingStartBlock.has(staker)) return false;
        if (!this.stakingBalances.has(staker)) return false;

        const startBlock: u256 = this.stakingStartBlock.get(staker);
        const endBlock: u256 = Blockchain.blockNumber;
        const duration: u256 = SafeMath.sub(endBlock, startBlock);
        if (duration < StackingOP20.MINIMUM_STAKING_DURATION) {
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
        const success = this._unsafeTransferFrom(this.address, staker, reward);
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

        const precision: u256 = u256.fromU32(100_000_000);
        const stakeProportion: u256 = SafeMath.div(
            SafeMath.mul(stakedAmount, precision),
            this.totalStaked,
        );

        const maxDurationMultiplier: u256 = SafeMath.mul(
            StackingOP20.MAXIMUM_DURATION_MULTIPLIER,
            precision,
        );

        const durationWithPrecision: u256 = SafeMath.mul(
            SafeMath.max(stakedDuration, u256.One),
            precision,
        );

        const unsafeDurationMultiplier: u256 = SafeMath.div(
            durationWithPrecision,
            StackingOP20.DURATION_MULTIPLIER,
        );

        const durationMultiplier: u256 = SafeMath.min(
            unsafeDurationMultiplier,
            maxDurationMultiplier,
        );

        const reward: u256 = SafeMath.mul(this.rewardPool, stakeProportion);
        const rewardMultiplier: u256 = SafeMath.div(
            SafeMath.mul(reward, durationMultiplier),
            precision,
        );

        const finalReward: u256 = SafeMath.div(SafeMath.add(reward, rewardMultiplier), precision);

        return SafeMath.min(finalReward, this.rewardPool);
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
