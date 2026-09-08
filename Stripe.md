# Habahub — Payment & Identity Architecture

## Objective

Replace the planned Paytrail integration with Stripe Connect.

Habahub is a marketplace supporting:

* C2C selling
* B2C selling
* normal product purchases
* auctions
* live selling
* shipping
* platform commission
* delayed seller payouts

The platform must NOT implement its own wallet, customer balance, seller balance, stored-value account, or internal money ledger.

Stripe must be the payment infrastructure responsible for payment processing, connected seller accounts, seller payout infrastructure, and Stripe-side KYC requirements.

Signicat is used for Habahub's own user authentication and Finnish strong electronic identification.

---

# 1. Core financial architecture

Use Stripe Connect.

Preferred payment flow:

Customer
↓
Habahub checkout
↓
Stripe PaymentIntent / Checkout
↓
Habahub platform Stripe account
↓
funds remain on the Stripe platform balance while the transaction is pending
↓
business rules determine when seller funds can be released
↓
Stripe Transfer to seller's Connected Account
↓
Stripe payout
↓
Seller bank account

Do NOT create a Habahub wallet.

Do NOT maintain a monetary balance for users inside the Habahub database.

Do NOT allow users to deposit money into Habahub.

Do NOT implement "wallet balance", "seller balance", "available balance", or similar user-controlled monetary accounts.

The database may contain transaction state and accounting metadata, but not a shadow wallet.

---

# 2. Stripe Connect model

Use:

Stripe Connect + separate charges and transfers.

Reason:

Habahub needs to accept the customer's payment first and decide later when the seller should receive their funds.

Destination charges are NOT the preferred model because destination charges transfer funds to the connected account immediately.

Separate charges and transfers allow Habahub to:

1. create the customer payment on the platform;
2. wait for payment settlement;
3. wait for fulfillment / delivery / dispute conditions;
4. calculate the seller's final amount;
5. create a Stripe Transfer to the seller's connected account.

Stripe documentation:

https://docs.stripe.com/connect/separate-charges-and-transfers

https://docs.stripe.com/connect/charges

---

# 3. Important terminology

Do not call this "escrow" in product/legal copy unless explicitly approved by legal counsel and Stripe.

Internally use:

"payment hold / delayed transfer"

or:

"funds held before seller transfer"

The business requirement is:

Customer pays now.

Seller receives the money later.

Habahub never creates or owns a user wallet.

Stripe remains the payment infrastructure.

---

# 4. Seller account types

There are two seller categories.

## C2C seller

A private individual selling goods.

Stripe:

Connected Account representing an individual.

Required Stripe capabilities should be requested according to Stripe's current Finland requirements.

## B2C seller

A registered business selling to consumers.

Stripe:

Connected Account representing a company/business.

The connected account must contain the business information required by Stripe, including any required representatives / beneficial owners / business details.

Do not attempt to duplicate Stripe's KYC process in Habahub.

Stripe is responsible for determining which verification information is required for the connected account.

Reference:

https://docs.stripe.com/connect/identity-verification

---

# 5. Habahub identity vs Stripe identity

These are separate concepts.

## Habahub identity

Use Signicat.

Primary Finnish authentication method:

Finnish Trust Network (FTN).

Users should be able to authenticate with:

* Finnish bank credentials
* Mobiilivarmenne

The UX should be:

"Kirjaudu pankkitunnuksilla"

not:

"Upload passport"

not:

"Take a photo of your passport"

not:

"Upload ID document"

for normal Finnish user authentication.

Signicat:

https://developer.signicat.com/identity-methods/ftn/about-ftn/

https://www.signicat.com/fi/kayttotapaukset/finnish-trust-network

## Stripe identity

Stripe Connect onboarding remains separate.

Stripe may request additional information from sellers because Stripe has its own regulatory/KYC obligations.

Never assume Signicat verification automatically satisfies Stripe's connected-account verification requirements.

---

# 6. User model

The database should have a normal user:

User

Fields should include approximately:

* id
* email
* phone
* name
* signicat_subject
* identity_verified_at
* user_type
* seller_type
* stripe_connected_account_id
* stripe_onboarding_status
* stripe_payout_status
* created_at
* updated_at

seller_type:

* NONE
* C2C
* B2C

Do not store:

* wallet_balance
* available_balance
* user_credit
* seller_wallet
* stored_money

---

# 7. Stripe connected account lifecycle

When a user becomes a seller:

1. User chooses "Start selling".
2. Determine seller type:

   * private individual
   * business
3. Create or retrieve the Stripe Connected Account.
4. Generate Stripe's onboarding flow.
5. Redirect/embed Stripe onboarding.
6. Stripe collects the required KYC and payout information.
7. Stripe sends webhook events.
8. Habahub updates seller onboarding status.
9. Seller can list products only when required Stripe capabilities are active.

Do not collect sensitive banking information ourselves unless absolutely required.

Prefer Stripe-hosted or Stripe-provided onboarding.

---

# 8. Payment lifecycle

Every marketplace purchase must have a Habahub Order and a Stripe PaymentIntent.

Example:

Product price: 100 EUR
Shipping: 5 EUR

Customer total:

105 EUR

Create PaymentIntent:

amount = 10500
currency = eur

Store:

Order
Payment
PaymentIntent ID

The payment belongs to the Habahub platform payment flow.

Do not immediately transfer seller funds if the business rules require a delivery/return period.

---

# 9. Money calculation

Create a deterministic server-side calculation service.

Example:

gross_amount

* shipping_paid_by_buyer

- Habahub_commission
- seller-paid shipping subsidy if applicable
- other explicitly defined marketplace fees
  = seller_transfer_amount

Example:

Product: 100.00 EUR
Shipping: 5.00 EUR
Buyer pays: 105.00 EUR

Habahub commission:

3.5% of product sale = 3.50 EUR

Seller transfer:

101.50 EUR

Shipping must be handled according to the exact business model.

Do NOT hardcode the example above until the final commercial rules are confirmed.

All monetary calculations must use integer minor units.

Never use floating point for money.

Example:

100 EUR => 10000 cents.

---

# 10. Platform revenue

Habahub revenue should remain in the platform Stripe account.

The platform may retain:

* marketplace commission
* agreed seller fees
* agreed shipping/postage fees where Habahub is the party collecting those fees

The seller receives only the amount defined by the marketplace transaction calculation.

Do not create a separate Habahub wallet for these amounts.

Stripe's platform balance is the source of truth for payment funds.

---

# 11. Delayed seller transfer

Seller transfer must happen only after the configured release condition.

Example release flow:

PAYMENT_SUCCEEDED
↓
ORDER_PAID
↓
ITEM_SHIPPED
↓
DELIVERY_CONFIRMED
↓
BUYER_PROTECTION_PERIOD_EXPIRED
↓
READY_FOR_SELLER_TRANSFER
↓
STRIPE_TRANSFER_CREATED
↓
SELLER_PAYOUT

The exact business release condition must be configurable.

Do not use arbitrary time-based releases without a documented business reason.

Stripe explicitly supports holding funds on the platform balance before transferring them to connected accounts.

Reference:

https://docs.stripe.com/connect/account-balances

---

# 12. Stripe Transfer

When the order becomes eligible for seller payment:

Create a Stripe Transfer.

The transfer amount is:

seller_transfer_amount

Associate the transfer with the original payment where appropriate.

Use:

source_transaction

when the transfer needs to be tied to the original charge/payment and funds may not yet be available.

Use:

transfer_group

to associate Stripe objects belonging to the same marketplace order.

Example conceptual flow:

PaymentIntent
↓
Charge
↓
Order
↓
Transfer

Do not create the transfer before the business release condition is satisfied.

---

# 13. Webhooks

The payment system must be webhook-driven.

Never trust the frontend redirect as proof of payment.

Important webhook events must be handled idempotently.

At minimum investigate and implement the Stripe events required for:

* PaymentIntent success
* PaymentIntent failure
* charge/refund lifecycle
* disputes
* connected account changes
* payout status
* transfer status

Webhook processing must be idempotent.

Every webhook event ID must be persisted.

If the same event is delivered twice, it must not:

* create a second transfer
* create a duplicate order
* issue a second refund
* change a transaction state incorrectly

---

# 14. Order state machine

Implement an explicit order state machine.

Example:

PENDING_PAYMENT
PAYMENT_PROCESSING
PAID
SELLER_PREPARING
SHIPPED
DELIVERED
BUYER_PROTECTION
TRANSFER_PENDING
TRANSFERRED
COMPLETED

Failure states:

PAYMENT_FAILED
CANCELLED
REFUNDED
PARTIALLY_REFUNDED
DISPUTED
TRANSFER_FAILED

Never infer financial state from UI state.

The backend is authoritative.

---

# 15. Refunds

Refund logic must be explicitly designed.

Possible states:

* full refund before seller transfer
* partial refund before seller transfer
* full refund after seller transfer
* dispute after seller transfer

If money has already been transferred to the seller, Habahub must have a defined mechanism to reverse/recover the seller funds where Stripe supports it.

Stripe's refund behavior differs depending on Connect charge type.

Reference:

https://docs.stripe.com/connect/charges

Do not implement refund logic only in the frontend.

---

# 16. Disputes

A card dispute must not be treated as a normal refund.

Create explicit dispute states.

Example:

DISPUTE_OPEN
DISPUTE_UNDER_REVIEW
DISPUTE_WON
DISPUTE_LOST

The system must define what happens if:

* seller transfer has not happened
* seller transfer has already happened
* payout has already happened

Stripe is responsible for payment-network dispute processing.

Habahub is responsible for marketplace business logic and seller/customer communication.

---

# 17. Shipping

Shipping must be represented as an order component, not as a wallet transaction.

Example:

Order:

product_amount
shipping_amount
platform_fee
stripe_fee
seller_transfer_amount

Do not create a fake "shipping wallet".

If Habahub purchases shipping labels, model that as an actual business expense/order operation.

If the buyer simply pays a shipping amount that is ultimately passed to the seller, model it explicitly in the transaction calculation.

The exact accounting treatment must be confirmed with the accountant.

---

# 18. C2C and B2C business rules

The checkout should look the same to the buyer.

The seller's account type should be invisible unless legally/business-wise required.

C2C:

buyer → Habahub → Stripe → private seller

B2C:

buyer → Habahub → Stripe → business seller

The difference is primarily seller onboarding, KYC, tax/business information, and legal seller status.

Do not build two completely separate payment systems.

Use one payment engine with different connected-account metadata/configuration.

---

# 19. Auctions

Auction payments need special treatment.

Do not authorize/charge every bid.

The winning bid becomes an order/payment obligation.

Suggested flow:

Auction
↓
Winner determined
↓
Order created
↓
Payment session created
↓
Customer pays
↓
same marketplace payment flow
↓
seller transfer delayed until release condition

If preauthorization is desired, research and document the exact Stripe capability and authorization window before implementing it.

Do not invent an authorization model.

---

# 20. Live selling

Live selling should reuse the same Order + PaymentIntent infrastructure.

Do not build a separate payment system for live sales.

Live event:

Product
↓
winning customer
↓
Order
↓
PaymentIntent
↓
Stripe
↓
release workflow
↓
seller transfer

---

# 21. Security requirements

Never expose Stripe secret keys to the frontend.

All Stripe operations that move money must happen server-side.

Never trust:

* client-side price
* client-side seller ID
* client-side commission
* client-side shipping price
* client-side order status
* client-side payment status

The server must calculate the final amount from authoritative database records.

Never allow a client to specify:

transfer amount
connected_account_id
application fee
refund amount

without server-side authorization and calculation.

---

# 22. Idempotency

Every money-moving operation must use an idempotency strategy.

Examples:

Create PaymentIntent:

habahub_order_<orderId>

Create seller transfer:

habahub_transfer_<orderId>

Create refund:

habahub_refund_<refundId>

The exact Stripe API implementation should follow current Stripe documentation.

---

# 23. Stripe account onboarding UX

Do not build a custom Stripe KYC form unless there is a strong reason.

Preferred flow:

Habahub seller registration
↓
Select:
"Yksityinen henkilö"
or
"Yritys"
↓
Create/retrieve Stripe Connected Account
↓
Stripe onboarding
↓
Return to Habahub
↓
Webhook confirms requirements/capabilities
↓
Seller can sell

If Stripe requires more information later, surface:

"Stripe tarvitsee lisätietoja maksujen vastaanottamista varten."

Do not expose internal Stripe terminology unnecessarily.

---

# 24. Signicat UX

For Finnish users:

"Kirjaudu / tunnistaudu pankkitunnuksilla"

Use Signicat FTN.

The user can select their Finnish bank or Mobiilivarmenne.

Do not require passport upload as the default Finnish authentication path.

Signicat documentation:

https://developer.signicat.com/identity-methods/ftn/about-ftn/

---

# 25. Important architectural separation

There are three separate concepts:

1. Habahub user identity
2. Stripe connected seller identity
3. Marketplace order/payment

They must not be conflated.

Example:

User:
user_123

Signicat subject:
signicat_xxx

Stripe connected account:
acct_xxx

Order:
order_123

PaymentIntent:
pi_xxx

Transfer:
tr_xxx

These IDs should be linked in the database.

---

# 26. No wallet

This is a hard requirement.

Do not implement:

/wallet
/wallet/balance
/wallet/deposit
/wallet/withdraw

Do not expose a seller balance screen that implies Habahub holds customer funds.

Instead, seller dashboard should show:

"Pending sales"
"Awaiting delivery"
"Ready for payout"
"Paid"
"Stripe payout status"

These are marketplace transaction states, not Habahub money balances.

Where appropriate, link the seller to Stripe's payout/account management UI.

---

# 27. Accounting

Do not attempt to make the database itself the accounting ledger.

Store immutable transaction records and Stripe object IDs sufficient for reconciliation.

Every transaction should be reconcilable against Stripe.

Required internal records should include:

* order
* payment
* platform fee
* shipping component
* refund
* dispute
* seller transfer
* payout reference
* Stripe event IDs

Create a reconciliation process.

The objective:

Habahub database
↕
Stripe
↕
bank/accounting

must be reconcilable.

---

# 28. Documentation to use

Use current Stripe documentation as the primary technical source.

Stripe Connect charge models:

https://docs.stripe.com/connect/charges

Separate charges and transfers:

https://docs.stripe.com/connect/separate-charges-and-transfers

Account balances / holding funds:

https://docs.stripe.com/connect/account-balances

Connected account identity verification:

https://docs.stripe.com/connect/identity-verification

Stripe Connect pricing:

https://stripe.com/connect/pricing

Signicat FTN:

https://developer.signicat.com/identity-methods/ftn/about-ftn/

---

# 29. Implementation requirement for Claude

Before writing code:

1. Inspect the existing repository.
2. Identify the current authentication architecture.
3. Identify the current user model.
4. Identify the current order model.
5. Identify any existing Paytrail integration.
6. Identify all existing payment-related services.
7. Identify whether wallet/balance functionality already exists.
8. Produce a migration plan.
9. Do not blindly replace Paytrail with Stripe.
10. Do not create a second payment architecture alongside the existing one.

Then implement Stripe Connect incrementally.

First create:

Stripe service abstraction
Connected account service
Payment service
Transfer service
Webhook service
Order payment state machine

Then integrate them into the existing marketplace flow.

---

# 30. Definition of done

The implementation is complete only when:

* C2C seller can onboard with Stripe Connect
* B2C seller can onboard with Stripe Connect
* Finnish user can authenticate through Signicat FTN
* buyer can pay through Stripe
* payment is confirmed through webhook
* seller does NOT immediately receive the money when the business rules require delayed release
* seller transfer happens only after release conditions
* Habahub commission is retained by the platform
* shipping amount is handled according to the configured marketplace rules
* refunds work
* disputes have explicit states
* duplicate webhooks are harmless
* duplicate transfers are impossible
* Stripe IDs are persisted
* no Habahub wallet exists
* no user money balance exists in Habahub
* all money-moving operations are server-side
* all monetary values use integer minor units
* C2C and B2C share the same payment engine
* Stripe onboarding is used instead of implementing custom KYC
* payment/accounting state is fully auditable

Before implementing production payment flows, flag any requirement that may have regulatory, tax, PSD2/PSD3, AML/KYC, consumer-protection, or payment-services implications for human/legal review.
