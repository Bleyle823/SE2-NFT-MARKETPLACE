import { uploadToPinata, uploadJSONToPinata, isPinataConfigured, getPinataUrl } from './pinata';

// Enhanced IPFS service that can use both Infura and Pinata
export class EnhancedIPFSService {
  private usePinata: boolean;

  constructor() {
    // On the server we can check real configuration; on the client we'll route via API
    this.usePinata = true;
  }

  // Upload file; client uses server API to keep secrets safe
  async uploadFile(file: File): Promise<{ path: string; url: string }> {
    const isClient = typeof window !== 'undefined';
    if (isClient) {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/ipfs/pinata/upload-file', { method: 'POST', body: formData });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Upload failed');
      }
      const data = await response.json();
      return { path: data.path, url: data.url };
    }

    // Server-side: call Pinata directly
    if (!isPinataConfigured()) {
      throw new Error('Pinata is not configured. Set PINATA_API_KEY and PINATA_SECRET_KEY.');
    }
    const result = await uploadToPinata(file);
    return { path: result.IpfsHash, url: getPinataUrl(result.IpfsHash) };
  }

  // Upload JSON; client uses server API
  async uploadJSON(json: object): Promise<{ path: string; url: string }> {
    const isClient = typeof window !== 'undefined';
    if (isClient) {
      const response = await fetch('/api/ipfs/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(json),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Upload failed');
      }
      const data = await response.json();
      return { path: data.path, url: getPinataUrl(data.path) };
    }

    if (!isPinataConfigured()) {
      throw new Error('Pinata is not configured. Set PINATA_API_KEY and PINATA_SECRET_KEY.');
    }
    const result = await uploadJSONToPinata(json);
    return { path: result.IpfsHash, url: getPinataUrl(result.IpfsHash) };
  }

  // Get the best URL for an IPFS hash
  getBestUrl(ipfsHash: string): string {
    return getPinataUrl(ipfsHash);
  }

  // Check if Pinata is available
  isPinataAvailable(): boolean {
    return true;
  }
}

// Export a singleton instance
export const enhancedIPFS = new EnhancedIPFSService();
