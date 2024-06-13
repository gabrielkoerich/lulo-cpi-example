import * as anchor from '@coral-xyz/anchor'
import { BN, Program } from '@coral-xyz/anchor'
import {
    ASSOCIATED_TOKEN_PROGRAM_ID,
    createAssociatedTokenAccountIdempotentInstruction,
    createSyncNativeInstruction,
    getAssociatedTokenAddressSync,
    NATIVE_MINT,
    TOKEN_PROGRAM_ID,
} from '@solana/spl-token'
import {
    PublicKey,
    SystemProgram,
    TransactionInstruction,
} from '@solana/web3.js'
import { LuloIntegration } from '../target/types/lulo_integration'

const LULO_FLEXLEND_PROGRAM = new PublicKey(
    'FL3X2pRsQ9zHENpZSKDRREtccwJuei8yg9fwDu9UN69Q',
)

const LULO_RESERVE = new PublicKey(
    '4NCKkwUCBRcu7TGxDaEZ6Uw6TvzdDbnvSuYbXLzrLnzv',
)

describe('lulo-integration', () => {
    // Configure the client to use the local cluster.
    anchor.setProvider(anchor.AnchorProvider.env())

    const program = anchor.workspace.LuloIntegration as Program<LuloIntegration>

    const { connection } = program.provider

    let listener: number

    before(
        async () =>
            (listener = connection.onLogs(program.programId, (logs) => {
                console.log(logs)
            })),
    )

    after(() => connection.removeOnLogsListener(listener))

    it('init vault and deposit', async () => {
        const owner = program.provider.publicKey

        const initVaultTx = await program.methods
            .initVault()
            .accounts({
                owner,
                feePayer: program.provider.publicKey,
                mintAddress: NATIVE_MINT,
            })
            .rpc()

        console.log('init vault tx:', initVaultTx)

        const amount = new BN(1 * 10 ** 9)

        const ownerTokenAccount = getAssociatedTokenAddressSync(
            NATIVE_MINT,
            owner,
        )

        const preInstructions: TransactionInstruction[] = [
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
        ]

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
                feePayer: program.provider.publicKey,
                mintAddress: NATIVE_MINT,
                ownerTokenAccount,
                vault,
                vaultTokenAccount,
            })
            .preInstructions(preInstructions)
            .rpc()

        console.log('depositVaultTx:', depositVaultTx)
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

        const accounts = {
            owner,
            vault,
            vaultTokenAccount,
            mintAddress: NATIVE_MINT,
            luloUserAccount,
            luloUserTokenAccount,
            luloPromotionReserve: LULO_RESERVE,
            luloProgram: LULO_FLEXLEND_PROGRAM,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        }

        console.log({ accounts })

        const tx = await program.methods
            .luloDeposit(amount)
            .accountsStrict(accounts)
            .rpc({ skipPreflight: true })

        console.log('signature', tx)
    })
})
