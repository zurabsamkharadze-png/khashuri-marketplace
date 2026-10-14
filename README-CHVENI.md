# Chveni Korpusi / ჩვენი კორპუსი

Independent no-fee proof-of-concept for Khāshuri, Rustaveli 16: 3 entrances, 8 floors, ground commercial, 60 apartments on floors 2–8.

## Preview

[Open static preview](https://htmlpreview.github.io/?https://raw.githubusercontent.com/zurabsamkharadze-png/khashuri-marketplace/chveni-korpusi-free/index.html)

This branch is isolated from `main` and does not alter the existing marketplace deployment.

## Important security limitation

**Only a local, single-browser DEMO**: the mode switch for chairman/resident is NOT authentication. Do not use real residents' names, phone numbers, financial records or payment evidence. Browser localStorage is not a shared backend. All demo financial entries and ballots have no legal significance.

The 60 apartments exist with unspecified floor/entrance assignment; commercial premises are separate and must be added manually once their number is known.

For real use by 60 households, deploy a secure authentication and authorization backend with row-level policies, private data, chairman approval workflow, server-side data backups, and audit logs. A static hosting site alone is insufficient.

No Lovable dependency, payments, paid APIs or user signups are present in this branch. The project is designed to remain compatible with a future GitHub Pages setup.
