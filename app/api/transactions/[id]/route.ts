import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { deleteTransaction } from "@/lib/services/transactions";
import type { ApiResponse } from "@/lib/types/api";

const paramsSchema = z.object({
  id: z.string().uuid(),
});

export async function DELETE(_: Request, context: { params: { id: string } }) {
  try {
    const parsed = paramsSchema.safeParse(context.params);

    if (!parsed.success) {
      const payload: ApiResponse<{ deleted: boolean }> = {
        ok: false,
        error: {
          code: "BAD_REQUEST",
          message: "Invalid transaction id",
        },
      };
      return NextResponse.json(payload, { status: 400 });
    }

    const deleted = await deleteTransaction(parsed.data.id);
    const payload: ApiResponse<{ deleted: boolean }> = {
      ok: true,
      data: { deleted },
    };

    return NextResponse.json(payload);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError ||
      error instanceof Prisma.PrismaClientUnknownRequestError
    ) {
      const payload: ApiResponse<{ deleted: boolean }> = {
        ok: false,
        error: {
          code: "DATABASE_ERROR",
          message: "Failed to delete transaction",
        },
      };
      return NextResponse.json(payload, { status: 500 });
    }

    const payload: ApiResponse<{ deleted: boolean }> = {
      ok: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to delete transaction",
      },
    };
    return NextResponse.json(payload, { status: 500 });
  }
}
