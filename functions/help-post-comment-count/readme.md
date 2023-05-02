# THAT Functions

## help-post-comment-count

Firestore gcp function to update helpPost with its current comment count.

The Firestore trigger activates on `write` (create, update, delete) ignoring document `update` and updating count on `create` and `delete`.

### stuff

nodejs 18
