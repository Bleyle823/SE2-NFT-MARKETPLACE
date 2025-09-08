"use server";

import { uploadToPinata, getPinataUrl } from "~~/utils/pinata";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!file || !(file instanceof File)) {
      return Response.json({ error: "Missing file" }, { status: 400 });
    }

    const result = await uploadToPinata(file);
    return Response.json({ path: result.IpfsHash, url: getPinataUrl(result.IpfsHash) });
  } catch (error) {
    console.log("Error uploading file to Pinata", error);
    return Response.json({ error: "Error uploading file to Pinata" }, { status: 500 });
  }
}


