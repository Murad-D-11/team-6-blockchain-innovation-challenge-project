#![cfg(test)]
extern crate std;

use crate::{
    Config, Error, Laya, LayaClient, Loan, LoanStatus, Mode, Payoff, PayoffRequest, Remit,
    RemitResult, Repaid, RequestConfirmed, RequestCreated, RequestStatus,
};
use soroban_sdk::{
    testutils::{Address as _, Events as _, Ledger as _, MockAuth, MockAuthInvoke},
    token::{Client as TokenClient, StellarAssetClient},
    Address, BytesN, Env, Event as _, IntoVal,
};

pub(crate) struct Setup<'a> {
    pub env: Env,
    pub client: LayaClient<'a>,
    pub contract_id: Address,
    pub admin: Address,
    pub token: Address,
}

pub(crate) fn setup<'a>() -> Setup<'a> {
    let env = Env::default();
    let admin = Address::generate(&env);
    let token = env
        .register_stellar_asset_contract_v2(Address::generate(&env))
        .address();
    let contract_id = env.register(Laya, (admin.clone(), token.clone(), 60u64, 3u32));
    let client = LayaClient::new(&env, &contract_id);
    Setup {
        env,
        client,
        contract_id,
        admin,
        token,
    }
}

// ---- constructor / config ----

#[test]
fn constructor_stores_config() {
    let s = setup();
    assert_eq!(
        s.client.get_config(),
        Config {
            admin: s.admin.clone(),
            token: s.token.clone(),
            period_secs: 60,
            max_pause_periods: 3,
        }
    );
}

#[test]
fn constructor_does_not_validate_period() {
    // Decision (Murad, Nov 5): the constructor accepts period_secs == 0; only set_period rejects it.
    let env = Env::default();
    let admin = Address::generate(&env);
    let token = Address::generate(&env);
    let id = env.register(Laya, (admin, token, 0u64, 3u32));
    assert_eq!(LayaClient::new(&env, &id).get_config().period_secs, 0);
}

// ---- add_creditor / remove_creditor / is_creditor ----

#[test]
fn unknown_address_is_not_a_creditor() {
    let s = setup();
    assert!(!s.client.is_creditor(&Address::generate(&s.env)));
}

#[test]
fn admin_can_add_creditor() {
    let s = setup();
    s.env.mock_all_auths();
    let c = Address::generate(&s.env);
    s.client.add_creditor(&c);
    assert!(s.client.is_creditor(&c));
}

#[test]
fn add_creditor_requires_admin_auth() {
    let s = setup();
    s.env.mock_all_auths();
    let c = Address::generate(&s.env);
    s.client.add_creditor(&c);
    let auths = s.env.auths();
    assert_eq!(auths.len(), 1);
    assert_eq!(auths[0].0, s.admin);
}

#[test]
fn add_creditor_by_non_admin_fails() {
    let s = setup();
    let intruder = Address::generate(&s.env);
    let c = Address::generate(&s.env);
    s.env.mock_auths(&[MockAuth {
        address: &intruder,
        invoke: &MockAuthInvoke {
            contract: &s.contract_id,
            fn_name: "add_creditor",
            args: (c.clone(),).into_val(&s.env),
            sub_invokes: &[],
        },
    }]);
    assert!(s.client.try_add_creditor(&c).is_err());
    assert!(!s.client.is_creditor(&c));
}

#[test]
fn add_creditor_with_no_auth_fails() {
    let s = setup();
    let c = Address::generate(&s.env);
    assert!(s.client.try_add_creditor(&c).is_err());
    assert!(!s.client.is_creditor(&c));
}

#[test]
fn add_creditor_twice_is_a_noop() {
    let s = setup();
    s.env.mock_all_auths();
    let c = Address::generate(&s.env);
    s.client.add_creditor(&c);
    s.client.add_creditor(&c);
    assert!(s.client.is_creditor(&c));
}

#[test]
fn admin_can_remove_creditor() {
    let s = setup();
    s.env.mock_all_auths();
    let c = Address::generate(&s.env);
    let other = Address::generate(&s.env);
    s.client.add_creditor(&c);
    s.client.add_creditor(&other);
    s.client.remove_creditor(&c);
    assert!(!s.client.is_creditor(&c));
    assert!(s.client.is_creditor(&other));
}

#[test]
fn remove_creditor_by_non_admin_fails() {
    let s = setup();
    s.env.mock_all_auths();
    let c = Address::generate(&s.env);
    s.client.add_creditor(&c);

    let intruder = Address::generate(&s.env);
    s.env.mock_auths(&[MockAuth {
        address: &intruder,
        invoke: &MockAuthInvoke {
            contract: &s.contract_id,
            fn_name: "remove_creditor",
            args: (c.clone(),).into_val(&s.env),
            sub_invokes: &[],
        },
    }]);
    assert!(s.client.try_remove_creditor(&c).is_err());
    assert!(s.client.is_creditor(&c));
}

#[test]
fn remove_unregistered_creditor_is_a_noop() {
    // PENDING Murad's decision: the spec does not say what removing an unregistered address does.
    let s = setup();
    s.env.mock_all_auths();
    let c = Address::generate(&s.env);
    s.client.remove_creditor(&c);
    assert!(!s.client.is_creditor(&c));
}

// ---- requests (Step 3) ----

const P190: i128 = 1_900_000_000; // 190 USDC
const HASH: [u8; 32] = [7u8; 32];

pub(crate) struct Actors {
    pub worker: Address,
    pub family: Address,
    pub creditor: Address,
}

/// Mocks all auths, registers a fresh creditor, and returns worker/family/creditor addresses.
pub(crate) fn actors(s: &Setup) -> Actors {
    s.env.mock_all_auths();
    let a = Actors {
        worker: Address::generate(&s.env),
        family: Address::generate(&s.env),
        creditor: Address::generate(&s.env),
    };
    s.client.add_creditor(&a.creditor);
    a
}

pub(crate) fn open_request(s: &Setup, a: &Actors, principal: i128, months: u32, share: u32) -> u32 {
    s.client.request_payoff(
        &a.worker,
        &a.family,
        &a.creditor,
        &principal,
        &months,
        &share,
        &BytesN::from_array(&s.env, &HASH),
    )
}

fn try_open(
    s: &Setup,
    a: &Actors,
    creditor: &Address,
    principal: i128,
    months: u32,
    share: u32,
) -> Result<u32, Error> {
    match s.client.try_request_payoff(
        &a.worker,
        &a.family,
        creditor,
        &principal,
        &months,
        &share,
        &BytesN::from_array(&s.env, &HASH),
    ) {
        Ok(Ok(id)) => Ok(id),
        Ok(Err(_)) => panic!("conversion error"),
        Err(Ok(e)) => Err(e),
        Err(Err(_)) => panic!("host error, not a contract error"),
    }
}

/// Unwraps the contract Error out of a `try_*` result.
fn err<T: core::fmt::Debug>(
    r: Result<Result<T, soroban_sdk::ConversionError>, Result<Error, soroban_sdk::InvokeError>>,
) -> Error {
    match r {
        Err(Ok(e)) => e,
        other => panic!("expected a contract error, got {:?}", other),
    }
}

#[test]
fn request_count_is_zero_when_empty() {
    assert_eq!(setup().client.request_count(), 0);
}

#[test]
fn request_payoff_creates_open_request_with_id_1() {
    let s = setup();
    let a = actors(&s);
    s.env.ledger().set_timestamp(1_000);
    let id = open_request(&s, &a, P190, 12, 1500);
    assert_eq!(id, 1);
    assert_eq!(s.client.request_count(), 1);
    assert_eq!(
        s.client.get_request(&1),
        PayoffRequest {
            id: 1,
            worker: a.worker.clone(),
            family: a.family.clone(),
            creditor: a.creditor.clone(),
            principal: P190,
            months: 12,
            legal_amount: P190,
            share_bps: 1500,
            doc_hash: BytesN::from_array(&s.env, &HASH),
            status: RequestStatus::Open,
            created_at: 1_000,
            confirmed_at: 0,
        }
    );
}

#[test]
fn ids_increment() {
    let s = setup();
    let a = actors(&s);
    assert_eq!(open_request(&s, &a, P190, 12, 1500), 1);
    assert_eq!(open_request(&s, &a, P190, 12, 1500), 2);
    assert_eq!(s.client.request_count(), 2);
}

// v2 golden: invoice amount. principal 1_900_000_000, months 12 -> legal_amount 1_900_000_000.
#[test]
fn golden_invoice_amount_legal_equals_principal() {
    let s = setup();
    let a = actors(&s);
    let id = open_request(&s, &a, 1_900_000_000, 12, 1500);
    assert_eq!(s.client.get_request(&id).legal_amount, 1_900_000_000);
}

#[test]
fn months_does_not_affect_any_amount() {
    let s = setup();
    let a = actors(&s);
    let r1 = open_request(&s, &a, P190, 1, 1500);
    let r60 = open_request(&s, &a, P190, 60, 1500);
    assert_eq!(s.client.get_request(&r1).legal_amount, P190);
    assert_eq!(s.client.get_request(&r60).legal_amount, P190);
}

#[test]
fn request_payoff_emits_request_created() {
    let s = setup();
    let a = actors(&s);
    let id = open_request(&s, &a, P190, 12, 1500);
    let expected = RequestCreated {
        id,
        worker: a.worker.clone(),
        creditor: a.creditor.clone(),
        legal_amount: P190,
    };
    assert_eq!(
        s.env.events().all().filter_by_contract(&s.contract_id),
        std::vec![expected.to_xdr(&s.env, &s.contract_id)]
    );
}

#[test]
fn request_payoff_requires_worker_auth() {
    let s = setup();
    let a = actors(&s);
    let _ = open_request(&s, &a, P190, 12, 1500);
    let auths = s.env.auths();
    assert_eq!(auths[0].0, a.worker);
}

// Error 3
#[test]
fn error_3_unregistered_creditor() {
    let s = setup();
    let a = actors(&s);
    let stranger = Address::generate(&s.env);
    assert_eq!(
        try_open(&s, &a, &stranger, P190, 12, 1500),
        Err(Error::CreditorNotRegistered)
    );
}

#[test]
fn error_3_removed_creditor() {
    let s = setup();
    let a = actors(&s);
    s.client.remove_creditor(&a.creditor);
    assert_eq!(
        try_open(&s, &a, &a.creditor, P190, 12, 1500),
        Err(Error::CreditorNotRegistered)
    );
}

// Error 8
#[test]
fn error_8_invalid_amount() {
    let s = setup();
    let a = actors(&s);
    let c = a.creditor.clone();
    assert_eq!(try_open(&s, &a, &c, 0, 12, 1500), Err(Error::InvalidAmount));
    assert_eq!(try_open(&s, &a, &c, -1, 12, 1500), Err(Error::InvalidAmount));
    assert_eq!(
        try_open(&s, &a, &c, 1_000_000_000_000_001, 12, 1500),
        Err(Error::InvalidAmount)
    );
    // boundaries that are allowed
    assert!(try_open(&s, &a, &c, 1, 12, 1500).is_ok());
    assert!(try_open(&s, &a, &c, 1_000_000_000_000_000, 12, 1500).is_ok());
}

// Error 9
#[test]
fn error_9_invalid_months() {
    let s = setup();
    let a = actors(&s);
    let c = a.creditor.clone();
    assert_eq!(try_open(&s, &a, &c, P190, 0, 1500), Err(Error::InvalidMonths));
    assert_eq!(try_open(&s, &a, &c, P190, 61, 1500), Err(Error::InvalidMonths));
    assert!(try_open(&s, &a, &c, P190, 1, 1500).is_ok());
    assert!(try_open(&s, &a, &c, P190, 60, 1500).is_ok());
}

// Error 7 (share outside 100..=1500)
#[test]
fn error_7_invalid_share_on_request() {
    let s = setup();
    let a = actors(&s);
    let c = a.creditor.clone();
    assert_eq!(try_open(&s, &a, &c, P190, 12, 99), Err(Error::InvalidShare));
    assert_eq!(try_open(&s, &a, &c, P190, 12, 1501), Err(Error::InvalidShare));
    assert!(try_open(&s, &a, &c, P190, 12, 100).is_ok());
    assert!(try_open(&s, &a, &c, P190, 12, 1500).is_ok());
}

#[test]
fn failed_request_creates_nothing() {
    let s = setup();
    let a = actors(&s);
    let c = a.creditor.clone();
    let _ = try_open(&s, &a, &c, 0, 12, 1500);
    assert_eq!(s.client.request_count(), 0);
}

// Error 4
#[test]
fn error_4_request_not_found() {
    let s = setup();
    let _a = actors(&s);
    assert_eq!(err(s.client.try_get_request(&1)), Error::RequestNotFound);
    assert_eq!(err(s.client.try_confirm_request(&1)), Error::RequestNotFound);
    assert_eq!(err(s.client.try_cancel_request(&1)), Error::RequestNotFound);
    assert_eq!(err(s.client.try_get_request(&0)), Error::RequestNotFound);
}

// confirm_request
#[test]
fn confirm_request_sets_confirmed_and_time() {
    let s = setup();
    let a = actors(&s);
    s.env.ledger().set_timestamp(1_000);
    let id = open_request(&s, &a, P190, 12, 1500);
    s.env.ledger().set_timestamp(1_500);
    s.client.confirm_request(&id);
    let auths = s.env.auths(); // read right away: later calls replace the recorded auths
    let r = s.client.get_request(&id);
    assert_eq!(r.status, RequestStatus::Confirmed);
    assert_eq!(r.confirmed_at, 1_500);
    assert_eq!(r.created_at, 1_000);
    assert_eq!(auths[0].0, a.creditor);
}

#[test]
fn confirm_request_emits_request_confirmed() {
    let s = setup();
    let a = actors(&s);
    let id = open_request(&s, &a, P190, 12, 1500);
    s.client.confirm_request(&id);
    let expected = RequestConfirmed {
        id,
        creditor: a.creditor.clone(),
    };
    assert_eq!(
        s.env.events().all().filter_by_contract(&s.contract_id),
        std::vec![expected.to_xdr(&s.env, &s.contract_id)]
    );
}

#[test]
fn confirm_by_wrong_address_fails() {
    let s = setup();
    let a = actors(&s);
    let id = open_request(&s, &a, P190, 12, 1500);

    // The worker signs instead of the request's own creditor.
    let wrong = a.worker.clone();
    s.env.mock_auths(&[MockAuth {
        address: &wrong,
        invoke: &MockAuthInvoke {
            contract: &s.contract_id,
            fn_name: "confirm_request",
            args: (id,).into_val(&s.env),
            sub_invokes: &[],
        },
    }]);
    assert!(s.client.try_confirm_request(&id).is_err());
    assert_eq!(s.client.get_request(&id).status, RequestStatus::Open);
    assert_eq!(s.client.get_request(&id).confirmed_at, 0);
}

#[test]
fn confirm_by_another_registered_creditor_fails() {
    let s = setup();
    let a = actors(&s);
    let other = Address::generate(&s.env);
    s.client.add_creditor(&other);
    let id = open_request(&s, &a, P190, 12, 1500);
    s.env.mock_auths(&[MockAuth {
        address: &other,
        invoke: &MockAuthInvoke {
            contract: &s.contract_id,
            fn_name: "confirm_request",
            args: (id,).into_val(&s.env),
            sub_invokes: &[],
        },
    }]);
    assert!(s.client.try_confirm_request(&id).is_err());
    assert_eq!(s.client.get_request(&id).status, RequestStatus::Open);
}

// Error 5
#[test]
fn error_5_confirm_twice() {
    let s = setup();
    let a = actors(&s);
    let id = open_request(&s, &a, P190, 12, 1500);
    s.client.confirm_request(&id);
    assert_eq!(err(s.client.try_confirm_request(&id)), Error::InvalidRequestStatus);
}

#[test]
fn error_5_confirm_cancelled() {
    let s = setup();
    let a = actors(&s);
    let id = open_request(&s, &a, P190, 12, 1500);
    s.client.cancel_request(&id);
    assert_eq!(err(s.client.try_confirm_request(&id)), Error::InvalidRequestStatus);
}

#[test]
fn error_5_confirm_funded() {
    let s = setup();
    let a = actors(&s);
    let id = open_request(&s, &a, P190, 12, 1500);
    s.client.confirm_request(&id);
    let funder = funded_user(&s, P190);
    s.client.fund_request(&funder, &id, &Mode::Loan, &300);
    assert_eq!(err(s.client.try_confirm_request(&id)), Error::InvalidRequestStatus);
}

// cancel_request
#[test]
fn cancel_open_request() {
    let s = setup();
    let a = actors(&s);
    let id = open_request(&s, &a, P190, 12, 1500);
    s.client.cancel_request(&id);
    let auths = s.env.auths(); // read right away: later calls replace the recorded auths
    assert_eq!(s.client.get_request(&id).status, RequestStatus::Cancelled);
    assert_eq!(auths[0].0, a.worker);
}

#[test]
fn cancel_confirmed_request() {
    let s = setup();
    let a = actors(&s);
    let id = open_request(&s, &a, P190, 12, 1500);
    s.client.confirm_request(&id);
    s.client.cancel_request(&id);
    assert_eq!(s.client.get_request(&id).status, RequestStatus::Cancelled);
}

#[test]
fn error_5_cancel_after_funding_fails() {
    // Goes through the real fund_request (Step 4); no forced storage.
    let s = setup();
    let a = actors(&s);
    let id = open_request(&s, &a, P190, 12, 1500);
    s.client.confirm_request(&id);
    let funder = funded_user(&s, P190);
    s.client.fund_request(&funder, &id, &Mode::Loan, &300);
    assert_eq!(s.client.get_request(&id).status, RequestStatus::Funded);
    assert_eq!(err(s.client.try_cancel_request(&id)), Error::InvalidRequestStatus);
    assert_eq!(s.client.get_request(&id).status, RequestStatus::Funded);
    assert_eq!(s.client.get_loan(&id).status, LoanStatus::Active);
}

#[test]
fn error_5_cancel_twice() {
    let s = setup();
    let a = actors(&s);
    let id = open_request(&s, &a, P190, 12, 1500);
    s.client.cancel_request(&id);
    assert_eq!(err(s.client.try_cancel_request(&id)), Error::InvalidRequestStatus);
}

#[test]
fn cancel_by_non_worker_fails() {
    let s = setup();
    let a = actors(&s);
    let id = open_request(&s, &a, P190, 12, 1500);
    let wrong = a.creditor.clone();
    s.env.mock_auths(&[MockAuth {
        address: &wrong,
        invoke: &MockAuthInvoke {
            contract: &s.contract_id,
            fn_name: "cancel_request",
            args: (id,).into_val(&s.env),
            sub_invokes: &[],
        },
    }]);
    assert!(s.client.try_cancel_request(&id).is_err());
    assert_eq!(s.client.get_request(&id).status, RequestStatus::Open);
}

#[test]
fn request_payoff_by_wrong_signer_fails() {
    let s = setup();
    let a = actors(&s);
    let stranger = Address::generate(&s.env);
    s.env.mock_auths(&[MockAuth {
        address: &stranger,
        invoke: &MockAuthInvoke {
            contract: &s.contract_id,
            fn_name: "request_payoff",
            args: (
                a.worker.clone(),
                a.family.clone(),
                a.creditor.clone(),
                P190,
                12u32,
                1500u32,
                BytesN::<32>::from_array(&s.env, &HASH),
            )
                .into_val(&s.env),
            sub_invokes: &[],
        },
    }]);
    assert!(s
        .client
        .try_request_payoff(
            &a.worker,
            &a.family,
            &a.creditor,
            &P190,
            &12,
            &1500,
            &BytesN::from_array(&s.env, &HASH),
        )
        .is_err());
    assert_eq!(s.client.request_count(), 0);
}

// ---- funding (Step 4) ----

fn token_client<'a>(s: &'a Setup) -> TokenClient<'a> {
    TokenClient::new(&s.env, &s.token)
}

/// New address holding `amount` test tokens. Needs mock_all_auths (call `actors(&s)` first).
pub(crate) fn funded_user(s: &Setup, amount: i128) -> Address {
    let user = Address::generate(&s.env);
    StellarAssetClient::new(&s.env, &s.token).mint(&user, &amount);
    user
}

/// Open request that the creditor has confirmed.
pub(crate) fn confirmed_request(s: &Setup, a: &Actors, principal: i128, share: u32) -> u32 {
    let id = open_request(s, a, principal, 12, share);
    s.client.confirm_request(&id);
    id
}

fn try_fund(s: &Setup, funder: &Address, id: u32, mode: Mode, fee: u32) -> Error {
    err(s.client.try_fund_request(funder, &id, &mode, &fee))
}

// v2 golden: Loan fee. legal 1_900_000_000, fee_bps 300 -> outstanding 1_957_000_000.
#[test]
fn golden_loan_fee_outstanding() {
    let s = setup();
    let a = actors(&s);
    s.env.ledger().set_timestamp(2_000);
    let id = confirmed_request(&s, &a, 1_900_000_000, 1500);
    let funder = funded_user(&s, 10_000_000_000);
    s.env.ledger().set_timestamp(3_000);

    let loan_id = s.client.fund_request(&funder, &id, &Mode::Loan, &300);
    assert_eq!(loan_id, id);
    assert_eq!(
        s.client.get_loan(&loan_id),
        Loan {
            id: 1,
            worker: a.worker.clone(),
            family: a.family.clone(),
            funder: funder.clone(),
            creditor: a.creditor.clone(),
            mode: Mode::Loan,
            legal_amount: 1_900_000_000,
            fee_bps: 300,
            outstanding: 1_957_000_000,
            share_bps: 1500,
            min_share_bps: 1500,
            doc_hash: BytesN::from_array(&s.env, &HASH),
            funded_at: 3_000,
            last_payment_at: 3_000,
            total_repaid: 0,
            total_to_family: 0,
            remit_count: 0,
            status: LoanStatus::Active,
        }
    );
    assert_eq!(s.client.get_request(&id).status, RequestStatus::Funded);
}

#[test]
fn fund_request_pays_creditor_the_legal_amount() {
    let s = setup();
    let a = actors(&s);
    let id = confirmed_request(&s, &a, 1_900_000_000, 1500);
    let funder = funded_user(&s, 10_000_000_000);
    s.client.fund_request(&funder, &id, &Mode::Loan, &300);
    assert_eq!(token_client(&s).balance(&a.creditor), 1_900_000_000);
    assert_eq!(token_client(&s).balance(&funder), 10_000_000_000 - 1_900_000_000);
}

// v2 golden: Grant. 650_000_000, fee 0 -> legal 650_000_000, outstanding 0, Repaid.
#[test]
fn golden_grant_is_repaid_with_zero_outstanding() {
    let s = setup();
    let a = actors(&s);
    let id = confirmed_request(&s, &a, 650_000_000, 1500);
    let employer = funded_user(&s, 10_000_000_000);
    s.client.fund_request(&employer, &id, &Mode::Grant, &0);

    let loan = s.client.get_loan(&id);
    assert_eq!(loan.legal_amount, 650_000_000);
    assert_eq!(loan.outstanding, 0);
    assert_eq!(loan.status, LoanStatus::Repaid);
    assert_eq!(loan.mode, Mode::Grant);
    assert_eq!(loan.fee_bps, 0);
    assert_eq!(token_client(&s).balance(&a.creditor), 650_000_000);
    assert_eq!(token_client(&s).balance(&employer), 10_000_000_000 - 650_000_000);
    assert_eq!(s.client.get_request(&id).status, RequestStatus::Funded);
}

#[test]
fn loan_fee_boundaries_and_truncation() {
    let s = setup();
    let a = actors(&s);
    let funder = funded_user(&s, 100_000_000_000);

    // fee 0 is allowed in Loan mode: outstanding == legal_amount
    let r0 = confirmed_request(&s, &a, 1_900_000_000, 1500);
    s.client.fund_request(&funder, &r0, &Mode::Loan, &0);
    assert_eq!(s.client.get_loan(&r0).outstanding, 1_900_000_000);

    // fee 800 (max) allowed: 1_900_000_000 + 152_000_000
    let r8 = confirmed_request(&s, &a, 1_900_000_000, 1500);
    s.client.fund_request(&funder, &r8, &Mode::Loan, &800);
    assert_eq!(s.client.get_loan(&r8).outstanding, 2_052_000_000);

    // integer division truncates: 12_345 * 300 / 10_000 = 370 (not 370.35)
    let rt = confirmed_request(&s, &a, 12_345, 1500);
    s.client.fund_request(&funder, &rt, &Mode::Loan, &300);
    assert_eq!(s.client.get_loan(&rt).outstanding, 12_345 + 370);
}

// Error 10
#[test]
fn error_10_invalid_fee() {
    let s = setup();
    let a = actors(&s);
    let funder = funded_user(&s, 100_000_000_000);
    let id = confirmed_request(&s, &a, P190, 1500);

    assert_eq!(try_fund(&s, &funder, id, Mode::Loan, 801), Error::InvalidFee);
    assert_eq!(try_fund(&s, &funder, id, Mode::Grant, 1), Error::InvalidFee);
    assert_eq!(try_fund(&s, &funder, id, Mode::Grant, 300), Error::InvalidFee);

    // nothing happened: still Confirmed, no loan, no money moved
    assert_eq!(s.client.get_request(&id).status, RequestStatus::Confirmed);
    assert_eq!(err(s.client.try_get_loan(&id)), Error::LoanNotFound);
    assert_eq!(token_client(&s).balance(&a.creditor), 0);
}

// v2 golden: Fund unconfirmed. fund_request on an Open request -> Error 5.
#[test]
fn golden_error_5_fund_open_request() {
    let s = setup();
    let a = actors(&s);
    let id = open_request(&s, &a, P190, 12, 1500);
    let funder = funded_user(&s, 10_000_000_000);
    assert_eq!(try_fund(&s, &funder, id, Mode::Loan, 300), Error::InvalidRequestStatus);
    assert_eq!(s.client.get_request(&id).status, RequestStatus::Open);
    assert_eq!(err(s.client.try_get_loan(&id)), Error::LoanNotFound);
    assert_eq!(token_client(&s).balance(&funder), 10_000_000_000);
}

#[test]
fn error_5_fund_twice() {
    let s = setup();
    let a = actors(&s);
    let id = confirmed_request(&s, &a, P190, 1500);
    let funder = funded_user(&s, 10_000_000_000);
    s.client.fund_request(&funder, &id, &Mode::Loan, &300);
    assert_eq!(try_fund(&s, &funder, id, Mode::Loan, 300), Error::InvalidRequestStatus);
    // second attempt moved nothing
    assert_eq!(token_client(&s).balance(&a.creditor), P190);
}

#[test]
fn error_5_fund_cancelled() {
    let s = setup();
    let a = actors(&s);
    let id = confirmed_request(&s, &a, P190, 1500);
    s.client.cancel_request(&id);
    let funder = funded_user(&s, 10_000_000_000);
    assert_eq!(try_fund(&s, &funder, id, Mode::Loan, 300), Error::InvalidRequestStatus);
}

#[test]
fn error_4_fund_missing_request() {
    let s = setup();
    let _a = actors(&s);
    let funder = funded_user(&s, 10_000_000_000);
    assert_eq!(try_fund(&s, &funder, 1, Mode::Loan, 300), Error::RequestNotFound);
}

// Error 6
#[test]
fn error_6_loan_not_found() {
    let s = setup();
    let a = actors(&s);
    assert_eq!(err(s.client.try_get_loan(&1)), Error::LoanNotFound);
    assert_eq!(err(s.client.try_get_loan(&0)), Error::LoanNotFound);
    // a request that exists but is not funded has no loan
    let id = confirmed_request(&s, &a, P190, 1500);
    assert_eq!(err(s.client.try_get_loan(&id)), Error::LoanNotFound);
}

// Failed funding: funder balance below legal_amount -> reverts, no loan created.
#[test]
fn failed_funding_low_balance_reverts_and_creates_no_loan() {
    let s = setup();
    let a = actors(&s);
    let id = confirmed_request(&s, &a, P190, 1500);
    let funder = funded_user(&s, P190 - 1); // one stroop short

    let result = s.client.try_fund_request(&funder, &id, &Mode::Loan, &300);
    assert!(result.is_err());

    assert_eq!(err(s.client.try_get_loan(&id)), Error::LoanNotFound); // no loan
    assert_eq!(s.client.get_request(&id).status, RequestStatus::Confirmed); // not Funded
    assert_eq!(token_client(&s).balance(&funder), P190 - 1); // funder untouched
    assert_eq!(token_client(&s).balance(&a.creditor), 0); // creditor unpaid
    assert!(s.env.events().all().filter_by_contract(&s.contract_id).events().is_empty()); // no Payoff
}

#[test]
fn failed_funding_with_zero_balance_creates_no_loan() {
    let s = setup();
    let a = actors(&s);
    let id = confirmed_request(&s, &a, P190, 1500);
    let funder = Address::generate(&s.env); // holds nothing
    assert!(s.client.try_fund_request(&funder, &id, &Mode::Loan, &300).is_err());
    assert_eq!(err(s.client.try_get_loan(&id)), Error::LoanNotFound);
    assert_eq!(s.client.get_request(&id).status, RequestStatus::Confirmed);
}

#[test]
fn funding_succeeds_after_a_failed_attempt_once_topped_up() {
    let s = setup();
    let a = actors(&s);
    let id = confirmed_request(&s, &a, P190, 1500);
    let funder = funded_user(&s, P190 - 1);
    assert!(s.client.try_fund_request(&funder, &id, &Mode::Loan, &300).is_err());
    StellarAssetClient::new(&s.env, &s.token).mint(&funder, &1);
    s.client.fund_request(&funder, &id, &Mode::Loan, &300); // exactly legal_amount is enough
    assert_eq!(s.client.get_loan(&id).outstanding, 1_957_000_000);
    assert_eq!(token_client(&s).balance(&funder), 0);
}

#[test]
fn fund_request_requires_funder_auth() {
    let s = setup();
    let a = actors(&s);
    let id = confirmed_request(&s, &a, P190, 1500);
    let funder = funded_user(&s, 10_000_000_000);
    s.client.fund_request(&funder, &id, &Mode::Loan, &300);
    assert_eq!(s.env.auths()[0].0, funder);
}

#[test]
fn fund_by_wrong_signer_fails() {
    let s = setup();
    let a = actors(&s);
    let id = confirmed_request(&s, &a, P190, 1500);
    let funder = funded_user(&s, 10_000_000_000);
    let stranger = Address::generate(&s.env);
    s.env.mock_auths(&[MockAuth {
        address: &stranger,
        invoke: &MockAuthInvoke {
            contract: &s.contract_id,
            fn_name: "fund_request",
            args: (funder.clone(), id, Mode::Loan, 300u32).into_val(&s.env),
            sub_invokes: &[],
        },
    }]);
    assert!(s.client.try_fund_request(&funder, &id, &Mode::Loan, &300).is_err());
    assert_eq!(s.client.get_request(&id).status, RequestStatus::Confirmed);
    assert_eq!(token_client(&s).balance(&funder), 10_000_000_000);
}

#[test]
fn fund_request_emits_payoff() {
    let s = setup();
    let a = actors(&s);
    let id = confirmed_request(&s, &a, P190, 1500);
    let funder = funded_user(&s, 10_000_000_000);
    s.client.fund_request(&funder, &id, &Mode::Loan, &300);
    let expected = Payoff {
        id,
        funder: funder.clone(),
        creditor: a.creditor.clone(),
        amount: P190,
        mode: Mode::Loan,
    };
    assert_eq!(
        s.env.events().all().filter_by_contract(&s.contract_id),
        std::vec![expected.to_xdr(&s.env, &s.contract_id)]
    );
}

#[test]
fn grant_emits_payoff_with_grant_mode() {
    let s = setup();
    let a = actors(&s);
    let id = confirmed_request(&s, &a, 650_000_000, 1500);
    let employer = funded_user(&s, 10_000_000_000);
    s.client.fund_request(&employer, &id, &Mode::Grant, &0);
    let expected = Payoff {
        id,
        funder: employer.clone(),
        creditor: a.creditor.clone(),
        amount: 650_000_000,
        mode: Mode::Grant,
    };
    assert_eq!(
        s.env.events().all().filter_by_contract(&s.contract_id),
        std::vec![expected.to_xdr(&s.env, &s.contract_id)]
    );
}

#[test]
fn loan_id_equals_request_id_for_several_requests() {
    let s = setup();
    let a = actors(&s);
    let funder = funded_user(&s, 100_000_000_000);
    let r1 = confirmed_request(&s, &a, P190, 1500);
    let r2 = confirmed_request(&s, &a, 650_000_000, 1000);
    // fund out of order
    assert_eq!(s.client.fund_request(&funder, &r2, &Mode::Loan, &300), r2);
    assert_eq!(s.client.fund_request(&funder, &r1, &Mode::Loan, &300), r1);
    assert_eq!(s.client.get_loan(&r2).share_bps, 1000);
    assert_eq!(s.client.get_loan(&r2).min_share_bps, 1000);
    assert_eq!(s.client.get_loan(&r1).share_bps, 1500);
}

// ---- repayment (Step 5) ----

/// Funds a request and gives the worker `cash` test tokens. Funding happens at ledger time `t`.
/// Returns (loan_id, funder).
fn funded_loan(
    s: &Setup,
    a: &Actors,
    principal: i128,
    share: u32,
    mode: Mode,
    fee: u32,
    cash: i128,
    t: u64,
) -> (u32, Address) {
    let id = confirmed_request(s, a, principal, share);
    let funder = funded_user(s, principal);
    s.env.ledger().set_timestamp(t);
    s.client.fund_request(&funder, &id, &mode, &fee);
    StellarAssetClient::new(&s.env, &s.token).mint(&a.worker, &cash);
    (id, funder)
}

/// The 190 USDC training loan at 3%: outstanding 1_957_000_000, share 1500, funded at t=1000.
fn golden_loan(s: &Setup, a: &Actors) -> (u32, Address) {
    funded_loan(s, a, 1_900_000_000, 1500, Mode::Loan, 300, 100_000_000_000, 1_000)
}

fn bal(s: &Setup, who: &Address) -> i128 {
    token_client(s).balance(who)
}

// v2 golden: normal remit. 4_000_000_000 at share 1500.
#[test]
fn golden_normal_remit() {
    let s = setup();
    let a = actors(&s);
    let (id, funder) = golden_loan(&s, &a);
    let worker_before = bal(&s, &a.worker);

    let r = s.client.remit(&id, &4_000_000_000);
    assert_eq!(
        r,
        RemitResult {
            to_lender: 600_000_000,
            to_family: 3_400_000_000,
            outstanding: 1_357_000_000,
        }
    );
    assert_eq!(bal(&s, &funder), 600_000_000);
    assert_eq!(bal(&s, &a.family), 3_400_000_000);
    assert_eq!(bal(&s, &a.worker), worker_before - 4_000_000_000);

    let loan = s.client.get_loan(&id);
    assert_eq!(loan.outstanding, 1_357_000_000);
    assert_eq!(loan.total_repaid, 600_000_000);
    assert_eq!(loan.total_to_family, 3_400_000_000);
    assert_eq!(loan.remit_count, 1);
    assert_eq!(loan.status, LoanStatus::Active);
}

// v2 golden: repayment path 195.70 -> 135.70 -> 75.70 -> 15.70 -> 0, and the final remit
// (outstanding 157_000_000, amount 4_000_000_000) -> 157_000_000 / 3_843_000_000, Repaid.
#[test]
fn golden_repayment_path_and_final_remit() {
    let s = setup();
    let a = actors(&s);
    let (id, funder) = golden_loan(&s, &a);
    assert_eq!(s.client.get_loan(&id).outstanding, 1_957_000_000); // 195.70

    let mut seen = std::vec::Vec::new();
    for _ in 0..3 {
        seen.push(s.client.remit(&id, &4_000_000_000).outstanding);
    }
    assert_eq!(seen, std::vec![1_357_000_000, 757_000_000, 157_000_000]); // 135.70, 75.70, 15.70
    assert_eq!(s.client.get_loan(&id).status, LoanStatus::Active);

    // final remit: outstanding is 157_000_000
    assert_eq!(s.client.get_loan(&id).outstanding, 157_000_000);
    let last = s.client.remit(&id, &4_000_000_000);
    assert_eq!(
        last,
        RemitResult {
            to_lender: 157_000_000,
            to_family: 3_843_000_000,
            outstanding: 0,
        }
    );
    let loan = s.client.get_loan(&id);
    assert_eq!(loan.status, LoanStatus::Repaid);
    assert_eq!(loan.outstanding, 0);
    assert_eq!(loan.remit_count, 4);
    // the funder got principal + fee back exactly
    assert_eq!(loan.total_repaid, 1_957_000_000);
    assert_eq!(bal(&s, &funder), 1_957_000_000);
    assert_eq!(loan.total_to_family, 4 * 4_000_000_000 - 1_957_000_000);
}

// v2 golden: Grant. outstanding 0 / Repaid, then remit 4_000_000_000 -> 0 and 4_000_000_000.
#[test]
fn golden_grant_remit_all_to_family() {
    let s = setup();
    let a = actors(&s);
    let (id, employer) =
        funded_loan(&s, &a, 650_000_000, 1500, Mode::Grant, 0, 10_000_000_000, 1_000);
    let before = bal(&s, &employer);

    let r = s.client.remit(&id, &4_000_000_000);
    assert_eq!(
        r,
        RemitResult {
            to_lender: 0,
            to_family: 4_000_000_000,
            outstanding: 0,
        }
    );
    assert_eq!(bal(&s, &employer), before); // nothing to the employer
    assert_eq!(bal(&s, &a.family), 4_000_000_000);
    let loan = s.client.get_loan(&id);
    assert_eq!(loan.status, LoanStatus::Repaid);
    assert_eq!(loan.total_repaid, 0);
    assert_eq!(loan.total_to_family, 4_000_000_000);
    assert_eq!(loan.remit_count, 1);
}

// v2 golden: dust remit. 50_000_000 at share 1500 -> 7_500_000, pause clock not reset.
#[test]
fn golden_dust_remit_does_not_reset_clock() {
    let s = setup();
    let a = actors(&s);
    let (id, funder) = golden_loan(&s, &a); // last_payment_at = 1000
    s.env.ledger().set_timestamp(1_100);

    let r = s.client.remit(&id, &50_000_000);
    assert_eq!(r.to_lender, 7_500_000);
    assert_eq!(r.to_family, 42_500_000);
    assert_eq!(r.outstanding, 1_957_000_000 - 7_500_000);
    assert_eq!(bal(&s, &funder), 7_500_000);
    let loan = s.client.get_loan(&id);
    assert_eq!(loan.last_payment_at, 1_000); // NOT reset
    assert_eq!(loan.remit_count, 1);
}

// Pause clock: only a payment to the funder of >= 1 USDC (10_000_000) resets it.
#[test]
fn pause_clock_threshold_is_exactly_one_usdc_to_the_funder() {
    let s = setup();
    let a = actors(&s);
    let (id, _f) = golden_loan(&s, &a); // share 1500, last_payment_at = 1000

    // amount 66_666_666 -> to_lender 9_999_999 (one stroop under 1 USDC): no reset
    s.env.ledger().set_timestamp(1_100);
    let r = s.client.remit(&id, &66_666_666);
    assert_eq!(r.to_lender, 9_999_999);
    assert_eq!(s.client.get_loan(&id).last_payment_at, 1_000);

    // amount 66_666_667 -> to_lender 10_000_000 (exactly 1 USDC): reset
    s.env.ledger().set_timestamp(1_200);
    let r = s.client.remit(&id, &66_666_667);
    assert_eq!(r.to_lender, 10_000_000);
    assert_eq!(s.client.get_loan(&id).last_payment_at, 1_200);
}

#[test]
fn a_big_remittance_with_a_small_share_to_the_funder_does_not_reset_the_clock() {
    // What counts is the payment to the FUNDER, not the size of the remittance.
    let s = setup();
    let a = actors(&s);
    let (id, _f) = funded_loan(&s, &a, 1_900_000_000, 100, Mode::Loan, 300, 100_000_000_000, 1_000);
    s.env.ledger().set_timestamp(1_100);
    // 900_000_000 (90 USDC) at 1% -> 9_000_000 to the funder, under 1 USDC
    let r = s.client.remit(&id, &900_000_000);
    assert_eq!(r.to_lender, 9_000_000);
    assert_eq!(s.client.get_loan(&id).last_payment_at, 1_000);
}

#[test]
fn final_small_payment_that_repays_the_loan_does_not_reset_the_clock() {
    // Murad's rule: only >= 1 USDC to the funder resets the clock, even when the loan is repaid.
    let s = setup();
    let a = actors(&s);
    let (id, _f) = funded_loan(&s, &a, 5_000_000, 1500, Mode::Loan, 0, 1_000_000_000, 1_000);
    s.env.ledger().set_timestamp(1_100);
    let r = s.client.remit(&id, &100_000_000);
    assert_eq!(r.to_lender, 5_000_000); // capped at outstanding, under 1 USDC
    assert_eq!(r.outstanding, 0);
    let loan = s.client.get_loan(&id);
    assert_eq!(loan.status, LoanStatus::Repaid);
    assert_eq!(loan.last_payment_at, 1_000);
}

#[test]
fn to_lender_is_capped_at_outstanding() {
    let s = setup();
    let a = actors(&s);
    let (id, funder) = funded_loan(&s, &a, 5_000_000, 1500, Mode::Loan, 0, 1_000_000_000, 1_000);
    let r = s.client.remit(&id, &1_000_000_000);
    assert_eq!(r.to_lender, 5_000_000);
    assert_eq!(r.to_family, 995_000_000);
    assert_eq!(bal(&s, &funder), 5_000_000);
}

#[test]
fn remit_after_repaid_sends_everything_to_family() {
    let s = setup();
    let a = actors(&s);
    let (id, funder) = funded_loan(&s, &a, 5_000_000, 1500, Mode::Loan, 0, 1_000_000_000, 1_000);
    s.client.remit(&id, &100_000_000); // repays
    let funder_after = bal(&s, &funder);
    let r = s.client.remit(&id, &100_000_000);
    assert_eq!(r.to_lender, 0);
    assert_eq!(r.to_family, 100_000_000);
    assert_eq!(bal(&s, &funder), funder_after);
    assert_eq!(s.client.get_loan(&id).remit_count, 2);
    assert_eq!(s.client.get_loan(&id).status, LoanStatus::Repaid);
}

#[test]
fn remit_emits_remit_event() {
    let s = setup();
    let a = actors(&s);
    let (id, _f) = golden_loan(&s, &a);
    s.client.remit(&id, &4_000_000_000);
    let expected = Remit {
        id,
        to_lender: 600_000_000,
        to_family: 3_400_000_000,
        outstanding: 1_357_000_000,
    };
    assert_eq!(
        s.env.events().all().filter_by_contract(&s.contract_id),
        std::vec![expected.to_xdr(&s.env, &s.contract_id)]
    );
}

#[test]
fn final_remit_emits_remit_then_repaid() {
    let s = setup();
    let a = actors(&s);
    let (id, _f) = funded_loan(&s, &a, 5_000_000, 1500, Mode::Loan, 0, 1_000_000_000, 1_000);
    s.client.remit(&id, &100_000_000);
    let e1 = Remit {
        id,
        to_lender: 5_000_000,
        to_family: 95_000_000,
        outstanding: 0,
    };
    let e2 = Repaid { id };
    assert_eq!(
        s.env.events().all().filter_by_contract(&s.contract_id),
        std::vec![
            e1.to_xdr(&s.env, &s.contract_id),
            e2.to_xdr(&s.env, &s.contract_id)
        ]
    );
}

#[test]
fn remit_on_an_already_repaid_loan_emits_no_repaid_event() {
    let s = setup();
    let a = actors(&s);
    let (id, _e) = funded_loan(&s, &a, 650_000_000, 1500, Mode::Grant, 0, 10_000_000_000, 1_000);
    s.client.remit(&id, &4_000_000_000);
    let e1 = Remit {
        id,
        to_lender: 0,
        to_family: 4_000_000_000,
        outstanding: 0,
    };
    assert_eq!(
        s.env.events().all().filter_by_contract(&s.contract_id),
        std::vec![e1.to_xdr(&s.env, &s.contract_id)]
    );
}

// Error 8 / Error 6 on remit
#[test]
fn error_8_remit_amount_must_be_positive() {
    let s = setup();
    let a = actors(&s);
    let (id, _f) = golden_loan(&s, &a);
    assert_eq!(err(s.client.try_remit(&id, &0)), Error::InvalidAmount);
    assert_eq!(err(s.client.try_remit(&id, &-1)), Error::InvalidAmount);
    assert_eq!(s.client.get_loan(&id).remit_count, 0);
}

#[test]
fn error_6_remit_loan_not_found() {
    let s = setup();
    let _a = actors(&s);
    assert_eq!(err(s.client.try_remit(&1, &100)), Error::LoanNotFound);
    assert_eq!(err(s.client.try_set_share(&1, &1000)), Error::LoanNotFound);
    assert_eq!(err(s.client.try_missed_periods(&1)), Error::LoanNotFound);
    assert_eq!(err(s.client.try_is_overdue(&1)), Error::LoanNotFound);
}

#[test]
fn remit_requires_worker_auth_and_wrong_signer_fails() {
    let s = setup();
    let a = actors(&s);
    let (id, funder) = golden_loan(&s, &a);
    s.client.remit(&id, &100_000_000);
    assert_eq!(s.env.auths()[0].0, a.worker);

    // the funder (or anyone else) cannot remit on the worker's behalf
    s.env.mock_auths(&[MockAuth {
        address: &funder,
        invoke: &MockAuthInvoke {
            contract: &s.contract_id,
            fn_name: "remit",
            args: (id, 100_000_000i128).into_val(&s.env),
            sub_invokes: &[],
        },
    }]);
    assert!(s.client.try_remit(&id, &100_000_000).is_err());
    assert_eq!(s.client.get_loan(&id).remit_count, 1);
}

#[test]
fn remit_with_too_little_balance_reverts_and_changes_nothing() {
    let s = setup();
    let a = actors(&s);
    let (id, funder) =
        funded_loan(&s, &a, 1_900_000_000, 1500, Mode::Loan, 300, 1_000_000_000, 1_000);
    let before = s.client.get_loan(&id);
    assert!(s.client.try_remit(&id, &4_000_000_000).is_err()); // worker has only 1_000_000_000
    assert_eq!(s.client.get_loan(&id), before);
    assert_eq!(bal(&s, &a.worker), 1_000_000_000);
    assert_eq!(bal(&s, &funder), 0);
    assert_eq!(bal(&s, &a.family), 0);
}

// set_share
#[test]
fn set_share_changes_the_split() {
    let s = setup();
    let a = actors(&s);
    let (id, _f) = funded_loan(&s, &a, 1_900_000_000, 1000, Mode::Loan, 300, 100_000_000_000, 1_000);
    s.client.set_share(&id, &1500);
    assert_eq!(s.env.auths()[0].0, a.worker);
    let loan = s.client.get_loan(&id);
    assert_eq!(loan.share_bps, 1500);
    assert_eq!(loan.min_share_bps, 1000); // the floor never moves
    assert_eq!(s.client.remit(&id, &1_000_000_000).to_lender, 150_000_000);
    // lowering back to the floor is allowed
    s.client.set_share(&id, &1000);
    assert_eq!(s.client.remit(&id, &1_000_000_000).to_lender, 100_000_000);
}

// v2 golden: share floor. set_share(1400) when min_share_bps is 1500 -> Error 7.
#[test]
fn golden_error_7_share_below_floor() {
    let s = setup();
    let a = actors(&s);
    let (id, _f) = golden_loan(&s, &a); // min_share_bps = 1500
    assert_eq!(s.client.get_loan(&id).min_share_bps, 1500);
    assert_eq!(err(s.client.try_set_share(&id, &1400)), Error::InvalidShare);
    assert_eq!(s.client.get_loan(&id).share_bps, 1500); // unchanged
}

#[test]
fn error_7_set_share_bounds() {
    let s = setup();
    let a = actors(&s);
    let (id, _f) = funded_loan(&s, &a, 1_900_000_000, 1000, Mode::Loan, 300, 0, 1_000);
    assert_eq!(err(s.client.try_set_share(&id, &999)), Error::InvalidShare); // below floor
    assert_eq!(err(s.client.try_set_share(&id, &1501)), Error::InvalidShare); // above 1500
    assert_eq!(err(s.client.try_set_share(&id, &0)), Error::InvalidShare);
    s.client.set_share(&id, &1000); // floor itself
    s.client.set_share(&id, &1500); // ceiling itself
    // a loan funded at the lowest share (100) can go down to 100 but not 99
    let (low, _f2) = funded_loan(&s, &a, 1_900_000_000, 100, Mode::Loan, 300, 0, 1_000);
    assert_eq!(err(s.client.try_set_share(&low, &99)), Error::InvalidShare);
    s.client.set_share(&low, &100);
}

#[test]
fn set_share_by_wrong_signer_fails() {
    let s = setup();
    let a = actors(&s);
    let (id, funder) = golden_loan(&s, &a);
    s.env.mock_auths(&[MockAuth {
        address: &funder,
        invoke: &MockAuthInvoke {
            contract: &s.contract_id,
            fn_name: "set_share",
            args: (id, 1500u32).into_val(&s.env),
            sub_invokes: &[],
        },
    }]);
    assert!(s.client.try_set_share(&id, &1500).is_err());
}

// set_period
#[test]
fn admin_can_set_period() {
    let s = setup();
    s.env.mock_all_auths();
    s.client.set_period(&120, &5);
    assert_eq!(s.env.auths()[0].0, s.admin);
    let c = s.client.get_config();
    assert_eq!(c.period_secs, 120);
    assert_eq!(c.max_pause_periods, 5);
    assert_eq!(c.admin, s.admin); // other fields untouched
    assert_eq!(c.token, s.token);
}

#[test]
fn error_11_set_period_zero() {
    let s = setup();
    s.env.mock_all_auths();
    assert_eq!(err(s.client.try_set_period(&0, &3)), Error::InvalidPeriod);
    let c = s.client.get_config();
    assert_eq!((c.period_secs, c.max_pause_periods), (60, 3)); // unchanged
    // max_pause_periods = 0 is allowed
    s.client.set_period(&60, &0);
    assert_eq!(s.client.get_config().max_pause_periods, 0);
}

#[test]
fn set_period_by_non_admin_fails() {
    let s = setup();
    let intruder = Address::generate(&s.env);
    s.env.mock_auths(&[MockAuth {
        address: &intruder,
        invoke: &MockAuthInvoke {
            contract: &s.contract_id,
            fn_name: "set_period",
            args: (120u64, 5u32).into_val(&s.env),
            sub_invokes: &[],
        },
    }]);
    assert!(s.client.try_set_period(&120, &5).is_err());
    assert_eq!(s.client.get_config().period_secs, 60);
}

// missed_periods / is_overdue
#[test]
fn missed_periods_and_overdue_follow_the_rule() {
    let s = setup();
    let a = actors(&s);
    let (id, _f) = golden_loan(&s, &a); // period 60, max 3, last_payment_at = 1000
    let at = |t: u64| s.env.ledger().set_timestamp(t);

    at(1_000);
    assert_eq!((s.client.missed_periods(&id), s.client.is_overdue(&id)), (0, false));
    at(1_059);
    assert_eq!((s.client.missed_periods(&id), s.client.is_overdue(&id)), (0, false));
    at(1_060);
    assert_eq!((s.client.missed_periods(&id), s.client.is_overdue(&id)), (1, false));
    at(1_239); // 239 / 60 = 3: still not "more than 3"
    assert_eq!((s.client.missed_periods(&id), s.client.is_overdue(&id)), (3, false));
    at(1_240); // 240 / 60 = 4 > 3
    assert_eq!((s.client.missed_periods(&id), s.client.is_overdue(&id)), (4, true));
}

#[test]
fn a_real_payment_resets_the_overdue_count_but_dust_does_not() {
    let s = setup();
    let a = actors(&s);
    let (id, _f) = golden_loan(&s, &a);

    s.env.ledger().set_timestamp(1_300); // 5 periods missed, overdue
    assert!(s.client.is_overdue(&id));
    s.client.remit(&id, &50_000_000); // dust: 7_500_000 to the funder
    assert_eq!(s.client.missed_periods(&id), 5);
    assert!(s.client.is_overdue(&id));

    s.client.remit(&id, &4_000_000_000); // 600_000_000 to the funder: reset
    assert_eq!(s.client.missed_periods(&id), 0);
    assert!(!s.client.is_overdue(&id));
    assert_eq!(s.client.get_loan(&id).last_payment_at, 1_300);
}

#[test]
fn repaid_loans_are_never_overdue() {
    let s = setup();
    let a = actors(&s);
    let (grant, _e) =
        funded_loan(&s, &a, 650_000_000, 1500, Mode::Grant, 0, 10_000_000_000, 1_000);
    let (paid, _f) = funded_loan(&s, &a, 5_000_000, 1500, Mode::Loan, 0, 1_000_000_000, 1_000);
    s.client.remit(&paid, &100_000_000);
    s.env.ledger().set_timestamp(1_000_000);
    for id in [grant, paid] {
        assert_eq!(s.client.missed_periods(&id), 0);
        assert!(!s.client.is_overdue(&id));
    }
}

#[test]
fn set_period_changes_missed_periods() {
    let s = setup();
    let a = actors(&s);
    let (id, _f) = golden_loan(&s, &a);
    s.env.ledger().set_timestamp(1_240);
    assert_eq!(s.client.missed_periods(&id), 4);
    s.client.set_period(&120, &3);
    assert_eq!(s.client.missed_periods(&id), 2); // 240 / 120
    assert!(!s.client.is_overdue(&id));
    s.client.set_period(&120, &1);
    assert!(s.client.is_overdue(&id)); // 2 > 1
}
