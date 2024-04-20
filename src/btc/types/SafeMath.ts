import { u256 } from 'as-bignum/assembly';


export class SafeMath {
    public static ZERO: u256 = u256.fromU32(0);

    public static add(a: u256, b: u256): u256 {
        const c: u256 = u256.add(a, b);
        if (c < a) {
            throw new Error('SafeMath: addition overflow');
        }
        return c;
    }

    public static sub(a: u256, b: u256): u256 {
        if (a < b) {
            throw new Error('SafeMath: subtraction overflow');
        }
        return u256.sub(a, b);
    }

    public static mul(a: u256, b: u256): u256 {
        return u256.mul(a, b);
    }

    public static and(a: u256, b: u256): u256 {
        return u256.and(a, b);
    }

    public static or(a: u256, b: u256): u256 {
        return u256.or(a, b);
    }

    public static xor(a: u256, b: u256): u256 {
        return u256.xor(a, b);
    }

    public static shr(a: u256, b: u32): u256 {
        return u256.shr(a, b);
    }

}
