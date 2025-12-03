export const passwordResetTemplate = (firstName, resetToken, expirationTime) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password - Memorise</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background-color: #0961F5; 
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
        }
        .content {
            background-color: #f9f9f9;
            padding: 30px;
            border-radius: 0 0 8px 8px;
            text-align: center;
        }
        
        /* Style Khusus OTP */
        .otp-container {
            margin: 30px 0;
        }
        .otp-code {
            font-size: 36px;
            font-family: 'Courier New', Courier, monospace; 
            font-weight: bold;
            letter-spacing: 8px;
            color: #0961F5; /* Teks Biru */
            background-color: #ffffff;
            border: 2px dashed #0961F5; /* Border putus-putus biru */
            padding: 15px 25px;
            display: inline-block;
            border-radius: 12px;
        }
        
        .warning {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
            padding: 15px;
            border-radius: 4px;
            margin: 20px 0;
            text-align: left;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            font-size: 14px;
            color: #666;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Reset Password Code</h1>
    </div>
    
    <div class="content">
        <h2>Hi ${firstName},</h2>
        
        <p>You requested to reset your password. Please enter the following code in the Memorise app to continue:</p>
        
        <div class="otp-container">
            <div class="otp-code">
                ${resetToken}
            </div>
        </div>
        
        <div class="warning">
            <strong>⚠️ Security Notice:</strong> Never share this code with anyone. This code will expire in ${expirationTime}. If you didn't request this, please ignore this email.
        </div>
        
        <div class="footer">
            <p>Best regards,<br>The Memorise Team</p>
            <p>This is an automated message. Please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>
`;