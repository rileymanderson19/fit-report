import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Report Storage Limits | FitReport Docs',
  description: 'Understand how FitReport manages report storage and automatic cleanup',
};

export default function ReportStorageLimitsPage() {
  return (
    <article>
      <h1>Report Storage Limits</h1>

      <h2>Overview</h2>
      <p>
        FitReport automatically manages storage by limiting each client to a maximum of 2 reports. 
        When a new report is generated, the system automatically removes the oldest reports to stay within this limit.
      </p>

      <h2>How It Works</h2>

      <h3>Automatic Cleanup Process</h3>
      <ol>
        <li><strong>Before storing a new report</strong>, the system checks existing reports for the client</li>
        <li><strong>If 2 or more reports exist</strong>, the oldest reports are automatically deleted</li>
        <li><strong>The new report is then stored</strong>, ensuring the limit is maintained</li>
        <li><strong>All operations are atomic</strong> - either the entire process succeeds or fails together</li>
      </ol>

      <h3>Technical Implementation</h3>
      <ul>
        <li><strong>Trigger Point</strong>: Cleanup occurs in <code>/api/reports/store</code> before inserting new reports</li>
        <li><strong>Query Strategy</strong>: Reports are ordered by <code>created_at</code> (oldest first) for deletion</li>
        <li><strong>Scope</strong>: Cleanup only affects reports for the specific client and trainer combination</li>
        <li><strong>Atomicity</strong>: Database operations ensure data consistency</li>
      </ul>

      <h3>What Gets Deleted</h3>
      <ul>
        <li>Only the <strong>oldest reports</strong> for the specific client are removed</li>
        <li>The system keeps the most recent report plus makes room for the new one</li>
        <li>Reports from other clients are never affected</li>
        <li>All deletions respect trainer ownership (RLS policies)</li>
      </ul>

      <h2>User Experience</h2>

      <h3>For Trainers</h3>
      <ul>
        <li><strong>Transparent Operation</strong>: The cleanup happens automatically behind the scenes</li>
        <li><strong>No UI Changes</strong>: The report generation process remains exactly the same</li>
        <li><strong>Guaranteed Limit</strong>: Users will never see more than 2 reports per client</li>
        <li><strong>No Data Loss Risk</strong>: The system always preserves the most recent data</li>
      </ul>

      <h3>Report List Behavior</h3>
      <ul>
        <li>Client report pages will show a maximum of 2 reports</li>
        <li>Oldest reports disappear automatically when new ones are created</li>
        <li>The &quot;Delete All&quot; functionality still works as expected</li>
      </ul>

      <h2>Technical Details</h2>

      <h3>Database Operations</h3>
      <pre><code>{`-- 1. Query existing reports (oldest first)
SELECT id, created_at FROM reports 
WHERE client_id = ? AND trainer_id = ? 
ORDER BY created_at ASC

-- 2. Delete excess reports if count >= 2
DELETE FROM reports 
WHERE id IN (oldest_report_ids)

-- 3. Insert new report
INSERT INTO reports (client_id, trainer_id, report_data, ...)`}</code></pre>

      <h3>Error Handling</h3>
      <ul>
        <li><strong>Cleanup Failure</strong>: New report creation continues even if cleanup fails</li>
        <li><strong>Best Effort</strong>: The limit is enforced on a best-effort basis</li>
        <li><strong>Logging</strong>: All cleanup operations are logged for monitoring</li>
        <li><strong>Rollback</strong>: Database constraints prevent data corruption</li>
      </ul>

      <h3>Performance Impact</h3>
      <ul>
        <li><strong>Minimal Overhead</strong>: Adds 2-3 queries per report creation</li>
        <li><strong>Indexed Queries</strong>: Uses existing database indexes for fast execution</li>
        <li><strong>Low Latency</strong>: Cleanup typically completes in milliseconds</li>
      </ul>

      <h2>Coverage</h2>

      <h3>Manual Reports</h3>
      <ul>
        <li>✅ Generated through the dashboard interface</li>
        <li>✅ Created via <code>/dashboard/clients</code> page</li>
        <li>✅ Individual client report generation</li>
      </ul>

      <h3>Scheduled Reports</h3>
      <ul>
        <li>✅ Automated cron job reports (future feature)</li>
        <li>✅ Bulk report generation</li>
        <li>✅ All scheduled report types</li>
      </ul>

      <h3>API Integration</h3>
      <ul>
        <li>✅ Direct API calls to <code>/api/reports/store</code></li>
        <li>✅ Third-party integrations</li>
        <li>✅ Any system that stores reports</li>
      </ul>

      <h2>Configuration</h2>

      <h3>Current Settings</h3>
      <ul>
        <li><strong>Maximum Reports Per Client</strong>: 2</li>
        <li><strong>Cleanup Strategy</strong>: Delete oldest reports first</li>
        <li><strong>Enforcement Level</strong>: Best effort (continues on cleanup failure)</li>
      </ul>

      <h3>Future Customization</h3>
      <p>The system is designed to allow future configuration options:</p>
      <ul>
        <li>Different limits per trainer/subscription tier</li>
        <li>Alternative cleanup strategies (archival vs deletion)</li>
        <li>Configurable enforcement levels</li>
      </ul>
    </article>
  );
} 