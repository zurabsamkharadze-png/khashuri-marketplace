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
- `firestore.rules`: strict security rules enforced server-side; prevents unauthorized profile or phone reads.
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
- Georgian default and Russian toggle; responsive UI.

## Not yet implemented for production

Real financial ledger, repair reports, formal voting, backup/restore, membership revocation, profile edits and audit logs. Those functions in the old static demo must not be confused with production features. Firebase Security Rules need live integration tests before production use. The prototype uses simple client transactions without Cloud Functions; chairperson decisions can be updated only under chairman security rules.

## Known constraints

- Firestore does not provide official continuous point-in-time backup on Spark. Avoid claiming protected disaster recovery until a lawful manual encrypted backup process is built.
- No billing information is required for Spark, and no payments or provider service upgrades have been performed by this repository change.
- Firebase Web app config contains public identifiers, while Firebase Security Rules protect the data. NEVER put private keys in frontend code.
