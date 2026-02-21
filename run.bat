@echo off
cd /d C:\Users\PJ\python\venv\katadas_2d_bandai
echo add venv...
call .\Scripts\activate.bat
echo Flask start...
python app.py
pause