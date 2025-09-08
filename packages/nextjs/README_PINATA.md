# Pinata Integration Guide

This app is configured to use Pinata for all IPFS uploads and reads.

## 1) Environment variables
Create a `.env.local` in `packages/nextjs` with:

- PINATA_API_KEY=YOUR_API_KEY
- PINATA_SECRET_KEY=YOUR_SECRET
- PINATA_GATEWAY=https://gateway.pinata.cloud

Restart `yarn start` after changes.

## 2) What changed
- Uploads now go through Pinata via:
  - API route `POST /api/ipfs/add` for JSON
  - API route `POST /api/ipfs/pinata/upload-file` for files (multipart/form-data)
- Retrieval uses Pinata gateway URLs.

## 3) Client usage
- JSON: keep using existing helper that posts to `/api/ipfs/add`.
- Files: send `FormData` with key `file` to `/api/ipfs/pinata/upload-file`.

## 4) Testing
1. Start stack:
   - `yarn chain` (optional if testing contracts)
   - `yarn start`
2. Set env in `.env.local` and restart.
3. Test image upload at `/ipfsUpload`:
   - Drop/select an image and click Upload to IPFS.
   - You should see a Pinata URL and CID.
4. Test JSON upload in `/myNFTs` or `/ipfsUpload` ticket section:
   - Generate metadata and click Upload to IPFS.
   - Confirm a CID is returned.
5. Retrieval:
   - Go to `/ipfsDownload`, paste the CID, click Download; JSON should render.
   - Open the image URL shown to verify it loads from Pinata gateway.

## 5) Notes
- Ensure API keys have pinning permissions in Pinata.
- If uploads fail with configuration error, verify `.env.local` keys.
- Gateways can be customized via `PINATA_GATEWAY`.
