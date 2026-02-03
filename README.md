# Marketaa

AI-assisted outreach platform that helps teams discover context, craft personalized messages, and build meaningful connections—while keeping humans in control.

## Features

- **AI-Powered Lead Research** - Automatically gather context about leads using web search and AI analysis
- **Personalized Email Generation** - Create tailored outreach messages based on lead context
- **Email Sequences** - Build automated multi-step email campaigns with delays and conditions
- **Template Library** - Save and reuse successful email patterns with A/B testing support
- **Lead Scoring** - AI-powered lead prioritization based on engagement and fit
- **Gmail & Outlook Integration** - Connect email accounts for sending and reply tracking
- **Calendar Integration** - Book meetings directly from the platform
- **Email Warmup** - Domain health monitoring and warmup activities
- **Team Collaboration** - Invite team members with role-based permissions
- **Analytics Dashboard** - Track outreach performance and team metrics

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: SQLite (dev) / PostgreSQL (prod)
- **ORM**: Prisma
- **Auth**: NextAuth.js
- **AI**: OpenAI GPT-4, LangChain
- **Search**: Tavily API
- **Email**: Resend
- **Styling**: Tailwind CSS v4, shadcn/ui
- **Charts**: Recharts
- **Payments**: Paystack

## Prerequisites

- Node.js 18+
- npm or yarn
- OpenAI API key
- Tavily API key (for web search)

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/marketaa.git
cd marketaa
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="file:./dev.db"

# Auth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret-generate-with-openssl-rand-base64-32"

# OpenAI (Required for AI features)
OPENAI_API_KEY="sk-..."

# Tavily (Required for web search/research)
TAVILY_API_KEY="tvly-..."

# Resend (Required for sending emails)
RESEND_API_KEY="re_..."
RESEND_FROM_EMAIL="noreply@yourdomain.com"

# Encryption (for storing OAuth tokens)
ENCRYPTION_KEY="your-32-character-encryption-key"

# Google OAuth (Optional - for Gmail/Calendar integration)
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# Microsoft OAuth (Optional - for Outlook/Calendar integration)
MICROSOFT_CLIENT_ID="..."
MICROSOFT_CLIENT_SECRET="..."

# Paystack (Optional - for billing)
PAYSTACK_SECRET_KEY="sk_..."
PAYSTACK_PUBLIC_KEY="pk_..."

# Cron Secret (for scheduled jobs)
CRON_SECRET="your-cron-secret"
```

### 4. Initialize the database

```bash
npx prisma generate
npx prisma db push
```

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 6. Create an admin user

First, register a regular account through the UI at `/register`. Then promote it to admin:

**Option A: Using Prisma Studio**

```bash
npx prisma studio
```

Navigate to the `User` table, find your user, and change `role` from `"user"` to `"admin"`.

**Option B: Using SQLite CLI**

```bash
sqlite3 prisma/dev.db "UPDATE User SET role = 'admin' WHERE email = 'your@email.com';"
```

**Option C: Using PostgreSQL**

```bash
psql $DATABASE_URL -c "UPDATE \"User\" SET role = 'admin' WHERE email = 'your@email.com';"
```

Once promoted, you'll see the **Admin Dashboard** link in the sidebar with access to:
- User management (view, edit roles, manage subscriptions)
- Platform statistics
- Subscription plan management

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth pages (login, register, etc.)
│   ├── (dashboard)/       # Dashboard pages
│   └── api/               # API routes
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── integrations/     # Integration components
│   └── ...
├── lib/                   # Utilities and services
│   ├── ai/               # AI/LLM functions
│   ├── integrations/     # OAuth & API integrations
│   └── jobs/             # Background job handlers
└── types/                # TypeScript types
```

## Database

### Development (SQLite)

The default configuration uses SQLite for easy local development:

```env
DATABASE_URL="file:./dev.db"
```

### Production (PostgreSQL)

For production, switch to PostgreSQL:

1. Update `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

2. Update `.env`:
```env
DATABASE_URL="postgresql://user:password@host:5432/marketaa"
```

3. Run migrations:
```bash
npx prisma migrate dev
```

## API Integrations

### OpenAI

Used for:
- Lead research and context extraction
- Email draft generation
- Lead scoring analysis
- Next action suggestions

### Tavily

Used for web search to gather information about leads and their organizations.

### Google (Gmail & Calendar)

1. Create a project in [Google Cloud Console](https://console.cloud.google.com/)
2. Enable Gmail API and Google Calendar API
3. Create OAuth 2.0 credentials
4. Add authorized redirect URI: `{NEXTAUTH_URL}/api/integrations/google/callback`

### Microsoft (Outlook & Calendar)

1. Register an app in [Azure Portal](https://portal.azure.com/)
2. Add Microsoft Graph permissions: `Mail.Send`, `Mail.Read`, `Calendars.ReadWrite`
3. Add redirect URI: `{NEXTAUTH_URL}/api/integrations/microsoft/callback`

## Scheduled Jobs

The platform uses a cron endpoint for background tasks:

- Sequence step execution
- Email warmup activities
- Inbox sync for replies
- Analytics aggregation

Set up a cron job to hit `/api/cron/process-jobs` every 5 minutes:

```bash
*/5 * * * * curl -X POST https://yourdomain.com/api/cron/process-jobs -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Or use Vercel Cron with `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/cron/process-jobs",
    "schedule": "*/5 * * * *"
  }]
}
```

## Admin Features

The admin dashboard (`/admin`) provides:

- **Dashboard** - Platform-wide statistics (users, projects, leads, revenue)
- **User Management** (`/admin/users`) - View all users, change roles, manage subscriptions
- **Plan Management** (`/admin/plans`) - Configure subscription plans and pricing

Admin capabilities:
- Promote/demote users to admin role
- Manually assign subscription plans to users
- View platform-wide metrics and growth trends

## Scripts

```bash
npm run dev       # Start development server
npm run build     # Build for production
npm run start     # Start production server
npm run lint      # Run ESLint
```

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the project in Vercel
3. Add environment variables
4. Deploy

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request
