import { BadRequestException } from '@nestjs/common';
import { Prisma, ReviewMediaType } from '@prisma/client';
import { MediaService } from '../../media/services/media.service';

export const EMPTY_COMMENT_FALLBACK = 'No comment';
export const PRODUCT_REVIEW_NOT_FOUND = 'Product review not found.';
export const SHOP_REVIEW_NOT_FOUND = 'Shop review not found.';
export const MAX_REVIEW_MEDIA_ITEMS = 6;

export interface UploadedReviewMediaItem {
  url: string;
  mediaType: ReviewMediaType;
  mimeType?: string;
  sizeBytes?: number;
}

export function inferReviewMediaType(url: string, mimeType?: string): ReviewMediaType {
  if (mimeType?.toLowerCase().startsWith('video/')) {
    return ReviewMediaType.VIDEO;
  }
  const cleanUrl = url.split('?')[0].toLowerCase();
  if (cleanUrl.endsWith('.mp4') || cleanUrl.endsWith('.mov') || cleanUrl.endsWith('.webm')) {
    return ReviewMediaType.VIDEO;
  }
  return ReviewMediaType.IMAGE;
}

export function buildReviewVisibilityFilter(viewerId?: string): Record<string, unknown> {
  if (viewerId) {
    return {
      OR: [{ isVisible: true }, { userId: viewerId }],
    };
  }
  return { isVisible: true };
}

export async function prepareReviewMedia(
  mediaService: MediaService | undefined,
  mediaUrls?: string[],
  files?: Express.Multer.File[],
): Promise<{ urls: string[]; items: UploadedReviewMediaItem[] }> {
  const normalizedUrls = (mediaUrls ?? []).map((u) => u.trim()).filter(Boolean);
  const totalCount = normalizedUrls.length + (files?.length ?? 0);
  if (totalCount > MAX_REVIEW_MEDIA_ITEMS) {
    throw new BadRequestException(
      `Maximum ${MAX_REVIEW_MEDIA_ITEMS} images/videos allowed per review or reply.`,
    );
  }

  const items: UploadedReviewMediaItem[] = normalizedUrls.map((url) => ({
    url,
    mediaType: inferReviewMediaType(url),
  }));

  if (files && files.length > 0) {
    if (!mediaService) {
      throw new BadRequestException('Media upload service is currently unavailable.');
    }
    const uploaded = await mediaService.uploadMultipleMedia(files, undefined, {
      strictReviewPolicy: true,
    });
    for (const item of uploaded.items) {
      items.push({
        url: item.url,
        mediaType: inferReviewMediaType(item.url, item.mimeType),
        mimeType: item.mimeType,
        sizeBytes: item.size,
      });
    }
  }

  return {
    urls: items.map((item) => item.url),
    items,
  };
}

export async function persistReviewMedia(
  tx: Prisma.TransactionClient,
  target: { productReviewId?: string; shopReviewId?: string },
  items: UploadedReviewMediaItem[],
): Promise<void> {
  if (items.length === 0 || !tx.reviewMedia?.createMany) return;

  await tx.reviewMedia.createMany({
    data: items.map((item, index) => ({
      productReviewId: target.productReviewId ?? null,
      shopReviewId: target.shopReviewId ?? null,
      url: item.url,
      mediaType: item.mediaType,
      mimeType: item.mimeType ?? null,
      sizeBytes: item.sizeBytes ?? null,
      sortOrder: index,
    })),
  });
}
