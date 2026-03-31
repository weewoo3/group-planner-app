import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    Alert,
    Avatar,
    Box,
    Button,
    CircularProgress,
    Container,
    IconButton,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    Paper,
    Typography,
} from "@mui/material";
import { Add, ShareOutlined } from "@mui/icons-material";
import { getGroupDetails } from "@/features/groups/api/group-details";
import type { GroupDetailsData } from "@/features/groups/api/group-details";
import ShareInviteDialog from "@/features/groups/components/ShareInviteDialog";
import AdminControls from "@/features/groups/components/AdminControls";
import axios from "axios";
import ActivitiesList from "@/features/activities/components/ActivitiesList";
import { useAuth } from "@/providers/AuthProvider";
import CreateActivityDialog from "@/features/activities/components/CreateActivityDialog";

const GroupDetails = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [group, setGroup] = useState<GroupDetailsData["group"] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [shareDialogOpen, setShareDialogOpen] = useState(false);
    const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
    const [selectedActivityTitle, setSelectedActivityTitle] = useState<string | null>(null);
    const [groupStatus, setGroupStatus] = useState<string>("WIP");
    const [finalizationLoading, setFinalizationLoading] = useState(false);
    const [createActivityOpen, setCreateActivityOpen] = useState(false);

    const loadGroupDetails = async (groupId: string) => {
        try {
            setLoading(true);
            setError(null);
            const res = await getGroupDetails(groupId);
            setGroup(res.data.group);
        } catch (err: unknown) {
            let message = "Failed to load group details.";

            if (axios.isAxiosError(err) && err.response?.data?.message) {
                message = err.response.data.message;
            }

            setError(message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!id) {
            setError("Missing group id.");
            setLoading(false);
            return;
        }
        void loadGroupDetails(id);
    }, [id]);

    const handleActivitySelect = useCallback((activityId: string, activityTitle: string) => {
        // Only allow selection if user is creator and group not finalized
        if (user && group && user.id === group.creatorId && groupStatus.toUpperCase() !== "FINALIZED") {
            setSelectedActivityId(activityId);
            setSelectedActivityTitle(activityTitle);
        }
    }, [user, group, groupStatus]);

    const handleGroupStatusChange = useCallback((status: string) => {
        setGroupStatus(status);
    }, []);

    const handleFinalized = useCallback(async () => {
        // Reload group details after finalization
        if (!id) return;

        setFinalizationLoading(true);

        try {
            const res = await getGroupDetails(id);
            setGroup(res.data.group);
            setGroupStatus(res.data.group.status || "WIP");
            setSelectedActivityId(null);
            setSelectedActivityTitle(null);
        } catch (err) {
            console.error("Failed to reload group after finalization", err);
        } finally {
            setFinalizationLoading(false);
        }
    }, [id]);

    const isCreator = user && group && user.id === group.creatorId;

    if (loading) {
        return (
            <Container maxWidth="md" sx={{ py: 4, textAlign: "center" }}>
                <CircularProgress />
            </Container>
        );
    }

    if (error) {
        return (
            <Container maxWidth="md" sx={{ py: 4 }}>
                <Alert severity="error">{error}</Alert>
            </Container>
        );
    }

    if (!group) return null;

    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            <Box
                sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 1,
                }}
            >
                <Typography variant="h4">{group.name}</Typography>
                <IconButton
                    onClick={() => setShareDialogOpen(true)}
                    aria-label="share invite"
                    color="primary"
                >
                    <ShareOutlined />
                </IconButton>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Created on {new Date(group.createdAt).toLocaleDateString()}
            </Typography>

            {/* Proposed Activities List */}
            <Paper
                sx={{
                    display: "flex",
                    flexDirection: "column",
                    p: 2,
                    mb: 3,
                }}
            >
                <Box sx={{ display: "flex", mb: 1 }}>
                    <Typography variant="h6" sx={{ flex: 1 }}>
                        Proposed Activities
                    </Typography>
                    {/** Only show "Add Activity" button if user is a member and group not finalized */}
                    {groupStatus.toUpperCase() !== "FINALIZED" && (
                        <Button
                            variant="contained"
                            onClick={() => setCreateActivityOpen(true)}
                            startIcon={<Add sx={{ width: 22, height: 22 }} />}
                            size="small"
                            sx={{
                                "& .MuiButton-startIcon": { margin: 0 },
                                minWidth: 0,
                                minHeight: 0,
                                width: 40,
                                height: 40,
                            }}
                        />
                    )}
                </Box>
                <ActivitiesList
                    groupId={group.id}
                    onActivitySelect={isCreator && !finalizationLoading ? handleActivitySelect : undefined}
                    selectedActivityId={selectedActivityId}
                    onGroupStatusChange={handleGroupStatusChange}
                />
            </Paper>

            {/* Admin Controls - Only visible to creator */}
            {isCreator && (
                <Paper
                    sx={{
                        p: 0,
                        mb: 3,
                        '& *:focus': {
                            scrollMargin: 0,
                            outline: 'none',
                        }
                    }}
                    tabIndex={-1}
                >
                    <AdminControls
                        groupId={group.id}
                        groupStatus={groupStatus}
                        selectedActivityId={selectedActivityId}
                        selectedActivityTitle={selectedActivityTitle}
                        onFinalized={handleFinalized}
                        isLoading={finalizationLoading}
                    />
                </Paper>
            )}

            {/* Members List */}
            <Paper sx={{ p: 2 }}>
                <Typography variant="h6" sx={{ mb: 1 }}>
                    Members ({group.memberships.length})
                </Typography>
                <List>
                    {group.memberships.map((membership) => (
                        <ListItem key={membership.userId}>
                            <ListItemAvatar>
                                <Avatar src={membership.user.avatar ?? undefined}>
                                    {membership.user.name?.[0] ?? "U"}
                                </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                                primary={membership.user.name ?? membership.user.email}
                                secondary={`${membership.user.email} • ${membership.role ?? "Member"}`}
                            />
                        </ListItem>
                    ))}
                </List>
            </Paper>
            <Button variant="contained" onClick={() => navigate("/home")} sx={{ my: 2, mb: 2 }}>
                Back to Groups
            </Button>

            {/* Share Invite Dialog */}
            <ShareInviteDialog
                open={shareDialogOpen}
                onClose={() => setShareDialogOpen(false)}
                inviteCode={group.inviteCode}
            />

            {/* Create Activity Dialog */}
            <CreateActivityDialog
                open={createActivityOpen}
                onClose={() => setCreateActivityOpen(false)}
                groupId={group.id}
                loadGroupDetails={loadGroupDetails}
            />
        </Container>
    );
};

export default GroupDetails;
