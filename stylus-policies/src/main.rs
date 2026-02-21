#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]

/// Main entry point for the Stylus WASM contract.
/// In production (no_main), this is never called — the entrypoint
/// is handled by the #[entrypoint] macro on SpendingLimitPolicy.
#[cfg(not(any(test, feature = "export-abi")))]
#[no_mangle]
pub extern "C" fn main() {}

/// When built with export-abi feature, prints the Solidity ABI.
/// Usage: cargo run --features export-abi
#[cfg(feature = "export-abi")]
fn main() {
    stylus_sdk::abi::export::handle_license_and_pragma();
    stylus_sdk::abi::export::print_from_args::<stylus_policies::SpendingLimitPolicy>();
}
