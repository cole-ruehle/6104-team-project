---
timestamp: 'Sat Nov 22 2025 09:07:09 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251122_090709.102240af.md]]'
content_id: 3fe027db977b08b0c0178497bcdd2f34dbe61ffbb94ddac85e00be006609afb8
---

# test: PublicProfile

Can you help me write up the these test cases for this implementation of PublicProfile:

1. Creates a new profile with valid data, unique user ID, non-empty headline, non-empty attributes + links: Expect success {} and DB contains correct fields.
2. Attempt to create a duplicate profile, create a profile, then immediately try again: Should return error Profile for user X already exists.
3. Attempt to create a profile with empty headline or with spaces, such as headline = "" or headline = " ": Should reject.
4. Attributes = \[] and Links = \[] on create: Allowed, should store empty arrays.
5. Attributes or links containing duplicates: Should store a deduped array if set behavior is used.
6. Update headline only: Ensure unprovided fields remain unchanged
7. Update attributes only: Ensure unprovided fields remain unchanged
8. Update links only: Ensure unprovided fields remain unchanged
9. Update nonexistent profile: Should give error.
10. Update profile with headline as an empty string: Show give error.
11. Explicitly overwrite to empty sets attributes = \[] and links = \[]:Should wipe them.
12. Delete existing profile: Should delete.
13. Delete nonexistent: Should error.
14. Call delete twice: First success, second error (deletedCount = 0)
15. Delete a profile, then create another with same ID, ensure the new creation succeeds.
