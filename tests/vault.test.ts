import * as anchor from '@coral-xyz/anchor'
import { BN, Program } from '@coral-xyz/anchor'
import {
    createAssociatedTokenAccountIdempotentInstruction,
    createSyncNativeInstruction,
    getAssociatedTokenAddressSync,
    NATIVE_MINT,
} from '@solana/spl-token'
import { PublicKey, SystemProgram } from '@solana/web3.js'
import { Vault } from '../target/types/vault'

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

        const amount = new BN(2 * 10 ** 9)

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
})
