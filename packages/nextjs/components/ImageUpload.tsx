"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { uploadImageToPinata, getIPFSUrl } from "~~/services/pinata";

interface ImageUploadProps {
  onImageUploaded: (imageCID: string, imageUrl: string) => void;
  onUploadStart?: () => void;
  onUploadError?: (error: string) => void;
  className?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  onImageUploaded,
  onUploadStart,
  onUploadError,
  className = "",
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState<string>("");

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];
      
      // Validate file type
      if (!file.type.startsWith("image/")) {
        onUploadError?.("Please upload an image file");
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        onUploadError?.("File size must be less than 10MB");
        return;
      }

      setIsUploading(true);
      setUploadProgress("Preparing upload...");
      onUploadStart?.();

      try {
        setUploadProgress("Uploading to IPFS...");
        const imageCID = await uploadImageToPinata(file);
        const imageUrl = getIPFSUrl(imageCID);
        
        setUploadedImageUrl(imageUrl);
        setUploadProgress("Upload complete!");
        
        onImageUploaded(imageCID, imageUrl);
      } catch (error) {
        console.error("Upload error:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to upload image";
        onUploadError?.(errorMessage);
        setUploadProgress("");
      } finally {
        setIsUploading(false);
      }
    },
    [onImageUploaded, onUploadStart, onUploadError]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
    },
    multiple: false,
    disabled: isUploading,
  });

  return (
    <div className={`w-full ${className}`}>
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive ? "border-primary bg-primary/10" : "border-gray-300 hover:border-primary"}
          ${isUploading ? "cursor-not-allowed opacity-50" : ""}
          ${uploadedImageUrl ? "border-success bg-success/10" : ""}
        `}
      >
        <input {...getInputProps()} />
        
        {uploadedImageUrl ? (
          <div className="space-y-4">
            <div className="relative w-full h-48 mx-auto rounded-lg overflow-hidden">
              <img
                src={uploadedImageUrl}
                alt="Uploaded event"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="text-success font-semibold">✓ Image uploaded successfully!</div>
            <div className="text-sm text-gray-600">
              Click or drag to replace image
            </div>
          </div>
        ) : isUploading ? (
          <div className="space-y-4">
            <div className="loading loading-spinner loading-lg mx-auto"></div>
            <div className="text-lg font-semibold">{uploadProgress}</div>
            <div className="text-sm text-gray-600">
              Please wait while we upload your image to IPFS...
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-6xl">📸</div>
            <div className="space-y-2">
              <div className="text-lg font-semibold">
                {isDragActive ? "Drop your image here!" : "Upload Event Image"}
              </div>
              <div className="text-sm text-gray-600">
                Drag & drop an image, or click to browse
              </div>
              <div className="text-xs text-gray-500">
                Supports PNG, JPG, JPEG, GIF, WEBP (max 10MB)
              </div>
            </div>
          </div>
        )}
      </div>
      
      {uploadedImageUrl && (
        <div className="mt-4 p-3 bg-base-200 rounded-lg">
          <div className="text-sm font-semibold mb-1">IPFS URL:</div>
          <div className="text-xs font-mono break-all text-gray-600">
            {uploadedImageUrl}
          </div>
        </div>
      )}
    </div>
  );
};
