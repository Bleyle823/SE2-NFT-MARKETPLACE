# Pinata IPFS Setup Guide

To enable image uploads and NFT metadata storage, you need to configure Pinata IPFS integration.

## Step 1: Create a Pinata Account

1. Go to [https://pinata.cloud/](https://pinata.cloud/)
2. Sign up for a free account
3. Complete email verification

## Step 2: Generate API Keys

1. In your Pinata dashboard, navigate to **API Keys**
2. Click **New Key**
3. Configure permissions:
   - ✅ **pinFileToIPFS** (required for image uploads)
   - ✅ **pinJSONToIPFS** (required for metadata uploads)
   - ✅ **unpin** (optional, for removing files)
4. Set a descriptive name like "Event Ticketing App"
5. Click **Create Key**
6. **Important**: Copy and save your JWT token - you won't see it again!

## Step 3: Get Your Gateway URL

1. In your Pinata dashboard, go to **Gateways**
2. Copy your dedicated gateway URL (e.g., `https://mygateway.mypinata.cloud`)
3. Or use the public gateway: `https://gateway.pinata.cloud`

## Step 4: Configure Environment Variables

Create a `.env.local` file in the `packages/nextjs` directory:

```bash
# Pinata Configuration
NEXT_PUBLIC_PINATA_JWT=your_jwt_token_here
NEXT_PUBLIC_PINATA_GATEWAY=https://gateway.pinata.cloud
```

Replace `your_jwt_token_here` with your actual JWT token from Step 2.

## Step 5: How It Works

The app uses Pinata's REST API directly for reliable uploads:

- **Image Upload**: Files are uploaded via `https://api.pinata.cloud/pinning/pinFileToIPFS`
- **Metadata Upload**: JSON metadata is uploaded via `https://api.pinata.cloud/pinning/pinJSONToIPFS`
- **Image Display**: Images are loaded from your configured gateway

No additional SDK configuration is needed - just set your environment variables!

## Testing the Setup

1. Start your development server: `npm run dev`
2. Go to the Events page
3. Click "Create Event"
4. Try uploading an image - it should show a success message with IPFS URL

## Troubleshooting

- **Upload fails**: Check your JWT token is correct
- **Images don't display**: Verify your gateway URL
- **CORS errors**: Make sure you're using HTTPS in production

## Free Tier Limits

Pinata free tier includes:
- 1 GB storage
- 100,000 requests per month
- Sufficient for testing and small applications

For production apps with high usage, consider upgrading to a paid plan.
