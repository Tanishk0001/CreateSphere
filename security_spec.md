# Security Specification - CreateSphere

## Data Invariants
1. A **User** must have a verified email and can only manage their own profile.
2. A **Project** must belong to a valid user (`userId`) and once created, the `userId` and `createdAt` are immutable.
3. A **SocialConnection** is highly sensitive and must only be readable and writeable by the specific user it belongs to.
4. **Access Tokens** and **Refresh Tokens** must be handled with extreme care (only owner access).

## The "Dirty Dozen" Payloads (Deny Cases)

1. **Identity Spoofing (Projects)**: Creating a project with a `userId` that doesn't match the authenticated user.
2. **Identity Spoofing (Social)**: Reading another user's `socialConnections` subcollection.
3. **Privilege Escalation (User)**: Trying to set extra fields like `isAdmin` (if we had them) in the user profile.
4. **Orphaned Write (Project)**: Creating a project without a valid parent user document (if relational sync enforced).
5. **Update Gap (Project)**: Changing the `userId` of an existing project.
6. **Update Gap (Social)**: Updating the `platform` field of a connection (immutable).
7. **Resource Poisoning (ID)**: Using a 2KB string as a project ID.
8. **Resource Poisoning (Data)**: Sending a 1MB string in the `name` field of a project.
9. **Timestamp Injection**: Sending a client-side timestamp for `createdAt` instead of `request.time`.
10. **Shadow Field (Social)**: Adding a `system_admin: true` field to a `socialConnection`.
11. **Cross-User Leak (List)**: Querying all projects without a filter, expecting the rules to reject it if it contains other users' data.
12. **PII Leak**: Trying to read another user's profile which contains their private email.

## Test Runner
Verified via `firestore.rules.test.ts`.
