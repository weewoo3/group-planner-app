import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from "@mui/material";
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from "@mui/x-date-pickers";
import dayjs, { Dayjs } from "dayjs";
import { useState } from "react";
import { createActivity } from "../api/create-activity";
import axios from "axios";
import FeedbackSnackbar from "@/components/FeedbackSnackbar";

interface CreateActivityDialogProps {
    open: boolean;
    onClose: () => void;
    groupId: string;
    loadGroupDetails: (groupId: string) => Promise<void>;
}

const CreateActivityDialog = ({ open, onClose, groupId, loadGroupDetails }: CreateActivityDialogProps) => {
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState("");
    const [titleError, setTitleError] = useState("");
    const [dateError, setDateError] = useState("");
    const [timeError, setTimeError] = useState("");
    const [dateValue, setDateValue] = useState<Dayjs | null>(null);
    const [timeValue, setTimeValue] = useState<Dayjs | null>(null);
    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
    }>({
        open: false,
        message: "",
    });

    const resetForm = () => {
        setError("");
        setTitleError("");
        setDateError("");
        setTimeError("");
        setDateValue(null);
        setTimeValue(null);
        setLoading(false);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const validateTitle = (title: string) => {
        if (title.length === 0) {
            return true; // Let HTML5 required handle empty
        }
        if (title.length < 3) {
            setTitleError("Title must be at least 3 characters");
            return false;
        } else if (title.length > 60) {
            setTitleError("Title must be under 60 characters");
            return false;
        }
        setTitleError("");
        return true;
    };

    const validateDate = (date: Dayjs | null) => {
        if (!date) {
            return true; // Let required handle empty
        }
        if (!date.isValid()) {
            setDateError("Proposed date is invalid");
            return false;
        } else if (date.isBefore(dayjs(), "day")) {
            setDateError("Proposed date cannot be in the past");
            return false;
        }
        setDateError("");
        return true;
    };

    const validateTime = (time: Dayjs | null, dateValue: Dayjs | null) => {
        if (!time) {
            return true; // Let required handle empty
        }
        if (!time.isValid()) {
            setTimeError("Proposed time is invalid");
            return false;
        }
        // Only check past time if date is today
        if (dateValue && dateValue.isValid() && dateValue.isSame(dayjs(), "day") && time.isBefore(dayjs())) {
            setTimeError("Proposed time cannot be in the past");
            return false;
        }
        setTimeError("");
        return true;
    };

    const validate = (title: string, date: Dayjs, time: Dayjs) => {
        let valid = true;
        // title errors
        if (title.length < 3) {
            setTitleError("Title must be at least 3 characters");
            valid = false;
        } else if (title.length > 60) {
            setTitleError("Title must be under 60 characters")
            valid = false;
        }
        
        // date errors
        if (!date.isValid()) {
            setDateError("Proposed date is invalid");
            valid = false;
        } else if (date.isBefore(dayjs(), "day")) {
            setDateError("Proposed date cannot be in the past");
            valid = false;
        }
        
        // time errors
        if (!time.isValid()) {
            setTimeError("Proposed time is invalid");
            valid = false;
        } else if (date.isSame(dayjs(), "day") && time.isBefore(dayjs())) {
            setTimeError("Proposed time cannot be in the past");
            valid = false;
        }
        
        return valid;
    };

    const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();
        
        // Clear previous errors
        setError("");
        setTitleError("");
        setDateError("");
        setTimeError("");

        // Get form data
        const formData = new FormData(e.currentTarget);

        const title = formData.get("title")?.toString().trim() || "";
        const dateString = formData.get("date")?.toString() || "";
        const timeString = formData.get("time")?.toString() || "";
        const description = formData.get("description")?.toString() || "";

        // Convert date and time to dayjs objects
        const date = dayjs(dateString, "MM/DD/YYYY", true);
        const time = dayjs(timeString, "hh:mm A", true);
        
        // Validate
        if (!validate(title, date, time)) {
            return; // Exit early if validation fails, loading state not affected
        }
        
        // Set loading ONLY after validation passes
        setLoading(true);
        
        // Combine date and time to isostring
        const finalDatetime = date.hour(time.hour()).minute(time.minute());
        const isoString = finalDatetime.toISOString();

        // Create activity API call
        try {
            const res = await createActivity(groupId, title, isoString, description);
            if (!res.success) {
                const message = res.message || "Failed to create activity.";
                setError(message);
                setLoading(false);
                return;
            }
            
            setSnackbar({
                open: true,
                message: "Activity proposal created successfully!"
            });

            // Close dialog after brief delay
            setTimeout(() => {
                handleClose();
                setSnackbar({ open: false, message: "" });
                loadGroupDetails(groupId); // refetch activities
            }, 1500);
        } catch (error) {
            let message = "Failed to create activity. Please try again.";
            
            if (axios.isAxiosError(error) && error.response?.data?.message) {
                message = error.response.data.message;
            }

            setError(message);
            setLoading(false);
        }
    }

    return (
        <Dialog 
            open={open}
            onClose={handleClose}
            fullWidth
            maxWidth="sm"
            slotProps={{
                paper: {
                    sx: {
                        borderRadius: 3,
                        p: 1,
                    },
                },
            }}
        >
            {/* Title */}
            <DialogTitle>Suggest an Activity</DialogTitle>

            {/* Dialog Form */}
            <Box
                component="form"
                onSubmit={handleSubmit}
            >
                <DialogContent>
                    {/* Title */}
                    <TextField
                        label="Title"
                        name="title"
                        fullWidth
                        margin="normal"
                        error={Boolean(titleError)}
                        helperText={titleError}
                        required
                        autoFocus
                        onBlur={(e) => validateTitle(e.target.value)}
                        onChange={() => titleError && setTitleError("")}
                    />

                    {/* Date and Time */}
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <DatePicker
                            label="Date"
                            name="date"
                            value={dateValue}
                            minDate={dayjs()}
                            onChange={(newValue) => {
                                setDateValue(newValue);
                                if (dateError) setDateError("");
                                // Re-validate time when date changes (for past time check)
                                if (timeValue) {
                                    validateTime(timeValue, newValue);
                                }
                            }}
                            onClose={() => validateDate(dateValue)}
                            slotProps={{ 
                                textField: { 
                                    required: true,
                                    fullWidth: true, 
                                    margin: "normal",
                                    error: Boolean(dateError),
                                    helperText: dateError,
                                    onBlur: () => validateDate(dateValue)
                                } 
                            }}
                        />
                        <TimePicker
                            label="Time"
                            name="time"
                            value={timeValue}
                            onChange={(newValue) => {
                                setTimeValue(newValue);
                                if (timeError) setTimeError("");
                            }}
                            onClose={() => validateTime(timeValue, dateValue)}
                            slotProps={{ 
                                textField: { 
                                    required: true,
                                    fullWidth: true, 
                                    margin: "normal",
                                    error: Boolean(timeError),
                                    helperText: timeError,
                                    onBlur: () => validateTime(timeValue, dateValue)
                                } 
                            }}
                        />
                    </LocalizationProvider>

                    {/* Description */}
                    <TextField
                        label="Description"
                        name="description"
                        fullWidth
                        multiline
                        rows={3}
                        margin="normal"
                    />
                </DialogContent>
                
                {/* Dialog Buttons */}
                <DialogActions sx={{ justifyContent: "space-between", alignItems: "center" }}>
                    <Box>
                        {error && <Alert severity="error">{error}</Alert>}
                    </Box>

                    <Box>
                        <Button onClick={handleClose}>Cancel</Button>
                        <Button type="submit" variant="contained" disabled={loading}>
                            {loading ? "Creating..." : "Create"}
                        </Button>
                    </Box>
                </DialogActions>
            </Box>

            {/* Snackbar for success notifications only */}
            <FeedbackSnackbar
                open={snackbar.open}
                message={snackbar.message}
                severity="success" 
                autoHideDuration={6000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
            />
        </Dialog>
    );
};

export default CreateActivityDialog;
