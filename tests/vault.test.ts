import * as anchor from '@coral-xyz/anchor'
import { BN, Program } from '@coral-xyz/anchor'
import {
    createAssociatedTokenAccountIdempotentInstruction,
    createSyncNativeInstruction,
    getAssociatedTokenAddressSync,
    NATIVE_MINT,
} from '@solana/spl-token'
import { ComputeBudgetProgram, PublicKey, SystemProgram } from '@solana/web3.js'
import { assert } from 'chai'
import { Vault } from '../target/types/vault'
import {
    DRIFT_PROGRAM_ID,
    getDriftSpotMarketVaultPublicKey,
    getDriftStateAccountPublicKey,
    getDriftUserAccountPublicKey,
    getDriftUserStatsAccountPublicKey,
} from './util/drift'

const LULO_FLEXLEND_PROGRAM = new PublicKey(
    'FL3X2pRsQ9zHENpZSKDRREtccwJuei8yg9fwDu9UN69Q',
)

const LULO_RESERVE = new PublicKey(
    '4NCKkwUCBRcu7TGxDaEZ6Uw6TvzdDbnvSuYbXLzrLnzv',
)

describe('lulo vault', () => {
    // Configure the client to use the local cluster.
    anchor.setProvider(anchor.AnchorProvider.env())

    const program = anchor.workspace.Vault as Program<Vault>

    const { connection } = program.provider

    let listener: number

    before(
        async () =>
            (listener = connection.onLogs(program.programId, (logs) => {
                console.log(logs)
            })),
    )

    after(() => connection.removeOnLogsListener(listener))

    it('init vault', async () => {
        const owner = program.provider.publicKey

        const initVaultTx = await program.methods
            .initVault()
            .accounts({
                owner,
                mintAddress: NATIVE_MINT,
            })
            .rpc()

        console.log({ initVaultTx })
    })

    it('deposit to vault', async () => {
        const owner = program.provider.publicKey

        const amount = new BN(10 * 10 ** 9)

        const ownerTokenAccount = getAssociatedTokenAddressSync(
            NATIVE_MINT,
            owner,
        )

        const vault = PublicKey.findProgramAddressSync(
            [Buffer.from('vault'), NATIVE_MINT.toBuffer(), owner.toBuffer()],
            program.programId,
        )[0]

        const vaultTokenAccount = getAssociatedTokenAddressSync(
            NATIVE_MINT,
            vault,
            true,
        )

        const depositVaultTx = await program.methods
            .depositVault(amount)
            .accounts({
                owner,
                mintAddress: NATIVE_MINT,
                ownerTokenAccount,
                vault,
                vaultTokenAccount,
            })
            .preInstructions([
                createAssociatedTokenAccountIdempotentInstruction(
                    owner,
                    ownerTokenAccount,
                    owner,
                    NATIVE_MINT,
                ),
                SystemProgram.transfer({
                    fromPubkey: owner,
                    toPubkey: ownerTokenAccount,
                    lamports: amount.toNumber(),
                }),
                createSyncNativeInstruction(ownerTokenAccount),
            ])
            .rpc()

        console.log({ depositVaultTx })

        assert.equal(
            (await connection.getTokenAccountBalance(vaultTokenAccount)).value
                .uiAmount,
            10,
        )
    })

    it('withdraw from vault', async () => {
        const owner = program.provider.publicKey

        const ownerTokenAccount = getAssociatedTokenAddressSync(
            NATIVE_MINT,
            owner,
        )

        const vault = PublicKey.findProgramAddressSync(
            [Buffer.from('vault'), NATIVE_MINT.toBuffer(), owner.toBuffer()],
            program.programId,
        )[0]

        const vaultTokenAccount = getAssociatedTokenAddressSync(
            NATIVE_MINT,
            vault,
            true,
        )

        const withdrawVaultTx = await program.methods
            .withdrawVault(new BN(1 * 10 ** 9))
            .accounts({
                owner,
                mintAddress: NATIVE_MINT,
                ownerTokenAccount,
                vault,
                vaultTokenAccount,
            })
            .preInstructions([
                createAssociatedTokenAccountIdempotentInstruction(
                    owner,
                    ownerTokenAccount,
                    owner,
                    NATIVE_MINT,
                ),
            ])
            .rpc()

        console.log({ withdrawVaultTx })

        assert.equal(
            (await connection.getTokenAccountBalance(vaultTokenAccount)).value
                .uiAmount,
            9,
        )
    })

    it('transfer from vault to lulo', async () => {
        const amount = new BN(1 * 10 ** 9)

        const owner = program.provider.publicKey

        const vault = PublicKey.findProgramAddressSync(
            [Buffer.from('vault'), NATIVE_MINT.toBuffer(), owner.toBuffer()],
            program.programId,
        )[0]

        const vaultTokenAccount = getAssociatedTokenAddressSync(
            NATIVE_MINT,
            vault,
            true,
        )

        const luloUserAccount = PublicKey.findProgramAddressSync(
            [Buffer.from('flexlend'), vault.toBuffer()],
            LULO_FLEXLEND_PROGRAM,
        )[0]

        const luloUserTokenAccount = getAssociatedTokenAddressSync(
            NATIVE_MINT,
            luloUserAccount,
            true,
        )

        const luloDepositTx = await program.methods
            .luloDeposit(amount)
            .accounts({
                owner,
                vault,
                vaultTokenAccount,
                mintAddress: NATIVE_MINT,
                luloUserAccount,
                luloUserTokenAccount,
                luloPromotionReserve: LULO_RESERVE,
                luloProgram: LULO_FLEXLEND_PROGRAM,
            })
            .rpc({ skipPreflight: true })

        console.log({ luloDepositTx })

        assert.equal(
            (await connection.getTokenAccountBalance(luloUserTokenAccount))
                .value.uiAmount,
            1,
        )
    })

    it('request lulo withdraw', async () => {
        const amount = new BN(1 * 10 ** 9)

        const owner = program.provider.publicKey

        const vault = PublicKey.findProgramAddressSync(
            [Buffer.from('vault'), NATIVE_MINT.toBuffer(), owner.toBuffer()],
            program.programId,
        )[0]

        const vaultTokenAccount = getAssociatedTokenAddressSync(
            NATIVE_MINT,
            vault,
            true,
        )

        const luloUserAccount = PublicKey.findProgramAddressSync(
            [Buffer.from('flexlend'), vault.toBuffer()],
            LULO_FLEXLEND_PROGRAM,
        )[0]

        const luloUserTokenAccount = getAssociatedTokenAddressSync(
            NATIVE_MINT,
            luloUserAccount,
            true,
        )

        const luloWithdrawTx = await program.methods
            .luloWithdraw(amount)
            .accounts({
                owner,
                vault,
                vaultTokenAccount,
                mintAddress: NATIVE_MINT,
                luloUserAccount,
                luloUserTokenAccount,
                luloPromotionReserve: LULO_RESERVE,
                luloProgram: LULO_FLEXLEND_PROGRAM,
            })
            .rpc({ skipPreflight: true })

        console.log({ luloWithdrawTx })
    })

    it('direct drift deposit', async () => {
        const amount = new BN(1 * 10 ** 9)

        const owner = program.provider.publicKey

        const vault = PublicKey.findProgramAddressSync(
            [Buffer.from('vault'), NATIVE_MINT.toBuffer(), owner.toBuffer()],
            program.programId,
        )[0]

        const vaultTokenAccount = getAssociatedTokenAddressSync(
            NATIVE_MINT,
            vault,
            true,
        )

        const luloUserAccount = PublicKey.findProgramAddressSync(
            [Buffer.from('flexlend'), vault.toBuffer()],
            LULO_FLEXLEND_PROGRAM,
        )[0]

        const luloUserTokenAccount = getAssociatedTokenAddressSync(
            NATIVE_MINT,
            luloUserAccount,
            true,
        )

        const driftUser = getDriftUserAccountPublicKey(luloUserAccount)
        const driftUserStats =
            getDriftUserStatsAccountPublicKey(luloUserAccount)
        const driftState = getDriftStateAccountPublicKey()

        const marketIndex = 1
        const spotMarketVault = getDriftSpotMarketVaultPublicKey(marketIndex)
        const spotMarket = new PublicKey(
            '3x85u7SWkmmr7YQGYhtjARgxwegTLJgkSLRprfXod6rh',
        )
        const oracle = new PublicKey(
            'H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG',
        )

        const depositTx = await program.methods
            .luloDepositDrift(amount)
            .accounts({
                owner,
                vault,
                vaultTokenAccount,
                mintAddress: NATIVE_MINT,
                luloUserAccount,
                luloUserTokenAccount,
                luloPromotionReserve: LULO_RESERVE,
                luloProgram: LULO_FLEXLEND_PROGRAM,
            })
            // maybe we could do an API for remaining accounts?
            .remainingAccounts([
                {
                    pubkey: driftUser,
                    isSigner: false,
                    isWritable: true,
                },
                {
                    pubkey: driftUserStats,
                    isSigner: false,
                    isWritable: true,
                },
                {
                    pubkey: driftState,
                    isSigner: false,
                    isWritable: true,
                },
                {
                    pubkey: spotMarketVault,
                    isSigner: false,
                    isWritable: true,
                },
                {
                    pubkey: spotMarket,
                    isSigner: false,
                    isWritable: true,
                },
                {
                    pubkey: oracle,
                    isSigner: false,
                    isWritable: false,
                },
                {
                    pubkey: DRIFT_PROGRAM_ID,
                    isSigner: false,
                    isWritable: false,
                },
            ])
            .rpc({ skipPreflight: true })

        console.log({ depositTx })
    })

    it('direct drift withdraw', async () => {
        const amount = new BN(1 * 10 ** 9)

        const owner = program.provider.publicKey

        const vault = PublicKey.findProgramAddressSync(
            [Buffer.from('vault'), NATIVE_MINT.toBuffer(), owner.toBuffer()],
            program.programId,
        )[0]

        const vaultTokenAccount = getAssociatedTokenAddressSync(
            NATIVE_MINT,
            vault,
            true,
        )

        const luloUserAccount = PublicKey.findProgramAddressSync(
            [Buffer.from('flexlend'), vault.toBuffer()],
            LULO_FLEXLEND_PROGRAM,
        )[0]

        const luloUserTokenAccount = getAssociatedTokenAddressSync(
            NATIVE_MINT,
            luloUserAccount,
            true,
        )

        const driftUser = getDriftUserAccountPublicKey(luloUserAccount)
        const driftUserStats =
            getDriftUserStatsAccountPublicKey(luloUserAccount)
        const driftState = getDriftStateAccountPublicKey()
        // const driftSigner = getDriftSignerPublicKey(DRIFT_PROGRAM)

        const driftSigner = new PublicKey(
            'JCNCMFXo5M5qwUPg2Utu1u6YWp3MbygxqBsBeXXJfrw',
        )

        const marketIndex = 1
        const spotMarketVault = getDriftSpotMarketVaultPublicKey(marketIndex)
        // const spotMarkets = [
        //     // new PublicKey('6gMq3mRCKf8aP3ttTyYhuijVZ2LGi14oDsBbkgubfLB3'),
        //     new PublicKey('3x85u7SWkmmr7YQGYhtjARgxwegTLJgkSLRprfXod6rh'),
        // ]

        // const oracles = [
        //     // new PublicKey('Gnt27xtC473ZT2Mw5u8wZ68Z3gULkSTb5DuxJy7eJotD'),
        //     new PublicKey('H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG'),
        // ]

        const spotMarket = new PublicKey(
            '3x85u7SWkmmr7YQGYhtjARgxwegTLJgkSLRprfXod6rh',
        )
        const oracle = new PublicKey(
            'H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG',
        )

        const withdrawTx = await program.methods
            .luloWithdrawDrift(amount)
            .preInstructions([
                ComputeBudgetProgram.setComputeUnitLimit({
                    units: 1_000_000,
                }),
            ])
            .accounts({
                owner,
                vault,
                vaultTokenAccount,
                mintAddress: NATIVE_MINT,
                luloUserAccount,
                luloUserTokenAccount,
                luloPromotionReserve: LULO_RESERVE,
                luloProgram: LULO_FLEXLEND_PROGRAM,
            })
            .remainingAccounts([
                {
                    pubkey: driftUser,
                    isSigner: false,
                    isWritable: true,
                },
                {
                    pubkey: driftUserStats,
                    isSigner: false,
                    isWritable: true,
                },
                {
                    pubkey: driftState,
                    isSigner: false,
                    isWritable: true,
                },
                {
                    pubkey: driftSigner,
                    isSigner: false,
                    isWritable: false,
                },
                {
                    pubkey: spotMarketVault,
                    isSigner: false,
                    isWritable: true,
                },
                {
                    pubkey: spotMarket,
                    isSigner: false,
                    isWritable: true,
                },
                {
                    pubkey: oracle,
                    isSigner: false,
                    isWritable: false,
                },
                {
                    pubkey: DRIFT_PROGRAM_ID,
                    isSigner: false,
                    isWritable: false,
                },
            ])
            .rpc({ skipPreflight: true })

        console.log({ withdrawTx })
    })
})
