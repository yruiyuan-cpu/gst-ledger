# Agent Rules

## Transaction deletion
- Soft delete transactions by setting `deleted_at` rather than issuing physical deletes.
- Default all transaction queries and lists to filter out rows where `deleted_at` is not null.
- Require a confirmation step for transaction deletes and surface a success cue (toast/redirect) after completion.
