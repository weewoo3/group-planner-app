import { useState } from "react";
import {
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Paper,
    Typography,
    Alert,
} from "@mui/material";
import { EmojiEvents, CheckCircle } from "@mui/icons-material";
import { finalizeGroup } from "@/features/groups/api/finalize-group";
import axios from "axios";

interface AdminControlsProps {
    groupId: string;
    groupStatus: string;
    selectedActivityId: string | null;
    selectedActivityTitle: string | null;
    onFinalized: () => void;
    isLoading?: boolean;
}

const AdminControls = ({
    groupId,
    groupStatus,
    selectedActivityId,
    selectedActivityTitle,
    onFinalized,
    isLoading = false,
}: AdminControlsProps) => {
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [internalLoading, setInternalLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Combine internal and external loading states
    const isProcessing = internalLoading || isLoading;

    const handleFinalizeClick = () => {
        if (!selectedActivityId) {
            setError("Please select an activity to finalize");
            return;
        }
        setConfirmDialogOpen(true);
    };

    const handleConfirmFinalize = async () => {
        if (!selectedActivityId) return;

        try {
            setInternalLoading(true);
            setError(null);
            await finalizeGroup(groupId, selectedActivityId);
            setConfirmDialogOpen(false);
            onFinalized();
            // Refresh the page to show updated state
            window.location.reload();
        } catch (err: unknown) {
            let message = "Failed to finalize group.";
            if (axios.isAxiosError(err) && err.response?.data?.message) {
                message = err.response.data.message;
            }
            setError(message);
        } finally {
            setInternalLoading(false);
        }
    };

    const handleCancelFinalize = () => {
        setConfirmDialogOpen(false);
        setError(null);
    };

    // Don't show admin controls if already finalized
    if (groupStatus.toUpperCase() === "FINALIZED") {
        return (
            <Paper sx={{ p: 2, bgcolor: "success.light", borderRadius: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <CheckCircle color="success" />
                    <Typography variant="h6" color="success.dark">
                        Group Finalized
                    </Typography>
                </Box>
                <Typography variant="body2" color="success.dark" sx={{ mt: 1 }}>
                    This group has been finalized. No further changes can be made.
                </Typography>
            </Paper>
        );
    }

    return (
        <>
            <Paper sx={{ p: 2, bgcolor: "primary.light", borderRadius: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                    <EmojiEvents color="primary" />
                    <Typography variant="h6" color="primary.dark">
                        Admin Controls
                    </Typography>
                </Box>

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                {!selectedActivityId && (
                    <Alert severity="info" sx={{ mb: 2 }} tabIndex={-1}>
                        Select an activity from the list above by clicking on it, then finalize your selection.
                    </Alert>
                )}

                {selectedActivityId && (
                    <Alert severity="success" sx={{ mb: 2 }} tabIndex={-1}>
                        Selected: <strong>{selectedActivityTitle}</strong>
                    </Alert>
                )}

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    As the group creator, you can finalize the selection. This will:
                </Typography>
                <Box component="ul" sx={{ pl: 2, mb: 2 }}>
                    <Typography component="li" variant="body2" color="text.secondary">
                        Mark the selected activity as the winner
                    </Typography>
                    <Typography component="li" variant="body2" color="text.secondary">
                        Lock the group (no more voting or changes)
                    </Typography>
                    <Typography component="li" variant="body2" color="text.secondary">
                        Notify all members of the final decision
                    </Typography>
                </Box>

                <Button
                    variant="contained"
                    color="primary"
                    fullWidth
                    size="large"
                    onClick={handleFinalizeClick}
                    disabled={!selectedActivityId || isProcessing}
                    startIcon={isProcessing ? <CircularProgress size={20} color="inherit" /> : <EmojiEvents />}
                >
                    {isProcessing ? "Processing..." : "Finalize Selection"}
                </Button>
            </Paper>

            {/* Confirmation Dialog */}
            <Dialog
                open={confirmDialogOpen}
                onClose={handleCancelFinalize}
                aria-labelledby="finalize-dialog-title"
            >
                <DialogTitle id="finalize-dialog-title">
                    Confirm Finalization
                </DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to finalize this group with{" "}
                        <strong>{selectedActivityTitle}</strong> as the winner?
                    </DialogContentText>
                    <DialogContentText sx={{ mt: 2 }}>
                        This action cannot be undone. The group will be locked and no further
                        changes will be allowed.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCancelFinalize} disabled={isProcessing}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirmFinalize}
                        variant="contained"
                        color="primary"
                        disabled={isProcessing}
                        autoFocus
                    >
                        {isProcessing ? "Finalizing..." : "Confirm"}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default AdminControls;
