import { S3Client } from 'bun';

import s3Config from '@/config/s3';

const client = new S3Client({
  endpoint: s3Config.endpoint,
  accessKeyId: s3Config.accessKeyId,
  secretAccessKey: s3Config.secretAccessKey,
  bucket: s3Config.bucket,
});

export interface IStorageService {
  getPublicDomain(): string
  delete(path: string): Promise<void>
}

export const StorageService: IStorageService = {
  getPublicDomain() {
    return s3Config.publicDomain;
  },
  async delete(path: string) {
    await client.delete(path);
  },
};
