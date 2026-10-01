import { Request, Response } from "express";
import * as areaService from "../services/area.service.js";

export async function getStats(req: Request, res: Response) {
  const stats = await areaService.getAreaStats();
  res.json({ areas: stats });
}
