import fs from 'fs/promises';
import path from 'path';
import { env } from '../config/env';

const UPLOADS_DIR = 'uploads';

export class FileUtils {
  static getFileName(file: Express.Multer.File): string {
    return `${Date.now()}-${file.originalname}`;
  }

  static getFilePath(fileName: string): string {
    return path.join(UPLOADS_DIR, fileName);
  }

  static getFileUrl(filePath: string): string {
    return `${env.API_URL}/${filePath}`;
  }

  static async save(filePath: string, fileBuffer: Buffer<ArrayBufferLike>): Promise<void> {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
    await fs.writeFile(filePath, fileBuffer);
  }

  static async exists(filePath: string): Promise<boolean> {
    return fs
      .access(filePath)
      .then(() => true)
      .catch(() => false);
  }

  static async delete(filePath: string): Promise<void> {
    let filePathToDelete = filePath;

    const fileExists = await FileUtils.exists(filePathToDelete);

    if (!fileExists) {
      const fileName = path.basename(filePathToDelete);

      filePathToDelete = FileUtils.getFilePath(fileName);

      const fileExistsInUploads = await FileUtils.exists(filePathToDelete);

      if (!fileExistsInUploads) {
        console.warn(`File not found: ${filePathToDelete}`);
        return;
      }
    }

    await fs.unlink(filePathToDelete);
  }
}