import FeedbackSnackbar from "@/components/FeedbackSnackbar";
import { Check, ContentCopy } from "@mui/icons-material";
import { Box, Button, Container, IconButton, InputAdornment, Paper, TextField, Typography } from "@mui/material";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface CreateGroupSuccessProps {
    inviteCode: string;
    groupUrl: string;
}

const CreateGroupSuccess = ({ inviteCode, groupUrl }: CreateGroupSuccessProps) => {
    const navigate = useNavigate();
    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
    }>({
        open: false,
        message: "",
    });

    const handleCopy = async (text: string, type: "code" | "link") => {
        try {
            await navigator.clipboard.writeText(text);
            setSnackbar({
                open: true,
                message: type === "code" ? "Invite code copied!" : "Invite link copied!",
            });
        } catch (err) {
            console.error("Failed to copy:", err);
            setSnackbar({
                open: true,
                message: "Failed to copy. Please try again.",
            });
        }
    };
    
    return (
        <Container maxWidth="xs" sx={{ py: 4 }}>
            <Paper 
                elevation={5}
                sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    p: 3,
                    borderRadius: 2,
                    gap: 2,
                }}
            >
                {/* Check Icon */}
                <Box
                    sx={{
                        width: 60,
                        height: 60,
                        borderRadius: 10,
                        backgroundColor: "success.light",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <Check color="success" sx={{ fontSize: 38 }} />
                </Box>

                {/* Title */}
                <Typography variant="h4">
                    Group Created
                </Typography>

                {/* Invite Code */}
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1, width: "100%" }}>
                    <Typography sx={{ textAlign: "center" }}>
                        Share this code with your friends!
                    </Typography>
                    <TextField
                        fullWidth
                        value={inviteCode}
                        slotProps={{
                            input: {
                                readOnly: true,
                                sx: {
                                    fontSize: "1.1rem",
                                    letterSpacing: 6,
                                    fontWeight: 600,
                                },
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            onClick={() => handleCopy(inviteCode, "code")}
                                            edge="end"
                                            aria-label="copy invite code"
                                        >
                                            <ContentCopy />
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            },
                        }}
                        sx={{
                            "& .MuiOutlinedInput-root": {
                                borderRadius: 3,
                            },
                            "& input": {
                                textAlign: "center",
                            },
                        }}
                    />
                </Box>

                {/* Action Buttons */}
                <Box sx={{ 
                    display: "flex", 
                    flexDirection: { xs: "column-reverse", sm: "row" },
                    justifyContent: "space-between",
                    width: "100%",
                    gap: 1,
                    mt: 1,
                }}>
                    <Button
                        onClick={() => navigate("/home")}
                        variant="outlined"
                        fullWidth
                        sx={{ textTransform: "none" }}
                    >
                        Back home
                    </Button>
                    <Button
                        onClick={() => navigate(groupUrl)}
                        variant="contained"
                        fullWidth
                        sx={{ textTransform: "none" }}
                    >
                        Go to group
                    </Button>
                </Box>
                
            </Paper>

            {/* Snackbar for copy feedback */}
            <FeedbackSnackbar
                open={snackbar.open}
                message={snackbar.message}
                severity="success"
                autoHideDuration={3000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
            />
        </Container>
    );
};

export default CreateGroupSuccess;
