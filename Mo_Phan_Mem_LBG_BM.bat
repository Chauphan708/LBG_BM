@echo off
chcp 65001 >nul
title Phan Mem Lich Bao Giang Giao Vien Bo Mon - LBG_BM (Khoi 1 - 5)
echo =========================================================================
echo   ĐANG KHỞI ĐỘNG PHẦN MỀM LỊCH BÁO GIẢNG GIÁO VIÊN BỘ MÔN (LBG_BM)
echo   Dành riêng cho Giáo viên bộ môn dạy nhiều lớp / nhiều phân hiệu
echo   Hỗ trợ 5 khối (Khối 1 - 5) và 5 phân hiệu (Điểm A, B, C, D, E)
echo =========================================================================
echo.
echo Đang mở ứng dụng trên trình duyệt web mặc định của bạn...
start "" "%~dp0index.html"
exit
