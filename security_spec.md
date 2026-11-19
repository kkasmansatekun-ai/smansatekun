# Security Specification — SMANSATEKUN Firestore Rules

## 1. Data Invariants
1. **Default-Deny Safety Net**: Every unspecified path under `/databases/{database}/documents` is denied for both read and write.
2. **Verified Identity**: All write operations require `request.auth != null` and `request.auth.token.email_verified == true`.
3. **Bootstrapped Admin & RBAC Isolation**:
   - The runtime owner email (`rahmat0042@gmail.com` with `email_verified == true`) is a bootstrapped Admin; additional Admins are verified via `/admins/{uid}`.
   - Staff write access (`isAuthorizedStaff()`) requires either `isAdmin()` or an Admin-registered entry in `/approvedStaff/{emailKey}` — random external Google accounts cannot write to school collections.
   - Users can never self-assign `role: "admin"` or `role: "guru"` without whitelist approval on `/users/{userId}` creation, nor escalate `role` on update.
4. **PII Isolation**:
   - `/users/{userId}` can only be read by `request.auth.uid == userId` or Admin.
   - `/poinMurid/{studentId}` (student NIS & behavior records) can only be read/listed by the owning authorized teacher (`resource.data.ownerId == request.auth.uid`) or Admin — never publicly readable and never using `get()` inside `allow list`.
5. **Public Showcase Queries & Strict Domain Validation**:
   - `/dokumentasi`, `/berita`, `/instagramPosts`, `/jabatan`, `/lmsCourses`, `/inventaris`, `/permintaan` only allow `list` / `get` when `resource.data.visibility == 'public'` (or Admin), preventing blanket unfiltered reads.
   - `/instagramPosts/{postId}` strictly requires `postUrl` to match `^https://(www\\.)?instagram\\.com/.+`, blocking phishing or `javascript:` URLs.
6. **Strict Schema & Volumetric Bounds**:
   - Every string field enforces `.size()` bounds matching `firebase-blueprint.json`.
   - Every ID path variable enforces `isValidId(id)` (`^[a-zA-Z0-9_\-]+$`, max 128 chars) on single-document operations.
   - Every `create` enforces `hasAll` + `hasOnly` to block shadow fields.
   - Every `update` validates the full incoming entity via `isValid[Entity](incoming())`, uses `affectedKeys().hasOnly(...)`, preserves immutable fields (`createdAt`, `uploaderId`, `creatorUid`, `ownerId`, `uid`), and enforces `updatedAt == request.time`.
7. **Terminal State Locking**:
   - On `/permintaan/{requestId}`, once `status` is `'Disetujui'` or `'Ditolak'`, non-admin users cannot modify the record (`isAdmin()` override allowed for corrections).
8. **Bounded Arrays**:
   - `lmsCourses.modul` (<= 30), `lmsCourses.tugas` (<= 30), and `poinMurid.riwayat` (<= 50) enforce size limits and first-element map validation when non-empty.

## 2. Adversarial Payloads (Must Return PERMISSION_DENIED)
1. **Self-Role Escalation (`/users/{uid}` create)**: Verified non-admin creates `/users/{uid}` with `role: "admin"`.
2. **Role Tampering (`/users/{uid}` update)**: Verified teacher updates own `/users/{uid}` changing `role` from `"guru"` to `"admin"`.
3. **PII Cross-User Read (`/users/{otherUid}` get)**: Authenticated non-admin attempts to read another user's profile.
4. **Email Spoofing Attack**: Unauthenticated or `email_verified: false` token using `rahmat0042@gmail.com` tries to write `/berita/{id}`.
5. **Shadow Field Injection (`/inventaris/{id}` create)**: Verified admin/guru inserts extra undocumented key `isVerified: true`.
6. **ID Poisoning (`/inventaris/{badId}` create)**: Creating a document with an ID containing spaces/symbols or > 128 chars.
7. **Uploader Identity Spoofing (`/dokumentasi/{id}` create)**: Verified teacher sets `uploaderId` to another user's UID.
8. **Timestamp Forgery (`/dokumentasi/{id}` create)**: Setting `createdAt` to a client-chosen timestamp instead of `request.time`.
9. **Immutable Field Mutation (`/dokumentasi/{id}` update)**: Changing `createdAt` or `uploaderId` on update.
10. **Terminal State Bypass (`/permintaan/{id}` update)**: Non-admin edits a procurement request whose existing `status` is `'Disetujui'`.
11. **Oversized String / Resource Poisoning (`/inventaris/{id}` update)**: Updating `namaPerangkat` with a 500-character string (> 140 maxLength) or invalid `kondisi: "Hilang"`.
12. **Unbounded Array / Student PII Leak (`/poinMurid` list & update)**: Unauthenticated user lists `/poinMurid`, or authenticated user pushes > 50 entries into `riwayat`.
13. **External Outsider Write Attack (`/inventaris/{id}` & `/approvedStaff/{id}` create)**: Random verified external Google account not listed in `/approvedStaff` tries to add inventory or self-register into `/approvedStaff`.
14. **Instagram Phishing / XSS URL Spoofing (`/instagramPosts/{id}` create)**: Attempting to save `javascript:alert(1)` or `https://evil-instagram.com/p/123` as `postUrl`.
