import type { NextApiRequest, NextApiResponse } from "next";
import { v2 as cloudinary } from "cloudinary";
import formidable from "formidable";
import fs from "fs";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Disable Next.js default body parsing
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const form = formidable({
    multiples: false, // Expect a single file
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("Error parsing form:", err);
      return res.status(500).json({ error: "Error parsing form data" });
    }

    // Fix: Access file correctly
    const file = Array.isArray(files.file) ? files.file[0] : files.file;

    if (!file || !file.filepath) {
      console.error("File or filepath missing:", files);
      return res.status(400).json({ error: "File missing or invalid" });
    }

    try {
      // Create a read stream for the file
      const stream = fs.createReadStream(file.filepath);

      // Upload to Cloudinary
      const uploadStream = cloudinary.uploader.upload_stream({ folder: process.env.CLOUDINARY_FOLDER || "default-folder" }, (error, result) => {
        if (error) {
          console.error("Cloudinary upload error:", error);
          return res.status(500).json({ error: "Failed to upload image" });
        }

        // Respond with Cloudinary image URL
        res.status(200).json({ success: true, url: result?.secure_url });
      });

      // Pipe the file stream into the upload stream
      stream.pipe(uploadStream);
    } catch (error) {
      console.error("Error uploading file to Cloudinary:", error);
      res.status(500).json({ error: "Internal server error during upload" });
    }
  });
}
