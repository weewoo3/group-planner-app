import { Request, Response, NextFunction } from "express";
import { Group } from "@prisma/client";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "./errorHandler";
import prisma from "../config/database";

// Extend Express Request to include the resolved group (set by isGroupMember)
declare global {
    namespace Express {
        interface Request {
            group?: Group;
        }
    }
}

/**
 * Middleware to verify the authenticated user is a member of the requested group.
 * Fetches the group and attaches it to req.group for downstream handlers.
 *
 * Always returns 403 on any failure — including missing group — to avoid leaking
 * whether a given group ID exists at all.
 *
 * Usage: router.get('/:id', protect, isGroupMember, handler)
 */
export const isGroupMember = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const groupId = req.params.id as string;
    const userId = req.user!.id;

    const group = await prisma.group.findUnique({ where: { id: groupId } });

    if (!group) {
        throw new AppError("You are not a member of this group", 403);
    }

    const membership = await prisma.membership.findUnique({
        where: { userId_groupId: { userId, groupId } },
    });

    if (!membership) {
        throw new AppError("You are not a member of this group", 403);
    }

    req.group = group;
    next();
});

/**
 * Middleware to verify the authenticated user is the creator of req.group.
 * Must always be chained after isGroupMember (relies on req.group being set).
 *
 * Usage: router.put('/:id', protect, isGroupMember, isGroupCreator, handler)
 */
export const isGroupCreator = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    if (req.group!.creatorId !== req.user!.id) {
        throw new AppError("Only the group creator can perform this action", 403);
    }

    next();
});

/**
 * Middleware to prevent modifications to a finalized group.
 * Must be chained after isGroupMember (relies on req.group being set).
 * 
 * Blocks the following operations when status = "Finalized":
 * - Creating activities
 * - Voting on activities
 * - Updating activities
 * - Deleting activities
 * 
 * Read operations (GET) are still allowed.
 * 
 * Usage: router.post('/:id/activities', protect, isGroupMember, preventFinalizedModifications, handler)
 */
export const preventFinalizedModifications = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    if (req.group!.status.toUpperCase() === "FINALIZED") {
        throw new AppError("Cannot modify a finalized group", 400);
    }

    next();
});
