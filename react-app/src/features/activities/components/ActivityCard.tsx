import { Card, CardContent, Typography, Divider, Tooltip, IconButton, Box } from "@mui/material";
import { formatDate } from "@/utils/formatDate";
import type { Activity } from "@/types/models";
import { ThumbUp } from "@mui/icons-material";
import { useState } from "react";

interface ActivityCardProps {
    activity: Activity;
    onVote?: (activityId: string, currentlyVoted: boolean) => void;
    isVoted?: boolean;
    disabled?: boolean;
}

const ActivityCard = ({
    activity,
    onVote,
    isVoted = false,
    disabled = false,
}: ActivityCardProps) => {
    const [expanded, setExpanded] = useState(false);

    const maxLength = 60;
    const isLong = (activity.description?.length ?? 0) > maxLength;
    const description = expanded
        ? activity.description
        : activity.description && activity.description.slice(0, maxLength).trim();
    return (
        <Card elevation={0} sx={{ width: "100%" }}>
            {/* Top Content */}
            <CardContent
                sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    p: 0,
                    "&:last-child": { pb: 0 },
                }}
            >
                <div>
                    {/* Title */}
                    <Typography variant="subtitle1">{activity.title}</Typography>

                    {/* Proposed time */}
                    <Typography variant="body2" color="text.secondary">
                        {formatDate(activity.proposedTime)}
                    </Typography>
                </div>
            </CardContent>

            <Divider sx={{ borderBottomWidth: 2.5, my: 1, bgcolor: "background.default" }} />

            {/* Bottom Content */}
            <CardContent sx={{ p: 0, m: 0, position: "relative", "&:last-child": { pb: 0 } }}>
                {/* Description */}
                {activity.description && (
                    <Typography variant="body2" color="text.secondary">
                        {description}
                        {isLong && !expanded && "..."}
                        {isLong && (
                            <Typography
                                variant="inherit"
                                component="span"
                                onClick={() => setExpanded((prev) => !prev)}
                                sx={{
                                    color: "primary.main",
                                    cursor: "pointer",
                                }}
                            >
                                {expanded ? " Show less" : " Read more"}
                            </Typography>
                        )}
                    </Typography>
                )}
                
                <Box sx={{ 
                        display: "flex", 
                        flexDirection: "row", 
                        justifyContent: "space-between", 
                        alignItems: "center",
                        gap: 3,
                    }}
                >
                    {/* Vote Count */}
                    <Typography
                        variant="caption"
                        sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                    >
                        <Tooltip
                            title={
                                disabled
                                    ? "Voting closed"
                                    : isVoted
                                    ? "Remove vote"
                                    : "Vote for this activity"
                            }
                            arrow
                        >
                            <span>
                                <IconButton
                                    size="small"
                                    disabled={disabled}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onVote?.(activity.id, isVoted);
                                    }}
                                    sx={{ p: 0.25 }}
                                >
                                    <ThumbUp
                                        fontSize="small"
                                        sx={{
                                            color:
                                                isVoted && !disabled ? "success.main" : "text.disabled",
                                        }}
                                    />
                                </IconButton>
                            </span>
                        </Tooltip>
                        {activity._count.votes}
                    </Typography>

                    {/* Proposed by */}
                    <Tooltip title={`proposed by ${activity.user.name}`} arrow>
                        <Typography
                            variant="caption"
                            sx={{
                                color: "info.main",
                                fontStyle: "italic",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                cursor: "default",
                                px: 0.1,
                            }}
                        >
                            by {activity.user.name}
                        </Typography>
                    </Tooltip>
                </Box>
            </CardContent>
        </Card>
    );
};

export default ActivityCard;
