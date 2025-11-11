import fs from "fs";
import path from "path";
import { NextApiRequest, NextApiResponse } from "next";

interface ImageData {
  name: string;
  url: string;
  path: string;
  directory: string;
  size: number;
}

// 缓存机制
let cachedImages: ImageData[] | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 30 * 1000; // 30秒缓存

function getImageFiles(
  dirPath: string,
  relativePath: string = ""
): ImageData[] {
  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"];
  const images: ImageData[] = [];

  try {
    const items = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(dirPath, item.name);
      const relativeItemPath = relativePath
        ? path.join(relativePath, item.name)
        : item.name;

      if (item.isDirectory()) {
        const subImages = getImageFiles(fullPath, relativeItemPath);
        images.push(...subImages);
      } else if (item.isFile()) {
        const ext = path.extname(item.name).toLowerCase();
        if (imageExtensions.includes(ext)) {
          const stats = fs.statSync(fullPath);
          images.push({
            name: item.name,
            url: `/images/${relativeItemPath.replace(/\\/g, "/")}`,
            path: relativeItemPath,
            directory: relativePath || "根目录",
            size: stats.size,
          });
        }
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error);
  }

  return images;
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // 检查缓存
    const now = Date.now();
    if (cachedImages && (now - cacheTimestamp) < CACHE_DURATION) {
      // 设置缓存头
      res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=30');
      return res.status(200).json({ images: cachedImages });
    }

    const imagesDirectory = path.join(process.cwd(), "public", "images");

    if (!fs.existsSync(imagesDirectory)) {
      const emptyResult: ImageData[] = [];
      cachedImages = emptyResult;
      cacheTimestamp = now;
      res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=30');
      return res.status(200).json({ images: emptyResult });
    }

    const images = getImageFiles(imagesDirectory);
    
    // 更新缓存
    cachedImages = images;
    cacheTimestamp = now;

    // 设置缓存头
    res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=30');
    res.status(200).json({ images });
  } catch (error) {
    console.error("Error reading images directory:", error);
    res.status(500).json({
      message: "Error reading images directory",
      error: String(error),
    });
  }
}
