import { Request, Response } from "express";
import { incomeQuerySchema, paginationSchema } from "../schemas/income.schema.js";
import * as incomeService from "../services/income.service.js";

export async function getOverall(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const queryResult = incomeQuerySchema.safeParse(req.query);
  if (!queryResult.success) {
    res.status(400).json({ error: queryResult.error.issues[0].message });
    return;
  }
  const data = await incomeService.getOverallIncome(req.user.id, queryResult.data);
  res.json(data);
}

export async function getListings(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const queryResult = incomeQuerySchema.safeParse(req.query);
  if (!queryResult.success) {
    res.status(400).json({ error: queryResult.error.issues[0].message });
    return;
  }
  const listings = await incomeService.getListingIncome(req.user.id, queryResult.data);
  res.json({ listings });
}

export async function getContracts(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const queryResult = incomeQuerySchema.safeParse(req.query);
  if (!queryResult.success) {
    res.status(400).json({ error: queryResult.error.issues[0].message });
    return;
  }
  const contracts = await incomeService.getContractIncome(req.user.id, queryResult.data);
  res.json({ contracts });
}

export async function getPayments(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const queryResult = incomeQuerySchema.safeParse(req.query);
  if (!queryResult.success) {
    res.status(400).json({ error: queryResult.error.issues[0].message });
    return;
  }
  const pageResult = paginationSchema.safeParse(req.query);
  if (!pageResult.success) {
    res.status(400).json({ error: pageResult.error.issues[0].message });
    return;
  }
  const data = await incomeService.getOwnerPaymentsLedger(
    req.user.id,
    queryResult.data,
    pageResult.data,
  );
  res.json(data);
}
