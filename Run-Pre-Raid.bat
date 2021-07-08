@echo off
echo Going to scrape from "Pre-Raid.profile"
echo ----------------------------------------

for /f "tokens=1,* delims== " %%i in (Pre-Raid.profile) do (
   call node.exe wowhead-scrape.js %%j %%i
   echo.
   pause
)

echo ----------------------------------------
echo.
echo Done.
echo.
pause