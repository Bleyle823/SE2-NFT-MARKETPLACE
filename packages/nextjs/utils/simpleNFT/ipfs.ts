import { uploadJSONToPinata, getPinataUrl } from "../pinata";

// Minimal client-like wrapper to keep compatibility with existing callers
// Only implements the `add` method used by the app routes
export const ipfsClient = {
  async add(data: unknown): Promise<{ path: string }> {
    // Accept stringified JSON or an object
    let jsonObject: unknown = data;
    if (typeof data === "string") {
      try {
        jsonObject = JSON.parse(data);
      } catch {
        // If it's a plain string, wrap it
        jsonObject = { value: data };
      }
    }
    const result = await uploadJSONToPinata(jsonObject as object);
    return { path: result.IpfsHash };
  },
};

export async function getNFTMetadataFromIPFS(ipfsHash: string) {
  try {
    const url = getPinataUrl(ipfsHash);
    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) return undefined;
    return await res.json();
  } catch (error) {
    console.log("Error fetching JSON from Pinata gateway:", error);
    return undefined;
  }
}
