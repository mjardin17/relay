# Next Actions: Empire OS Relay v2.0

1. **Production Deployment**: Deploy Express application with persistent SQLite volume or Cloud SQL PostgreSQL instance.
2. **Third-Party Integration Setup**: Configure SendGrid/Twilio API keys in `.env` to enable real dispatch mode for Stale Lead Recovery.
3. **Multi-Tenant JWT Auth**: Wrap `/api/growth/*` router with passport/JWT authentication middleware.
