import { useEffect, useState } from "react";
import { Hiking } from "@mui/icons-material";
import {
    Alert,
    Avatar,
    CircularProgress,
    List,
    ListItem,
    ListItemAvatar,
    Typography,
} from "@mui/material";
import axios from "axios";
import { getAllActivities } from "@/features/activities/api/get-all-activities";
import type { Activity } from "@/types/models";
import ActivityCard from "./ActivityCard";
import { addVote, removeVote } from "@/features/activities/api/vote-activity";

interface ActivitiesListProps {
    groupId: string;
    onActivitySelect?: (activityId: string, activityTitle: string) => void;
    selectedActivityId?: string | null;
    onGroupStatusChange?: (status: string) => void;
}

const ActivitiesList = ({
    groupId,
    onActivitySelect,
    selectedActivityId,
    onGroupStatusChange,
}: ActivitiesListProps) => {
    const [activities, setActivities] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [groupStatus, setGroupStatus] = useState<string>("");

    useEffect(() => {
        const loadActivities = async (groupId: string) => {
            try {
                setLoading(true);
                setError(null);

                const res = await getAllActivities(groupId);
                const status = (res.data as any).groupStatus;

                const activities = res.data.activities.map((a: any) => ({
                    ...a,
                    hasVoted: Array.isArray(a.votes) && a.votes.length > 0,
                }));

                setActivities(activities);
                setGroupStatus(status);

                if (onGroupStatusChange && status) {
                    onGroupStatusChange(status);
                }
            } catch (err: unknown) {
                let message = "Failed to fetch activities.";

                if (axios.isAxiosError(err) && err.response?.data?.message) {
                    message = err.response.data.message;
                }

                setError(message);
            } finally {
                setLoading(false);
            }
        };

        loadActivities(groupId);
    }, [groupId, onGroupStatusChange]);

    const handleVote = async (activityId: string, currentlyVoted: boolean) => {
        // Prevent voting if the group is finalized
        if (groupStatus.toUpperCase() === "FINALIZED") return;

        setActivities((prev) =>
            prev.map((a) =>
                a.id === activityId
                    ? {
                          ...a,
                          hasVoted: !currentlyVoted,
                          _count: {
                              ...a._count,
                              votes: currentlyVoted
                                  ? Math.max(0, a._count.votes - 1)
                                  : a._count.votes + 1,
                          },
                      }
                    : a,
            ),
        );

        try {
            if (currentlyVoted) {
                await removeVote(groupId, activityId);
            } else {
                await addVote(groupId, activityId);
            }
        } catch {
            setActivities((prev) =>
                prev.map((a) =>
                    a.id === activityId
                        ? {
                              ...a,
                              hasVoted: currentlyVoted,
                              _count: {
                                  ...a._count,
                                  votes: currentlyVoted
                                      ? a._count.votes + 1
                                      : Math.max(0, a._count.votes - 1),
                              },
                          }
                        : a,
                ),
            );
        }
    };

    return (
        <>
            {loading && <CircularProgress size={24} />}
            {error && <Alert severity="error">{error}</Alert>}

            {!loading && !error && activities.length === 0 && (
                <Typography color="text.secondary">This group has no proposals yet...</Typography>
            )}

            {!loading && !error && activities.length > 0 && (
                <List
                    sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                        alignItems: "center",
                    }}
                >
                    {activities.map((activity) => {
                        const isWinner = activity.isWinner === true;
                        const isSelected = selectedActivityId === activity.id;

                        return (
                            <ListItem
                                key={activity.id}
                                onClick={() => onActivitySelect?.(activity.id, activity.title)}
                                sx={{
                                    bgcolor: "background.paper",
                                    borderRadius: 2,
                                    py: 2,
                                    width: "100%",
                                    boxShadow: 3,
                                    cursor: onActivitySelect ? "pointer" : "default",
                                    border: isSelected ? 3 : 0,
                                    borderColor: "primary.main",
                                    transition: "all 0.2s",
                                    position: "relative",
                                    overflow: "hidden",
                                    "&:hover": onActivitySelect
                                        ? {
                                              boxShadow: 6,
                                              transform: "scale(1.01)",
                                          }
                                        : {},
                                }}
                            >
                                <ListItemAvatar>
                                    <Avatar sx={{ bgcolor: "primary.main" }}>
                                        <Hiking />
                                    </Avatar>
                                </ListItemAvatar>
                                <ActivityCard
                                    activity={activity}
                                    onVote={handleVote}
                                    isVoted={activity.hasVoted === true}
                                    disabled={groupStatus.toUpperCase() === "FINALIZED"}
                                />
                                {isWinner && (
                                    <Typography
                                        component="div"
                                        sx={{
                                            position: "absolute",
                                            top: 12,
                                            right: -32,
                                            bgcolor: "warning.main",
                                            color: "warning.contrastText",
                                            px: 5,
                                            py: 0.5,
                                            fontWeight: "bold",
                                            fontSize: "0.7rem",
                                            transform: "rotate(45deg)",
                                            boxShadow: 2,
                                            zIndex: 1,
                                            width: 140,
                                            textAlign: "center",
                                        }}
                                    >
                                        🏆 SELECTED
                                    </Typography>
                                )}
                            </ListItem>
                        );
                    })}
                </List>
            )}
        </>
    );
};

export default ActivitiesList;
