import crypto from "crypto";
import prisma from "../config/database";
import { AppError } from "../middlewares/errorHandler";

/**
 * Generates a unique 6-character uppercase hex invite code.
 */
function generateInviteCode(): string {
    return crypto.randomBytes(3).toString("hex").toUpperCase();
}

export class GroupService {
    /**
     * Create a new group and immediately enrol the creator as an Admin member, 2 actions in 1.
     * Both writes are wrapped in a transaction — if either fails, both roll back.
     * @param creatorId - ID of the authenticated user creating the group
     * @param data - Group name and optional description
     */
    async createGroup(creatorId: string, data: { name: string; description?: string }) {
        // Retry up to 5 times to guarantee a collision-free invite code before entering the transaction.
        let inviteCode = "";
        for (let attempt = 0; attempt < 5; attempt++) {
            const candidate = generateInviteCode();
            const taken = await prisma.group.findUnique({ where: { inviteCode: candidate } });
            if (!taken) {
                inviteCode = candidate;
                break;
            }
        }

        if (!inviteCode) {
            throw new AppError("Failed to generate a unique invite code. Please try again.", 500);
        }

        return prisma.$transaction(async (tx) => {
            const group = await tx.group.create({
                data: {
                    name: data.name,
                    description: data.description,
                    inviteCode,
                    creatorId,
                },
            });

            await tx.membership.create({
                data: {
                    userId: creatorId,
                    groupId: group.id,
                    role: "Admin",
                },
            });

            return group;
        });
    }

    /**
     * Return all groups the user is a member of, along with their role in each.
     * @param userId - ID of the authenticated user
     */
    async getMyGroups(userId: string) {
        const memberships = await prisma.membership.findMany({
            where: { userId },
            include: {
                group: {
                    include: {
                        _count: {
                            select: { memberships: true },
                        },
                    },
                },
            },
        });

        return memberships.map(({ role, group }) => {
            const { _count, ...groupData } = group;
            return {
                ...groupData,
                role,
                memberCount: _count?.memberships ?? 0,
            };
        });
    }

    /**
     * Return full group details (members list + creator) — only if the requester
     * is already a member of the group.
     * @param groupId - ID of the group to fetch
     * @param userId - ID of the authenticated user (for membership check)
     */
    async getGroupById(groupId: string, userId: string) {
        const membership = await prisma.membership.findUnique({
            where: { userId_groupId: { userId, groupId } },
        });

        if (!membership) {
            throw new AppError("You are not a member of this group", 403);
        }

        const group = await prisma.group.findUnique({
            where: { id: groupId },
            include: {
                creator: {
                    select: { id: true, name: true, email: true, avatar: true },
                },
                memberships: {
                    include: {
                        user: {
                            select: { id: true, name: true, email: true, avatar: true },
                        },
                    },
                },
            },
        });

        if (!group) {
            throw new AppError("Group not found", 404);
        }

        return group;
    }

    /**
     * Update a group's name and/or description.
     * Authorization (creator check) is handled by middleware before this is called.
     * @param groupId - ID of the group to update
     * @param data - Fields to update
     */
    async updateGroup(groupId: string, data: { name?: string; description?: string | null }) {
        return prisma.group.update({
            where: { id: groupId },
            data: {
                ...(data.name !== undefined && { name: data.name }),
                ...(data.description !== undefined && { description: data.description }),
            },
        });
    }

    /**
     * Delete a group. Cascade rules in the DB handle memberships automatically.
     * Authorization (creator check) is handled by middleware before this is called.
     * @param groupId - ID of the group to delete
     */
    async deleteGroup(groupId: string): Promise<void> {
        await prisma.group.delete({ where: { id: groupId } });
    }

    /**
     * Add a user to a group after verifying the invite code matches.
     * @param userId - ID of the user joining
     * @param inviteCode - Invite code provided by the user, invite code is the sole group identifier
     */
    async joinGroup(userId: string, inviteCode: string) {
        const group = await prisma.group.findUnique({ where: { inviteCode } });

        if (!group) {
            throw new AppError("Invalid invite code", 400);
        }

        const existing = await prisma.membership.findUnique({
            where: { userId_groupId: { userId, groupId: group.id } },
        });

        if (existing) {
            throw new AppError("You are already a member of this group", 400);
        }

        return prisma.membership.create({
            data: { userId, groupId: group.id, role: "Member" },
        });
    }

    /**
     * Remove a user from a group. The creator cannot leave their own group.
     * @param groupId - ID of the group to leave
     * @param userId - ID of the user leaving
     */
    async unjoinGroup(groupId: string, userId: string): Promise<void> {
        const group = await prisma.group.findUnique({ where: { id: groupId } });

        if (!group) {
            throw new AppError("Group not found", 404);
        }

        if (group.creatorId === userId) {
            throw new AppError("The creator cannot leave the group", 400);
        }

        const membership = await prisma.membership.findUnique({
            where: { userId_groupId: { userId, groupId } },
        });

        if (!membership) {
            throw new AppError("You are not a member of this group", 400);
        }

        await prisma.membership.delete({
            where: { userId_groupId: { userId, groupId } },
        });
    }

    /**
     * Finalize a group by selecting a winner activity and updating group status.
     * This combines two operations: setting the winner and finalizing the group.
     * @param groupId - ID of the group to finalize
     * @param activityId - ID of the activity to mark as winner
     * @returns Updated group with status "FINALIZED"
     */
    async finalizeGroup(groupId: string, activityId: string) {
        return prisma.$transaction(async (tx) => {
            // Verify the activity exists and belongs to this group
            const activity = await tx.activity.findUnique({
                where: { id: activityId },
            });

            if (!activity) {
                throw new AppError("Activity not found", 404);
            }

            if (activity.groupId !== groupId) {
                throw new AppError("Activity does not belong to this group", 400);
            }

            // Verify the group exists and is not already finalized
            const group = await tx.group.findUnique({
                where: { id: groupId },
            });

            if (!group) {
                throw new AppError("Group not found", 404);
            }

            if (group.status.toUpperCase() === "FINALIZED") {
                throw new AppError("Group is already finalized", 400);
            }

            // Reset all activities' isWinner to false in this group
            await tx.activity.updateMany({
                where: { groupId, isWinner: true },
                data: { isWinner: false },
            });

            // Set the specified activity as winner
            await tx.activity.update({
                where: { id: activityId },
                data: { isWinner: true },
            });

            // Update group status to Finalized
            return tx.group.update({
                where: { id: groupId },
                data: { status: "FINALIZED" },
            });
        });
    }
}

export default new GroupService();
