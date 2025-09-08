"use client";

import { useState, useEffect } from 'react';
import { getIPFSUrl, getAllIPFSUrls } from '~~/utils/ipfs-gateways';

interface IPFSImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackSrc?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export const IPFSImage: React.FC<IPFSImageProps> = ({
  src,
  alt,
  className = '',
  fallbackSrc = '/placeholder-event.svg',
  onLoad,
  onError,
}) => {
  const [currentSrc, setCurrentSrc] = useState<string>(fallbackSrc);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [gatewayIndex, setGatewayIndex] = useState(0);

  useEffect(() => {
    if (!src) {
      setCurrentSrc(fallbackSrc);
      setIsLoading(false);
      return;
    }

    // Check if it's an IPFS URL
    if (src.includes('/ipfs/')) {
      const ipfsHash = src.replace(/^https?:\/\/[^\/]+\/ipfs\//, '');
      const urls = getAllIPFSUrls(ipfsHash);
      setCurrentSrc(urls[0]); // Start with first gateway
    } else {
      setCurrentSrc(src);
    }
    
    setIsLoading(true);
    setHasError(false);
    setGatewayIndex(0);
  }, [src, fallbackSrc]);

  const handleError = () => {
    if (src && src.includes('/ipfs/')) {
      const ipfsHash = src.replace(/^https?:\/\/[^\/]+\/ipfs\//, '');
      const urls = getAllIPFSUrls(ipfsHash);
      
      // Try next gateway
      const nextIndex = gatewayIndex + 1;
      if (nextIndex < urls.length) {
        setGatewayIndex(nextIndex);
        setCurrentSrc(urls[nextIndex]);
        return;
      }
    }
    
    // All gateways failed or not an IPFS URL
    setHasError(true);
    setCurrentSrc(fallbackSrc);
    setIsLoading(false);
    onError?.();
  };

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
    onLoad?.();
  };

  return (
    <div className={`relative ${className}`}>
      {/* Loading placeholder */}
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse rounded-lg"></div>
      )}
      
      {/* Main image */}
      <img
        src={currentSrc || fallbackSrc}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        }`}
        onLoad={handleLoad}
        onError={handleError}
      />
      
      {/* Error indicator */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
          <div className="text-center text-gray-500">
            <div className="text-2xl mb-2">🖼️</div>
            <div className="text-xs">Image unavailable</div>
          </div>
        </div>
      )}
    </div>
  );
};
