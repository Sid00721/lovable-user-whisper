@echo off
REM Batch script to run the user activity update script
REM This can be scheduled to run periodically using Windows Task Scheduler

echo Starting user activity update...
echo.

REM Change to the script directory
cd /d "%~dp0"

REM Run the Python script
python update_user_activity.py

REM Check if the script ran successfully
if %ERRORLEVEL% EQU 0 (
    echo.
    echo User activity update completed successfully!
) else (
    echo.
    echo User activity update failed with error code %ERRORLEVEL%
)

echo.
echo Press any key to exit...
pause >nul