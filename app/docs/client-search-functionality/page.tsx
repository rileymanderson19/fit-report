import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Client Search Functionality | FitReport Docs',
  description: 'Guide to using the client search and filtering features',
};

export default function ClientSearchFunctionalityPage() {
  return (
    <article>
      <h1>Client Search Bar Functionality</h1>

      <h2>Overview</h2>
      <p>
        The client search bar provides trainers with a fast way to navigate between different client reports 
        without going back to the main clients page. It&apos;s designed to streamline the workflow for 
        reviewing multiple client check-ins quickly.
      </p>

      <h2>Location</h2>
      <p>
        The search bar is positioned at the <strong>top of every client reports page</strong> 
        (<code>/dashboard/clients/[id]/reports</code>), providing immediate access to navigate to other clients.
      </p>

      <h2>Features</h2>

      <h3>Real-Time Search</h3>
      <ul>
        <li><strong>Debounced Search</strong>: 300ms delay to prevent excessive API calls</li>
        <li><strong>Multi-Term Support</strong>: Search for &quot;John Doe&quot; or &quot;john doe&quot; both work</li>
        <li><strong>Email Search</strong>: Can search by client email addresses</li>
        <li><strong>Case Insensitive</strong>: Search works regardless of capitalization</li>
      </ul>

      <h3>Smart Filtering</h3>
      <ul>
        <li><strong>Excludes Current Client</strong>: Won&apos;t show the client you&apos;re currently viewing</li>
        <li><strong>Active Clients Only</strong>: Only shows active/imported clients</li>
        <li><strong>Limited Results</strong>: Shows maximum 8 results for performance</li>
        <li><strong>Alphabetical Ordering</strong>: Results ordered by first name</li>
      </ul>

      <h3>Keyboard Navigation</h3>
      <ul>
        <li><strong>Arrow Keys</strong>: Up/Down to navigate through results</li>
        <li><strong>Enter</strong>: Navigate to selected client</li>
        <li><strong>Escape</strong>: Close dropdown and clear search</li>
        <li><strong>Tab</strong>: Normal tab navigation behavior</li>
      </ul>

      <h3>Mouse Interaction</h3>
      <ul>
        <li><strong>Click to Navigate</strong>: Click any result to go to that client&apos;s reports</li>
        <li><strong>Hover Highlighting</strong>: Results highlight on mouse hover</li>
        <li><strong>Click Outside</strong>: Closes dropdown when clicking elsewhere</li>
      </ul>

      <h2>User Interface</h2>

      <h3>Search Input</h3>
      <ul>
        <li>Search icon on the left</li>
        <li>Placeholder text: &quot;Search clients to quickly navigate...&quot;</li>
        <li>Loading spinner appears during initial client loading</li>
        <li>Disabled state while loading</li>
      </ul>

      <h3>Dropdown Results</h3>
      <ul>
        <li><strong>Client Information</strong>: Shows full name and email</li>
        <li><strong>Visual Feedback</strong>: Selected item highlighted in primary color</li>
        <li><strong>Navigation Hint</strong>: &quot;View Reports →&quot; indicator</li>
        <li><strong>No Results State</strong>: Friendly message when no matches found</li>
        <li><strong>Scrollable</strong>: Results area scrolls if needed (max height constraint)</li>
      </ul>

      <h2>Search Algorithm</h2>
      <p>The search functionality uses a comprehensive matching algorithm:</p>

      <pre><code>{`const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);

return clients.filter(client => {
  const fullName = \`\${client.first_name} \${client.last_name}\`.toLowerCase();
  const email = client.email.toLowerCase();
  
  return searchTerms.every(term => 
    fullName.includes(term) || 
    email.includes(term) ||
    client.first_name.toLowerCase().includes(term) ||
    client.last_name.toLowerCase().includes(term)
  );
});`}</code></pre>

      <h3>Search Examples</h3>
      <ul>
        <li><code>&quot;john&quot;</code> → Matches &quot;John Doe&quot;, &quot;Johnny Smith&quot;</li>
        <li><code>&quot;john doe&quot;</code> → Matches &quot;John Doe&quot; specifically</li>
        <li><code>&quot;doe john&quot;</code> → Also matches &quot;John Doe&quot; (order independent)</li>
        <li><code>&quot;john@email.com&quot;</code> → Matches by email address</li>
        <li><code>&quot;j do&quot;</code> → Matches &quot;John Doe&quot; (partial matching)</li>
      </ul>

      <h2>Use Cases</h2>

      <h3>Primary Use Case: Quick Client Switching</h3>
      <ol>
        <li>Trainer reviewing &quot;John Doe&quot; reports</li>
        <li>Types &quot;jane&quot; in search bar</li>
        <li>Sees &quot;Jane Smith&quot; in results</li>
        <li>Clicks or presses Enter</li>
        <li>Immediately navigated to Jane&apos;s reports</li>
      </ol>

      <h3>Search by Email</h3>
      <ol>
        <li>Trainer remembers client&apos;s email but not name</li>
        <li>Types partial email address</li>
        <li>Finds client in results</li>
        <li>Navigates directly to their reports</li>
      </ol>

      <h3>Workflow Integration</h3>
      <ul>
        <li>Perfect for systematic client check-ins</li>
        <li>Eliminates need to return to main clients page</li>
        <li>Reduces clicks and navigation time</li>
        <li>Supports rapid review workflows</li>
      </ul>

      <h2>Performance Optimizations</h2>
      <ul>
        <li><strong>Single Load</strong>: Clients fetched once on component mount</li>
        <li><strong>Debounced Search</strong>: Prevents excessive filtering operations</li>
        <li><strong>Result Limiting</strong>: Maximum 8 results shown</li>
        <li><strong>Efficient Filtering</strong>: Client-side search after initial load</li>
      </ul>

      <h2>Accessibility</h2>

      <h3>Screen Reader Support</h3>
      <ul>
        <li>Proper ARIA labels for search input</li>
        <li>Keyboard navigation fully supported</li>
        <li>Focus management for dropdown interactions</li>
      </ul>

      <h3>Keyboard Only Navigation</h3>
      <ul>
        <li>Full functionality without mouse</li>
        <li>Logical tab order maintained</li>
        <li>Clear visual focus indicators</li>
      </ul>
    </article>
  );
} 