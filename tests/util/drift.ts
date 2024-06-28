import { PublicKey } from '@solana/web3.js'
import BN from 'bn.js'

export const DRIFT_PROGRAM_ID = new PublicKey(
    'dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH',
)
export const DEFAULT_SUBACCOUNT_ID = 0

export function getDriftStateAccountPublicKeyAndNonce(
    programId: PublicKey = DRIFT_PROGRAM_ID,
): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from('drift_state')],
        programId,
    )
}

export function getDriftStateAccountPublicKey(
    programId: PublicKey = DRIFT_PROGRAM_ID,
): PublicKey {
    return getDriftStateAccountPublicKeyAndNonce(programId)[0]
}

export function getDriftUserAccountPublicKeyAndNonce(
    authority: PublicKey,
    subAccountId = 0,
    programId: PublicKey = DRIFT_PROGRAM_ID,
): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from('user'),
            authority.toBuffer(),
            new BN(subAccountId).toArrayLike(Buffer, 'le', 2),
        ],
        programId,
    )
}

export function getDriftUserAccountPublicKey(
    authority: PublicKey,
    subAccountId = 0,
    programId: PublicKey = DRIFT_PROGRAM_ID,
): PublicKey {
    return getDriftUserAccountPublicKeyAndNonce(
        authority,
        subAccountId,
        programId,
    )[0]
}

export function getDriftUserStatsAccountPublicKey(
    authority: PublicKey,
    programId: PublicKey = DRIFT_PROGRAM_ID,
): PublicKey {
    return PublicKey.findProgramAddressSync(
        [Buffer.from('user_stats'), authority.toBuffer()],
        programId,
    )[0]
}

export function getDriftSpotMarketVaultPublicKey(
    marketIndex: number,
    programId: PublicKey = DRIFT_PROGRAM_ID,
): PublicKey {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from('spot_market_vault'),
            new BN(marketIndex).toArrayLike(Buffer, 'le', 2),
        ],
        programId,
    )[0]
}
