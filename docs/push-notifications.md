# Push Notifications Setup

Device push notifications for DuoLink — notifications appear on the device lock screen and notification tray like any other app.

---

## How It Works

```
DB trigger inserts row into notifications table
        ↓
Supabase Database Webhook fires
        ↓
Edge Function (send-push-notification) runs in Supabase cloud
        ↓
Edge Function fetches user's push_token from profiles table
        ↓
Calls Expo Push API → Apple / Google → device
```

---

## One-Time Setup Steps

### 1. Run the SQL migration

In **Supabase Dashboard → SQL Editor**, run:

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_token TEXT;
```

This adds the column that stores each user's device token.

---

### 2. Login to Supabase CLI

```bash
npx supabase login
```

Opens a browser — log in, copy the verification code, paste it in the terminal.

---

### 3. Deploy the Edge Function

```bash
npx supabase functions deploy send-push-notification --project-ref lpggxqfljjrqdukmwcrk
```

This uploads `supabase/functions/send-push-notification/index.ts` to Supabase's cloud servers. Run this again any time you change the function.

---

### 4. Get the Service Role Key

1. Go to: https://supabase.com/dashboard/project/lpggxqfljjrqdukmwcrk/settings/api-keys
2. Scroll down to **Secret keys**
3. Click the copy icon — it starts with `eyJ...`

> Keep this key private. Never commit it to git or put it in the app.

---

### 5. Set Up the Database Webhook

1. Go to: https://supabase.com/dashboard/project/lpggxqfljjrqdukmwcrk/database/hooks
2. Click **Create a new hook**
3. Fill in:
   - **Name:** `send_push_on_notification`
   - **Table:** `notifications`
   - **Events:** `INSERT`
   - **Type:** HTTP Request
   - **URL:** `https://lpggxqfljjrqdukmwcrk.supabase.co/functions/v1/send-push-notification`
4. Under **HTTP Headers**, add two headers:
   - `Content-Type` → `application/json`
   - `Authorization` → `Bearer eyJ...` ← paste your service role key here
5. Click **Save**

---

### 6. Build the App

Push notifications require an EAS build — they do not work in Expo Go.

**iOS:**
```bash
eas build --platform ios
```

**Android:**
```bash
eas build --platform android
```

**Both at once:**
```bash
eas build --platform all
```

After the build finishes, submit to stores:
```bash
eas submit --platform ios
eas submit --platform android
```

---

## Re-deploying the Edge Function

Any time you change `supabase/functions/send-push-notification/index.ts`, redeploy with:

```bash
npx supabase functions deploy send-push-notification --project-ref lpggxqfljjrqdukmwcrk
```

---

## How Push Tokens Are Registered

When a user logs in, the app automatically:
1. Asks for notification permission (iOS shows the system prompt)
2. Gets an Expo push token from Expo's servers
3. Saves it to `profiles.push_token` in Supabase

This is handled in `app/services/notificationService.js` and called from `app/context/AuthContext.js`.

---

## Notification Types and Where They Navigate

| Type | Navigates To |
|------|-------------|
| `message` | Chat screen (the specific conversation) |
| `job_update` with `job_post_id` | Job Post Details screen |
| `job_update` without ID | Job Status Dashboard |
| `verification` | Document Upload screen |
| `document_expiry` | Document Upload screen |
| `document_expired` | Document Upload screen |
| `review` | Notifications screen |
| `engagement` | Notifications screen |
| anything else | Notifications screen |

---

## Project References

| Item | Value |
|------|-------|
| Supabase Project Ref | `lpggxqfljjrqdukmwcrk` |
| EAS Project ID | `6b1e5fb0-3626-4fb4-8344-8d41b271134f` |
| App Bundle ID (iOS) | `com.namstack.namdriver` |
| App Package (Android) | `com.namstack.namdriver` |
| Edge Function URL | `https://lpggxqfljjrqdukmwcrk.supabase.co/functions/v1/send-push-notification` |
| Edge Function file | `supabase/functions/send-push-notification/index.ts` |
