@echo off
echo Going to scrape from "Phase2.profile"
echo ----------------------------------------

for /f "tokens=1,* delims== " %%i in (Phase2.profile) do (
   call node.exe wowhead-scrape.js %%j %%i
   echo.
   pause
)

echo ----------------------------------------
echo.
echo Done.
echo.
pause