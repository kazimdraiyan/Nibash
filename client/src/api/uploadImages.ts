import { apiClient } from "./client";

export async function uploadListingImages(listingId: string, files: File[]) {
  const formData = new FormData();
  files.forEach((f) => formData.append("images", f));
  return apiClient.postForm<{ message: string; mediaIds: number[] }>(
    `/listings/${listingId}/media`,
    formData
  );
}