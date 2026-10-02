/**
 * Presigned URL generator for Cloudflare R2 / S3 avatar asset storage.
 */
export interface PresignedUploadUrls {
  avatarKey: string;
  thumbnailKey: string;
  avatarUploadUrl: string;
  thumbnailUploadUrl: string;
  avatarPublicUrl: string;
  thumbnailPublicUrl: string;
}

export function generatePresignedAvatarUrls(
  playerId: string,
  extension = 'webp',
  bucketUrl = process.env.R2_BUCKET_URL || 'https://assets.tournamentmanager.dev'
): PresignedUploadUrls {
  const cleanId = encodeURIComponent(playerId.trim());
  const ext = extension.replace(/^\./, '');
  const avatarKey = `avatars/${cleanId}.${ext}`;
  const thumbnailKey = `thumbnails/${cleanId}.${ext}`;

  // Direct presigned PUT target (or storage gateway)
  const avatarUploadUrl = `${bucketUrl}/${avatarKey}?action=put`;
  const thumbnailUploadUrl = `${bucketUrl}/${thumbnailKey}?action=put`;

  const avatarPublicUrl = `${bucketUrl}/${avatarKey}`;
  const thumbnailPublicUrl = `${bucketUrl}/${thumbnailKey}`;

  return {
    avatarKey,
    thumbnailKey,
    avatarUploadUrl,
    thumbnailUploadUrl,
    avatarPublicUrl,
    thumbnailPublicUrl,
  };
}
