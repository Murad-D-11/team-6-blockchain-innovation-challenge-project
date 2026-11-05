#![no_std]
//! Laya v2 contract. Interface: docs/SPEC.md "Shared contract A", with the one v2 change
//! from docs/PLAN-v2.md: in `request_payoff`, `legal_amount = principal`.

use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, token, Address, BytesN,
    Env,
};

// ---------------------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------------------

#[contracttype]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
#[repr(u32)]
pub enum Mode {
    Loan = 0,
    Grant = 1,
}

#[contracttype]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
#[repr(u32)]
pub enum RequestStatus {
    Open = 0,
    Confirmed = 1,
    Funded = 2,
    Cancelled = 3,
}

#[contracttype]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
#[repr(u32)]
pub enum LoanStatus {
    Active = 0,
    Repaid = 1,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Config {
    pub admin: Address,
    pub token: Address,
    pub period_secs: u64,
    pub max_pause_periods: u32,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PayoffRequest {
    pub id: u32,
    pub worker: Address,
    pub family: Address,
    pub creditor: Address,
    pub principal: i128,
    pub months: u32,
    pub legal_amount: i128,
    pub share_bps: u32,
    pub doc_hash: BytesN<32>,
    pub status: RequestStatus,
    pub created_at: u64,
    pub confirmed_at: u64, // 0 until confirmed
}

#[contracttype]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Loan {
    pub id: u32,
    pub worker: Address,
    pub family: Address,
    pub funder: Address,
    pub creditor: Address,
    pub mode: Mode,
    pub legal_amount: i128,
    pub fee_bps: u32,
    pub outstanding: i128,
    pub share_bps: u32,
    pub min_share_bps: u32,
    pub doc_hash: BytesN<32>,
    pub funded_at: u64,
    pub last_payment_at: u64,
    pub total_repaid: i128,
    pub total_to_family: i128,
    pub remit_count: u32,
    pub status: LoanStatus,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct RemitResult {
    pub to_lender: i128,
    pub to_family: i128,
    pub outstanding: i128,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1, // reserved, unused
    NotInitialized = 2,     // reserved, unused
    CreditorNotRegistered = 3,
    RequestNotFound = 4,
    InvalidRequestStatus = 5, // wrong status for this action
    LoanNotFound = 6,
    InvalidShare = 7,  // outside 100..=1500, or below min_share_bps
    InvalidAmount = 8, // <= 0, or principal > 1_000_000_000_000_000
    InvalidMonths = 9, // outside 1..=60
    InvalidFee = 10,   // Loan: fee_bps > 800; Grant: fee_bps != 0
    InvalidPeriod = 11, // period_secs == 0
}

#[contracttype]
pub enum DataKey {
    Config,
    Count,
    Creditor(Address),
    Request(u32),
    Loan(u32),
}

// ---------------------------------------------------------------------------------------
// Events: topics are the snake_case struct name, then `id`; data is a map of the other fields.
// ---------------------------------------------------------------------------------------

#[contractevent]
pub struct RequestCreated {
    #[topic]
    pub id: u32,
    pub worker: Address,
    pub creditor: Address,
    pub legal_amount: i128,
}

#[contractevent]
pub struct RequestConfirmed {
    #[topic]
    pub id: u32,
    pub creditor: Address,
}

#[contractevent]
pub struct Payoff {
    #[topic]
    pub id: u32,
    pub funder: Address,
    pub creditor: Address,
    pub amount: i128,
    pub mode: Mode,
}

#[contractevent]
pub struct Remit {
    #[topic]
    pub id: u32,
    pub to_lender: i128,
    pub to_family: i128,
    pub outstanding: i128,
}

#[contractevent]
pub struct Repaid {
    #[topic]
    pub id: u32,
}

// ---------------------------------------------------------------------------------------
// Storage lifetime: threshold 120_960 ledgers, extend to 518_400 (about 30 days).
// ---------------------------------------------------------------------------------------

pub(crate) const TTL_THRESHOLD: u32 = 120_960;
pub(crate) const TTL_EXTEND_TO: u32 = 518_400;

pub(crate) fn extend_instance(env: &Env) {
    env.storage()
        .instance()
        .extend_ttl(TTL_THRESHOLD, TTL_EXTEND_TO);
}

// ---------------------------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------------------------

#[contract]
pub struct Laya;

pub(crate) const MAX_PRINCIPAL: i128 = 1_000_000_000_000_000;

pub(crate) fn read_config(env: &Env) -> Config {
    // The constructor always runs at deploy, so Config exists. Errors 1 and 2 are reserved/unused.
    env.storage().instance().get(&DataKey::Config).unwrap()
}

pub(crate) fn read_count(env: &Env) -> u32 {
    env.storage().instance().get(&DataKey::Count).unwrap_or(0)
}

pub(crate) fn read_request(env: &Env, id: u32) -> Result<PayoffRequest, Error> {
    env.storage()
        .persistent()
        .get(&DataKey::Request(id))
        .ok_or(Error::RequestNotFound)
}

pub(crate) fn read_loan(env: &Env, id: u32) -> Result<Loan, Error> {
    env.storage()
        .persistent()
        .get(&DataKey::Loan(id))
        .ok_or(Error::LoanNotFound)
}

pub(crate) fn write_loan(env: &Env, loan: &Loan) {
    let key = DataKey::Loan(loan.id);
    env.storage().persistent().set(&key, loan);
    env.storage()
        .persistent()
        .extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND_TO);
}

pub(crate) fn write_request(env: &Env, request: &PayoffRequest) {
    let key = DataKey::Request(request.id);
    env.storage().persistent().set(&key, request);
    env.storage()
        .persistent()
        .extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND_TO);
}

#[contractimpl]
impl Laya {
    // NOTE: the constructor does NOT validate `period_secs` (decision by Murad, Nov 5: the spec
    // shows no Result here). `period_secs == 0` is only rejected by `set_period` (Error 11).
    // scripts/deploy.sh MUST pass a non-zero period_secs (the plan uses 60), because a zero
    // period would make `missed_periods` divide by zero.
    pub fn __constructor(
        env: Env,
        admin: Address,
        token: Address,
        period_secs: u64,
        max_pause_periods: u32,
    ) {
        let config = Config {
            admin,
            token,
            period_secs,
            max_pause_periods,
        };
        env.storage().instance().set(&DataKey::Config, &config);
        extend_instance(&env);
    }

    // ---- Admin only (config.admin.require_auth()) ----

    /// Registers a provider. Registering an already-registered address is a no-op.
    pub fn add_creditor(env: Env, creditor: Address) -> Result<(), Error> {
        read_config(&env).admin.require_auth();
        let key = DataKey::Creditor(creditor);
        env.storage().persistent().set(&key, &true);
        env.storage()
            .persistent()
            .extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND_TO);
        extend_instance(&env);
        Ok(())
    }

    /// Unregisters a provider. Existing requests and loans are not touched.
    // Decision (Murad, Nov 5): removing an unregistered address is a no-op that returns Ok (not Error 3).
    pub fn remove_creditor(env: Env, creditor: Address) -> Result<(), Error> {
        read_config(&env).admin.require_auth();
        env.storage()
            .persistent()
            .remove(&DataKey::Creditor(creditor));
        extend_instance(&env);
        Ok(())
    }

    // ---- Worker ----

    /// `legal_amount = principal` (v2). `months` is validated (1..=60) but affects no amount.
    /// Check order (spec is silent): creditor registered, amount, months, share.
    pub fn request_payoff(
        env: Env,
        worker: Address,
        family: Address,
        creditor: Address,
        principal: i128,
        months: u32,
        share_bps: u32,
        doc_hash: BytesN<32>,
    ) -> Result<u32, Error> {
        worker.require_auth();
        if !env
            .storage()
            .persistent()
            .has(&DataKey::Creditor(creditor.clone()))
        {
            return Err(Error::CreditorNotRegistered);
        }
        if principal <= 0 || principal > MAX_PRINCIPAL {
            return Err(Error::InvalidAmount);
        }
        if !(1..=60).contains(&months) {
            return Err(Error::InvalidMonths);
        }
        if !(100..=1500).contains(&share_bps) {
            return Err(Error::InvalidShare);
        }

        let id = read_count(&env) + 1;
        let legal_amount = principal;
        let request = PayoffRequest {
            id,
            worker: worker.clone(),
            family,
            creditor: creditor.clone(),
            principal,
            months,
            legal_amount,
            share_bps,
            doc_hash,
            status: RequestStatus::Open,
            created_at: env.ledger().timestamp(),
            confirmed_at: 0,
        };
        write_request(&env, &request);
        env.storage().instance().set(&DataKey::Count, &id);
        extend_instance(&env);

        RequestCreated {
            id,
            worker,
            creditor,
            legal_amount,
        }
        .publish(&env);
        Ok(id)
    }

    /// Only an Open or Confirmed request can be cancelled.
    pub fn cancel_request(env: Env, request_id: u32) -> Result<(), Error> {
        let mut request = read_request(&env, request_id)?;
        request.worker.require_auth();
        if request.status != RequestStatus::Open && request.status != RequestStatus::Confirmed {
            return Err(Error::InvalidRequestStatus);
        }
        request.status = RequestStatus::Cancelled;
        write_request(&env, &request);
        extend_instance(&env);
        Ok(())
    }

    // ---- Creditor (provider) ----

    /// Open -> Confirmed, signed by the request's own creditor. No registry re-check (spec is silent).
    pub fn confirm_request(env: Env, request_id: u32) -> Result<(), Error> {
        let mut request = read_request(&env, request_id)?;
        request.creditor.require_auth();
        if request.status != RequestStatus::Open {
            return Err(Error::InvalidRequestStatus);
        }
        request.status = RequestStatus::Confirmed;
        request.confirmed_at = env.ledger().timestamp();
        write_request(&env, &request);
        extend_instance(&env);

        RequestConfirmed {
            id: request_id,
            creditor: request.creditor,
        }
        .publish(&env);
        Ok(())
    }

    // ---- Funder ----

    /// Pays `legal_amount` from the funder to the request's creditor and creates the loan in one
    /// transaction. If the token transfer fails (for example the funder's balance is too low) the
    /// whole call reverts: no loan, and the request stays Confirmed.
    /// Check order (spec is silent): request exists, funder auth, status Confirmed (5), fee (10).
    /// Returns the loan id, which equals the request id.
    pub fn fund_request(
        env: Env,
        funder: Address,
        request_id: u32,
        mode: Mode,
        fee_bps: u32,
    ) -> Result<u32, Error> {
        let mut request = read_request(&env, request_id)?;
        funder.require_auth();
        if request.status != RequestStatus::Confirmed {
            return Err(Error::InvalidRequestStatus);
        }
        match mode {
            Mode::Loan if fee_bps > 800 => return Err(Error::InvalidFee),
            Mode::Grant if fee_bps != 0 => return Err(Error::InvalidFee),
            _ => {}
        }

        let legal_amount = request.legal_amount;
        let (outstanding, status) = match mode {
            Mode::Loan => (
                legal_amount + legal_amount * (fee_bps as i128) / 10_000,
                LoanStatus::Active,
            ),
            Mode::Grant => (0, LoanStatus::Repaid),
        };

        let config = read_config(&env);
        token::Client::new(&env, &config.token).transfer(&funder, &request.creditor, &legal_amount);

        let now = env.ledger().timestamp();
        let loan = Loan {
            id: request_id,
            worker: request.worker.clone(),
            family: request.family.clone(),
            funder: funder.clone(),
            creditor: request.creditor.clone(),
            mode,
            legal_amount,
            fee_bps,
            outstanding,
            share_bps: request.share_bps,
            min_share_bps: request.share_bps,
            doc_hash: request.doc_hash.clone(),
            funded_at: now,
            last_payment_at: now,
            total_repaid: 0,
            total_to_family: 0,
            remit_count: 0,
            status,
        };
        write_loan(&env, &loan);
        request.status = RequestStatus::Funded;
        write_request(&env, &request);
        extend_instance(&env);

        Payoff {
            id: request_id,
            funder,
            creditor: request.creditor,
            amount: legal_amount,
            mode,
        }
        .publish(&env);
        Ok(request_id)
    }

    // ---- Read-only ----

    pub fn get_loan(env: Env, id: u32) -> Result<Loan, Error> {
        read_loan(&env, id)
    }

    pub fn get_config(env: Env) -> Config {
        read_config(&env)
    }

    /// 0 when empty.
    pub fn request_count(env: Env) -> u32 {
        read_count(&env)
    }

    pub fn get_request(env: Env, id: u32) -> Result<PayoffRequest, Error> {
        read_request(&env, id)
    }

    pub fn is_creditor(env: Env, creditor: Address) -> bool {
        env.storage()
            .persistent()
            .has(&DataKey::Creditor(creditor))
    }
}

#[cfg(test)]
mod test;
