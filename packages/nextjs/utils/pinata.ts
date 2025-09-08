// Pinata IPFS service for better reliability and performance
// Prefer server-only env vars; fallback to NEXT_PUBLIC for backward compatibility in dev
const PINATA_API_KEY = process.env.PINATA_API_KEY || process.env.NEXT_PUBLIC_PINATA_API_KEY || '';
const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY || process.env.NEXT_PUBLIC_PINATA_SECRET_KEY || '';
const PINATA_GATEWAY = process.env.PINATA_GATEWAY || process.env.NEXT_PUBLIC_PINATA_GATEWAY || '';

// Pinata API endpoints
const PINATA_PIN_FILE_URL = 'https://api.pinata.cloud/pinning/pinFileToIPFS';
const PINATA_PIN_JSON_URL = 'https://api.pinata.cloud/pinning/pinJSONToIPFS';

// Headers for Pinata API
const getPinataHeaders = () => ({
  'pinata_api_key': PINATA_API_KEY,
  'pinata_secret_api_key': PINATA_SECRET_KEY,
});

// Upload file to Pinata
export const uploadToPinata = async (file: File): Promise<{ IpfsHash: string; PinSize: number }> => {
  if (!PINATA_API_KEY || !PINATA_SECRET_KEY) {
    throw new Error('Pinata API keys not configured');
  }

  const formData = new FormData();
  formData.append('file', file);
  
  // Optional metadata
  const metadata = JSON.stringify({
    name: file.name,
    keyvalues: {
      type: 'event-image',
      uploadedAt: new Date().toISOString(),
    }
  });
  formData.append('pinataMetadata', metadata);

  // Optional options
  const options = JSON.stringify({
    cidVersion: 0,
    wrapWithDirectory: false,
  });
  formData.append('pinataOptions', options);

  const response = await fetch(PINATA_PIN_FILE_URL, {
    method: 'POST',
    headers: getPinataHeaders(),
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Pinata upload failed: ${response.statusText}`);
  }

  return await response.json();
};

// Upload JSON to Pinata
export const uploadJSONToPinata = async (json: object): Promise<{ IpfsHash: string; PinSize: number }> => {
  if (!PINATA_API_KEY || !PINATA_SECRET_KEY) {
    throw new Error('Pinata API keys not configured');
  }

  const response = await fetch(PINATA_PIN_JSON_URL, {
    method: 'POST',
    headers: {
      ...getPinataHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      pinataContent: json,
      pinataMetadata: {
        name: 'event-metadata',
        keyvalues: {
          type: 'event-metadata',
          uploadedAt: new Date().toISOString(),
        }
      },
      pinataOptions: {
        cidVersion: 0,
      }
    }),
  });

  if (!response.ok) {
    throw new Error(`Pinata JSON upload failed: ${response.statusText}`);
  }

  return await response.json();
};

// Get Pinata URL for a hash
export const getPinataUrl = (hash: string): string => {
  if (PINATA_GATEWAY) {
    return `${PINATA_GATEWAY}/ipfs/${hash}`;
  }
  return `https://gateway.pinata.cloud/ipfs/${hash}`;
};

// Check if Pinata is configured
export const isPinataConfigured = (): boolean => {
  return !!(PINATA_API_KEY && PINATA_SECRET_KEY);
};
