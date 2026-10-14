# ჩვენი კორპუსი — Firebase Spark (0 ₾ prototype)

**Status: source code prepared; NOT CONNECTED OR DEPLOYED.** This folder is an independent Firebase replacement for the Supabase prototype. It does not alter the live Khashuri Market or the older demo. Do not enter real residents' personal information until security tests on a real isolated Firebase project succeed.

## Always stay on FREE Spark

- Use a dedicated new Firebase project with **Spark (no-cost)**; do not add a Google Cloud Billing account or upgrade to Blaze.
- Use **Firebase Hosting** (not Firebase App Hosting), **Cloud Firestore (default free database)** and **Firebase Authentication with email/password**.
- Do not enable Cloud Functions, paid SMS phone authentication, Cloud Storage uploads, additional databases or optional paid services.
- Staying within free quotas may suffice for a single 60-apartment building, but this cannot be guaranteed forever: when quotas are exhausted, functionality can be disabled until the quota resets. On Spark this must not create pay-as-you-go bills.
- On official Firebase documentation at the time of writing, Firestore's one free database provides up to 50,000 document reads/day, 20,000 writes/day and 1 GiB stored. Verify service limits before launch.

## Files

- `public/index.html`, `style.css`, `app.js`: Georgian/Russian mobile-first site.
- `public/config.js`: INTENTIONALLY null. Add only Firebase's **public Web app config** once the user's Google/Firebase project is connected.
- `firestore.rules`: strict security rules enforced server-side; prevents unauthorized profile or phone reads, restricts announcements, repair tickets, monthly charges and immutable receipt entries.
- `package.json` / `tests/rules.test.mjs`: offline Firebase Emulator security regression tests; these still need to be executed with Firebase Emulator before production.
- `firebase.json`: deploy the static site by **Firebase Hosting**, and Firestore rules. No Cloud Functions.

## Setup after official Firebase connection

1. Create a NEW Firebase Spark project in the user's Google account. No billing account/card.
2. Add a Web app; take its PUBLIC web config object, fill `public/config.js`. Never share service-account private keys.
3. Enable **Authentication → Sign-in method → Email/Password**. Review/enable email verification and authorized hosting domains.
4. Create **Cloud Firestore → Standard edition → Native mode → one default database** in the selected region; leave it on Spark.
5. Deploy site via Firebase Hosting and deploy `firestore.rules`. Verify deployed rules are active **before** real people are invited. This uses the normal Firebase CLI or the connected official Firebase plugin.
6. Register the verified chairman's email, then identify the precise Firebase Auth UID. From the **trusted Firebase Console** (not a public webpage) create **roles/{thatVerifiedUID}** with one Boolean field `chairman = true`. Roles are not writable by web clients.
7. Test using separate resident and chairperson accounts: signed-out users cannot access profiles; residents only read their own private profile/application/member document; residents cannot assign chairman; only the chairperson can list all pending applications and members. Test email verification, mismatched apartment vs entrance/floor, repeated approvals, rejection/reapplication, and password reset.
8. Once verified, arrange a privacy notice and obtain a legal basis/appropriate consent to collect residents' phone numbers in Georgia.

## Implemented now

- Email/password sign-up and sign-in, verification email, password reset.
- One applicant per account; residents may reapply after rejection.
- Chairman-only application list and atomic approval transaction; a successful decision records the apartment mapping and membership.
- Chairman-only private directory with first/last name, entrance, floor, apartment, phone, and search.
- Chairman can assign or update entrance/floor for apartments 1–60. Check carefully before using real records.
- Chairman-only announcements for approved residents (not public on an unsecured preview).
- Resident repairs with description and chairman-only status updates; residents see only their own repair history.
- **Manual monthly finances (no bank processing):** chairman fixes a uniform fee per month for 60 apartments, logs immutable receipt entries in integer tetri, and exports a CSV summary. Approved residents view fees and receipts only for their own apartment. Amounts are not invoices or bank-confirmed payments.
- Each month is calculated separately. Older arrears and overpayments are **not** carried forward; no adjustment/reversal facility is implemented yet. Thus this section is not ready to serve as a legally authoritative ledger.
- Georgian default and Russian toggle; responsive UI.

## Not yet implemented for production

Production-ready audited financial corrections, arrears/overpayment carryover, formal voting, encrypted backup/restore, membership revocation, profile edits and audit logs. Those functions in the old static demo must not be confused with production features. Firebase Security Rules need emulator tests and live integration tests before production use. The prototype uses simple client transactions without Cloud Functions; chairperson decisions can be updated only under chairman security rules.

## Known constraints

- Firestore does not provide official continuous point-in-time backup on Spark. Avoid claiming protected disaster recovery until a lawful manual encrypted backup process is built.
- No billing information is required for Spark, and no payments or provider service upgrades have been performed by this repository change.
- Firebase Web app config contains public identifiers, while Firebase Security Rules protect the data. NEVER put private keys in frontend code.

## Security tests before real data

Run locally only after the Firebase tools and test packages are available: `cd firebase && npm install && npm run test:rules`. These tests use Firebase Emulator and the **demo** project identifier; no real cloud project or billing is required. An emulator binary and Java runtime are required, and initial setup may need internet access.

Covered scenarios: logged-out private reads denied; no resident privilege escalation; verification required before apartment applications; announcements accessible only to approved members; repairs created only by approved residents for their apartment, with status editable only by chairman; unit mapping editable only by chairman; monthly charges immutable and chairman-only; receipts append-only and private to the approved apartment. **Test file creation does not mean the tests have run.**

## Finance data model

- `months/YYYY-MM`: `month`, `amountTetri`, `createdBy`, `createdAt`. Created only once by chairman; one monthly amount for all 60 flats. **Do not edit or delete** historical month settings; corrections require a future audited adjustment process.
- `payments/<autoid>`: `month`, `apartment`, `amountTetri`, `note`, `createdBy`, `createdAt`. Immutable append-only manual receipt recording (not payment capture). The resident's Firestore list query MUST include `where('apartment','==',membership.apartment)`, and the server rules check the resident's approved membership for any document read.
- Client arithmetic uses **integer tetri**, not floating-point GEL. Monthly fees and payment entries have bounds enforced in Firestore Rules. Only the current selected month is totaled; rollover not implemented.
- CSV contains apartment-level financial status and is unencrypted when saved; the chairman should store it securely and not post it publicly.
- The rules are committed but not yet deployed or exercised against a real Firebase project. Emulator tests have been written, but weren't executed in this environment because external npm downloads are unavailable.
