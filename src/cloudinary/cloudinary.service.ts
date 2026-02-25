import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { v2 as cloudinary, type UploadApiResponse, type UploadApiErrorResponse } from 'cloudinary';
import { Readable } from 'stream';

export type CloudinaryUploadResult = {
  url: string;
  secureUrl: string;
  publicId: string;
  format?: string;
  bytes?: number;
};

@Injectable()
export class CloudinaryService {
  private readonly configured: boolean;
  private readonly folderPrefix: string;

  constructor() {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    this.configured = Boolean(cloudName && apiKey && apiSecret);
    this.folderPrefix = (process.env.CLOUDINARY_FOLDER_PREFIX ?? 'surtimarket').trim();

    if (this.configured) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });
    }
  }

  isConfigured() {
    return this.configured;
  }

  async uploadImageBuffer(params: {
    buffer: Buffer;
    folder: string;
    publicId?: string;
    format?: string;
    overwrite?: boolean;
  }): Promise<CloudinaryUploadResult> {
    if (!this.configured) {
      throw new InternalServerErrorException('Cloudinary no configurado');
    }

    const folder = this.buildFolder(params.folder);

    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'image',
          folder,
          public_id: params.publicId,
          format: params.format,
          overwrite: params.overwrite ?? true,
        },
        (error?: UploadApiErrorResponse, uploadResult?: UploadApiResponse) => {
          if (error) return reject(error);
          if (!uploadResult) return reject(new Error('Cloudinary no devolvió resultado'));
          return resolve(uploadResult);
        },
      );

      Readable.from(params.buffer).pipe(stream);
    });

    return {
      url: result.url,
      secureUrl: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      bytes: result.bytes,
    };
  }

  private buildFolder(folder: string) {
    const cleaned = folder.replace(/^\/+|\/+$/g, '');
    if (!this.folderPrefix) return cleaned;
    return cleaned ? `${this.folderPrefix}/${cleaned}` : this.folderPrefix;
  }
}

