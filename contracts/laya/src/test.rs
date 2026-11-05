#![cfg(test)]
extern crate std;

use crate::{
    Config, DataKey, Error, Laya, LayaClient, PayoffRequest, RequestConfirmed, RequestCreated,
    RequestStatus,
};
use soroban_sdk::{
    testutils::{Address as _, Events as _, Ledger as _, MockAuth, MockAuthInvoke},
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

/// Test-only: put a request into any status (the funding path arrives in Step 4).
fn force_status(s: &Setup, id: u32, status: RequestStatus) {
    s.env.as_contract(&s.contract_id, || {
        let key = DataKey::Request(id);
        let mut r: PayoffRequest = s.env.storage().persistent().get(&key).unwrap();
        r.status = status;
        s.env.storage().persistent().set(&key, &r);
    });
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
    force_status(&s, id, RequestStatus::Funded);
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
    // The status is forced to Funded here; Step 4 repeats this through the real fund_request.
    let s = setup();
    let a = actors(&s);
    let id = open_request(&s, &a, P190, 12, 1500);
    s.client.confirm_request(&id);
    force_status(&s, id, RequestStatus::Funded);
    assert_eq!(err(s.client.try_cancel_request(&id)), Error::InvalidRequestStatus);
    assert_eq!(s.client.get_request(&id).status, RequestStatus::Funded);
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
