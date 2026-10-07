import type { UploadUrlDto } from '@vrp/shared-types';
import type { UploadUrlRequest } from '@vrp/validation';
import { http, unwrap } from '@/api/client';

export const uploadService = {
  requestVehicleImageUrl: (input: UploadUrlRequest) =>
    unwrap<UploadUrlDto>(http.post('/uploads/vehicle-images', input)),

  /**
   * Sends the file straight to S3 with the presigned URL — the bytes never
   * pass through the API. XHR (not fetch) so we can report real progress.
   */
  putToS3(target: UploadUrlDto, file: File, onProgress: (fraction: number) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', target.uploadUrl);
      for (const [name, value] of Object.entries(target.headers)) xhr.setRequestHeader(name, value);
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) onProgress(event.loaded / event.total);
      };
      xhr.onload = () =>
        xhr.status >= 200 && xhr.status < 300
          ? resolve()
          : reject(new Error(`Upload failed (${xhr.status})`));
      xhr.onerror = () => reject(new Error('Upload failed. Check your connection and try again.'));
      xhr.send(file);
    });
  },
};
