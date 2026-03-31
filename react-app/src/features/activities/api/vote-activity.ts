import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";

type VoteData = {
    voteCount: number;
    hasVoted: boolean;
};

export const addVote = (groupId: string, activityId: string): Promise<ApiResponse<VoteData>> => {
    return api.post(`/groups/${groupId}/activities/${activityId}/vote`);
};

export const removeVote = (groupId: string, activityId: string): Promise<ApiResponse<VoteData>> => {
    return api.delete(`/groups/${groupId}/activities/${activityId}/vote`);
};
