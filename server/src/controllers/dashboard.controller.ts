import { Request, Response } from "express";
import * as dashboardService from "../services/dashboard.service.js";

export async function getDashboard(_req: Request, res: Response): Promise<void> {
  const [
    overview,
    growth,
    ownerRanking,
    concurrentTenants,
    rentOutliers,
    noPhotos,
    duplicateLocations,
  ] = await Promise.all([
    dashboardService.getPlatformOverview(),
    dashboardService.getGrowthTrends(),
    dashboardService.getOwnersByListingCount(),
    dashboardService.getConcurrentTenants(),
    dashboardService.getRentOutliers(),
    dashboardService.getListingsWithNoPhotos(),
    dashboardService.getDuplicateLocations(),
  ]);

  res.json({
    overview,
    growth,
    fraud: {
      owners_by_listing_count: ownerRanking,
      concurrent_tenants: concurrentTenants,
      rent_outliers: rentOutliers,
      listings_no_photos: noPhotos,
      duplicate_locations: duplicateLocations,
    },
  });
}
