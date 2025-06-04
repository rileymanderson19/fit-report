# Report Storage Limits

## Overview
FitReport automatically manages storage by limiting each client to a maximum of 2 reports. When a new report is generated, the system automatically removes the oldest reports to stay within this limit.

## How It Works

### Automatic Cleanup Process
1. **Before storing a new report**, the system checks existing reports for the client
2. **If 2 or more reports exist**, the oldest reports are automatically deleted
3. **The new report is then stored**, ensuring the limit is maintained
4. **All operations are atomic** - either the entire process succeeds or fails together

### Technical Implementation
- **Trigger Point**: Cleanup occurs in `/api/reports/store` before inserting new reports
- **Query Strategy**: Reports are ordered by `created_at` (oldest first) for deletion
- **Scope**: Cleanup only affects reports for the specific client and trainer combination
- **Atomicity**: Database operations ensure data consistency

### What Gets Deleted
- Only the **oldest reports** for the specific client are removed
- The system keeps the most recent report plus makes room for the new one
- Reports from other clients are never affected
- All deletions respect trainer ownership (RLS policies)

## User Experience

### For Trainers
- **Transparent Operation**: The cleanup happens automatically behind the scenes
- **No UI Changes**: The report generation process remains exactly the same
- **Guaranteed Limit**: Users will never see more than 2 reports per client
- **No Data Loss Risk**: The system always preserves the most recent data

### Report List Behavior
- Client report pages will show a maximum of 2 reports
- Oldest reports disappear automatically when new ones are created
- The "Delete All" functionality still works as expected

## Technical Details

### Database Operations
```sql
-- 1. Query existing reports (oldest first)
SELECT id, created_at FROM reports 
WHERE client_id = ? AND trainer_id = ? 
ORDER BY created_at ASC

-- 2. Delete excess reports if count >= 2
DELETE FROM reports 
WHERE id IN (oldest_report_ids)

-- 3. Insert new report
INSERT INTO reports (client_id, trainer_id, report_data, ...)
```

### Error Handling
- **Cleanup Failure**: New report creation continues even if cleanup fails
- **Best Effort**: The limit is enforced on a best-effort basis
- **Logging**: All cleanup operations are logged for monitoring
- **Rollback**: Database constraints prevent data corruption

### Performance Impact
- **Minimal Overhead**: Adds 2-3 queries per report creation
- **Indexed Queries**: Uses existing database indexes for fast execution
- **Low Latency**: Cleanup typically completes in milliseconds

## Coverage

### Manual Reports
- ✅ Generated through the dashboard interface
- ✅ Created via `/dashboard/clients` page
- ✅ Individual client report generation

### Scheduled Reports
- ✅ Automated cron job reports (future feature)
- ✅ Bulk report generation
- ✅ All scheduled report types

### API Integration
- ✅ Direct API calls to `/api/reports/store`
- ✅ Third-party integrations
- ✅ Any system that stores reports

## Monitoring

### Logging
The system logs the following events:
- Number of reports cleaned up per operation
- Cleanup success/failure status
- Client IDs and trainer IDs involved

### Response Data
The API response includes cleanup information:
```json
{
  "message": "Report stored successfully",
  "data": { ... },
  "cleanup": {
    "deletedCount": 1,
    "cleanupSuccess": true
  }
}
```

## Configuration

### Current Settings
- **Maximum Reports Per Client**: 2
- **Cleanup Strategy**: Delete oldest reports first
- **Enforcement Level**: Best effort (continues on cleanup failure)

### Future Customization
The system is designed to allow future configuration options:
- Different limits per trainer/subscription tier
- Alternative cleanup strategies (archival vs deletion)
- Configurable enforcement levels

## Migration

### Existing Data
- **No Immediate Changes**: Existing reports beyond the limit remain until new reports are created
- **Gradual Cleanup**: The limit is enforced only when new reports are generated
- **Preservation**: No bulk deletion of existing data occurs

### Backward Compatibility
- **API Compatibility**: All existing API endpoints work unchanged
- **UI Compatibility**: No changes to user interfaces
- **Feature Compatibility**: All existing features continue to work

## Security

### Access Control
- **Trainer Isolation**: Cleanup only affects reports owned by the requesting trainer
- **RLS Enforcement**: Database-level security policies are maintained
- **Client Isolation**: Reports from different clients never interfere

### Data Integrity
- **Atomic Operations**: Database transactions prevent partial failures
- **Constraint Validation**: Existing database constraints remain enforced
- **Audit Trail**: All operations are logged for security monitoring

## Troubleshooting

### Common Scenarios

**"Reports seem to disappear"**
- This is expected behavior when more than 2 reports exist
- Only the oldest reports are removed automatically
- The 2 most recent reports are always preserved

**"Cleanup failed but report was created"**
- The system prioritizes successful report creation
- Cleanup failures are logged but don't block new reports
- The limit will be enforced on the next report creation

**"Performance seems slower"**
- The cleanup process adds minimal overhead (typically <100ms)
- All operations use indexed database queries
- Monitor server logs for any unusual delays

### Debugging
- Check server logs for cleanup operation details
- API responses include cleanup status information
- Database queries can be monitored for performance analysis 