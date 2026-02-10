import { z } from "zod";

import { ConfigSchema } from "./config-schema";

const StatusSchema = z
  .object({
    ap: z.object({ running: z.boolean() }).strict(),
    usb: z.object({ active: z.boolean() }).strict(),
    updatedAt: z.string().datetime(),
  })
  .strict();

const DaemonStatusRequestSchema = z.object({ type: z.literal("status") }).strict();
const DaemonApplyConfigRequestSchema = z
  .object({
    type: z.literal("apply-config"),
    config: ConfigSchema,
  })
  .strict();
const DaemonSystemRequestSchema = z
  .object({
    type: z.literal("system"),
    action: z.enum(["reboot", "shutdown"]),
  })
  .strict();

export const DaemonRequestSchema = z.discriminatedUnion("type", [
  DaemonStatusRequestSchema,
  DaemonApplyConfigRequestSchema,
  DaemonSystemRequestSchema,
]);

const DaemonStatusResponseSchema = z
  .object({
    type: z.literal("status"),
    status: StatusSchema,
  })
  .strict();

const DaemonAppliedResponseSchema = z
  .object({
    type: z.literal("applied"),
    status: StatusSchema,
  })
  .strict();

const DaemonSystemResponseSchema = z
  .object({
    type: z.literal("system"),
    accepted: z.boolean(),
    status: StatusSchema,
  })
  .strict();

const DaemonErrorResponseSchema = z
  .object({
    type: z.literal("error"),
    message: z.string().min(1),
  })
  .strict();

export const DaemonResponseSchema = z.discriminatedUnion("type", [
  DaemonStatusResponseSchema,
  DaemonAppliedResponseSchema,
  DaemonSystemResponseSchema,
  DaemonErrorResponseSchema,
]);

export type DaemonRequest = z.infer<typeof DaemonRequestSchema>;
export type DaemonResponse = z.infer<typeof DaemonResponseSchema>;
export type DaemonStatus = z.infer<typeof StatusSchema>;
