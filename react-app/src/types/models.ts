export type User = {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
    createdAt: string;
    updatedAt: string;
};

export type Group = {
    id: string;
    name: string;
    description?: string | null;
    inviteCode: string;
    creatorId: string;
    status?: string;
    createdAt: string;
};

export type Membership = {
    userId: string;
    groupId: string;
    role?: string;
    user?: User;
    group?: Group;
};

export type Activity = {
    id: string;
    groupId: string;
    userId: string;
    title: string;
    description?: string;
    proposedTime: string;
    isWinner: boolean;
    createdAt: string;
    hasVoted?: boolean;
    _count: {
        votes: number;
    };
    user: User;
};
