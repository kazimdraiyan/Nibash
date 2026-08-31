import { Request, Response } from "express";
import {
  createContractSchema,
  updateContractSchema,
} from "../schemas/contract.schema.js";
import * as contractService from "../services/contract.service.js";

export async function create(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const result = createContractSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.issues[0].message });
    return;
  }
  const contractId = await contractService.createContract(
    req.user.id,
    result.data,
  );
  res
    .status(201)
    .json({ message: "contract created successfully", contractId });
}

export async function getById(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const contract = await contractService.getContractById(
    req.params.id as string,
    req.user.id,
  );
  res.json({ contract });
}

export async function sign(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const result = updateContractSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.issues[0].message });
    return;
  }
  await contractService.signContract(req.params.id as string, req.user.id);
  res.json({ message: "contract signed successfully" });
}
