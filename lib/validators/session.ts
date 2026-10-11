import { z } from "zod";

/** Máximo de integrantes por equipo al registrarlos en admin */
export const MAX_TEAM_MEMBERS = 30;

export const sessionCodeSchema = z
  .string()
  .min(3)
  .max(12)
  .regex(/^[A-Za-z0-9]+$/, "Solo letras y números");

export const createSessionSchema = z.object({
  code: sessionCodeSchema,
});

export const teamInputSchema = z.object({
  nombre: z.string().min(1).max(80),
  miembros: z
    .array(z.string().min(1).max(80))
    .min(1)
    .max(MAX_TEAM_MEMBERS),
  ordenTurno: z.number().int().min(0),
});

export const judgeInputSchema = z.object({
  label: z.string().min(1).max(10),
  pin: z.string().min(4).max(12),
});

export const judgePinSchema = z.object({
  code: sessionCodeSchema,
  pin: z.string().min(4).max(12),
});

export const scoreSubmitSchema = z.object({
  attemptId: z.string().min(1),
  judgeId: z.string().min(1),
  points: z.number().int().min(0),
});
