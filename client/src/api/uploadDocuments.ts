import { apiClient } from "./client";

export async function uploadListingDocuments(
  listingId: string,
  documentType: string,
  files: File[],
) {
  const formData = new FormData();
  formData.append("document_type", documentType);
  files.forEach((file) => formData.append("files", file));

  return apiClient.postForm<{ documentId: number; mediaIds: number[] }>(
    `/listings/${listingId}/documents`,
    formData,
  );
}

export async function fetchListingDocuments(listingId: string) {
  return apiClient.get<{
    documents: {
      id: number;
      document_type: string;
      is_verified: boolean;
      media: { id: number; url: string }[];
    }[];
  }>(`/listings/${listingId}/documents`);
}