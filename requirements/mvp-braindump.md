# Feature Requirements

### MVP

### Dashboard Copy

On the [dashboard page] I want the following copy to be displayed:

Welcome to FitReport.

(If the user does not have an active plan, show this message):

No active subscription
You need to subscribe to generate reports.

[Subscribe Now]

(If the user does have an active plan, show this):

Here's how to generate reports:

1. Enter your trainerize credentials
2. Import your clients from trainerize
3. Schedule & run your report


### Account logic

now what steps should I take to test this? I would like to make sure that the following logic is in place:

1. A user must have a subscription prior to doing anything on the app. This means the dashboard should be the only option available to them until they are subscribed.
2. Once they are subscribed, they should be able to access all other pages (clients, reports, trainerize configuration).
3. The data should be stored in supabase under the profiles table: customer_id, price_id, has_access.
4. They should have access as long as their subscription is active.