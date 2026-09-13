@echo off
call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat" >nul 2>&1
cd /d "D:\ÏîÄ¿\hebingxiangmu\quyuan-tauri\src-tauri"
"C:\Users\liang\.cargo\bin\cargo.exe" build 2>&1
