// Multiple IPFS gateways for better reliability
// Pinata gateway is prioritized for better performance
export const IPFS_GATEWAYS = [
  'https://gateway.pinata.cloud/ipfs/',
  'https://ipfs.io/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://dweb.link/ipfs/',
  'https://ipfs.fleek.co/ipfs/',
  'https://gateway.originprotocol.com/ipfs/',
];

// Function to get the best IPFS URL with fallback gateways
export const getIPFSUrl = (ipfsHash: string): string => {
  if (!ipfsHash) return '';
  
  // Remove any existing gateway prefix
  const cleanHash = ipfsHash.replace(/^https?:\/\/[^\/]+\/ipfs\//, '');
  
  // Return the first gateway (ipfs.io) as primary
  return `${IPFS_GATEWAYS[0]}${cleanHash}`;
};

// Function to get all possible IPFS URLs for fallback
export const getAllIPFSUrls = (ipfsHash: string): string[] => {
  if (!ipfsHash) return [];
  
  // Remove any existing gateway prefix
  const cleanHash = ipfsHash.replace(/^https?:\/\/[^\/]+\/ipfs\//, '');
  
  return IPFS_GATEWAYS.map(gateway => `${gateway}${cleanHash}`);
};

// Function to test if an IPFS URL is accessible
export const testIPFSUrl = async (url: string): Promise<boolean> => {
  try {
    const response = await fetch(url, { 
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-cache'
    });
    return true; // If no error, assume it's accessible
  } catch (error) {
    return false;
  }
};

// Function to get the best working IPFS URL
export const getBestIPFSUrl = async (ipfsHash: string): Promise<string> => {
  if (!ipfsHash) return '';
  
  const urls = getAllIPFSUrls(ipfsHash);
  
  // Try each gateway in order
  for (const url of urls) {
    try {
      const isAccessible = await testIPFSUrl(url);
      if (isAccessible) {
        return url;
      }
    } catch (error) {
      // Continue to next gateway
      continue;
    }
  }
  
  // If all fail, return the first one as fallback
  return urls[0];
};
