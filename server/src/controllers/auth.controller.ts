import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import {
  registerSchema,
  loginSchema,
  becomeTenantSchema,
} from "../schemas/auth.schema.js";
import * as authService from "../services/auth.service.js";

export async function register(req: Request, res: Response) {
  const result = registerSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.issues[0].message });
    return;
  }
  const { name, email, password, phone, nid } = result.data;
  await authService.registerUser(name, email, password, phone, nid);

  // auto login after registration
  const token = await authService.loginUser(email, password);
  res.json({ token });
}

export async function login(req: Request, res: Response) {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.issues[0].message });
    return;
  }
  const { email, password } = result.data;
  const token = await authService.loginUser(email, password);
  res.json({ token });
}

export async function me(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const user = await authService.getUserById(req.user.id);
  res.json({ user }); // { id, name, email, nid, phone }
}

export async function becomeOwner(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  await authService.becomeOwner(req.user.id);
  res.json({ message: "successfully became an owner" });
}

export async function becomeTenant(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const result = becomeTenantSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.issues[0].message });
    return;
  }
  const { monthly_income, emergency_contact } = result.data;
  await authService.becomeTenant(
    req.user.id,
    monthly_income,
    emergency_contact,
  );
  res.json({ message: "successfully became a tenant" });
}

export async function logout(req: Request, res: Response) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const token = authHeader.split(" ")[1];
  const decoded = jwt.decode(token);
  if (!decoded || typeof decoded === "string" || !decoded.exp) {
    // jwt.deocde returns string/ jwtPAYLOAD/NULL, the typeof guard hanlde the case where the  token isnt an object and the !decoded.exp guard handles the case where the token is an object but doesnt have an exp property
    res.status(400).json({ error: "invalid token" });
    return;
  }
  const expiresAt = new Date(decoded.exp * 1000);
  await authService.revokeToken(token, expiresAt);
  res.json({ message: "logged out successfully" });
}
