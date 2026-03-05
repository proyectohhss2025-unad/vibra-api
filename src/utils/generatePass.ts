import { sendPassGenerateAndSendEmail } from "../helpers/email";

export const generateRandomPassword = async (length = 12, email: string): Promise<string> => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_-+={}[\]|;:,<.>/?' +
        '`~'; // Include additional characters if needed

    let newPassword = '';
    for (let i = 0; i < length; i++) {
        newPassword += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    await sendPassGenerateAndSendEmail(email, newPassword, false);

    return newPassword;
};