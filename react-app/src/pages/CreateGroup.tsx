import { useState } from "react";
import { Alert, Box, Button, Paper, Container, TextField, Typography } from "@mui/material";
import { createGroup } from "@/features/groups/api/create-group";
import axios from "axios";
import CreateGroupSuccess from "@/features/groups/components/CreateGroupSuccess";

interface FormErrors {
    name?: string;
}

const CreateGroup = () => {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [errors, setErrors] = useState<FormErrors>({});
    const [apiError, setApiError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [groupCreated, setGroupCreated] = useState(false);
    const [inviteCode, setInviteCode] = useState<string | null>(null);
    const [groupUrl, setGroupUrl] = useState<string | null>(null);

    const validate = () => {
        const nextErrors: FormErrors = {};
        const trimmedName = name.trim();

        if (!trimmedName) nextErrors.name = "Group name is required.";
        else if (trimmedName.length < 3)
            nextErrors.name = "Group name must be at least 3 characters.";

        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const handleSubmit = async (event: React.SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();
        setApiError(null);

        if (!validate()) return;

        try {
            setLoading(true);

            const response = await createGroup(name.trim(), description.trim() || undefined);
            setInviteCode(response.data.group.inviteCode)
            setGroupUrl(`/groups/${response.data.group.id}`)

            setGroupCreated(true);
            setName("");
            setDescription("");
            setErrors({});
        } catch (error: unknown) {
            let message = "Failed to create group. Please try again.";

            if (axios.isAxiosError(error) && error.response?.data?.message) {
                message = error.response.data.message;
            }

            setApiError(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {!groupCreated ? (
                <>
                    {/* Create Form */}
                    <Container maxWidth="sm" sx={{ py: 4 }}>
                        <Paper elevation={5} sx={{ p: 3, borderRadius: 2 }}>
                            <Typography variant="h4" sx={{ mb: 3 }}>
                                Create Group
                            </Typography>

                            <Box
                                component="form"
                                onSubmit={handleSubmit}
                                sx={{ display: "flex", flexDirection: "column", gap: 2 }}
                            >
                                <TextField
                                    label="Group Name"
                                    value={name}
                                    onChange={(event) => setName(event.target.value)}
                                    error={Boolean(errors.name)}
                                    helperText={errors.name}
                                    required
                                    fullWidth
                                />

                                <TextField
                                    label="Description"
                                    value={description}
                                    onChange={(event) => setDescription(event.target.value)}
                                    multiline
                                    minRows={3}
                                    fullWidth
                                />

                                <Button type="submit" variant="contained" disabled={loading}>
                                    {loading ? "Creating..." : "Create Group"}
                                </Button>
                            </Box>

                            {apiError && <Alert severity="error">{apiError}</Alert>}
                        </Paper>
                    </Container>
                </>
            ) : (
                <>
                    {/* Success Message */}
                    <CreateGroupSuccess inviteCode={inviteCode!} groupUrl={groupUrl!} />
                </>
            )}
        </>
    );
};

export default CreateGroup;
