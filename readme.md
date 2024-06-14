# Lulo Example CPI Integration

This program is an example of User Vaults.

Users can deposit to vaults and can transfer the amount to [Lulo](https://lulo.fi) via CPI to earn interest.

Users can withdraw from their Vault, if the vault has enought amount it sends directly to the user. Otherwise it needs to requests to Lulo via CPI which will send the withdraw amount later in a async operation.

This idea can be adapted to a Protocol Reserve/Vault where only the program admin can deposit, transfer to lulo and withdraw back to the program.

### Run

1. Setup Rust >= 1.73, Solana CLI >= 1.16 and Anchor CLI >= 0.28.0
2. `git clone xx`
3. `yarn`
4. `anchor test`
