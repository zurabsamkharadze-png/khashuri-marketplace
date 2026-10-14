# ჩვენი კორპუსი / Chveni Korpusi — Secure implementation

## Stage: code prepared; **NOT DEPLOYED**
This directory is a separate, secure candidate for the 60-apartment residential building at Rustaveli 16, Khashuri. It is **not** connected to the existing demo, Lovable, or the two older Supabase business projects. The files contain NO access keys, personal details or passwords.

The existing browser-only demonstration remains available on the separate `chveni-korpusi-free` branch. **Do not enter real residents' names, phone numbers or payment data in that demo.**

### What is implemented

- Georgian (default) and Russian interface, mobile layouts.
- Supabase email/password registration and email verification; no open chairman signup.
- Separate profile (first name, surname, phone); apartment application (entrance 1–3, residential floor 2–8, apartment 1–60, owner/resident).
- Residents can view only their own profile, request status and approved apartment membership; all data fetched only after authentication.
- Chairman can see pending requests, approve/reject them with a server-side permission check and inspect a private residents directory.
- Chairman-only server RPC allows correcting approved residents' names and phone numbers, logged in an audit table.
- Database Row-Level Security blocks unauthenticated access to the directory and disallows residents from elevating privileges, editing others' profiles or approving requests.
- Role assignment to chairman is NOT exposed to public signup. Admin assignment requires verification of the actual person.

### Files

- `index.html` + `style.css` — static mobile-friendly frontend.
- `app.js` — client code using supabase-js 2 from a CDN (public key only).
- `config.js` — empty PUBLIC configuration, currently intentionally disables real registration.
- `migrations/001_init.sql` — profile, roles, 60 apartments, pending requests, membership, chairman approval, RLS.
- `migrations/002_member_edit.sql` — audited chairman-only profile corrections.

### To activate later without changing other websites

1. Obtain a **NEW ISOLATED** backend project on a free tier that actually permits it. The existing Supabase organization already has two projects, and the current free limit may not permit a third project. **Do not run migrations in either old project.**
2. With authorization and a dedicated project, execute `migrations/001_init.sql` followed by `migrations/002_member_edit.sql` in the new database. Review security and confirm the SQL succeeds.
3. Enable email/password registration in Auth and configure confirmed email redirect URLs for the intended new HTTPS domain. Be aware the default free email delivery capacity can be very limited: signups of 60 families may need to be staggered or use an authorized external SMTP service with verified terms.
4. Set **only** the project's HTTPS Supabase URL and PUBLIC anon/publishable key in `config.js`. NEVER place a service-role/secret key in browser code. Database RLS must remain enabled.
5. Publish `secure/` files on an approved independent HTTPS static domain. Do not use a third-party HTML-preview proxy for real private data.
6. Have the intended chairman register and verify their email. Verify their exact auth user ID using authorized means; ONLY THEN, via the database SQL editor, assign `corp_roles.role='chairman'` for that verified UUID. Do NOT give chairman status automatically to the first registration.
7. Validate with two real test accounts: a resident must not view another resident's profile, phone, audit history, requests or the chairman dashboard; an unverified applicant must have no access to member data. Ensure repeated approvals and entrance/floor mismatches are blocked.
8. Get appropriate resident privacy notice/consent, establish a backup/restore policy and assess Georgia's applicable personal-data rules before inviting families.

### Free-tier and security boundary

Source code is free. Operational hosting is only free while within the relevant provider's limits. **No provider, billing, backend credentials or public deployment was automatically added by this commit.** The backend migration has been reviewed statically and is not yet tested against a live PostgreSQL instance. User interface behavior has been exercised with mocked auth/data; production behavior remains to be tested.

The secure app does not yet include production finance, repair ticket and formal voting modules: they remain in the standalone demonstration until access control and persistence are operational.
