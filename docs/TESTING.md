# Testing Guide

This guide walks you through testing all features of Marketaa's email outreach platform.

---

## Prerequisites

### 1. Environment Setup

Create a `.env` file with:

```env
# Required
DATABASE_URL="file:./dev.db"
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key
OPENAI_API_KEY=sk-your-openai-key

# For email tracking
TRACKING_BASE_URL=http://localhost:3000

# For CRM sync (optional)
HUBSPOT_CLIENT_ID=your-hubspot-client-id
HUBSPOT_CLIENT_SECRET=your-hubspot-client-secret
```

### 2. Start the Application

```bash
npm install
npx prisma db push
npm run dev
```

### 3. Create a Test Account

1. Open http://localhost:3000
2. Sign up or log in
3. Connect your email (Gmail or Outlook) in Settings → Integrations

---

## Test Scenario: Full Outreach Workflow

### Step 1: Create a Project

1. Go to **Projects** page
2. Click **New Project**
3. Fill in:
   - Name: `Test Campaign`
   - Description: `Testing all features`
4. Click into the project and add **Context**:
   - `company_name` → `Acme Corp`
   - `what_we_do` → `We help sales teams automate outreach`
   - `sender_name` → `Your Name`

### Step 2: Create an Outreach Plan

1. Go to **Plans** tab
2. Click **New Plan**
3. Fill in:
   - Name: `Cold Email v1`
   - Goal: `Book a demo call`
   - Tone: `Professional but friendly`
   - Channels: Select `Email`
4. Save the plan

### Step 3: Add a Test Lead

1. Go to **Leads** tab
2. Click **Add Lead**
3. Fill in:
   - Name: `Test Contact`
   - Email: `your-personal-email@gmail.com` (use an email you can check)
   - Role: `VP of Sales`
   - Organization: `TestCorp`
4. Save the lead

---

## Feature Tests

### Feature 1: Email Tracking (Opens & Clicks)

**Setup:**
1. Click on your test lead
2. Click **Compose New Outreach**
3. Select your plan and click **Generate Draft**
4. Review the email and click **Save Action**
5. Click **Send Email**

**Test Opens:**
1. Check your personal inbox for the email
2. Open the email (make sure images are enabled)
3. Go back to Marketaa → Lead detail page
4. The action should show an **Opened** indicator

**Test Clicks:**
1. If the email contains any links, click one
2. You should be redirected to the destination
3. Back in Marketaa, the action should show a **Clicked** indicator

**Expected Results:**
- Open count increases each time you open the email
- Click count increases for each link clicked
- Timestamps show when first/last opened

---

### Feature 2: Reply Detection

**Setup:**
1. You should have already sent an email (from Feature 1)

**Test Positive Reply:**
1. From your personal email, reply to the test email with:
   > "This sounds interesting! I'd love to learn more. Can we schedule a call next week?"
2. In Marketaa, go to **Settings → Integrations**
3. Click **Sync** on your email provider
4. Go back to the lead detail page
5. Expand the action card to see the email thread

**Expected Results:**
- Reply appears in the thread
- Badge shows **Interested** (green)

**Test Other Reply Types:**

| Reply With | Expected Badge |
|------------|----------------|
| "Not interested, please remove me" | Not Interested (red) |
| "I'm out of office until Monday" | Out of Office (gray) |
| "Can you send me pricing info?" | Question (blue) |
| "Thanks for reaching out" | Neutral (gray) |

---

### Feature 3: Unsubscribe Handling

**Test Unsubscribe Link:**
1. Open the test email in your inbox
2. Scroll to the bottom - find the unsubscribe link
3. Click the unsubscribe link
4. You should see a confirmation page
5. Click **Unsubscribe**
6. You should see a success message

**Verify Suppression:**
1. In Marketaa, go to **Settings → Suppressions**
2. Your test email should appear in the list

**Test Send Blocking:**
1. Go back to the lead detail page
2. Try to compose and send another email
3. You should get an error: "Recipient has unsubscribed"

**Test Manual Suppression:**
1. Go to **Settings → Suppressions**
2. Click **Add** and enter an email address
3. Try to send to a lead with that email
4. Should be blocked

---

### Feature 4: LinkedIn Integration

**Add LinkedIn Profile:**
1. Click on a lead
2. In the sidebar, find the **LinkedIn** section
3. Enter the LinkedIn URL: `https://linkedin.com/in/username`
4. Add profile details:
   - Headline: `VP Sales | 10+ years B2B experience`
   - Current Company: `TestCorp`
   - Industry: `Software`
   - Location: `San Francisco, CA`
5. Click **Save**

**Verify Context Generated:**
1. Look at the **Context** section in the sidebar
2. You should see new items like:
   - `linkedin_headline`
   - `linkedin_industry`
   - `professional_background`

**Test in Email Generation:**
1. Click **Compose New Outreach**
2. Generate a new email
3. The email should reference LinkedIn data (e.g., mention their industry or experience)

---

### Feature 5: CRM Sync

**Connect HubSpot:**
1. Go to **Settings → Integrations**
2. Find **HubSpot** in the CRM section
3. Click **Connect**
4. Authorize in HubSpot
5. You should be redirected back with "Connected" status

**Sync a Lead:**
1. Go to any lead detail page
2. Find the **CRM Sync** section in the sidebar
3. Click the sync button next to HubSpot
4. Wait for sync to complete

**Verify in HubSpot:**
1. Log into your HubSpot account
2. Go to **Contacts**
3. Search for your lead's name
4. The contact should exist with:
   - Correct email, name, company
   - Activity showing the emails sent

**Sync All Leads:**
1. On a lead page, click **Sync All** to sync to all connected CRMs

---

### Feature 6: AI Writing Style Learning

**Train Your Style (requires 5+ edits):**

1. **First Email:**
   - Go to a lead, generate an email
   - Edit it: Remove "I hope this finds you well"
   - Save the action

2. **Second Email:**
   - Generate another email
   - Edit it: Change "reaching out" to "writing"
   - Save

3. **Third Email:**
   - Generate, edit: Add bullet points
   - Save

4. **Fourth Email:**
   - Generate, edit: Shorten the email significantly
   - Save

5. **Fifth Email:**
   - Generate, edit: Remove any formal closings like "Best regards"
   - Save

**Verify Style Learned:**
1. Go to **Settings → Writing Style** (or check the API)
2. You should see:
   - Sample count: 5+
   - Learned preferences listed

**Test Style Applied:**
1. Go to a new lead
2. Generate a fresh email
3. The email should already reflect your preferences:
   - No "hope this finds you well"
   - Shorter format
   - Your preferred phrases

---

## Quick Test Checklist

Use this checklist to verify all features:

| Feature | Test | Pass? |
|---------|------|-------|
| **Email Tracking** | Open email → count increases | ☐ |
| **Email Tracking** | Click link → redirects + count increases | ☐ |
| **Reply Detection** | Positive reply → "Interested" badge | ☐ |
| **Reply Detection** | Negative reply → "Not Interested" badge | ☐ |
| **Reply Detection** | OOO reply → "Out of Office" badge | ☐ |
| **Unsubscribe** | Click unsubscribe → confirmation page | ☐ |
| **Unsubscribe** | After unsubscribe → email in suppression list | ☐ |
| **Unsubscribe** | Send to suppressed → blocked with error | ☐ |
| **LinkedIn** | Add profile → context items created | ☐ |
| **LinkedIn** | Generate email → references LinkedIn data | ☐ |
| **CRM Sync** | Connect HubSpot → shows "Connected" | ☐ |
| **CRM Sync** | Sync lead → contact appears in HubSpot | ☐ |
| **Style Learning** | Edit 5+ emails → style is learned | ☐ |
| **Style Learning** | New email → reflects learned style | ☐ |

---

## Troubleshooting

### Emails not sending
- Check that you've connected an email provider in Settings → Integrations
- Verify your email OAuth hasn't expired (reconnect if needed)

### Tracking not working
- Make sure `TRACKING_BASE_URL` is set in `.env`
- Check that images are enabled in your email client
- Some email clients block tracking pixels

### Reply classification not showing
- Click "Sync" in Settings → Integrations to fetch new replies
- Classification only works on replies to sent emails

### CRM sync failing
- Verify your CRM OAuth credentials in `.env`
- Check that the CRM connection shows "Connected"
- Look at browser console for error details

### Style not learning
- You need at least 5 edited emails
- Make sure you're actually changing the body, not just the subject
- Edits must be meaningful (not just adding/removing spaces)

---

## Sample Test Data

### Test Leads to Create

| Name | Email | Role | Company |
|------|-------|------|---------|
| Alice Johnson | (your email) | CEO | StartupCo |
| Bob Smith | (your email +1) | VP Sales | EnterpriseCorp |
| Carol Williams | (your email +2) | Director | MidMarket Inc |

### Sample Reply Messages

**Positive:**
> Hi! This looks really interesting. I'd love to schedule a quick call to learn more. How's Thursday at 2pm?

**Negative:**
> Thanks for reaching out, but we're not looking for any new solutions right now. Please don't contact me again.

**Question:**
> Interesting. Can you tell me more about pricing? Do you have any case studies with companies like ours?

**Out of Office:**
> Thank you for your email. I am currently out of the office and will return on Monday, January 20th. For urgent matters, please contact support@company.com.

---

## Next Steps

After testing, you can:

1. **Connect production email** - Use your real work email
2. **Import real leads** - CSV import or manual entry
3. **Set up sequences** - Automated follow-up emails
4. **Connect your CRM** - Keep data in sync
5. **Refine AI style** - Keep editing to improve personalization
