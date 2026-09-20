/**
 * LỊCH BÁO GIẢNG & KẾ HOẠCH DẠY HỌC GIÁO VIÊN BỘ MÔN (LBG_BM)
 * Dành cho Giáo viên bộ môn (Tin học, Công nghệ, GD Thể chất, Âm nhạc, Mĩ thuật, Tiếng Anh...)
 * Hỗ trợ giảng dạy từ 1 đến 4 môn trên nhiều lớp và 5 phân hiệu (Điểm A, B, C, D, E)
 * Phiên bản độc lập LBG_BM V1.0 - Lưu trữ cục bộ an toàn
 */

(function() {
    'use strict';

    const STORAGE_KEY = "LBG_BM_DATA_V1";
    let currentOrientation = "portrait";

    function escapeHtml(unsafe) {
        if (!unsafe) return "";
        return unsafe.toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function escapeXml(unsafe) {
        if (!unsafe) return "";
        return unsafe.toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&apos;");
    }

    function getBaseLesson(lessonStr) {
        if (!lessonStr) return '';
        return lessonStr.replace(/\s*[\(\,\–\-]\s*(?:tiết|Tiết)\s*\d+[\)\.]?/gi, '').trim();
    }

    function normalizePunctuationSpacing(str) {
        if (!str) return '';
        return str
            .replace(/\s+([,;:!?.])/g, '$1')
            .replace(/([,;:!?])(?=[^\s0-9])/g, '$1 ')
            .replace(/\s{2,}/g, ' ')
            .trim();
    }

    function normalizeSubjectName(sub) {
        if (!sub) return "";
        const s = sub.toString().normalize("NFC").trim().toUpperCase()
            .replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A")
            .replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E")
            .replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I")
            .replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O")
            .replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U")
            .replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y")
            .replace(/Đ/g, "D");
        
        if (s.includes("TRAI NGHIEM") || s.includes("HDTN") || s.includes("HOAT DONG") || s.includes("CHAO CO") || s.includes("SINH HOAT")) {
            return "HĐ Trải nghiệm";
        }
        if (s.includes("TC TIENG VIET") || s.includes("TANG CUONG TIENG VIET") || s.includes("TC TV")) return "TC Tiếng Việt";
        if (s.includes("TIENG VIET") || s.includes("TV")) return "Tiếng Việt";
        if (s.includes("TC TOAN") || s.includes("TANG CUONG TOAN")) return "TC Toán";
        if (s.includes("TOAN")) return "Toán";
        if (s.includes("TIENG ANH") || s.includes("TA") || s.includes("ENGLISH")) return "Tiếng Anh";
        if (s.includes("TNXH") || s.includes("TU NHIEN")) return "TNXH";
        if (s.includes("KHOA HOC") || s === "KH") return "Khoa học";
        if (s.includes("LICH SU") || s.includes("DIA LI") || s.includes("LS") || s.includes("DL")) return "LS&ĐL";
        if (s.includes("DAO DUC") || s === "DD") return "Đạo đức";
        if (s.includes("TIN HOC") || s === "TH" || s.includes("TIN")) return "Tin học";
        if (s.includes("CONG NGHE") || s === "CN") return "Công nghệ";
        if (s.includes("THE CHAT") || s.includes("GDTC") || s.includes("THE DUC")) return "GD Thể chất";
        if (s.includes("AM NHAC") || s.includes("AN") || s.includes("NHAC")) return "Âm nhạc";
        if (s.includes("MI THUAT") || s.includes("MT") || s.includes("MY THUAT") || s.includes("VE")) return "Mĩ thuật";
        if (s.includes("THU VIEN")) return "Đọc Thư viện";
        if (s.includes("KNS") || s.includes("KY NANG")) return "KNS";
        if (s.includes("STEM")) return "STEM";
        if (s.includes("CD SO") || s.includes("CONG DAN")) return "CD Số";

        if (s.includes("DE TRONG") || s === "NGHI" || s.includes("NGHI HOC") || s.includes("NGHI TIET") || s.startsWith("--")) {
            return "-- Nghỉ / Để trống --";
        }

        return sub.toString().trim();
    }

    function parseClassInfo(className) {
        if (!className || className.startsWith("--")) return { grade: 5, campusId: 'A', name: '' };
        const gradeMatch = className.match(/\d/);
        const grade = gradeMatch ? parseInt(gradeMatch[0], 10) : 5;
        const campusMatch = className.match(/[A-Za-z]/);
        const campusId = campusMatch ? campusMatch[0].toUpperCase() : 'A';
        return { grade, campusId, name: className.trim() };
    }

    function getCampusBadgeClass(campusId) {
        const id = (campusId || 'A').toUpperCase();
        return 'badge-campus-' + id;
    }

    function getCampusName(campuses, campusId) {
        const id = (campusId || 'A').toUpperCase();
        const found = campuses.find(c => c.id === id || c.code === id);
        return found ? found.name : ('Điểm ' + id);
    }

    const DEFAULT_BASES = [
        "Căn cứ Thông tư số 32/2018/TT-BGDĐT ngày 26/12/2018 Ban hành Chương trình Giáo dục phổ thông tổng thể.",
        "Căn cứ Thông tư 27/2020/TT-BGDĐT ngày 04/9/2020 về việc ban hành Quy định đánh giá học sinh tiểu học;",
        "Căn cứ Công văn số 2345/BGDĐT-GDTH ngày 07/6/2021 về việc hướng dẫn xây dựng kế hoạch giáo dục nhà trường."
    ];

    const DEFAULT_CAMPUSES = [
        { id: "A", code: "A", name: "Trường chính (Điểm A)" },
        { id: "B", code: "B", name: "Phân hiệu 1 (Điểm B)" },
        { id: "C", code: "C", name: "Phân hiệu 2 (Điểm C)" },
        { id: "D", code: "D", name: "Phân hiệu 3 (Điểm D)" },
        { id: "E", code: "E", name: "Phân hiệu 4 (Điểm E)" }
    ];

    function generateDefault75Classes() {
        const classes = [];
        const campuses = ["A", "B", "C", "D", "E"];
        for (let g = 1; g <= 5; g++) {
            campuses.forEach(c => {
                for (let i = 1; i <= 3; i++) {
                    const name = `${g}${c}${i}`;
                    classes.push({
                        name: name,
                        grade: g,
                        campusId: c,
                        isAssigned: (g >= 3 && c === 'A') || (g === 5 && c === 'B') // default sample
                    });
                }
            });
        }
        return classes;
    }

    function generateDefaultBmTimetable() {
        // Sample realistic timetable for specialist teacher teaching Tin học & Công nghệ
        return [
            // Thứ 2
            { day: "Thứ 2", session: "Sáng", period: 1, className: "4A1", subject: "Tin học" },
            { day: "Thứ 2", session: "Sáng", period: 2, className: "4A2", subject: "Tin học" },
            { day: "Thứ 2", session: "Sáng", period: 3, className: "3A1", subject: "Tin học" },
            { day: "Thứ 2", session: "Sáng", period: 4, className: "5A1", subject: "Tin học" },
            { day: "Thứ 2", session: "Chiều", period: 1, className: "5A1", subject: "Công nghệ" },
            { day: "Thứ 2", session: "Chiều", period: 2, className: "5A2", subject: "Công nghệ" },
            { day: "Thứ 2", session: "Chiều", period: 3, className: "-- Trống --", subject: "-- Nghỉ / Để trống --" },

            // Thứ 3
            { day: "Thứ 3", session: "Sáng", period: 1, className: "3A2", subject: "Tin học" },
            { day: "Thứ 3", session: "Sáng", period: 2, className: "3A3", subject: "Tin học" },
            { day: "Thứ 3", session: "Sáng", period: 3, className: "5A2", subject: "Tin học" },
            { day: "Thứ 3", session: "Sáng", period: 4, className: "5A3", subject: "Tin học" },
            { day: "Thứ 3", session: "Chiều", period: 1, className: "4A3", subject: "Tin học" },
            { day: "Thứ 3", session: "Chiều", period: 2, className: "5A3", subject: "Công nghệ" },
            { day: "Thứ 3", session: "Chiều", period: 3, className: "-- Trống --", subject: "-- Nghỉ / Để trống --" },

            // Thứ 4 (Phân hiệu B)
            { day: "Thứ 4", session: "Sáng", period: 1, className: "5B1", subject: "Tin học" },
            { day: "Thứ 4", session: "Sáng", period: 2, className: "5B2", subject: "Tin học" },
            { day: "Thứ 4", session: "Sáng", period: 3, className: "4B1", subject: "Tin học" },
            { day: "Thứ 4", session: "Sáng", period: 4, className: "4B2", subject: "Tin học" },
            { day: "Thứ 4", session: "Chiều", period: 1, className: "5B1", subject: "Công nghệ" },
            { day: "Thứ 4", session: "Chiều", period: 2, className: "5B2", subject: "Công nghệ" },
            { day: "Thứ 4", session: "Chiều", period: 3, className: "-- Trống --", subject: "-- Nghỉ / Để trống --" },

            // Thứ 5
            { day: "Thứ 5", session: "Sáng", period: 1, className: "4A1", subject: "Công nghệ" },
            { day: "Thứ 5", session: "Sáng", period: 2, className: "4A2", subject: "Công nghệ" },
            { day: "Thứ 5", session: "Sáng", period: 3, className: "3A1", subject: "Công nghệ" },
            { day: "Thứ 5", session: "Sáng", period: 4, className: "3A2", subject: "Công nghệ" },
            { day: "Thứ 5", session: "Chiều", period: 1, className: "-- Trống --", subject: "-- Nghỉ / Để trống --" },
            { day: "Thứ 5", session: "Chiều", period: 2, className: "-- Trống --", subject: "-- Nghỉ / Để trống --" },
            { day: "Thứ 5", session: "Chiều", period: 3, className: "-- Trống --", subject: "-- Nghỉ / Để trống --" },

            // Thứ 6
            { day: "Thứ 6", session: "Sáng", period: 1, className: "4A3", subject: "Công nghệ" },
            { day: "Thứ 6", session: "Sáng", period: 2, className: "3A3", subject: "Công nghệ" },
            { day: "Thứ 6", session: "Sáng", period: 3, className: "4B1", subject: "Công nghệ" },
            { day: "Thứ 6", session: "Sáng", period: 4, className: "4B2", subject: "Công nghệ" },
            { day: "Thứ 6", session: "Chiều", period: 1, className: "-- Trống --", subject: "-- Nghỉ / Để trống --" },
            { day: "Thứ 6", session: "Chiều", period: 2, className: "-- Trống --", subject: "-- Nghỉ / Để trống --" },
            { day: "Thứ 6", session: "Chiều", period: 3, className: "-- Trống --", subject: "-- Nghỉ / Để trống --" }
        ];
    }

    let state = {
        currentTab: "tab-lbg",
        currentWeek: 1,
        ppctCurrentGrade: 5,
        ppctCurrentSubject: "Tin học",
        filterSubject: "all",
        filterCampus: "all",
        filterClass: "all",
        ctlopFilterClass: "all",
        ctlopFilterSubject: "all",
        lbgMonFilterSubject: "all",
        lbgMonShowIntegration: true,
        lbgOptHideEmptyRows: false,
        ctlopOptHideEmptyRows: false,
        lbgMonOptHideEmptyRows: false,
        lbgShowColSign: false,
        lbgShowColNote: true,
        lbgCustomCols: [],
        lbgShowBghSign: true,
        lbgShowHeadSign: true,
        lbgShowTeacherSign: true,
        ppctFilterOnlyAssigned: true,
        slotNotes: {},
        slotCustomCols: {},

        settings: {
            governingBody: "UBND PHƯỜNG TRUNG NHỨT",
            schoolName: "TRƯỜNG TIỂU HỌC TRUNG NHỨT",
            teacherName: "Nguyễn Văn Chuyên",
            departmentName: "Tổ Bộ Môn (Tin học - Công nghệ)",
            headOfDepartment: "Lê Văn Trưởng",
            academicYear: "2026 - 2027",
            location: "Trung Nhứt",
            dateString: "ngày 28 tháng 8 năm 2026",
            principal: "Phạm Quốc Hùng",
            vicePrincipal: "Lê Văn Tám",
            vicePrincipals: ["Lê Văn Tám"],
            bghSignerLbgType: "PHT",
            bghSignerLbgIndex: 0,
            bghSignerKhdhType: "HT",
            bghSignerKhdhIndex: 0,
            bases: [...DEFAULT_BASES]
        },

        assignedSubjects: [
            "Tin học",
            "Công nghệ"
        ],

        campuses: [...DEFAULT_CAMPUSES],
        allClasses: generateDefault75Classes(),
        timetable: generateDefaultBmTimetable(),
        gradeCurricula: { 1: [], 2: [], 3: [], 4: [], 5: [] },
        weeks: []
    };

    function showToast(message, type = "info") {
        const container = document.getElementById("toast-container");
        if (!container) return;
        const toast = document.createElement("div");
        toast.className = `toast ${type}`;
        const icon = type === "success" ? "✓" : type === "error" ? "⚠️" : "ℹ️";
        toast.innerHTML = `<span style="font-weight:bold;margin-right:6px;">${icon}</span><span>${escapeHtml(message)}</span>`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.classList.add("fade-out");
            setTimeout(() => toast.remove(), 400);
        }, 3200);
    }

    function initGradeCurricula() {
        for (let g = 1; g <= 4; g++) {
            if (window.APP_GRADE_DATA && window.APP_GRADE_DATA[g] && Array.isArray(window.APP_GRADE_DATA[g].ppct)) {
                state.gradeCurricula[g] = JSON.parse(JSON.stringify(window.APP_GRADE_DATA[g].ppct));
            }
        }
        if (window.APP_INITIAL_DATA && Array.isArray(window.APP_INITIAL_DATA.ppct)) {
            state.gradeCurricula[5] = JSON.parse(JSON.stringify(window.APP_INITIAL_DATA.ppct));
        }
        // Chuẩn hóa tên môn học trên toàn bộ các khối (loại bỏ xung đột chữ hoa/thường/dấu tổ hợp)
        for (let g = 1; g <= 5; g++) {
            if (Array.isArray(state.gradeCurricula[g])) {
                state.gradeCurricula[g].forEach(item => {
                    if (item.subject) item.subject = normalizeSubjectName(item.subject);
                });
            }
        }
    }

    function autoGenerateCalendar(yearString, startDateString, tetStartStr, tetEndStr) {
        const weeks = [];
        const start = new Date(startDateString);
        let currMonday = new Date(start);

        const tetStart = tetStartStr ? new Date(tetStartStr) : null;
        const tetEnd = tetEndStr ? new Date(tetEndStr) : null;

        for (let w = 1; w <= 35; w++) {
            // Check if currMonday falls within Tet
            if (tetStart && tetEnd && currMonday >= tetStart && currMonday <= tetEnd) {
                // Advance 1 week and re-check
                currMonday.setDate(currMonday.getDate() + 7);
            }

            const currFriday = new Date(currMonday);
            currFriday.setDate(currFriday.getDate() + 4);

            const formatVN = d => {
                const day = String(d.getDate()).padStart(2, '0');
                const m = String(d.getMonth() + 1).padStart(2, '0');
                const y = d.getFullYear();
                return `${day}/${m}/${y}`;
            };

            const startDateVN = formatVN(currMonday);
            const endDateVN = formatVN(currFriday);
            const monthStr = "Tháng " + (currMonday.getMonth() + 1);

            weeks.push({
                week: w,
                semester: w <= 18 ? 1 : 2,
                startDate: currMonday.toISOString().split('T')[0],
                endDate: currFriday.toISOString().split('T')[0],
                startDateVN: startDateVN,
                endDateVN: endDateVN,
                month: monthStr,
                holidays: "",
                notes: ""
            });

            currMonday.setDate(currMonday.getDate() + 7);
        }

        return weeks;
    }

    function getCustomSubjectCurricula() {
        const custom = {};
        let hasCustom = false;
        for (let g = 1; g <= 5; g++) {
            const baseList = g === 5 
                ? (window.APP_INITIAL_DATA && Array.isArray(window.APP_INITIAL_DATA.ppct) ? window.APP_INITIAL_DATA.ppct : []) 
                : (window.APP_GRADE_DATA && window.APP_GRADE_DATA[g] && Array.isArray(window.APP_GRADE_DATA[g].ppct) ? window.APP_GRADE_DATA[g].ppct : []);
            const currList = state.gradeCurricula[g] || [];
            
            // Unique subjects present in this grade
            const subjects = [...new Set(currList.map(x => x.subject))];
            subjects.forEach(sub => {
                const curSubLessons = currList.filter(x => x.subject === sub);
                const baseSubLessons = baseList.filter(x => x.subject === sub);

                let isMod = false;
                if (curSubLessons.length !== baseSubLessons.length) {
                    isMod = true;
                } else {
                    for (let i = 0; i < curSubLessons.length; i++) {
                        const c = curSubLessons[i];
                        const b = baseSubLessons[i];
                        if (!b || c.ppct !== b.ppct || c.lessonName !== b.lessonName || c.integration !== b.integration || c.duration !== b.duration || c.week !== b.week) {
                            isMod = true;
                            break;
                        }
                    }
                }
                if (isMod) {
                    custom[`${g}_${sub}`] = curSubLessons;
                    hasCustom = true;
                }
            });
        }
        return hasCustom ? custom : null;
    }

    function applyCustomSubjectCurricula(customMap) {
        if (!customMap || typeof customMap !== 'object') return;
        Object.keys(customMap).forEach(key => {
            const underscoreIdx = key.indexOf('_');
            if (underscoreIdx === -1) return;
            const grade = parseInt(key.slice(0, underscoreIdx), 10);
            const subject = key.slice(underscoreIdx + 1);
            const customLessons = customMap[key];
            if (Array.isArray(customLessons) && state.gradeCurricula[grade]) {
                const remaining = state.gradeCurricula[grade].filter(x => x.subject !== subject);
                state.gradeCurricula[grade] = remaining.concat(customLessons);
                state.gradeCurricula[grade].sort((a, b) => (a.week || 0) - (b.week || 0) || (a.ppct || 0) - (b.ppct || 0));
            }
        });
    }

    function cleanupObsoleteStorage() {
        const obsoleteKeys = [
            "LBG_APP_DATA_V4",
            "LBG_APP_DATA_V5",
            "LBG_APP_DATA_V6",
            "LBG_APP_DATA_V7"
        ];
        obsoleteKeys.forEach(k => {
            try {
                if (typeof localStorage !== 'undefined' && localStorage.getItem(k)) {
                    localStorage.removeItem(k);
                    console.log("Cleaned obsolete storage key:", k);
                }
            } catch (e) {}
        });
    }

    function loadState() {
        initGradeCurricula();

        // Default weeks
        state.weeks = autoGenerateCalendar("2026 - 2027", "2026-09-07", "2027-02-08", "2027-02-21");

        try {
            cleanupObsoleteStorage();
            const raw = (typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null) || 
                        (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(STORAGE_KEY) : null);
            if (raw) {
                const saved = JSON.parse(raw);
                if (saved.settings) Object.assign(state.settings, saved.settings);
                if (Array.isArray(saved.assignedSubjects) && saved.assignedSubjects.length > 0) state.assignedSubjects = saved.assignedSubjects;
                if (Array.isArray(saved.campuses) && saved.campuses.length > 0) state.campuses = saved.campuses;
                if (Array.isArray(saved.allClasses) && saved.allClasses.length > 0) state.allClasses = saved.allClasses;
                if (Array.isArray(saved.timetable) && saved.timetable.length > 0) state.timetable = saved.timetable;
                if (Array.isArray(saved.weeks) && saved.weeks.length > 0) state.weeks = saved.weeks;
                
                if (saved.customSubjectCurricula) {
                    applyCustomSubjectCurricula(saved.customSubjectCurricula);
                } else if (saved.gradeCurricula) {
                    for (let g = 1; g <= 5; g++) {
                        if (Array.isArray(saved.gradeCurricula[g]) && saved.gradeCurricula[g].length > 0) {
                            state.gradeCurricula[g] = saved.gradeCurricula[g];
                        }
                    }
                }
                // Chuẩn hóa tên môn trong toàn bộ dữ liệu nạp từ localStorage
                for (let g = 1; g <= 5; g++) {
                    if (Array.isArray(state.gradeCurricula[g])) {
                        state.gradeCurricula[g].forEach(item => {
                            if (item.subject) item.subject = normalizeSubjectName(item.subject);
                        });
                    }
                }
                if (saved.currentWeek) state.currentWeek = saved.currentWeek;
                if (saved.lbgShowColSign !== undefined) state.lbgShowColSign = saved.lbgShowColSign;
                if (saved.lbgShowColNote !== undefined) state.lbgShowColNote = saved.lbgShowColNote;
                if (Array.isArray(saved.lbgCustomCols)) state.lbgCustomCols = saved.lbgCustomCols;
                if (saved.lbgShowBghSign !== undefined) state.lbgShowBghSign = saved.lbgShowBghSign;
                if (saved.lbgShowHeadSign !== undefined) state.lbgShowHeadSign = saved.lbgShowHeadSign;
                if (saved.lbgShowTeacherSign !== undefined) state.lbgShowTeacherSign = saved.lbgShowTeacherSign;
                if (saved.lbgOptHideEmptyRows !== undefined) state.lbgOptHideEmptyRows = saved.lbgOptHideEmptyRows;
                if (saved.ctlopOptHideEmptyRows !== undefined) state.ctlopOptHideEmptyRows = saved.ctlopOptHideEmptyRows;
                if (saved.ppctFilterOnlyAssigned !== undefined) state.ppctFilterOnlyAssigned = saved.ppctFilterOnlyAssigned;
                if (saved.slotNotes && typeof saved.slotNotes === 'object') state.slotNotes = saved.slotNotes;
                if (saved.slotCustomCols && typeof saved.slotCustomCols === 'object') state.slotCustomCols = saved.slotCustomCols;
            }
        } catch (e) {
            console.error("Error loading LBG_BM state from localStorage:", e);
        }
    }

    // Initialize state immediately upon file load
    loadState();

    function saveState() {
        let toSave = null;
        try {
            const customSubCurricula = getCustomSubjectCurricula();
            toSave = {
                settings: state.settings,
                assignedSubjects: state.assignedSubjects,
                campuses: state.campuses,
                allClasses: state.allClasses,
                timetable: state.timetable,
                weeks: state.weeks,
                customSubjectCurricula: customSubCurricula,
                currentWeek: state.currentWeek,
                lbgShowColSign: state.lbgShowColSign,
                lbgShowColNote: state.lbgShowColNote,
                lbgCustomCols: state.lbgCustomCols,
                lbgShowBghSign: state.lbgShowBghSign,
                lbgShowHeadSign: state.lbgShowHeadSign,
                lbgShowTeacherSign: state.lbgShowTeacherSign,
                lbgOptHideEmptyRows: state.lbgOptHideEmptyRows,
                ctlopOptHideEmptyRows: state.ctlopOptHideEmptyRows,
                ppctFilterOnlyAssigned: state.ppctFilterOnlyAssigned,
                slotNotes: state.slotNotes,
                slotCustomCols: state.slotCustomCols
            };

            const payloadStr = JSON.stringify(toSave);

            try {
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem(STORAGE_KEY, payloadStr);
                }
            } catch (quotaErr) {
                console.warn("Storage quota warning, cleaning obsolete keys...", quotaErr);
                cleanupObsoleteStorage();
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem(STORAGE_KEY, payloadStr);
                }
            }
            updateTopHeader();
        } catch (e) {
            console.error("Error saving LBG_BM state to localStorage:", e);
            try {
                if (toSave && typeof sessionStorage !== 'undefined') {
                    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
                }
            } catch (sessErr) {}
            showToast("Bộ nhớ trình duyệt đầy! Dữ liệu đã lưu tạm vào phiên hiện tại. Vui lòng vào Cài Đặt bấm 'Sao lưu JSON'.", "warning");
        }
    }

    function updateTopHeader() {
        const topTeacher = document.getElementById("top-teacher-display");
        if (topTeacher) topTeacher.textContent = "GV: " + (state.settings.teacherName || "Nguyễn Văn Chuyên");

        const topDept = document.getElementById("top-department-display");
        if (topDept) topDept.textContent = state.settings.departmentName || "Tổ Bộ Môn";

        const topSchool = document.getElementById("top-badge-school");
        if (topSchool) topSchool.textContent = "🏫 " + (state.settings.schoolName || "TRƯỜNG TIỂU HỌC TRUNG NHỨT");
    }

    /**
     * Core Schedule Resolution for Specialist Teacher (GVBM)
     * Accurately resolves PPCT progress for each (class, subject) pair
     */
    function calculateWeekScheduleForBm(weekNum, filterSub = "all", filterCampus = "all", filterCls = "all", hideEmpty = false) {
        const slots = state.timetable || [];
        const result = [];
        const weeklyPeriodTracker = {};

        for (let i = 0; i < slots.length; i++) {
            const slot = slots[i];
            const isSlotEmpty = !slot.className || slot.className.startsWith("--") || !slot.subject || slot.subject.startsWith("--");

            if (isSlotEmpty) {
                if (!hideEmpty) {
                    result.push({
                        slotIndex: i,
                        day: slot.day,
                        session: slot.session,
                        period: slot.period,
                        className: "",
                        campusId: "",
                        grade: null,
                        subject: "-- Nghỉ / Để trống --",
                        normSub: "-- Nghỉ / Để trống --",
                        periodInWeek: 0,
                        ppct: "",
                        lessonName: "",
                        integration: "",
                        duration: "",
                        note: "",
                        isEmpty: true
                    });
                }
                continue;
            }

            const classInfo = parseClassInfo(slot.className);
            const normSub = normalizeSubjectName(slot.subject);

            // Check filters
            if (filterSub !== "all" && normalizeSubjectName(filterSub) !== normSub) continue;
            if (filterCampus !== "all" && classInfo.campusId !== filterCampus) continue;
            if (filterCls !== "all" && slot.className !== filterCls) continue;

            // Track period in week for this class and subject
            const trackerKey = `${slot.className}_${normSub}`;
            weeklyPeriodTracker[trackerKey] = (weeklyPeriodTracker[trackerKey] || 0) + 1;
            const periodInWeek = weeklyPeriodTracker[trackerKey];

            // Resolve lesson from curriculum of this grade
            const gradePpct = state.gradeCurricula[classInfo.grade] || [];
            let ppctItem = gradePpct.find(item => 
                item.week === weekNum && 
                normalizeSubjectName(item.subject) === normSub && 
                item.periodInWeek === periodInWeek
            );

            // Fallback match
            if (!ppctItem) {
                const subItems = gradePpct.filter(item => 
                    item.week === weekNum && 
                    normalizeSubjectName(item.subject) === normSub
                );
                if (subItems.length >= periodInWeek) {
                    ppctItem = subItems[periodInWeek - 1];
                } else if (subItems.length > 0) {
                    ppctItem = subItems[0];
                }
            }

            result.push({
                slotIndex: i,
                day: slot.day,
                session: slot.session,
                period: slot.period,
                className: slot.className,
                campusId: classInfo.campusId,
                grade: classInfo.grade,
                subject: slot.subject,
                normSub: normSub,
                periodInWeek: periodInWeek,
                ppct: ppctItem ? ppctItem.ppct : "",
                lessonName: ppctItem ? ppctItem.lessonName : "",
                integration: ppctItem ? (ppctItem.integration || "") : "",
                duration: ppctItem ? (ppctItem.duration || "") : "",
                note: slot.note || "",
                isEmpty: false
            });
        }

        return result;
    }

    /**
     * Group schedule by Subject for Tab 3
     */
    function calculateWeekScheduleBySubjectForBm(weekNum, filterSub = "all", hideEmpty = false) {
        const flatList = calculateWeekScheduleForBm(weekNum, filterSub, "all", "all", hideEmpty);
        const subjectsMap = {};

        flatList.forEach(row => {
            if (row.isEmpty) return;
            const sub = row.normSub;
            if (!subjectsMap[sub]) {
                subjectsMap[sub] = [];
            }
            subjectsMap[sub].push(row);
        });

        const grouped = [];
        Object.keys(subjectsMap).forEach(subName => {
            grouped.push({
                subject: subName,
                rows: subjectsMap[subName]
            });
        });

        return grouped;
    }

    function getDayDateStr(startDateVN, dayStr) {
        if (!startDateVN) return '';
        const parts = startDateVN.split('/');
        if (parts.length !== 3) return '';
        const monday = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
        
        let offset = 0;
        if (dayStr.includes('3')) offset = 1;
        else if (dayStr.includes('4')) offset = 2;
        else if (dayStr.includes('5')) offset = 3;
        else if (dayStr.includes('6')) offset = 4;
        
        const targetDate = new Date(monday);
        targetDate.setDate(targetDate.getDate() + offset);
        
        const d = String(targetDate.getDate()).padStart(2, '0');
        const m = String(targetDate.getMonth() + 1).padStart(2, '0');
        return `${dayStr}\n(${d}/${m})`;
    }

    function getDayFullDate(startDateVN, dayStr) {
        if (!startDateVN) return '';
        const parts = startDateVN.split('/');
        if (parts.length !== 3) return '';
        const monday = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
        let offset = 0;
        if (dayStr.includes('3')) offset = 1;
        else if (dayStr.includes('4')) offset = 2;
        else if (dayStr.includes('5')) offset = 3;
        else if (dayStr.includes('6')) offset = 4;
        const target = new Date(monday);
        target.setDate(target.getDate() + offset);
        return `${String(target.getDate()).padStart(2, '0')}/${String(target.getMonth() + 1).padStart(2, '0')}/${target.getFullYear()}`;
    }

    function renderWeekToolbar(containerId, onChangeCallback) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const currentWeek = state.currentWeek;
        const weekInfo = state.weeks.find(w => w.week === currentWeek) || { startDateVN: '', endDateVN: '' };

        container.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem; width: 100%;">
                <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                    <button type="button" class="btn btn-secondary btn-sm" id="${containerId}-prev-btn" ${currentWeek <= 1 ? 'disabled' : ''}>
                        ◀ Tuần Trước
                    </button>
                    <div style="display: flex; align-items: center; gap: 0.4rem;">
                        <label style="font-weight: 800; color: var(--primary); font-size: 0.95rem; margin: 0;">📅 Tuần dạy:</label>
                        <select class="form-select form-select-sm" id="${containerId}-select" style="font-weight: 800; color: var(--primary); font-size: 0.95rem; min-width: 120px;">
                            ${state.weeks.map(w => `<option value="${w.week}" ${w.week === currentWeek ? 'selected' : ''}>Tuần ${w.week}</option>`).join('')}
                        </select>
                    </div>
                    <button type="button" class="btn btn-secondary btn-sm" id="${containerId}-next-btn" ${currentWeek >= 35 ? 'disabled' : ''}>
                        Tuần Kế Tiếp ▶
                    </button>
                </div>
                <div style="font-size: 0.88rem; font-weight: 600; color: #475569; background: #fff; padding: 0.35rem 0.85rem; border-radius: var(--radius-sm); border: 1px solid var(--border-light);">
                    🗓️ Thời gian: <strong>${weekInfo.startDateVN || '...'}</strong> đến <strong>${weekInfo.endDateVN || '...'}</strong>
                </div>
            </div>
        `;

        const select = document.getElementById(`${containerId}-select`);
        if (select) {
            select.onchange = (e) => {
                state.currentWeek = parseInt(e.target.value, 10);
                saveState();
                if (onChangeCallback) onChangeCallback();
            };
        }

        const prevBtn = document.getElementById(`${containerId}-prev-btn`);
        if (prevBtn) {
            prevBtn.onclick = () => {
                if (state.currentWeek > 1) {
                    state.currentWeek--;
                    saveState();
                    if (onChangeCallback) onChangeCallback();
                }
            };
        }

        const nextBtn = document.getElementById(`${containerId}-next-btn`);
        if (nextBtn) {
            nextBtn.onclick = () => {
                if (state.currentWeek < 35) {
                    state.currentWeek++;
                    saveState();
                    if (onChangeCallback) onChangeCallback();
                }
            };
        }
    }

    // =========================================================================
    // DYNAMIC COLUMN ORDERING & MANAGEMENT (TAB 1 & TAB 2)
    // =========================================================================
    function getLbgOrderedColumns(customColsList, showSign, showNote, isCtlop) {
        const enabledCustomCols = Array.isArray(customColsList) 
            ? customColsList.filter(c => c && c.enabled !== false) 
            : [];
        
        const cols = [];
        
        const pushCustom = (pos) => {
            enabledCustomCols.filter(c => String(c.pos) === String(pos)).forEach(c => {
                cols.push({
                    key: 'custom_' + c.id,
                    id: c.id,
                    title: c.name || 'Cột mới',
                    isCustom: true,
                    pos: c.pos
                });
            });
        };

        // Pos 1: before day (Cột đầu tiên)
        pushCustom('1');

        // Day (Thứ, ngày)
        cols.push({ key: 'day', title: 'Thứ, ngày', isCustom: false });

        // Pos 2: after day
        pushCustom('2');

        // Session (Buổi)
        cols.push({ key: 'session', title: 'Buổi', isCustom: false });

        // Pos 3: after session
        pushCustom('3');

        // Period (Tiết)
        cols.push({ key: 'period', title: 'Tiết', isCustom: false });

        // Class (Lớp)
        cols.push({ key: 'class', title: 'Lớp', isCustom: false });

        // Pos 4: after class
        pushCustom('4');

        // Subject (Môn học) - CANH GIỮA VÀ GỌN GÀNG 110px
        cols.push({ key: 'subject', title: 'Môn học', isCustom: false });

        // Pos 5: after subject
        pushCustom('5');

        // PPCT (Tiết PPCT)
        cols.push({ key: 'ppct', title: 'Tiết PPCT', isCustom: false });

        // Pos 6: after ppct
        pushCustom('6');

        // Lesson (Tên bài dạy chi tiết)
        cols.push({ key: 'lesson', title: 'Tên bài dạy chi tiết (Nhấp đúp vào ô để sửa trực tiếp)', isCustom: false });

        // Pos 7: after lesson
        pushCustom('7');

        if (isCtlop) {
            cols.push({ key: 'integ', title: 'Nội dung tích hợp / Điều chỉnh', isCustom: false });
        }
        if (showSign) {
            cols.push({ key: 'sign', title: 'Kí tên', isCustom: false });
        }
        if (showNote) {
            cols.push({ key: 'note', title: 'Ghi chú', isCustom: false });
        }

        // Pos end: at the end of the table
        enabledCustomCols.filter(c => !['1', '2', '3', '4', '5', '6', '7'].includes(String(c.pos))).forEach(c => {
            cols.push({
                key: 'custom_' + c.id,
                id: c.id,
                title: c.name || 'Cột mới',
                isCustom: true,
                pos: c.pos || 'end'
            });
        });

        return cols;
    }

    function renderCustomColsManager(containerId, isModal = false) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = "";

        if (!Array.isArray(state.lbgCustomCols)) state.lbgCustomCols = [];

        state.lbgCustomCols.forEach(col => {
            const chip = document.createElement("div");
            chip.className = "custom-col-chip";
            chip.setAttribute("data-id", col.id);
            chip.style.cssText = "display: inline-flex; align-items: center; gap: 0.25rem; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 4px; padding: 0.15rem 0.35rem; font-size: 0.8rem;";

            const chk = document.createElement("input");
            chk.type = "checkbox";
            chk.checked = (col.enabled !== false);
            chk.title = "Bật/Tắt hiển thị cột này";
            chk.style.cursor = "pointer";
            chk.onchange = (e) => {
                col.enabled = e.target.checked;
                saveState();
                renderCustomColsManager("lbg-custom-cols-list", false);
                renderCustomColsManager("ctlop-custom-cols-list", false);
                renderTabLbgTableOnly();
                renderTabCtlopTableOnly();
            };

            const txt = document.createElement("input");
            txt.type = "text";
            txt.value = col.name || "Cột mới";
            txt.style.cssText = "width: 75px; border: none; font-size: 0.78rem; font-weight: 600; padding: 0 2px; color: var(--text-main); background: transparent;";
            txt.title = "Nhấp để đổi tên cột";
            txt.oninput = (e) => {
                col.name = e.target.value;
                saveState();
                ["lbg-custom-cols-list", "ctlop-custom-cols-list"].forEach(listId => {
                    const otherInput = document.querySelector(`#${listId} .custom-col-chip[data-id="${col.id}"] input[type="text"]`);
                    if (otherInput && otherInput.value !== e.target.value) otherInput.value = e.target.value;
                });
            };
            txt.onblur = () => {
                if (!col.name || !col.name.trim()) col.name = "Cột mới";
                saveState();
                renderTabLbgTableOnly();
                renderTabCtlopTableOnly();
            };

            const sel = document.createElement("select");
            sel.style.cssText = "font-size: 0.75rem; border: 1px solid #e2e8f0; border-radius: 3px; padding: 0 2px;";
            sel.title = "Chọn vị trí cột trong bảng";
            const posOptions = [
                { val: "end", label: "Cuối bảng" },
                { val: "1", label: "Đầu bảng" },
                { val: "2", label: "Sau Thứ" },
                { val: "3", label: "Sau Buổi" },
                { val: "4", label: "Sau Lớp" },
                { val: "5", label: "Sau Môn" },
                { val: "6", label: "Sau PPCT" },
                { val: "7", label: "Sau Tên bài" }
            ];
            posOptions.forEach(opt => {
                const optEl = document.createElement("option");
                optEl.value = opt.val;
                optEl.innerText = opt.label;
                if (String(col.pos || "end") === opt.val) optEl.selected = true;
                sel.appendChild(optEl);
            });
            sel.onchange = (e) => {
                col.pos = e.target.value;
                saveState();
                renderCustomColsManager("lbg-custom-cols-list", false);
                renderCustomColsManager("ctlop-custom-cols-list", false);
                renderTabLbgTableOnly();
                renderTabCtlopTableOnly();
            };

            const btnDel = document.createElement("button");
            btnDel.type = "button";
            btnDel.innerText = "✕";
            btnDel.title = "Xóa cột này";
            btnDel.style.cssText = "background: none; border: none; color: #dc2626; cursor: pointer; font-weight: bold; font-size: 0.8rem; padding: 0 2px;";
            btnDel.onclick = () => {
                state.lbgCustomCols = state.lbgCustomCols.filter(c => c.id !== col.id);
                saveState();
                renderCustomColsManager("lbg-custom-cols-list", false);
                renderCustomColsManager("ctlop-custom-cols-list", false);
                renderTabLbgTableOnly();
                renderTabCtlopTableOnly();
            };

            chip.appendChild(chk);
            chip.appendChild(txt);
            chip.appendChild(sel);
            chip.appendChild(btnDel);
            container.appendChild(chip);
        });
    }

    function handleAddNewCustomCol() {
        if (!Array.isArray(state.lbgCustomCols)) state.lbgCustomCols = [];
        const num = state.lbgCustomCols.length + 1;
        state.lbgCustomCols.push({
            id: 'col_' + Date.now(),
            name: `Cột mới ${num}`,
            pos: 'end',
            enabled: true
        });
        saveState();
        renderCustomColsManager("lbg-custom-cols-list", false);
        renderCustomColsManager("ctlop-custom-cols-list", false);
        renderTabLbgTableOnly();
        renderTabCtlopTableOnly();
        showToast("Đã thêm cột mới! Thầy/Cô có thể đổi tên và vị trí tùy ý.", "success");
    }

    function purgeUnassignedSubjectsData() {
        if (!Array.isArray(state.assignedSubjects) || state.assignedSubjects.length === 0) {
            alert("Thầy/Cô chưa chọn môn phụ trách nào! Vui lòng tick chọn ít nhất 1 môn phía trên trước khi thực hiện.");
            return;
        }
        const confirmMsg = `Hệ thống sẽ giữ lại dữ liệu các môn Thầy/Cô đang phụ trách:\n👉 ${state.assignedSubjects.join(', ')}\n\nVà XÓA TOÀN BỘ bài dạy của các môn không dạy từ Khối 1 đến Khối 5 để giải phóng 90% dung lượng lưu trữ.\n\n(Thầy/Cô có thể bấm "Khôi Phục Kho Môn Gốc" bất kỳ lúc nào nếu cần).\n\nThầy/Cô có chắc chắn muốn xóa?`;
        if (!confirm(confirmMsg)) return;

        const assignedNorms = state.assignedSubjects.map(s => normalizeSubjectName(s));
        let totalPurged = 0;
        let totalKept = 0;

        for (let g = 1; g <= 5; g++) {
            if (Array.isArray(state.gradeCurricula[g])) {
                const before = state.gradeCurricula[g].length;
                state.gradeCurricula[g] = state.gradeCurricula[g].filter(item => {
                    const norm = normalizeSubjectName(item.subject);
                    return assignedNorms.includes(norm);
                });
                const after = state.gradeCurricula[g].length;
                totalPurged += (before - after);
                totalKept += after;
            }
        }

        // Clean timetable slots with unassigned subjects
        if (Array.isArray(state.timetable)) {
            state.timetable.forEach(slot => {
                if (slot.subject && !slot.subject.startsWith("--")) {
                    const norm = normalizeSubjectName(slot.subject);
                    if (!assignedNorms.includes(norm)) {
                        slot.className = "-- Trống --";
                        slot.subject = "-- Nghỉ / Để trống --";
                    }
                }
            });
        }

        saveState();
        renderAssignedSubjectsSection();
        renderMasterTimetableMatrix();
        renderMasterTimetableDetailed();
        renderTabPpct();
        renderTabLbgTableOnly();
        renderTabCtlopTableOnly();

        showToast(`Đã giải phóng bộ nhớ! Xóa ${totalPurged} tiết môn không dạy, giữ lại ${totalKept} tiết môn phụ trách.`, "success");
    }

    function restoreAllSubjectsData() {
        if (!confirm("Thầy/Cô có muốn nạp lại đầy đủ dữ liệu phân phối chương trình của tất cả các môn từ kho gốc không?")) return;

        initGradeCurricula();
        saveState();
        renderTabPpct();
        renderTabLbgTableOnly();
        renderTabCtlopTableOnly();
        showToast("Đã khôi phục dữ liệu tất cả các môn từ kho mẫu gốc thành công!", "success");
    }

    // =========================================================================
    // TAB 1: RENDER LỊCH BÁO GIẢNG GVBM (TỔNG HỢP)
    // =========================================================================
    function renderTabLbg() {
        renderWeekToolbar("lbg-week-toolbar", renderTabLbg);

        // Populate Filters
        const subSelect = document.getElementById("lbg-filter-subject");
        if (subSelect) {
            const curVal = state.filterSubject;
            subSelect.innerHTML = `<option value="all">-- Tất cả môn dạy --</option>` +
                state.assignedSubjects.map(s => `<option value="${escapeHtml(s)}" ${s === curVal ? 'selected' : ''}>${escapeHtml(s)}</option>`).join('');
            subSelect.onchange = (e) => {
                state.filterSubject = e.target.value;
                renderTabLbgTableOnly();
            };
        }

        const campusSelect = document.getElementById("lbg-filter-campus");
        if (campusSelect) {
            campusSelect.value = state.filterCampus;
            campusSelect.onchange = (e) => {
                state.filterCampus = e.target.value;
                updateLbgClassFilterDropdown();
                renderTabLbgTableOnly();
            };
        }

        updateLbgClassFilterDropdown();

        // Checkbox hide empty rows
        const hideEmptyCheck = document.getElementById("lbg-opt-hide-empty-rows");
        if (hideEmptyCheck) {
            hideEmptyCheck.checked = !!state.lbgOptHideEmptyRows;
            hideEmptyCheck.onchange = (e) => {
                state.lbgOptHideEmptyRows = e.target.checked;
                const other = document.getElementById("ctlop-opt-hide-empty-rows");
                if (other) other.checked = e.target.checked;
                state.ctlopOptHideEmptyRows = e.target.checked;
                saveState();
                renderTabLbgTableOnly();
                renderTabCtlopTableOnly();
            };
        }

        // Sync option checkboxes
        const chkSign = document.getElementById("lbg-opt-col-sign");
        if (chkSign) chkSign.checked = !!state.lbgShowColSign;
        const chkNote = document.getElementById("lbg-opt-col-note");
        if (chkNote) chkNote.checked = (state.lbgShowColNote !== false);
        const chkBgh = document.getElementById("lbg-opt-sig-bgh");
        if (chkBgh) chkBgh.checked = (state.lbgShowBghSign !== false);
        const chkHead = document.getElementById("lbg-opt-sig-head");
        if (chkHead) chkHead.checked = (state.lbgShowHeadSign !== false);
        const chkTeacher = document.getElementById("lbg-opt-sig-teacher");
        if (chkTeacher) chkTeacher.checked = (state.lbgShowTeacherSign !== false);

        // Render dynamic custom column chips
        renderCustomColsManager("lbg-custom-cols-list", false);

        // Header info
        const govBody = document.getElementById("lbg-gov-body");
        if (govBody) govBody.textContent = state.settings.governingBody || "UBND PHƯỜNG TRUNG NHỨT";

        const schoolName = document.getElementById("lbg-school-name");
        if (schoolName) schoolName.textContent = state.settings.schoolName || "TRƯỜNG TIỂU HỌC TRUNG NHỨT";

        const deptHeader = document.getElementById("lbg-department-header");
        if (deptHeader) {
            deptHeader.textContent = `${(state.settings.departmentName || 'TỔ BỘ MÔN').toUpperCase()} — GIÁO VIÊN: ${(state.settings.teacherName || 'NGUYỄN VĂN CHUYÊN').toUpperCase()}`;
        }

        const weekTitle = document.getElementById("lbg-week-title");
        if (weekTitle) weekTitle.textContent = `LỊCH BÁO GIẢNG GIÁO VIÊN BỘ MÔN TUẦN ${state.currentWeek}`;

        const weekInfo = state.weeks.find(w => w.week === state.currentWeek) || { startDateVN: '', endDateVN: '' };
        const dateRange = document.getElementById("lbg-date-range");
        if (dateRange) {
            dateRange.textContent = `(Thời gian thực hiện: Từ ngày ${weekInfo.startDateVN || '...'} đến ngày ${weekInfo.endDateVN || '...'})`;
        }

        const subjectsSummary = document.getElementById("lbg-subjects-summary");
        if (subjectsSummary) {
            subjectsSummary.textContent = "Môn giảng dạy: " + (state.assignedSubjects.length > 0 ? state.assignedSubjects.join(", ") : "Chưa chọn môn");
        }

        // Signatures
        const sigTeacher = document.getElementById("lbg-sig-teacher");
        if (sigTeacher) sigTeacher.textContent = state.settings.teacherName || "Nguyễn Văn Chuyên";

        const sigHead = document.getElementById("lbg-sig-head");
        if (sigHead) sigHead.textContent = state.settings.headOfDepartment || "Lê Văn Trưởng";

        const sigPht = document.getElementById("lbg-sig-pht");
        if (sigPht) {
            const bghSigner = getBghSignerInfo("LBG");
            sigPht.textContent = bghSigner.name;
            const bghRole = document.getElementById("lbg-bgh-role");
            if (bghRole) bghRole.textContent = bghSigner.roleTitle;
        }

        // Toggle signature boxes visibility
        const boxBgh = document.getElementById("lbg-sig-box-bgh");
        if (boxBgh) boxBgh.style.display = (state.lbgShowBghSign !== false) ? "" : "none";
        const boxHead = document.getElementById("lbg-sig-box-head");
        if (boxHead) boxHead.style.display = (state.lbgShowHeadSign !== false) ? "" : "none";
        const boxTeacher = document.getElementById("lbg-sig-box-teacher");
        if (boxTeacher) boxTeacher.style.display = (state.lbgShowTeacherSign !== false) ? "" : "none";

        renderTabLbgTableOnly();
    }

    function updateLbgClassFilterDropdown() {
        const classSelect = document.getElementById("lbg-filter-class");
        if (!classSelect) return;
        const curVal = state.filterClass;
        let classes = state.allClasses || [];
        if (state.filterCampus !== "all") {
            classes = classes.filter(c => c.campusId === state.filterCampus);
        }

        classSelect.innerHTML = `<option value="all">-- Tất cả các lớp --</option>` +
            classes.map(c => `<option value="${c.name}" ${c.name === curVal ? 'selected' : ''}>${c.name} (Khối ${c.grade})</option>`).join('');
        
        classSelect.onchange = (e) => {
            state.filterClass = e.target.value;
            renderTabLbgTableOnly();
        };
    }

    function renderTabLbgTableOnly() {
        const tbody = document.getElementById("lbg-table-body");
        if (!tbody) return;

        const weekNum = state.currentWeek;
        const weekInfo = state.weeks.find(w => w.week === weekNum) || { startDateVN: '' };
        const schedule = calculateWeekScheduleForBm(
            weekNum,
            state.filterSubject,
            state.filterCampus,
            state.filterClass,
            state.lbgOptHideEmptyRows
        );

        const orderedCols = getLbgOrderedColumns(state.lbgCustomCols, state.lbgShowColSign, state.lbgShowColNote, false);

        // Dynamically update Table Header columns
        const theadTr = document.querySelector("#tab-lbg .table-lbg thead tr");
        if (theadTr) {
            let colsHtml = "";
            orderedCols.forEach(col => {
                if (col.key === 'day') colsHtml += `<th style="width: 105px;">Thứ, ngày</th>`;
                else if (col.key === 'session') colsHtml += `<th style="width: 60px;">Buổi</th>`;
                else if (col.key === 'period') colsHtml += `<th style="width: 45px;">Tiết</th>`;
                else if (col.key === 'class') colsHtml += `<th style="width: 80px; text-align: center; background: #e0e7ff; color: #312e81; font-weight: 800;">Lớp</th>`;
                else if (col.key === 'subject') colsHtml += `<th style="width: 110px; text-align: center;">Môn học</th>`;
                else if (col.key === 'ppct') colsHtml += `<th style="width: 75px; text-align: center;">Tiết PPCT</th>`;
                else if (col.key === 'lesson') colsHtml += `<th>Tên bài dạy chi tiết (Nhấp đúp vào ô để sửa trực tiếp)</th>`;
                else if (col.key === 'sign') colsHtml += `<th style="width: 75px; text-align: center;" class="col-sign">Kí tên</th>`;
                else if (col.key === 'note') colsHtml += `<th style="width: 120px;" class="col-note">Ghi chú</th>`;
                else if (col.isCustom) colsHtml += `<th style="width: 110px;" class="col-custom col-custom-${col.id}">${escapeHtml(col.title)}</th>`;
            });
            colsHtml += `<th style="width: 75px;" class="no-print">Thao tác</th>`;
            theadTr.innerHTML = colsHtml;
        }

        if (schedule.length === 0) {
            const totalCols = orderedCols.length + 1;
            tbody.innerHTML = `<tr><td colspan="${totalCols}" style="text-align:center; padding: 2rem; color: var(--text-muted);">Không có tiết dạy nào phù hợp với bộ lọc hiện tại.</td></tr>`;
            updateLbgStatistics(schedule);
            return;
        }

        // Group rows by day for spanning
        let html = "";
        let i = 0;
        while (i < schedule.length) {
            const curDay = schedule[i].day;
            let j = i;
            while (j < schedule.length && schedule[j].day === curDay) {
                j++;
            }
            const daySpan = j - i;
            const dateStr = getDayDateStr(weekInfo.startDateVN, curDay);

            for (let k = i; k < j; k++) {
                const row = schedule[k];
                const rowKey = `w${weekNum}_s${row.slotIndex}`;
                html += "<tr>";

                let dayCellHtml = "";
                if (k === i) {
                    dayCellHtml = `<td rowspan="${daySpan}" style="text-align: center; vertical-align: middle; font-weight: 700; background: #fafafa;">${dateStr.replace('\n', '<br><span style="font-size:0.8em;font-weight:normal;color:#64748b;">')}</span></td>`;
                }

                orderedCols.forEach(col => {
                    if (col.key === 'day') {
                        if (dayCellHtml) html += dayCellHtml;
                    } else if (col.key === 'session') {
                        html += `<td style="text-align: center; vertical-align: middle;">${escapeHtml(row.session)}</td>`;
                    } else if (col.key === 'period') {
                        html += `<td style="text-align: center; vertical-align: middle; font-weight: 700;">${row.period}</td>`;
                    } else if (col.key === 'class') {
                        if (row.isEmpty) {
                            html += `<td style="text-align: center; color: #94a3b8; font-style: italic;">--</td>`;
                        } else {
                            const badgeCls = getCampusBadgeClass(row.campusId);
                            html += `<td style="text-align: center; vertical-align: middle;"><span class="${badgeCls}">${escapeHtml(row.className)}</span></td>`;
                        }
                    } else if (col.key === 'subject') {
                        if (row.isEmpty) {
                            html += `<td style="text-align: center; color: #94a3b8; font-style: italic;">-- Nghỉ --</td>`;
                        } else {
                            html += `<td style="text-align: center; font-weight: 600; vertical-align: middle;">${escapeHtml(row.subject)}</td>`;
                        }
                    } else if (col.key === 'ppct') {
                        if (row.isEmpty) {
                            html += `<td style="text-align: center; color: #94a3b8;">-</td>`;
                        } else {
                            html += `<td style="text-align: center; font-weight: 700; vertical-align: middle; color: var(--primary);">${row.ppct || ''}</td>`;
                        }
                    } else if (col.key === 'lesson') {
                        if (row.isEmpty) {
                            html += `<td style="text-align: center; color: #94a3b8; font-style: italic;">-- Để trống --</td>`;
                        } else {
                            html += `<td style="vertical-align: middle; cursor: pointer;" title="Nhấp đúp để chỉnh sửa tên bài dạy" ondblclick="editLessonNameInline(${row.grade}, '${escapeHtml(row.normSub)}', ${weekNum}, ${row.periodInWeek}, this)">${escapeHtml(row.lessonName || '')}</td>`;
                        }
                    } else if (col.key === 'sign') {
                        html += `<td class="col-sign" style="text-align: center; color: #94a3b8;"></td>`;
                    } else if (col.key === 'note') {
                        const noteVal = (state.slotNotes && state.slotNotes[rowKey]) || row.note || '';
                        html += `<td class="col-note editable-cell" contenteditable="${!row.isEmpty}" data-key="${rowKey}" data-field="note" style="font-size: 0.85rem; text-align: left; vertical-align: middle;">${escapeHtml(noteVal)}</td>`;
                    } else if (col.isCustom) {
                        const customVal = (state.slotCustomCols && state.slotCustomCols[rowKey] && state.slotCustomCols[rowKey][col.id]) || '';
                        html += `<td class="col-custom editable-cell" contenteditable="${!row.isEmpty}" data-key="${rowKey}" data-field="customCol_${col.id}" data-col-id="${col.id}" style="font-size: 0.85rem; text-align: left; vertical-align: middle;">${escapeHtml(customVal)}</td>`;
                    }
                });

                if (row.isEmpty) {
                    html += `<td class="no-print" style="text-align: center;">-</td>`;
                } else {
                    html += `<td class="no-print" style="text-align: center; vertical-align: middle;">
                        <button type="button" class="btn btn-secondary btn-sm" style="padding: 0.15rem 0.4rem; font-size: 0.75rem;" onclick="openSlotEditPrompt(${row.slotIndex})">✏️</button>
                    </td>`;
                }

                html += "</tr>";
            }
            i = j;
        }

        tbody.innerHTML = html;
        bindTableEditableBlurEvents(tbody);
        updateLbgStatistics(schedule);
    }

    function updateLbgStatistics(schedule) {
        const totalStat = document.getElementById("lbg-stat-total");
        const classesStat = document.getElementById("lbg-stat-classes");
        const bySubjectsStat = document.getElementById("lbg-stat-by-subjects");

        const taughtRows = schedule.filter(r => !r.isEmpty);
        if (totalStat) totalStat.textContent = taughtRows.length + " tiết";

        const uniqueClasses = [...new Set(taughtRows.map(r => r.className))];
        if (classesStat) classesStat.textContent = uniqueClasses.length + " lớp";

        if (bySubjectsStat) {
            const counts = {};
            taughtRows.forEach(r => {
                counts[r.normSub] = (counts[r.normSub] || 0) + 1;
            });
            const parts = Object.keys(counts).map(s => `<strong>${s}</strong>: ${counts[s]} tiết`);
            bySubjectsStat.innerHTML = `<span class="stat-label">Phân bổ môn:</span> <span class="stat-value" style="font-size:0.85rem;font-weight:normal;">${parts.join(' | ') || '0'}</span>`;
        }
    }

    // =========================================================================
    // TAB 2: RENDER LỊCH BÁO GIẢNG & TÍCH HỢP XEM THEO LỚP
    // =========================================================================
    function renderTabCtlop() {
        renderWeekToolbar("ctlop-week-toolbar", renderTabCtlop);

        // Populate Class filter
        const classSelect = document.getElementById("ctlop-filter-class");
        if (classSelect) {
            const curCls = state.ctlopFilterClass;
            const myAssigned = (state.allClasses || []).filter(c => c.isAssigned);
            const classesToList = myAssigned.length > 0 ? myAssigned : state.allClasses;

            classSelect.innerHTML = `<option value="all">-- Tất cả các lớp (${classesToList.length} lớp) --</option>` +
                classesToList.map(c => `<option value="${c.name}" ${c.name === curCls ? 'selected' : ''}>Lớp ${c.name} - Khối ${c.grade} (${getCampusName(state.campuses, c.campusId)})</option>`).join('');

            classSelect.onchange = (e) => {
                state.ctlopFilterClass = e.target.value;
                renderTabCtlopTableOnly();
            };
        }

        // Populate Subject filter
        const subSelect = document.getElementById("ctlop-filter-subject");
        if (subSelect) {
            const curSub = state.ctlopFilterSubject;
            subSelect.innerHTML = `<option value="all">-- Tất cả môn --</option>` +
                state.assignedSubjects.map(s => `<option value="${escapeHtml(s)}" ${s === curSub ? 'selected' : ''}>${escapeHtml(s)}</option>`).join('');
            subSelect.onchange = (e) => {
                state.ctlopFilterSubject = e.target.value;
                renderTabCtlopTableOnly();
            };
        }

        const hideEmptyCheck = document.getElementById("ctlop-opt-hide-empty-rows");
        if (hideEmptyCheck) {
            hideEmptyCheck.checked = !!state.ctlopOptHideEmptyRows;
            hideEmptyCheck.onchange = (e) => {
                state.ctlopOptHideEmptyRows = e.target.checked;
                const other = document.getElementById("lbg-opt-hide-empty-rows");
                if (other) other.checked = e.target.checked;
                state.lbgOptHideEmptyRows = e.target.checked;
                saveState();
                renderTabLbgTableOnly();
                renderTabCtlopTableOnly();
            };
        }

        // Sync option checkboxes
        const chkSign = document.getElementById("ctlop-opt-col-sign");
        if (chkSign) chkSign.checked = !!state.lbgShowColSign;
        const chkNote = document.getElementById("ctlop-opt-col-note");
        if (chkNote) chkNote.checked = (state.lbgShowColNote !== false);
        const chkBgh = document.getElementById("ctlop-opt-sig-bgh");
        if (chkBgh) chkBgh.checked = (state.lbgShowBghSign !== false);
        const chkHead = document.getElementById("ctlop-opt-sig-head");
        if (chkHead) chkHead.checked = (state.lbgShowHeadSign !== false);
        const chkTeacher = document.getElementById("ctlop-opt-sig-teacher");
        if (chkTeacher) chkTeacher.checked = (state.lbgShowTeacherSign !== false);

        // Render dynamic custom column chips
        renderCustomColsManager("ctlop-custom-cols-list", false);

        // Header info
        const govBody = document.getElementById("ctlop-gov-body");
        if (govBody) govBody.textContent = state.settings.governingBody || "UBND PHƯỜNG TRUNG NHỨT";

        const schoolName = document.getElementById("ctlop-school-name");
        if (schoolName) schoolName.textContent = state.settings.schoolName || "TRƯỜNG TIỂU HỌC TRUNG NHỨT";

        const clsHeader = document.getElementById("ctlop-class-header");
        if (clsHeader) {
            if (state.ctlopFilterClass !== "all") {
                clsHeader.textContent = `LỊCH BÁO GIẢNG & TÍCH HỢP TẠI LỚP ${state.ctlopFilterClass.toUpperCase()} — GV: ${(state.settings.teacherName || '').toUpperCase()}`;
            } else {
                clsHeader.textContent = `LỊCH BÁO GIẢNG & TÍCH HỢP TẠI CÁC LỚP — GV: ${(state.settings.teacherName || '').toUpperCase()}`;
            }
        }

        const weekTitle = document.getElementById("ctlop-week-title");
        if (weekTitle) weekTitle.textContent = `LỊCH BÁO GIẢNG TÍCH HỢP TUẦN ${state.currentWeek}`;

        const weekInfo = state.weeks.find(w => w.week === state.currentWeek) || { startDateVN: '', endDateVN: '' };
        const dateRange = document.getElementById("ctlop-date-range");
        if (dateRange) dateRange.textContent = `(Thời gian thực hiện: Từ ngày ${weekInfo.startDateVN || '...'} đến ngày ${weekInfo.endDateVN || '...'})`;

        // Signatures
        const sigTeacher = document.getElementById("ctlop-sig-teacher");
        if (sigTeacher) sigTeacher.textContent = state.settings.teacherName || "Nguyễn Văn Chuyên";

        const sigHead = document.getElementById("ctlop-sig-head");
        if (sigHead) sigHead.textContent = state.settings.headOfDepartment || "Lê Văn Trưởng";

        const sigPht = document.getElementById("ctlop-sig-pht");
        if (sigPht) {
            const bghSigner = getBghSignerInfo("LBG");
            sigPht.textContent = bghSigner.name;
        }

        // Toggle signature boxes visibility
        const boxBgh = document.getElementById("ctlop-sig-box-bgh");
        if (boxBgh) boxBgh.style.display = (state.lbgShowBghSign !== false) ? "" : "none";
        const boxHead = document.getElementById("ctlop-sig-box-head");
        if (boxHead) boxHead.style.display = (state.lbgShowHeadSign !== false) ? "" : "none";
        const boxTeacher = document.getElementById("ctlop-sig-box-teacher");
        if (boxTeacher) boxTeacher.style.display = (state.lbgShowTeacherSign !== false) ? "" : "none";

        renderTabCtlopTableOnly();
    }

    function renderTabCtlopTableOnly() {
        const tbody = document.getElementById("ctlop-table-body");
        if (!tbody) return;

        const weekNum = state.currentWeek;
        const weekInfo = state.weeks.find(w => w.week === weekNum) || { startDateVN: '' };
        const schedule = calculateWeekScheduleForBm(
            weekNum,
            state.ctlopFilterSubject,
            "all",
            state.ctlopFilterClass,
            state.ctlopOptHideEmptyRows
        );

        const orderedCols = getLbgOrderedColumns(state.lbgCustomCols, state.lbgShowColSign, state.lbgShowColNote, true);

        // Dynamically update Table Header columns
        const theadTr = document.querySelector("#tab-ctlop .table-lbg thead tr");
        if (theadTr) {
            let colsHtml = "";
            orderedCols.forEach(col => {
                if (col.key === 'day') colsHtml += `<th style="width: 105px;">Thứ, ngày</th>`;
                else if (col.key === 'session') colsHtml += `<th style="width: 60px;">Buổi</th>`;
                else if (col.key === 'period') colsHtml += `<th style="width: 45px;">Tiết</th>`;
                else if (col.key === 'class') colsHtml += `<th style="width: 80px; text-align: center; background: #e0e7ff; color: #312e81; font-weight: 800;">Lớp</th>`;
                else if (col.key === 'subject') colsHtml += `<th style="width: 110px; text-align: center;">Môn học</th>`;
                else if (col.key === 'ppct') colsHtml += `<th style="width: 75px; text-align: center;">Tiết PPCT</th>`;
                else if (col.key === 'lesson') colsHtml += `<th style="min-width: 240px;">Tên bài dạy chi tiết</th>`;
                else if (col.key === 'integ') colsHtml += `<th style="min-width: 220px;">Nội dung tích hợp / Điều chỉnh</th>`;
                else if (col.key === 'sign') colsHtml += `<th style="width: 75px; text-align: center;" class="col-sign">Kí tên</th>`;
                else if (col.key === 'note') colsHtml += `<th style="width: 120px;" class="col-note">Ghi chú</th>`;
                else if (col.isCustom) colsHtml += `<th style="width: 110px;" class="col-custom col-custom-${col.id}">${escapeHtml(col.title)}</th>`;
            });
            colsHtml += `<th style="width: 75px;" class="no-print">Thao tác</th>`;
            theadTr.innerHTML = colsHtml;
        }

        if (schedule.length === 0) {
            const totalCols = orderedCols.length + 1;
            tbody.innerHTML = `<tr><td colspan="${totalCols}" style="text-align:center; padding: 2rem; color: var(--text-muted);">Không có tiết dạy nào tại lớp được chọn trong tuần này.</td></tr>`;
            return;
        }

        let html = "";
        let i = 0;
        while (i < schedule.length) {
            const curDay = schedule[i].day;
            let j = i;
            while (j < schedule.length && schedule[j].day === curDay) {
                j++;
            }
            const daySpan = j - i;
            const dateStr = getDayDateStr(weekInfo.startDateVN, curDay);

            for (let k = i; k < j; k++) {
                const row = schedule[k];
                const rowKey = `w${weekNum}_s${row.slotIndex}`;
                html += "<tr>";

                let dayCellHtml = "";
                if (k === i) {
                    dayCellHtml = `<td rowspan="${daySpan}" style="text-align: center; vertical-align: middle; font-weight: 700; background: #fafafa;">${dateStr.replace('\n', '<br><span style="font-size:0.8em;font-weight:normal;color:#64748b;">')}</span></td>`;
                }

                orderedCols.forEach(col => {
                    if (col.key === 'day') {
                        if (dayCellHtml) html += dayCellHtml;
                    } else if (col.key === 'session') {
                        html += `<td style="text-align: center; vertical-align: middle;">${escapeHtml(row.session)}</td>`;
                    } else if (col.key === 'period') {
                        html += `<td style="text-align: center; vertical-align: middle; font-weight: 700;">${row.period}</td>`;
                    } else if (col.key === 'class') {
                        if (row.isEmpty) {
                            html += `<td style="text-align: center; color: #94a3b8;">--</td>`;
                        } else {
                            const badgeCls = getCampusBadgeClass(row.campusId);
                            html += `<td style="text-align: center; vertical-align: middle;"><span class="${badgeCls}">${escapeHtml(row.className)}</span></td>`;
                        }
                    } else if (col.key === 'subject') {
                        if (row.isEmpty) {
                            html += `<td style="text-align: center; color: #94a3b8; font-style: italic;">-- Nghỉ --</td>`;
                        } else {
                            html += `<td style="text-align: center; font-weight: 600; vertical-align: middle;">${escapeHtml(row.subject)}</td>`;
                        }
                    } else if (col.key === 'ppct') {
                        if (row.isEmpty) {
                            html += `<td style="text-align: center; color: #94a3b8;">-</td>`;
                        } else {
                            html += `<td style="text-align: center; font-weight: 700; vertical-align: middle; color: var(--primary);">${row.ppct || ''}</td>`;
                        }
                    } else if (col.key === 'lesson') {
                        if (row.isEmpty) {
                            html += `<td style="text-align: center; color: #94a3b8; font-style: italic;">-- Để trống --</td>`;
                        } else {
                            html += `<td style="vertical-align: middle;">${escapeHtml(row.lessonName || '')}</td>`;
                        }
                    } else if (col.key === 'integ') {
                        if (row.isEmpty) {
                            html += `<td style="text-align: center; color: #94a3b8;"></td>`;
                        } else {
                            html += `<td style="vertical-align: middle; font-size: 0.85rem; color: #047857;" title="Nhấp đúp để sửa nội dung tích hợp" ondblclick="editIntegrationInline(${row.grade}, '${escapeHtml(row.normSub)}', ${weekNum}, ${row.periodInWeek}, this)">${escapeHtml(row.integration || '').replace(/\n/g, '<br>')}</td>`;
                        }
                    } else if (col.key === 'sign') {
                        html += `<td class="col-sign" style="text-align: center; color: #94a3b8;"></td>`;
                    } else if (col.key === 'note') {
                        const noteVal = (state.slotNotes && state.slotNotes[rowKey]) || row.note || '';
                        html += `<td class="col-note editable-cell" contenteditable="${!row.isEmpty}" data-key="${rowKey}" data-field="note" style="font-size: 0.85rem; text-align: left; vertical-align: middle;">${escapeHtml(noteVal)}</td>`;
                    } else if (col.isCustom) {
                        const customVal = (state.slotCustomCols && state.slotCustomCols[rowKey] && state.slotCustomCols[rowKey][col.id]) || '';
                        html += `<td class="col-custom editable-cell" contenteditable="${!row.isEmpty}" data-key="${rowKey}" data-field="customCol_${col.id}" data-col-id="${col.id}" style="font-size: 0.85rem; text-align: left; vertical-align: middle;">${escapeHtml(customVal)}</td>`;
                    }
                });

                if (row.isEmpty) {
                    html += `<td class="no-print" style="text-align: center;">-</td>`;
                } else {
                    html += `<td class="no-print" style="text-align: center; vertical-align: middle;">
                        <button type="button" class="btn btn-secondary btn-sm" style="padding: 0.15rem 0.4rem; font-size: 0.75rem;" onclick="openSlotEditPrompt(${row.slotIndex})">✏️</button>
                    </td>`;
                }

                html += "</tr>";
            }
            i = j;
        }

        tbody.innerHTML = html;
        bindTableEditableBlurEvents(tbody);
    }

    function bindTableEditableBlurEvents(tbody) {
        if (!tbody) return;
        tbody.querySelectorAll(".editable-cell").forEach(cell => {
            cell.addEventListener("blur", (e) => {
                const key = e.target.dataset.key;
                const field = e.target.dataset.field;
                const colId = e.target.dataset.colId;
                const val = e.target.innerText.trim();
                if (!key) return;
                if (field === "note") {
                    if (!state.slotNotes) state.slotNotes = {};
                    state.slotNotes[key] = val;
                } else if (colId) {
                    if (!state.slotCustomCols) state.slotCustomCols = {};
                    if (!state.slotCustomCols[key]) state.slotCustomCols[key] = {};
                    state.slotCustomCols[key][colId] = val;
                }
                saveState();
            });
        });
    }

    // =========================================================================
    // TAB 3: RENDER LỊCH BÁO GIẢNG GOM THEO MÔN HỌC
    // =========================================================================
    function renderTabLbgMon() {
        renderWeekToolbar("lbgmon-week-toolbar", renderTabLbgMon);

        const subSelect = document.getElementById("lbgmon-filter-subject");
        if (subSelect) {
            const curVal = state.lbgMonFilterSubject;
            subSelect.innerHTML = `<option value="all">-- Hiển thị tất cả môn --</option>` +
                state.assignedSubjects.map(s => `<option value="${escapeHtml(s)}" ${s === curVal ? 'selected' : ''}>${escapeHtml(s)}</option>`).join('');
            subSelect.onchange = (e) => {
                state.lbgMonFilterSubject = e.target.value;
                renderTabLbgMonTableOnly();
            };
        }

        const integToggle = document.getElementById("lbgmon-toggle-integration");
        if (integToggle) {
            integToggle.checked = state.lbgMonShowIntegration;
            integToggle.onchange = (e) => {
                state.lbgMonShowIntegration = e.target.checked;
                const thInteg = document.getElementById("lbgmon-th-integ");
                if (thInteg) thInteg.style.display = state.lbgMonShowIntegration ? "" : "none";
                renderTabLbgMonTableOnly();
            };
        }

        const hideEmptyCheck = document.getElementById("lbgmon-opt-hide-empty-rows");
        if (hideEmptyCheck) {
            hideEmptyCheck.checked = state.lbgMonOptHideEmptyRows;
            hideEmptyCheck.onchange = (e) => {
                state.lbgMonOptHideEmptyRows = e.target.checked;
                renderTabLbgMonTableOnly();
            };
        }

        // Header info
        const govBody = document.getElementById("lbgmon-gov-body");
        if (govBody) govBody.textContent = state.settings.governingBody || "UBND PHƯỜNG TRUNG NHỨT";

        const schoolName = document.getElementById("lbgmon-school-name");
        if (schoolName) schoolName.textContent = state.settings.schoolName || "TRƯỜNG TIỂU HỌC TRUNG NHỨT";

        const deptHeader = document.getElementById("lbgmon-department-header");
        if (deptHeader) {
            deptHeader.textContent = `${(state.settings.departmentName || 'TỔ BỘ MÔN').toUpperCase()} — GIÁO VIÊN: ${(state.settings.teacherName || 'NGUYỄN VĂN CHUYÊN').toUpperCase()}`;
        }

        const weekTitle = document.getElementById("lbgmon-week-title");
        if (weekTitle) weekTitle.textContent = `LỊCH BÁO GIẢNG THEO MÔN HỌC TUẦN ${state.currentWeek}`;

        const weekInfo = state.weeks.find(w => w.week === state.currentWeek) || { startDateVN: '', endDateVN: '' };
        const dateRange = document.getElementById("lbgmon-date-range");
        if (dateRange) dateRange.textContent = `(Thời gian thực hiện: Từ ngày ${weekInfo.startDateVN || '...'} đến ngày ${weekInfo.endDateVN || '...'})`;

        // Signatures
        const sigTeacher = document.getElementById("lbgmon-sig-teacher");
        if (sigTeacher) sigTeacher.textContent = state.settings.teacherName || "Nguyễn Văn Chuyên";

        const sigHead = document.getElementById("lbgmon-sig-head");
        if (sigHead) sigHead.textContent = state.settings.headOfDepartment || "Lê Văn Trưởng";

        const sigPht = document.getElementById("lbgmon-sig-pht");
        if (sigPht) {
            const bghSigner = getBghSignerInfo("LBG");
            sigPht.textContent = bghSigner.name;
        }

        renderTabLbgMonTableOnly();
    }

    function renderTabLbgMonTableOnly() {
        const tbody = document.getElementById("lbgmon-table-body");
        if (!tbody) return;

        const weekNum = state.currentWeek;
        const weekInfo = state.weeks.find(w => w.week === weekNum) || { startDateVN: '' };
        const groups = calculateWeekScheduleBySubjectForBm(
            weekNum,
            state.lbgMonFilterSubject,
            state.lbgMonOptHideEmptyRows
        );

        if (groups.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding: 2rem; color: var(--text-muted);">Không có tiết dạy nào theo môn trong tuần này.</td></tr>`;
            return;
        }

        let html = "";
        groups.forEach(grp => {
            const colSpan = state.lbgMonShowIntegration ? 9 : 8;
            html += `<tr style="background: #e2e8f0; font-weight: 800; color: #1e3a8a;">
                <td colspan="${colSpan}" style="padding: 0.5rem 1rem; font-size: 0.95rem; text-transform: uppercase;">
                    📚 MÔN: ${escapeHtml(grp.subject)} (${grp.rows.length} tiết)
                </td>
            </tr>`;

            grp.rows.forEach(row => {
                const dateStr = getDayDateStr(weekInfo.startDateVN, row.day);
                const badgeCls = getCampusBadgeClass(row.campusId);
                html += "<tr>";
                html += `<td style="text-align: center; vertical-align: middle; font-weight: 600;">${dateStr.replace('\n', '<br><span style="font-size:0.8em;font-weight:normal;color:#64748b;">')}</span></td>`;
                html += `<td style="text-align: center; vertical-align: middle;">${escapeHtml(row.session)}</td>`;
                html += `<td style="text-align: center; vertical-align: middle; font-weight: 700;">${row.period}</td>`;
                html += `<td style="text-align: center; vertical-align: middle;"><span class="${badgeCls}">${escapeHtml(row.className)}</span></td>`;
                html += `<td style="font-weight: 600; vertical-align: middle;">${escapeHtml(row.subject)}</td>`;
                html += `<td style="text-align: center; font-weight: 700; vertical-align: middle; color: var(--primary);">${row.ppct || ''}</td>`;
                html += `<td style="vertical-align: middle;">${escapeHtml(row.lessonName || '')}</td>`;
                if (state.lbgMonShowIntegration) {
                    html += `<td style="vertical-align: middle; font-size: 0.85rem; color: #047857;">${escapeHtml(row.integration || '').replace(/\n/g, '<br>')}</td>`;
                }
                html += `<td class="no-print" style="text-align: center; vertical-align: middle;">
                    <button type="button" class="btn btn-secondary btn-sm" style="padding: 0.15rem 0.4rem; font-size: 0.75rem;" onclick="openSlotEditPrompt(${row.slotIndex})">✏️</button>
                </td>`;
                html += "</tr>";
            });
        });

        tbody.innerHTML = html;
    }

    // =========================================================================
    // TAB 4: RENDER PPCT & KHDH CÁC KHỐI
    // =========================================================================
    function renderTabPpct() {
        const gradeSelect = document.getElementById("ppct-grade-select");
        if (gradeSelect) {
            gradeSelect.value = state.ppctCurrentGrade;
            gradeSelect.onchange = (e) => {
                state.ppctCurrentGrade = parseInt(e.target.value, 10);
                updatePpctSubjectDropdown();
                renderTabPpctTableOnly();
            };
        }

        const chkFilter = document.getElementById("ppct-filter-only-assigned");
        if (chkFilter) {
            chkFilter.checked = (state.ppctFilterOnlyAssigned !== false);
            chkFilter.onchange = (e) => {
                state.ppctFilterOnlyAssigned = e.target.checked;
                saveState();
                updatePpctSubjectDropdown();
                renderTabPpctTableOnly();
            };
        }

        const btnManageSubs = document.getElementById("btn-ppct-manage-subjects");
        if (btnManageSubs) {
            btnManageSubs.onclick = () => {
                switchActiveTab("tab-settings");
                setTimeout(() => {
                    const el = document.getElementById("assigned-subjects-tags-container");
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 150);
            };
        }

        updatePpctSubjectDropdown();
        renderTabPpctTableOnly();
    }

    function updatePpctSubjectDropdown() {
        const subSelect = document.getElementById("ppct-subject-select");
        if (!subSelect) return;

        const grade = state.ppctCurrentGrade;
        const ppctList = state.gradeCurricula[grade] || [];
        let subjects = [...new Set(ppctList.map(x => x.subject))];

        const chkFilter = document.getElementById("ppct-filter-only-assigned");
        if (chkFilter) {
            chkFilter.checked = (state.ppctFilterOnlyAssigned !== false);
        }

        if (state.ppctFilterOnlyAssigned !== false && Array.isArray(state.assignedSubjects) && state.assignedSubjects.length > 0) {
            const assignedNorms = state.assignedSubjects.map(s => normalizeSubjectName(s));
            const filtered = subjects.filter(s => assignedNorms.includes(normalizeSubjectName(s)));
            if (filtered.length > 0) {
                subjects = filtered;
            }
        }

        if (!subjects.includes(state.ppctCurrentSubject) && subjects.length > 0) {
            // Find a subject in assignedSubjects if possible
            const match = subjects.find(s => state.assignedSubjects.some(as => normalizeSubjectName(as) === normalizeSubjectName(s)));
            state.ppctCurrentSubject = match || subjects[0];
        }

        if (subjects.length === 0) {
            subSelect.innerHTML = `<option value="">-- Chưa có môn phụ trách nào trong khối này --</option>`;
        } else {
            subSelect.innerHTML = subjects.map(s => `<option value="${escapeHtml(s)}" ${s === state.ppctCurrentSubject ? 'selected' : ''}>${escapeHtml(s)}</option>`).join('');
        }

        subSelect.onchange = (e) => {
            state.ppctCurrentSubject = e.target.value;
            renderTabPpctTableOnly();
        };
    }

    function renderTabPpctTableOnly() {
        const tbody = document.getElementById("ppct-table-body");
        const titleEl = document.getElementById("ppct-table-title");
        if (!tbody) return;

        const grade = state.ppctCurrentGrade;
        const subject = state.ppctCurrentSubject;
        const list = (state.gradeCurricula[grade] || []).filter(item => item.subject === subject);

        if (titleEl) {
            titleEl.innerHTML = `📖 PPCT Môn <strong>${escapeHtml(subject)}</strong> — Khối ${grade} (${list.length} tiết)`;
        }

        if (list.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 2rem; color: var(--text-muted);">Không có bài dạy nào cho môn ${escapeHtml(subject)} ở Khối ${grade}.</td></tr>`;
            return;
        }

        tbody.innerHTML = list.map((item, idx) => `
            <tr>
                <td style="text-align: center; vertical-align: middle; font-weight: 700;">${item.week}</td>
                <td style="vertical-align: middle;">${escapeHtml(item.subject)}</td>
                <td style="text-align: center; vertical-align: middle;">${item.periodInWeek || 1}</td>
                <td style="text-align: center; vertical-align: middle; font-weight: 800; color: var(--primary);">${item.ppct}</td>
                <td style="vertical-align: middle; cursor: pointer;" title="Nhấp để sửa" ondblclick="editPpctLessonInline(${grade}, '${escapeHtml(item.subject)}', ${item.ppct}, 'lessonName', this)">${escapeHtml(item.lessonName || '')}</td>
                <td style="vertical-align: middle; font-size: 0.85rem; color: #047857; cursor: pointer;" title="Nhấp để sửa" ondblclick="editPpctLessonInline(${grade}, '${escapeHtml(item.subject)}', ${item.ppct}, 'integration', this)">${escapeHtml(item.integration || '').replace(/\n/g, '<br>')}</td>
                <td style="text-align: center; vertical-align: middle; font-size: 0.85rem; color: #64748b;">${escapeHtml(item.duration || '')}</td>
                <td class="no-print" style="text-align: center; vertical-align: middle;">
                    <button type="button" class="btn btn-secondary btn-sm" style="padding: 0.15rem 0.4rem; color: #b91c1c;" onclick="deletePpctLesson(${grade}, '${escapeHtml(item.subject)}', ${item.ppct})">🗑️</button>
                </td>
            </tr>
        `).join('');
    }

    // =========================================================================
    // TAB 5: RENDER LỊCH 35 TUẦN
    // =========================================================================
    function renderTabLichtuan() {
        const tbody = document.getElementById("lichtuan-table-body");
        if (!tbody) return;

        tbody.innerHTML = state.weeks.map(w => `
            <tr>
                <td style="text-align: center; vertical-align: middle; font-weight: 700;">Học kỳ ${w.semester}</td>
                <td style="text-align: center; vertical-align: middle; font-weight: 800; color: var(--primary);">Tuần ${w.week}</td>
                <td style="text-align: center; vertical-align: middle;">${w.startDateVN}</td>
                <td style="text-align: center; vertical-align: middle;">${w.endDateVN}</td>
                <td style="text-align: center; vertical-align: middle;">${w.month}</td>
                <td style="vertical-align: middle; font-size: 0.85rem; color: #b45309;" contenteditable="true" onblur="state.weeks[${w.week - 1}].holidays = this.innerText; saveState();">${escapeHtml(w.holidays || '')}</td>
                <td style="vertical-align: middle; font-size: 0.85rem;" contenteditable="true" onblur="state.weeks[${w.week - 1}].notes = this.innerText; saveState();">${escapeHtml(w.notes || '')}</td>
            </tr>
        `).join('');
    }

    // =========================================================================
    // TAB 6: RENDER CÀI ĐẶT MÔN DẠY, PHÂN HIỆU, LỚP HỌC & TKB CÁ NHÂN GVBM
    // =========================================================================
    function renderTabSettings() {
        // Section 1: General Info
        const setGov = document.getElementById("set-gov-body");
        if (setGov) setGov.value = state.settings.governingBody || "";

        const setSchool = document.getElementById("set-school-name");
        if (setSchool) setSchool.value = state.settings.schoolName || "";

        const setYear = document.getElementById("set-academic-year");
        if (setYear) setYear.value = state.settings.academicYear || "2026 - 2027";

        const setLoc = document.getElementById("set-location");
        if (setLoc) setLoc.value = state.settings.location || "Trung Nhứt";

        const setTeacher = document.getElementById("set-teacher");
        if (setTeacher) setTeacher.value = state.settings.teacherName || "Nguyễn Văn Chuyên";

        const setDept = document.getElementById("set-department");
        if (setDept) setDept.value = state.settings.departmentName || "Tổ Bộ Môn (Tin học - Công nghệ)";

        const setHead = document.getElementById("set-head");
        if (setHead) setHead.value = state.settings.headOfDepartment || "Lê Văn Trưởng";

        const setDate = document.getElementById("set-date");
        if (setDate) setDate.value = state.settings.dateString || "ngày 28 tháng 8 năm 2026";

        const setPrincipal = document.getElementById("set-principal");
        if (setPrincipal) {
            setPrincipal.value = state.settings.principal || "Phạm Quốc Hùng";
            setPrincipal.oninput = (e) => {
                state.settings.principal = e.target.value.trim();
                renderBghSignerDropdowns();
            };
        }

        renderPhtListInputs();
        renderBghSignerDropdowns();

        // Section 2: Assigned Subjects
        renderAssignedSubjectsSection();

        // Section 3: Campuses & Classes
        renderCampusesSection();
        renderClassesSection("all");

        // Section 4: Master Timetable
        renderMasterTimetableMatrix();
        renderMasterTimetableDetailed();
    }

    function renderPhtListInputs() {
        const container = document.getElementById("pht-list-container");
        if (!container) return;
        const list = state.settings.vicePrincipals || ["Lê Văn Tám"];
        container.innerHTML = list.map((name, idx) => `
            <div style="display: flex; gap: 0.35rem; align-items: center;">
                <input type="text" class="form-control form-control-sm pht-name-input" data-index="${idx}" value="${escapeHtml(name)}" style="font-weight: 600;">
                ${list.length > 1 ? `<button type="button" class="btn btn-secondary btn-sm" onclick="removePht(${idx})" style="padding: 0.2rem 0.45rem; color: #b91c1c;">✕</button>` : ''}
            </div>
        `).join('');

        container.querySelectorAll(".pht-name-input").forEach(inp => {
            inp.oninput = (e) => {
                const idx = parseInt(e.target.dataset.index, 10);
                if (!isNaN(idx) && state.settings.vicePrincipals) {
                    state.settings.vicePrincipals[idx] = e.target.value.trim();
                    renderBghSignerDropdowns();
                }
            };
        });
    }

    function renderBghSignerDropdowns() {
        const lbgSelect = document.getElementById("set-bgh-signer-lbg-select");
        const khdhSelect = document.getElementById("set-bgh-signer-khdh-select");
        const ht = state.settings.principal || "Phạm Quốc Hùng";
        const phtList = state.settings.vicePrincipals || ["Lê Văn Tám"];

        const optionsHtml = `
            <option value="HT:0">Hiệu trưởng: ${escapeHtml(ht)}</option>
            ${phtList.map((p, i) => `<option value="PHT:${i}">Phó Hiệu trưởng: ${escapeHtml(p)}</option>`).join('')}
        `;

        if (lbgSelect) {
            const currentVal = lbgSelect.value || `${state.settings.bghSignerLbgType || 'PHT'}:${state.settings.bghSignerLbgIndex || 0}`;
            lbgSelect.innerHTML = optionsHtml;
            lbgSelect.value = currentVal;
            if (!lbgSelect.value) lbgSelect.selectedIndex = 0;
            lbgSelect.onchange = (e) => {
                const parts = e.target.value.split(":");
                state.settings.bghSignerLbgType = parts[0];
                state.settings.bghSignerLbgIndex = parseInt(parts[1], 10);
            };
        }

        if (khdhSelect) {
            const currentVal = khdhSelect.value || `${state.settings.bghSignerKhdhType || 'HT'}:${state.settings.bghSignerKhdhIndex || 0}`;
            khdhSelect.innerHTML = optionsHtml;
            khdhSelect.value = currentVal;
            if (!khdhSelect.value) khdhSelect.selectedIndex = 0;
            khdhSelect.onchange = (e) => {
                const parts = e.target.value.split(":");
                state.settings.bghSignerKhdhType = parts[0];
                state.settings.bghSignerKhdhIndex = parseInt(parts[1], 10);
            };
        }
    }

    function getBghSignerInfo(docType = "LBG") {
        const isLbg = (docType === "LBG");
        const signerType = isLbg ? (state.settings.bghSignerLbgType || 'PHT') : (state.settings.bghSignerKhdhType || 'HT');
        const signerIdx = isLbg ? (state.settings.bghSignerLbgIndex || 0) : (state.settings.bghSignerKhdhIndex || 0);

        if (signerType === 'HT') {
            return {
                name: state.settings.principal || "Phạm Quốc Hùng",
                roleTitle: "HIỆU TRƯỞNG",
                docHeaderRole: "DUYỆT CỦA HIỆU TRƯỞNG"
            };
        } else {
            const phtList = state.settings.vicePrincipals || ["Lê Văn Tám"];
            const phtName = phtList[signerIdx] || phtList[0] || "Lê Văn Tám";
            return {
                name: phtName,
                roleTitle: "PHÓ HIỆU TRƯỞNG",
                docHeaderRole: "DUYỆT CỦA BAN GIÁM HIỆU"
            };
        }
    }

    function renderAssignedSubjectsSection() {
        const tagsContainer = document.getElementById("assigned-subjects-tags-container");
        if (tagsContainer) {
            if (state.assignedSubjects.length === 0) {
                tagsContainer.innerHTML = `<span style="color: #dc2626; font-style: italic;">Chưa chọn môn dạy nào! Thầy/Cô vui lòng tick chọn môn bên dưới.</span>`;
            } else {
                tagsContainer.innerHTML = state.assignedSubjects.map((sub, idx) => `
                    <span class="assigned-subject-chip">
                        <span>${escapeHtml(sub)}</span>
                        <button type="button" onclick="removeAssignedSubject(${idx})" style="background: none; border: none; color: #b91c1c; font-weight: bold; cursor: pointer; padding: 0 2px;">✕</button>
                    </span>
                `).join('');
            }
        }

        const grid = document.getElementById("available-subjects-selector-grid");
        if (grid) {
            const commonSubjects = [
                "Tin học", "Công nghệ", "GD Thể chất", "Âm nhạc", "Mĩ thuật",
                "Tiếng Anh", "KNS", "STEM", "Đạo đức", "Khoa học", "LS&ĐL", "HĐ Trải nghiệm"
            ];
            // Include any additional subjects teacher might have added
            state.assignedSubjects.forEach(s => {
                if (!commonSubjects.includes(s)) commonSubjects.push(s);
            });

            grid.innerHTML = commonSubjects.map(sub => {
                const checked = state.assignedSubjects.includes(sub);
                return `
                    <label style="display: flex; align-items: center; gap: 0.5rem; background: ${checked ? '#eff6ff' : '#f8fafc'}; border: 1px solid ${checked ? '#3b82f6' : '#cbd5e1'}; border-radius: 6px; padding: 0.45rem 0.75rem; cursor: pointer; font-size: 0.88rem; font-weight: ${checked ? '700' : '500'}; color: ${checked ? '#1e40af' : '#334155'}; transition: all 0.15s;">
                        <input type="checkbox" style="width: 16px; height: 16px; accent-color: var(--primary);" ${checked ? 'checked' : ''} onchange="toggleAssignedSubject('${escapeHtml(sub)}', this.checked)">
                        <span>${escapeHtml(sub)}</span>
                    </label>
                `;
            }).join('');
        }
    }

    function renderCampusesSection() {
        const container = document.getElementById("campuses-cards-container");
        if (!container) return;

        container.innerHTML = state.campuses.map(campus => {
            const badgeCls = getCampusBadgeClass(campus.id);
            return `
                <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: var(--radius-sm); padding: 0.75rem 1rem; display: flex; justify-content: space-between; align-items: center; gap: 0.5rem;">
                    <div>
                        <span class="${badgeCls}">${campus.code}</span>
                        <div style="font-weight: 700; font-size: 0.88rem; color: var(--text-main); margin-top: 0.25rem;">${escapeHtml(campus.name)}</div>
                    </div>
                    <button type="button" class="btn btn-secondary btn-sm" style="padding: 0.2rem 0.5rem; font-size: 0.78rem;" onclick="openEditCampusModal('${campus.id}')">✏️</button>
                </div>
            `;
        }).join('');
    }

    function renderClassesSection(gradeFilter = "all") {
        const container = document.getElementById("all-classes-pills-container");
        const countStat = document.getElementById("stat-assigned-classes-count");
        if (!container) return;

        let list = state.allClasses || [];
        const assignedCount = list.filter(c => c.isAssigned).length;
        if (countStat) countStat.textContent = `(${assignedCount} / ${list.length} lớp)`;

        if (gradeFilter !== "all") {
            const g = parseInt(gradeFilter, 10);
            list = list.filter(c => c.grade === g);
        }

        container.innerHTML = list.map((cls, idx) => {
            const badgeCls = getCampusBadgeClass(cls.campusId);
            return `
                <div class="class-pill-item ${cls.isAssigned ? 'assigned' : ''}" style="display: inline-flex; align-items: center; gap: 0.35rem;">
                    <input type="checkbox" title="Đánh dấu tôi dạy lớp này" ${cls.isAssigned ? 'checked' : ''} onchange="toggleClassAssigned('${cls.name}', this.checked)">
                    <span class="${badgeCls}">${cls.name}</span>
                    <button type="button" style="background: none; border: none; font-size: 0.75rem; cursor: pointer; color: #475569;" title="Sửa tên lớp" onclick="openEditClassModal('${cls.name}')">✏️</button>
                    <button type="button" style="background: none; border: none; font-size: 0.75rem; cursor: pointer; color: #b91c1c;" title="Xóa lớp" onclick="deleteClass('${cls.name}')">🗑️</button>
                </div>
            `;
        }).join('');

        // Bind filter buttons
        document.querySelectorAll(".filter-class-grade-btn").forEach(btn => {
            btn.onclick = (e) => {
                document.querySelectorAll(".filter-class-grade-btn").forEach(b => b.classList.remove("active"));
                e.target.classList.add("active");
                renderClassesSection(e.target.dataset.grade);
            };
        });
    }

    function renderMasterTimetableMatrix() {
        const tbody = document.getElementById("master-timetable-matrix-tbody");
        if (!tbody) return;

        const days = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6"];
        const slots = state.timetable || [];
        let html = "";

        // Morning (Periods 1 to 4)
        for (let p = 1; p <= 4; p++) {
            html += "<tr>";
            if (p === 1) html += `<td rowspan="4" style="vertical-align: middle; font-weight: 700; background: #fafafa;">Sáng</td>`;
            html += `<td style="vertical-align: middle; font-weight: 700;">Tiết ${p}</td>`;

            days.forEach((day, dIdx) => {
                const slot = slots.find(s => s.day === day && s.session === "Sáng" && s.period === p);
                const isAlt = (dIdx % 2 === 0);
                const tdCls = isAlt ? 'col-alt-day' : '';

                if (slot && slot.className && !slot.className.startsWith("--") && slot.subject && !slot.subject.startsWith("--")) {
                    const classInfo = parseClassInfo(slot.className);
                    const badgeCls = getCampusBadgeClass(classInfo.campusId);
                    html += `<td class="${tdCls}" style="vertical-align: middle;">
                        <div class="matrix-slot-bm">
                            <span class="${badgeCls} slot-class-badge">${escapeHtml(slot.className)}</span>
                            <span class="slot-subject-name">${escapeHtml(slot.subject)}</span>
                        </div>
                    </td>`;
                } else {
                    html += `<td class="${tdCls}" style="vertical-align: middle;"><span class="matrix-slot-bm slot-empty">--</span></td>`;
                }
            });
            html += "</tr>";
        }

        // Afternoon (Periods 1 to 3/4)
        for (let p = 1; p <= 3; p++) {
            html += "<tr>";
            if (p === 1) html += `<td rowspan="3" style="vertical-align: middle; font-weight: 700; background: #fafafa;">Chiều</td>`;
            html += `<td style="vertical-align: middle; font-weight: 700;">Tiết ${p}</td>`;

            days.forEach((day, dIdx) => {
                const slot = slots.find(s => s.day === day && s.session === "Chiều" && s.period === p);
                const isAlt = (dIdx % 2 === 0);
                const tdCls = isAlt ? 'col-alt-day' : '';

                if (slot && slot.className && !slot.className.startsWith("--") && slot.subject && !slot.subject.startsWith("--")) {
                    const classInfo = parseClassInfo(slot.className);
                    const badgeCls = getCampusBadgeClass(classInfo.campusId);
                    html += `<td class="${tdCls}" style="vertical-align: middle;">
                        <div class="matrix-slot-bm">
                            <span class="${badgeCls} slot-class-badge">${escapeHtml(slot.className)}</span>
                            <span class="slot-subject-name">${escapeHtml(slot.subject)}</span>
                        </div>
                    </td>`;
                } else {
                    html += `<td class="${tdCls}" style="vertical-align: middle;"><span class="matrix-slot-bm slot-empty">--</span></td>`;
                }
            });
            html += "</tr>";
        }

        tbody.innerHTML = html;
    }

    function renderMasterTimetableDetailed() {
        const tbody = document.getElementById("master-timetable-tbody");
        if (!tbody) return;

        const slots = state.timetable || [];
        const myAssigned = (state.allClasses || []).filter(c => c.isAssigned);
        const classesToList = myAssigned.length > 0 ? myAssigned : state.allClasses;

        tbody.innerHTML = slots.map((slot, idx) => {
            return `
                <tr>
                    <td style="vertical-align: middle; font-weight: 700;">${slot.day}</td>
                    <td style="vertical-align: middle;">${slot.session}</td>
                    <td style="text-align: center; vertical-align: middle; font-weight: 700;">${slot.period}</td>
                    <td style="vertical-align: middle;">
                        <select class="form-select form-select-sm slot-class-select" data-index="${idx}" style="font-weight: 700; color: var(--primary);">
                            <option value="-- Trống --" ${(!slot.className || slot.className.startsWith('--')) ? 'selected' : ''}>-- Trống / Nghỉ --</option>
                            ${classesToList.map(c => `<option value="${c.name}" ${c.name === slot.className ? 'selected' : ''}>${c.name} (K${c.grade} - Điểm ${c.campusId})</option>`).join('')}
                        </select>
                    </td>
                    <td style="vertical-align: middle;">
                        <select class="form-select form-select-sm slot-subject-select" data-index="${idx}" style="font-weight: 600;">
                            <option value="-- Nghỉ / Để trống --" ${(!slot.subject || slot.subject.startsWith('--')) ? 'selected' : ''}>-- Nghỉ / Để trống --</option>
                            ${state.assignedSubjects.map(s => `<option value="${escapeHtml(s)}" ${s === slot.subject ? 'selected' : ''}>${escapeHtml(s)}</option>`).join('')}
                        </select>
                    </td>
                    <td style="text-align: center; vertical-align: middle;">
                        <button type="button" class="btn btn-secondary btn-sm" style="padding: 0.15rem 0.45rem; font-size: 0.78rem;" onclick="clearSlot(${idx})">Làm trống</button>
                    </td>
                </tr>
            `;
        }).join('');

        // Bind event listeners for dropdowns
        document.querySelectorAll(".slot-class-select").forEach(sel => {
            sel.onchange = (e) => {
                const idx = parseInt(e.target.dataset.index, 10);
                state.timetable[idx].className = e.target.value;
                renderMasterTimetableMatrix();
            };
        });

        document.querySelectorAll(".slot-subject-select").forEach(sel => {
            sel.onchange = (e) => {
                const idx = parseInt(e.target.dataset.index, 10);
                state.timetable[idx].subject = e.target.value;
                renderMasterTimetableMatrix();
            };
        });
    }

    // =========================================================================
    // EXPORT ENGINES INTEGRATION
    // =========================================================================
    function exportLbgDocxCurrent(orientation = null) {
        const isLandscape = (orientation === "landscape" || currentOrientation === "landscape");
        const orient = isLandscape ? "landscape" : "portrait";
        const weekNum = state.currentWeek;
        const weekInfo = state.weeks.find(w => w.week === weekNum) || { startDateVN: '', endDateVN: '' };
        const schedule = calculateWeekScheduleForBm(weekNum, state.filterSubject, state.filterCampus, state.filterClass, state.lbgOptHideEmptyRows);

        const genFn = window.generateLbgDocx || (window.DocxGenerator && window.DocxGenerator.generateLbgDocx);
        if (genFn) {
            genFn(false, weekNum, weekInfo, schedule, state.settings, {}, orient, {
                showColSign: state.lbgShowColSign,
                showColNote: state.lbgShowColNote,
                customCols: state.lbgCustomCols,
                showBghSign: state.lbgShowBghSign,
                showHeadSign: state.lbgShowHeadSign,
                showTeacherSign: state.lbgShowTeacherSign,
                hideEmptyRows: state.lbgOptHideEmptyRows
            }).then(blob => {
                const orientSuffix = orient === "landscape" ? "_Kho_Ngang" : "";
                const filename = `LBG_BM_Tuan_${weekNum}_${(state.settings.teacherName || 'GVBM').replace(/\s+/g, '_')}${orientSuffix}.docx`;
                saveAs(blob, filename);
                showToast(`Đã xuất file Word: ${filename}`, "success");
            }).catch(err => {
                console.error("Docx err:", err);
                alert("Lỗi xuất Word: " + err.message);
            });
        } else {
            showToast("Không tìm thấy bộ tạo Word (docx_generator.js)", "error");
        }
    }

    function exportCtlopDocxCurrent(orientation = null) {
        const isLandscape = (orientation === "landscape" || currentOrientation === "landscape");
        const orient = isLandscape ? "landscape" : "portrait";
        const weekNum = state.currentWeek;
        const weekInfo = state.weeks.find(w => w.week === weekNum) || { startDateVN: '', endDateVN: '' };
        const schedule = calculateWeekScheduleForBm(weekNum, state.ctlopFilterSubject, "all", state.ctlopFilterClass, state.ctlopOptHideEmptyRows);

        const genFn = window.generateLbgDocx || (window.DocxGenerator && window.DocxGenerator.generateLbgDocx);
        if (genFn) {
            genFn(true, weekNum, weekInfo, schedule, state.settings, {}, orient, {
                showColSign: state.lbgShowColSign,
                showColNote: state.lbgShowColNote,
                customCols: state.lbgCustomCols,
                showBghSign: state.lbgShowBghSign,
                showHeadSign: state.lbgShowHeadSign,
                showTeacherSign: state.lbgShowTeacherSign,
                hideEmptyRows: state.ctlopOptHideEmptyRows
            }).then(blob => {
                const orientSuffix = orient === "landscape" ? "_Kho_Ngang" : "";
                const filename = `LBG_BM_TichHop_Tuan_${weekNum}_${(state.settings.teacherName || 'GVBM').replace(/\s+/g, '_')}${orientSuffix}.docx`;
                saveAs(blob, filename);
                showToast(`Đã xuất file Word: ${filename}`, "success");
            }).catch(err => {
                console.error("Docx err:", err);
                alert("Lỗi xuất Word: " + err.message);
            });
        } else {
            showToast("Không tìm thấy bộ tạo Word (docx_generator.js)", "error");
        }
    }

    function exportLbgMonDocxCurrent(orientation = null) {
        const isLandscape = (orientation === "landscape" || currentOrientation === "landscape");
        const orient = isLandscape ? "landscape" : "portrait";
        const weekNum = state.currentWeek;
        const weekInfo = state.weeks.find(w => w.week === weekNum) || { startDateVN: '', endDateVN: '' };
        const groups = calculateWeekScheduleBySubjectForBm(weekNum, state.lbgMonFilterSubject, state.lbgMonOptHideEmptyRows);

        const genFn = window.generateLbgBySubjectDocx || (window.DocxGenerator && window.DocxGenerator.generateLbgBySubjectDocx);
        if (genFn) {
            genFn({
                week: weekNum,
                weekInfo: weekInfo,
                groups: groups
            }, state.settings, state.lbgMonShowIntegration, orient, state.lbgMonFilterSubject).then(blob => {
                const subName = state.lbgMonFilterSubject === 'all' ? 'Cac_Mon' : state.lbgMonFilterSubject.replace(/\s+/g, '_');
                const orientSuffix = orient === "landscape" ? "_Kho_Ngang" : "";
                const filename = `LBG_BM_TheoMon_${subName}_Tuan_${weekNum}${orientSuffix}.docx`;
                saveAs(blob, filename);
                showToast(`Đã xuất file Word: ${filename}`, "success");
            }).catch(err => {
                console.error("Docx err:", err);
                alert("Lỗi xuất Word: " + err.message);
            });
        } else {
            showToast("Không tìm thấy bộ tạo Word Theo Môn", "error");
        }
    }

    function exportLbgXlsxCurrent(isCtlop = false) {
        const weekNum = state.currentWeek;
        const weekInfo = state.weeks.find(w => w.week === weekNum) || { startDateVN: '', endDateVN: '' };
        const schedule = isCtlop
            ? calculateWeekScheduleForBm(weekNum, state.ctlopFilterSubject, "all", state.ctlopFilterClass, state.ctlopOptHideEmptyRows)
            : calculateWeekScheduleForBm(weekNum, state.filterSubject, state.filterCampus, state.filterClass, state.lbgOptHideEmptyRows);

        const genFn = window.generateLbgXlsx || (window.XlsxGenerator && window.XlsxGenerator.generateLbgXlsx);
        if (genFn) {
            genFn({
                isCtlop: isCtlop,
                weekNum: weekNum,
                weekInfo: weekInfo,
                schedule: schedule,
                settings: state.settings,
                options: {
                    showColSign: state.lbgShowColSign,
                    showColNote: state.lbgShowColNote,
                    customCols: state.lbgCustomCols
                }
            }).then(blob => {
                const prefix = isCtlop ? "LBG_BM_TichHop" : "LBG_BM";
                const filename = `${prefix}_Tuan_${weekNum}_${(state.settings.teacherName || 'GVBM').replace(/\s+/g, '_')}.xlsx`;
                saveAs(blob, filename);
                showToast(`Đã xuất file Excel: ${filename}`, "success");
            }).catch(err => {
                console.error("Xlsx err:", err);
                alert("Lỗi xuất Excel: " + err.message);
            });
        } else {
            showToast("Không tìm thấy bộ tạo Excel (xlsx_generator.js)", "error");
        }
    }

    function exportLbgMonXlsxCurrent() {
        const weekNum = state.currentWeek;
        const weekInfo = state.weeks.find(w => w.week === weekNum) || { startDateVN: '', endDateVN: '' };
        const groups = calculateWeekScheduleBySubjectForBm(weekNum, state.lbgMonFilterSubject, state.lbgMonOptHideEmptyRows);

        const genFn = window.generateLbgBySubjectXlsx || (window.XlsxGenerator && window.XlsxGenerator.generateLbgBySubjectXlsx);
        if (genFn) {
            const subjectGroups = groups.map(g => ({ subjectName: g.subject, slots: g.rows }));
            genFn({
                weekNum: weekNum,
                weekInfo: weekInfo,
                subjectGroups: subjectGroups
            }, state.settings, state.lbgMonShowIntegration, state.lbgMonFilterSubject).then(blob => {
                const subName = state.lbgMonFilterSubject === 'all' ? 'Cac_Mon' : state.lbgMonFilterSubject.replace(/\s+/g, '_');
                const filename = `LBG_BM_TheoMon_${subName}_Tuan_${weekNum}.xlsx`;
                saveAs(blob, filename);
                showToast(`Đã xuất file Excel: ${filename}`, "success");
            }).catch(err => {
                console.error("Xlsx err:", err);
                alert("Lỗi xuất Excel: " + err.message);
            });
        } else {
            showToast("Không tìm thấy bộ tạo Excel Theo Môn", "error");
        }
    }

    function downloadPpctTemplate() {
        if (typeof XLSX === "undefined") {
            alert("Thư viện SheetJS chưa sẵn sàng!");
            return;
        }

        const wb = XLSX.utils.book_new();
        const headers = ["Tuần", "Môn học", "Tiết trong tuần", "Tiết PPCT", "Tên bài dạy", "Nội dung tích hợp / Điều chỉnh", "Thời lượng"];
        
        const sampleRows = [
            headers,
            [1, "Tin học", 1, 1, "Bài 1. Em có thể làm gì với máy tính (Tiết 1)", "Tích hợp NLS", "2 tiết"],
            [1, "Tin học", 2, 2, "Bài 1. Em có thể làm gì với máy tính (Tiết 2)", "Tích hợp NLS", "2 tiết"],
            [1, "Công nghệ", 1, 1, "Bài 1. Vai trò của công nghệ (Tiết 1)", "Tích hợp STEM, NLS", "1 tiết"],
            [1, "Âm nhạc", 1, 1, "Đọc nhạc: Bài số 1", "", "1 tiết"],
            [1, "Mĩ thuật", 1, 1, "Yếu tố tạo hình trong thực hành, sáng tạo theo chủ đề (tiết 1)", "", "1 tiết"],
            [1, "GD Thể chất", 1, 1, "Bài 1: Đội hình đội ngũ", "", "1 tiết"],
            [2, "Tin học", 1, 3, "Bài 2. Tìm kiếm thông tin trên website (Tiết 1)", "Tích hợp NLS", "2 tiết"],
            [2, "Công nghệ", 1, 2, "Bài 1. Vai trò của công nghệ (Tiết 2)", "", "1 tiết"]
        ];

        const ws = XLSX.utils.aoa_to_sheet(sampleRows);
        ws['!cols'] = [{ wch: 8 }, { wch: 18 }, { wch: 15 }, { wch: 12 }, { wch: 45 }, { wch: 35 }, { wch: 12 }];
        XLSX.utils.book_append_sheet(wb, ws, "Phan_Phoi_CT_GVBM");

        XLSX.writeFile(wb, "Mau_Phan_Phoi_Chuong_Trinh_GVBM.xlsx");
        showToast("Đã tải về file Excel mẫu phân phối chương trình GVBM!", "success");
    }

    function uploadPpctFromFile(file) {
        if (!file) return;
        if (typeof XLSX === "undefined") {
            alert("Thư viện SheetJS chưa sẵn sàng!");
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                if (!jsonRows || jsonRows.length <= 1) {
                    alert("File Excel không có dữ liệu!");
                    return;
                }

                // Match headers
                let colMap = { week: -1, subject: -1, periodInWeek: -1, ppct: -1, lesson: -1, integration: -1, duration: -1 };
                let startRow = 1;

                for (let r = 0; r < Math.min(10, jsonRows.length); r++) {
                    const row = jsonRows[r] || [];
                    row.forEach((cell, cIdx) => {
                        const str = String(cell || '').toLowerCase().trim();
                        if (str.includes('tuần') || str.includes('tuan')) colMap.week = cIdx;
                        else if (str.includes('môn') || str.includes('mon')) colMap.subject = cIdx;
                        else if (str.includes('trong tuần') || str.includes('tiết/tuần') || str.includes('tiết thứ')) colMap.periodInWeek = cIdx;
                        else if (str.includes('ppct') || str.includes('theo ct') || str.includes('tiết số')) colMap.ppct = cIdx;
                        else if (str.includes('tên bài') || str.includes('bài dạy') || str.includes('nội dung')) colMap.lesson = cIdx;
                        else if (str.includes('tích hợp') || str.includes('điều chỉnh')) colMap.integration = cIdx;
                        else if (str.includes('thời lượng') || str.includes('thoi luong')) colMap.duration = cIdx;
                    });
                    if (colMap.week !== -1 && colMap.lesson !== -1) {
                        startRow = r + 1;
                        break;
                    }
                }

                if (colMap.week === -1) colMap.week = 0;
                if (colMap.subject === -1) colMap.subject = 1;
                if (colMap.periodInWeek === -1) colMap.periodInWeek = 2;
                if (colMap.ppct === -1) colMap.ppct = 3;
                if (colMap.lesson === -1) colMap.lesson = 4;
                if (colMap.integration === -1) colMap.integration = 5;

                const parsedRows = [];
                let currentW = 1;
                let currentSub = state.ppctCurrentSubject || "Tin học";

                for (let r = startRow; r < jsonRows.length; r++) {
                    const row = jsonRows[r];
                    if (!row || row.length === 0) continue;

                    const wVal = parseInt(row[colMap.week], 10);
                    if (!isNaN(wVal) && wVal >= 1 && wVal <= 35) currentW = wVal;

                    const subVal = row[colMap.subject] ? String(row[colMap.subject]).trim() : '';
                    if (subVal && subVal.length > 1 && !subVal.toLowerCase().includes('môn')) {
                        currentSub = normalizeSubjectName(subVal);
                    }

                    const lessonVal = row[colMap.lesson] ? String(row[colMap.lesson]).trim() : '';
                    if (!lessonVal || lessonVal.toLowerCase().includes('tên bài')) continue;

                    let pInWeek = parseInt(row[colMap.periodInWeek], 10);
                    if (isNaN(pInWeek) || pInWeek <= 0) pInWeek = 1;

                    let ppctNum = parseInt(row[colMap.ppct], 10);
                    if (isNaN(ppctNum) || ppctNum <= 0) ppctNum = parsedRows.length + 1;

                    const integ = colMap.integration !== -1 && row[colMap.integration] ? String(row[colMap.integration]).trim() : '';
                    const dur = colMap.duration !== -1 && row[colMap.duration] ? String(row[colMap.duration]).trim() : '';

                    parsedRows.push({
                        week: currentW,
                        subject: currentSub,
                        periodInWeek: pInWeek,
                        ppct: ppctNum,
                        lessonName: normalizePunctuationSpacing(lessonVal),
                        integration: integ,
                        duration: dur
                    });
                }

                if (parsedRows.length === 0) {
                    alert("Không tìm thấy dữ liệu tiết học hợp lệ trong file Excel!");
                    return;
                }

                const grade = state.ppctCurrentGrade;
                const confirmMsg = `Hệ thống đã nhận diện được ${parsedRows.length} tiết PPCT từ file "${file.name}".\n\nThầy/Cô có muốn nạp dữ liệu này vào Khối ${grade} không?`;
                if (confirm(confirmMsg)) {
                    if (!state.gradeCurricula[grade]) state.gradeCurricula[grade] = [];
                    let updatedCount = 0;
                    let insertedCount = 0;

                    parsedRows.forEach(item => {
                        const existingIdx = state.gradeCurricula[grade].findIndex(p =>
                            p.week === item.week &&
                            normalizeSubjectName(p.subject) === normalizeSubjectName(item.subject) &&
                            p.periodInWeek === item.periodInWeek
                        );
                        if (existingIdx >= 0) {
                            state.gradeCurricula[grade][existingIdx] = { ...state.gradeCurricula[grade][existingIdx], ...item };
                            updatedCount++;
                        } else {
                            state.gradeCurricula[grade].push(item);
                            insertedCount++;
                        }
                    });

                    state.gradeCurricula[grade].sort((a, b) => (a.week || 0) - (b.week || 0) || (a.ppct || 0) - (b.ppct || 0));
                    saveState();
                    updatePpctSubjectDropdown();
                    renderTabPpctTableOnly();
                    renderTabLbg();
                    renderTabCtlop();
                    renderTabLbgMon();
                    showToast(`Đã nạp thành công ${parsedRows.length} tiết PPCT vào Khối ${grade}!`, "success");
                }
            } catch (err) {
                console.error("Lỗi đọc file Excel PPCT:", err);
                alert("Lỗi đọc file Excel: " + err.message);
            }
        };
        reader.readAsArrayBuffer(file);
    }

    function exportPpctExcelCurrent() {
        const grade = state.ppctCurrentGrade;
        const subject = state.ppctCurrentSubject;
        const list = (state.gradeCurricula[grade] || []).filter(item => normalizeSubjectName(item.subject) === normalizeSubjectName(subject));

        if (!list || list.length === 0) {
            showToast("Không có dữ liệu PPCT để xuất!", "warning");
            return;
        }

        const wb = XLSX.utils.book_new();
        const header = ["Tuần", "Môn học", "Tiết/Tuần", "Tiết PPCT", "Tên bài dạy", "Nội dung tích hợp / Điều chỉnh", "Thời lượng"];
        const rows = list.map(item => [
            item.week,
            item.subject,
            item.periodInWeek || 1,
            item.ppct,
            item.lessonName || '',
            item.integration || '',
            item.duration || ''
        ]);

        const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
        ws['!cols'] = [{ wch: 8 }, { wch: 18 }, { wch: 10 }, { wch: 10 }, { wch: 45 }, { wch: 45 }, { wch: 12 }];
        XLSX.utils.book_append_sheet(wb, ws, `PPCT_K${grade}_${subject.slice(0, 10)}`);

        const fileName = `PPCT_Khoi_${grade}_${subject.replace(/\s+/g, '_')}_${state.settings.academicYear.replace(/\s+/g, '')}.xlsx`;
        XLSX.writeFile(wb, fileName);
        showToast("Đã xuất file Excel PPCT thành công!", "success");
    }

    // =========================================================================
    // MULTI-SUBJECT KHDH & PPCT EXPORT (MODAL & ENGINES) + TOPIC ENRICHMENT
    // =========================================================================

    function getStandardTopicForSubject(subject, grade, week, lessonName) {
        const s = normalizeSubjectName(subject).toLowerCase();
        const lName = (lessonName || '').trim();

        // If lesson name contains explicit "Chủ đề ...", extract it
        const topicMatch = lName.match(/(Chủ đề\s*[^:\.\-]+|\bMạch\s*[^:\.\-]+)/i);
        if (topicMatch && topicMatch[0].length < 60) {
            return topicMatch[0].trim();
        }

        if (s.includes('tin')) {
            // Tin học GDPT 2018
            const g = parseInt(grade, 10) || 5;
            if (g === 5) {
                if (week <= 2) return "Chủ đề A: Máy tính và em";
                if (week <= 6) return "Chủ đề B: Mạng máy tính và Internet";
                if (week <= 8) return "Chủ đề C: Tổ chức lưu trữ, tìm kiếm và trao đổi thông tin";
                if (week <= 10) return "Chủ đề D: Đạo đức, pháp luật và văn hóa trong môi trường số";
                if (week <= 16) return "Chủ đề E: Ứng dụng tin học";
                if (week <= 18) return "Ôn tập và đánh giá học kì I";
                if (week <= 19) return "Chủ đề E: Ứng dụng tin học";
                if (week <= 33) return "Chủ đề F: Giải quyết vấn đề với sự trợ giúp của máy tính";
                return "Ôn tập và đánh giá cuối năm";
            } else if (g === 4) {
                if (week <= 3) return "Chủ đề A: Máy tính và em";
                if (week <= 8) return "Chủ đề B: Mạng máy tính và Internet";
                if (week <= 10) return "Chủ đề C: Tổ chức lưu trữ, tìm kiếm và trao đổi thông tin";
                if (week <= 11) return "Chủ đề D: Đạo đức, pháp luật và văn hóa trong môi trường số";
                if (week <= 16) return "Chủ đề E: Ứng dụng tin học";
                if (week <= 18) return "Ôn tập và đánh giá học kì I";
                if (week <= 25) return "Chủ đề E: Ứng dụng tin học";
                if (week <= 33) return "Chủ đề F: Giải quyết vấn đề với sự trợ giúp của máy tính";
                return "Ôn tập và đánh giá cuối năm";
            } else {
                // Grade 3
                if (week <= 8) return "Chủ đề 1: Máy tính và em";
                if (week === 9) return "Ôn tập và kiểm tra giữa học kì I";
                if (week <= 17) return "Chủ đề 2: Bàn phím và chuột máy tính";
                if (week === 18) return "Kiểm tra cuối học kì I";
                if (week <= 27) return "Chủ đề 3: Học cùng máy tính";
                if (week <= 34) return "Chủ đề 4: Làm quen với thế giới số";
                return "Kiểm tra cuối năm";
            }
        }

        if (s.includes('công nghệ') || s.includes('cong nghe')) {
            if (week <= 10) return "Công nghệ và đời sống";
            if (week <= 18) return "Ôn tập và kiểm tra học kì I";
            if (week <= 32) return "Thủ công kĩ thuật";
            return "Ôn tập và kiểm tra cuối năm";
        }

        if (s.includes('thể chất') || s.includes('gdtc')) {
            if (week <= 17) return "Đội hình đội ngũ & Bài tập thể dục";
            if (week === 18) return "Kiểm tra đánh giá học kì I";
            if (week <= 34) return "Tư thế kĩ năng vận động cơ bản";
            return "Kiểm tra đánh giá cuối năm";
        }

        if (s.includes('âm nhạc')) {
            const themeNum = Math.ceil(week / 4.5);
            return `Chủ đề ${themeNum <= 8 ? themeNum : 8}: Âm thanh ngày mới`;
        }

        if (s.includes('mĩ thuật') || s.includes('mi thuat')) {
            const themeNum = Math.ceil(week / 4.5);
            return `Chủ đề ${themeNum <= 8 ? themeNum : 8}: Sáng tạo mĩ thuật`;
        }

        if (s.includes('tiếng anh')) {
            const unitNum = Math.ceil(week / 2);
            return `Unit ${unitNum <= 20 ? unitNum : 20}`;
        }

        if (week <= 18) return "Học kì I";
        return "Học kì II";
    }

    function enrichKhdhRowsWithTopics(grade, subject, rows) {
        if (!Array.isArray(rows)) return [];
        const normSub = normalizeSubjectName(subject);
        
        let khdhSourceRows = null;
        if (window.APP_INITIAL_DATA && window.APP_INITIAL_DATA.khdh) {
            for (const k of Object.keys(window.APP_INITIAL_DATA.khdh)) {
                if (normalizeSubjectName(k) === normSub) {
                    khdhSourceRows = window.APP_INITIAL_DATA.khdh[k];
                    break;
                }
            }
        }

        return rows.map((r, idx) => {
            let topic = r.topic || r.theme || '';
            let duration = r.duration || '';
            let integration = r.integration || '';
            let notes = r.notes || '';
            let khmhPeriod = r.khmhPeriod || r.ppct || (idx + 1);

            if (khdhSourceRows && (!topic || !integration)) {
                const match = khdhSourceRows.find(kr => kr.week === r.week && (kr.khmhPeriod == r.ppct || kr.lesson === (r.lesson || r.lessonName)));
                if (match) {
                    if (!topic && match.topic) topic = match.topic;
                    if (!duration && match.duration) duration = match.duration;
                    if (!integration && match.integration) integration = match.integration;
                    if (!notes && match.notes) notes = match.notes;
                } else if (khdhSourceRows[idx]) {
                    if (!topic && khdhSourceRows[idx].topic) topic = khdhSourceRows[idx].topic;
                    if (!duration && khdhSourceRows[idx].duration) duration = khdhSourceRows[idx].duration;
                    if (!integration && khdhSourceRows[idx].integration) integration = khdhSourceRows[idx].integration;
                }
            }

            if (!topic) {
                topic = getStandardTopicForSubject(subject, grade, r.week, r.lesson || r.lessonName);
            }

            return {
                ...r,
                topic: topic,
                lesson: r.lesson || r.lessonName || '',
                lessonName: r.lessonName || r.lesson || '',
                duration: duration || '1 tiết',
                khmhPeriod: khmhPeriod,
                integration: integration,
                notes: notes
            };
        });
    }

    function openMultiExportKhdhModal() {
        const modal = document.getElementById("modal-khdh-multi-export");
        if (!modal) return;

        const gradeSelect = document.getElementById("multi-export-grade-select");
        if (gradeSelect) {
            gradeSelect.value = state.ppctCurrentGrade ? String(state.ppctCurrentGrade) : "5";
        }

        renderMultiExportSubjectsList();
        modal.style.display = "flex";
    }

    function closeMultiExportKhdhModal() {
        const modal = document.getElementById("modal-khdh-multi-export");
        if (modal) modal.style.display = "none";
    }

    function renderMultiExportSubjectsList() {
        const container = document.getElementById("multi-export-subjects-checklist");
        const gradeSelect = document.getElementById("multi-export-grade-select");
        if (!container || !gradeSelect) return;

        const selectedGrade = gradeSelect.value;
        const assignedNorms = (state.assignedSubjects || []).map(s => normalizeSubjectName(s));

        // Group subjects strictly by normalizeSubjectName to eliminate duplicates
        const subjectMap = new Map(); // normSub -> { displayName, count }
        const gradesToCheck = (selectedGrade === "all") ? [1, 2, 3, 4, 5] : [parseInt(selectedGrade, 10)];

        gradesToCheck.forEach(g => {
            const list = state.gradeCurricula[g] || [];
            list.forEach(item => {
                if (item.subject) {
                    const norm = normalizeSubjectName(item.subject);
                    if (!subjectMap.has(norm)) {
                        subjectMap.set(norm, { displayName: norm, count: 0 });
                    }
                    subjectMap.get(norm).count += 1;
                }
            });
        });

        (state.assignedSubjects || []).forEach(sub => {
            const norm = normalizeSubjectName(sub);
            if (!subjectMap.has(norm)) {
                subjectMap.set(norm, { displayName: norm, count: 0 });
            }
        });

        const availableSubjects = Array.from(subjectMap.values());

        if (availableSubjects.length === 0) {
            container.innerHTML = `<div style="padding: 1rem; text-align: center; color: #64748b;">Không có dữ liệu môn học nào cho khối này.</div>`;
            return;
        }

        availableSubjects.sort((a, b) => {
            const aAssigned = assignedNorms.includes(normalizeSubjectName(a.displayName)) ? 0 : 1;
            const bAssigned = assignedNorms.includes(normalizeSubjectName(b.displayName)) ? 0 : 1;
            if (aAssigned !== bAssigned) return aAssigned - bAssigned;
            return a.displayName.localeCompare(b.displayName);
        });

        container.innerHTML = availableSubjects.map(item => {
            const sub = item.displayName;
            const isAssigned = assignedNorms.includes(normalizeSubjectName(sub));
            const count = item.count || 0;
            const isChecked = isAssigned || (state.assignedSubjects.length === 0);

            return `
                <label style="display: flex; align-items: center; justify-content: space-between; padding: 0.45rem 0.65rem; background: ${isAssigned ? '#eff6ff' : '#fff'}; border: 1px solid ${isAssigned ? '#93c5fd' : '#e2e8f0'}; border-radius: 6px; cursor: pointer;">
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <input type="checkbox" class="multi-export-subject-item" value="${escapeHtml(sub)}" ${isChecked ? 'checked' : ''} style="width: 17px; height: 17px; accent-color: var(--primary);">
                        <span style="font-weight: ${isAssigned ? '700' : '500'}; color: ${isAssigned ? '#1e3a8a' : '#1e293b'};">
                            ${escapeHtml(sub)}
                        </span>
                        ${isAssigned ? '<span style="font-size: 0.72rem; background: #dbeafe; color: #1e40af; padding: 0.1rem 0.4rem; border-radius: 4px; font-weight: 700;">Môn phụ trách</span>' : ''}
                    </div>
                    <span style="font-size: 0.8rem; color: #64748b;">${count > 0 ? count + ' tiết' : 'Chưa có bài'}</span>
                </label>
            `;
        }).join('');
    }

    function doMultiExportDocx() {
        const gradeSelect = document.getElementById("multi-export-grade-select");
        const checkedItems = document.querySelectorAll(".multi-export-subject-item:checked");
        const selectedSubjects = Array.from(checkedItems).map(inp => inp.value);

        if (selectedSubjects.length === 0) {
            alert("Thầy/Cô vui lòng tick chọn ít nhất 1 môn để xuất KHDH!");
            return;
        }

        const selectedGrade = gradeSelect ? gradeSelect.value : "5";
        const gradesToCheck = (selectedGrade === "all") ? [1, 2, 3, 4, 5] : [parseInt(selectedGrade, 10)];

        const subjectsData = [];
        selectedSubjects.forEach(sub => {
            let combinedRows = [];
            gradesToCheck.forEach(g => {
                const list = (state.gradeCurricula[g] || []).filter(item => normalizeSubjectName(item.subject) === normalizeSubjectName(sub));
                const enriched = enrichKhdhRowsWithTopics(g, sub, list);
                combinedRows.push(...enriched);
            });

            if (combinedRows.length > 0) {
                subjectsData.push({
                    subjectName: sub,
                    rows: combinedRows
                });
            }
        });

        if (subjectsData.length === 0) {
            alert("Không tìm thấy dữ liệu bài dạy nào cho các môn đã chọn!");
            return;
        }

        const genFn = window.generateKhdhDocx || (window.DocxGenerator && window.DocxGenerator.generateKhdhDocx);
        if (!genFn) {
            showToast("Không tìm thấy bộ tạo Word KHDH!", "error");
            return;
        }

        const gradeLabel = (selectedGrade === "all") ? "Khoi_1-5" : `Khoi_${selectedGrade}`;

        genFn({
            grade: (selectedGrade === "all") ? "1, 2, 3, 4, 5" : selectedGrade,
            isMultiSubject: subjectsData.length > 1,
            subjectsData: subjectsData,
            settings: state.settings
        }).then(blob => {
            const safeYear = (state.settings.academicYear || "2026-2027").replace(/\s+/g, '');
            const filename = `KHDH_DaMon_${gradeLabel}_${subjectsData.length}Mon_${safeYear}.docx`;
            saveAs(blob, filename);
            closeMultiExportKhdhModal();
            showToast(`Đã xuất file Word KHDH gộp (${subjectsData.length} môn): ${filename}`, "success");
        }).catch(err => {
            console.error("Multi-export Docx error:", err);
            alert("Lỗi xuất Word KHDH Đa Môn: " + err.message);
        });
    }

    function doMultiExportExcel() {
        const gradeSelect = document.getElementById("multi-export-grade-select");
        const checkedItems = document.querySelectorAll(".multi-export-subject-item:checked");
        const selectedSubjects = Array.from(checkedItems).map(inp => inp.value);

        if (selectedSubjects.length === 0) {
            alert("Thầy/Cô vui lòng tick chọn ít nhất 1 môn để xuất Excel PPCT!");
            return;
        }

        const selectedGrade = gradeSelect ? gradeSelect.value : "5";
        const gradesToCheck = (selectedGrade === "all") ? [1, 2, 3, 4, 5] : [parseInt(selectedGrade, 10)];

        const wb = XLSX.utils.book_new();
        let totalSheets = 0;

        selectedSubjects.forEach(sub => {
            let combinedRows = [];
            gradesToCheck.forEach(g => {
                const list = (state.gradeCurricula[g] || []).filter(item => normalizeSubjectName(item.subject) === normalizeSubjectName(sub));
                list.forEach(r => {
                    combinedRows.push({ ...r, grade: g });
                });
            });

            if (combinedRows.length > 0) {
                const header = ["Khối", "Tuần", "Môn học", "Tiết/Tuần", "Tiết PPCT", "Tên bài dạy", "Nội dung tích hợp / Điều chỉnh", "Thời lượng"];
                const rows = combinedRows.map(item => [
                    item.grade || selectedGrade,
                    item.week,
                    item.subject,
                    item.periodInWeek || 1,
                    item.ppct,
                    item.lessonName || '',
                    item.integration || '',
                    item.duration || ''
                ]);

                const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
                ws['!cols'] = [{ wch: 8 }, { wch: 8 }, { wch: 18 }, { wch: 10 }, { wch: 10 }, { wch: 45 }, { wch: 45 }, { wch: 12 }];

                const cleanSub = sub.replace(/[:\\/\?\*\[\]]/g, '').slice(0, 20);
                let sheetName = (selectedGrade === "all") ? `${cleanSub}` : `K${selectedGrade}_${cleanSub}`;
                sheetName = sheetName.slice(0, 31);

                let finalSheetName = sheetName;
                let counter = 1;
                while (wb.SheetNames.includes(finalSheetName)) {
                    finalSheetName = `${sheetName.slice(0, 28)}_${counter++}`;
                }

                XLSX.utils.book_append_sheet(wb, ws, finalSheetName);
                totalSheets++;
            }
        });

        if (totalSheets === 0) {
            alert("Không có dữ liệu bài dạy nào để xuất Excel cho các môn đã chọn!");
            return;
        }

        const gradeLabel = (selectedGrade === "all") ? "Khoi_1-5" : `Khoi_${selectedGrade}`;
        const safeYear = (state.settings.academicYear || "2026-2027").replace(/\s+/g, '');
        const filename = `PPCT_DaMon_${gradeLabel}_${totalSheets}Mon_${safeYear}.xlsx`;

        XLSX.writeFile(wb, filename);
        closeMultiExportKhdhModal();
        showToast(`Đã xuất file Excel PPCT gộp (${totalSheets} Sheet môn): ${filename}`, "success");
    }

    // =========================================================================
    // PREVIEW KHDH CURRENT SUBJECT (DECREE 30/2020)
    // =========================================================================
    function previewKhdhCurrent() {
        const grade = state.ppctCurrentGrade;
        const subject = state.ppctCurrentSubject;
        const rawList = (state.gradeCurricula[grade] || []).filter(item => normalizeSubjectName(item.subject) === normalizeSubjectName(subject));

        if (rawList.length === 0) {
            alert(`Không có dữ liệu bài dạy nào cho môn ${subject} ở Khối ${grade}!`);
            return;
        }

        const enrichedList = enrichKhdhRowsWithTopics(grade, subject, rawList);
        const bghSigner = getBghSignerInfo("KHDH");

        const mainTitle = `KẾ HOẠCH DẠY HỌC MÔN ${subject.toUpperCase()} KHỐI ${grade}`;
        let paperHtml = `
        <div class="paper-page" style="background: white; padding: 2.5rem; font-family: 'Times New Roman', serif; line-height: 1.4; color: #000;">
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 1.5rem;">
                <tr>
                    <td style="width: 45%; text-align: center; vertical-align: top;">
                        <div style="font-size: 11pt; text-transform: uppercase;">${escapeHtml(state.settings.governingBody || 'UBND PHƯỜNG TRUNG NHỨT')}</div>
                        <div style="font-size: 11.5pt; font-weight: bold; text-transform: uppercase; text-decoration: underline;">${escapeHtml(state.settings.schoolName || 'TRƯỜNG TIỂU HỌC TRUNG NHỨT')}</div>
                        <div style="font-size: 11pt; margin-top: 4px;">Số: &nbsp; &nbsp; &nbsp; /KH-TH-K${grade}</div>
                    </td>
                    <td style="width: 55%; text-align: center; vertical-align: top;">
                        <div style="font-size: 11.5pt; font-weight: bold;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                        <div style="font-size: 12.5pt; font-weight: bold; text-decoration: underline;">Độc lập - Tự do - Hạnh phúc</div>
                        <div style="font-size: 11pt; font-style: italic; margin-top: 4px; text-align: right;">${escapeHtml(state.settings.location || 'Trung Nhứt')}, ${escapeHtml(state.settings.dateString || 'ngày 28 tháng 8 năm 2026')}</div>
                    </td>
                </tr>
            </table>

            <div style="text-align: center; font-size: 14pt; font-weight: bold; color: #002060; margin-bottom: 4px; text-transform: uppercase;">${mainTitle}</div>
            <div style="text-align: center; font-size: 12pt; font-weight: bold; margin-bottom: 1rem;">NĂM HỌC ${escapeHtml(state.settings.academicYear || '2026 - 2027')}</div>
        `;

        const basesList = (Array.isArray(state.settings.bases) && state.settings.bases.length > 0) ? state.settings.bases : DEFAULT_BASES;
        basesList.forEach(b => {
            paperHtml += `<div style="font-size: 11pt; font-style: italic; text-align: justify; margin-bottom: 4px; text-indent: 25px;">${escapeHtml(b)}</div>`;
        });

        paperHtml += `
            <div style="font-size: 11.5pt; text-indent: 25px; margin: 12px 0;">Tổ Bộ môn xây dựng Kế hoạch dạy học chi tiết môn ${escapeHtml(subject)} Khối ${grade} như sau:</div>
            
            <table class="table-lbg" style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10.5pt; border: 1px solid #7f7f7f;">
                <thead>
                    <tr style="background: #ebf1f5;">
                        <th style="border: 1px solid #7f7f7f; padding: 6px; width: 6%; text-align: center;">Tuần</th>
                        <th style="border: 1px solid #7f7f7f; padding: 6px; width: 18%; text-align: center;">Chủ đề / Mạch nội dung</th>
                        <th style="border: 1px solid #7f7f7f; padding: 6px; width: 24%; text-align: center;">Tên bài học</th>
                        <th style="border: 1px solid #7f7f7f; padding: 6px; width: 8%; text-align: center;">Thời lượng</th>
                        <th style="border: 1px solid #7f7f7f; padding: 6px; width: 8%; text-align: center;">Tiết theo KHMH</th>
                        <th style="border: 1px solid #7f7f7f; padding: 6px; width: 36%; text-align: center;">Nội dung điều chỉnh, bổ sung (nếu có)</th>
                    </tr>
                </thead>
                <tbody>
        `;

        enrichedList.forEach((r, idx) => {
            const topicText = r.topic || '';
            const lessonText = r.lesson || r.lessonName || '';
            const durText = r.duration || '1 tiết';
            const periodText = r.khmhPeriod || r.ppct || (idx + 1);
            const integText = (r.integration || '').replace(/\n/g, '<br>');

            paperHtml += `
                <tr>
                    <td style="border: 1px solid #bfbfbf; padding: 6px; text-align: center; font-weight: bold;">${r.week}</td>
                    <td style="border: 1px solid #bfbfbf; padding: 6px; font-weight: 600;">${escapeHtml(topicText)}</td>
                    <td style="border: 1px solid #bfbfbf; padding: 6px;">${escapeHtml(lessonText)}</td>
                    <td style="border: 1px solid #bfbfbf; padding: 6px; text-align: center;">${escapeHtml(durText)}</td>
                    <td style="border: 1px solid #bfbfbf; padding: 6px; text-align: center; font-weight: bold;">${periodText}</td>
                    <td style="border: 1px solid #bfbfbf; padding: 6px; font-size: 9.5pt;">${integText}</td>
                </tr>
            `;
        });

        paperHtml += `
                </tbody>
            </table>

            <table style="width: 100%; border-collapse: collapse; margin-top: 2rem;">
                <tr>
                    <td style="width: 40%; vertical-align: top; font-size: 10pt;">
                        <div style="font-weight: bold; font-style: italic;">Nơi nhận:</div>
                        <div>- Ban Giám hiệu (để b/c);</div>
                        <div>- Tổ CM (để t/h);</div>
                        <div>- Giáo viên giảng dạy;</div>
                        <div>- Lưu: VT, Hồ sơ Tổ.</div>
                    </td>
                    <td style="width: 60%; text-align: center; vertical-align: top;">
                        <div style="font-weight: bold; font-size: 11pt;">TỔ TRƯỞNG CHUYÊN MÔN</div>
                        <div style="font-size: 10pt; font-style: italic;">(Ký và ghi rõ họ tên)</div>
                        <div style="height: 60px;"></div>
                        <div style="font-weight: bold; font-size: 11pt;">${escapeHtml(state.settings.headOfDepartment || 'Lê Văn Trưởng')}</div>

                        <div style="font-weight: bold; font-size: 11pt; margin-top: 1.5rem;">PHÊ DUYỆT CỦA ${escapeHtml(bghSigner.roleTitle)}</div>
                        <div style="font-size: 10pt; font-style: italic;">(Ký, ghi rõ họ tên và đóng dấu)</div>
                        <div style="height: 60px;"></div>
                        <div style="font-weight: bold; font-size: 11pt;">${escapeHtml(bghSigner.name)}</div>
                    </td>
                </tr>
            </table>
        </div>
        `;

        openPreviewModal(
            `Xem Trước Kế Hoạch Dạy Học - Môn ${subject} (Khối ${grade})`,
            paperHtml,
            () => document.getElementById("btn-export-khdh-docx").click(),
            () => exportPpctExcelCurrent(),
            () => window.print()
        );
    }

    // =========================================================================
    // PREVIEW & PRINT MODAL (DECREE 30/2020)
    // =========================================================================
    function openPreviewModal(title, contentHtml, onDownloadDocx, onDownloadXlsx, onPrint) {
        const modal = document.getElementById("preview-modal");
        const modalTitle = document.getElementById("modal-preview-title");
        const modalBody = document.getElementById("modal-preview-body");
        const btnDocx = document.getElementById("modal-btn-docx");
        const btnXlsx = document.getElementById("modal-btn-xlsx");
        const btnPrint = document.getElementById("modal-btn-print");

        if (modalTitle) modalTitle.textContent = title;
        if (modalBody) modalBody.innerHTML = contentHtml;

        if (btnDocx) btnDocx.onclick = () => { if (onDownloadDocx) onDownloadDocx(); };
        if (btnXlsx) btnXlsx.onclick = () => { if (onDownloadXlsx) onDownloadXlsx(); };
        if (btnPrint) btnPrint.onclick = () => { if (onPrint) onPrint(); else window.print(); };

        if (modal) modal.style.display = "flex";
    }

    function closePreviewModal() {
        const modal = document.getElementById("preview-modal");
        if (modal) modal.style.display = "none";
    }

    // =========================================================================
    // BATCH EXPORT & PRINT (XUẤT & IN NHIỀU TUẦN CÙNG LÚC)
    // =========================================================================
    function openBatchExportModal(defaultType = 'lbg') {
        const radios = document.querySelectorAll('input[name="batch-doc-type"]');
        radios.forEach(r => {
            r.checked = (r.value === defaultType);
        });

        const batchOrientRadios = document.querySelectorAll('input[name="batch-orientation"]');
        batchOrientRadios.forEach(r => {
            r.checked = (r.value === currentOrientation);
        });

        const selStart = document.getElementById("batch-start-week");
        const selEnd = document.getElementById("batch-end-week");
        if (selStart && selEnd) {
            let optHtml = "";
            for (let i = 1; i <= 35; i++) {
                optHtml += `<option value="${i}">Tuần ${i}</option>`;
            }
            selStart.innerHTML = optHtml;
            selEnd.innerHTML = optHtml;
            selStart.value = "1";
            selEnd.value = "35";
        }

        const batchHideChk = document.getElementById("batch-opt-hide-empty-rows");
        if (batchHideChk) {
            batchHideChk.checked = (defaultType === 'ctlop') ? !!state.ctlopOptHideEmptyRows : !!state.lbgOptHideEmptyRows;
        }

        const modal = document.getElementById("batch-export-modal");
        if (modal) modal.style.display = "flex";
    }

    function closeBatchExportModal() {
        const modal = document.getElementById("batch-export-modal");
        if (modal) modal.style.display = "none";
    }

    function exportBatchLbgToDocx() {
        const docType = document.querySelector('input[name="batch-doc-type"]:checked')?.value || 'lbg';
        const isCtlop = (docType === 'ctlop');
        const startWeek = parseInt(document.getElementById("batch-start-week").value, 10) || 1;
        const endWeek = parseInt(document.getElementById("batch-end-week").value, 10) || 35;
        const batchOrient = document.querySelector('input[name="batch-orientation"]:checked')?.value || currentOrientation || 'portrait';

        if (startWeek > endWeek) {
            alert("Tuần bắt đầu phải nhỏ hơn hoặc bằng tuần kết thúc!");
            return;
        }

        closeBatchExportModal();

        const genMultiFn = window.generateMultiWeekLbgDocx || (window.DocxGenerator && window.DocxGenerator.generateMultiWeekLbgDocx);
        const genSubFn = window.generateBatchLbgBySubjectDocx || (window.DocxGenerator && window.DocxGenerator.generateBatchLbgBySubjectDocx);

        const options = {
            showColSign: state.lbgShowColSign,
            showColNote: state.lbgShowColNote,
            showColCustom: Array.isArray(state.lbgCustomCols) && state.lbgCustomCols.some(c => c.enabled !== false),
            customCols: state.lbgCustomCols || [],
            showBghSign: state.lbgShowBghSign,
            showHeadSign: state.lbgShowHeadSign,
            showTeacherSign: state.lbgShowTeacherSign,
            hideEmptyRows: isCtlop ? state.ctlopOptHideEmptyRows : state.lbgOptHideEmptyRows
        };

        if (docType === 'lbg-mon' && genSubFn) {
            showToast(`Đang tạo file Word theo môn từ Tuần ${startWeek} đến Tuần ${endWeek}...`, "info");
            const scheduleFn = (w) => calculateWeekScheduleBySubjectForBm(w, state.lbgMonFilterSubject, state.lbgMonOptHideEmptyRows);
            genSubFn(startWeek, endWeek, scheduleFn, state.settings, batchOrient, state.lbgMonShowIntegration !== false, state.lbgMonFilterSubject, "all").then(blob => {
                const filename = `Lich_Bao_Giang_Theo_Mon_Tuan_${startWeek}_den_${endWeek}.docx`;
                saveAs(blob, filename);
                showToast(`Đã xuất file Word thành công: ${filename}`, "success");
            }).catch(err => {
                console.error("Batch Word export error:", err);
                alert("Lỗi xuất file Word: " + err.message);
            });
        } else if (genMultiFn) {
            showToast(`Đang tạo file Word từ Tuần ${startWeek} đến Tuần ${endWeek}...`, "info");
            const scheduleFn = (w) => calculateWeekScheduleForBm(
                w,
                isCtlop ? state.ctlopFilterSubject : state.filterSubject,
                state.filterCampus,
                isCtlop ? state.ctlopFilterClass : state.filterClass,
                isCtlop ? state.ctlopOptHideEmptyRows : state.lbgOptHideEmptyRows
            );
            genMultiFn(isCtlop, startWeek, endWeek, scheduleFn, state.settings, batchOrient, options).then(blob => {
                const prefix = isCtlop ? "Lich_Bao_Giang_Tich_Hop" : "Lich_Bao_Giang";
                const filename = `${prefix}_Tuan_${startWeek}_den_${endWeek}_GVBM.docx`;
                saveAs(blob, filename);
                showToast(`Đã xuất file Word thành công: ${filename}`, "success");
            }).catch(err => {
                console.error("Batch Word export error:", err);
                alert("Lỗi xuất file Word: " + err.message);
            });
        } else {
            alert("Bộ tạo file Word chưa sẵn sàng!");
        }
    }

    function previewBatchLbg() {
        const docType = document.querySelector('input[name="batch-doc-type"]:checked')?.value || 'lbg';
        const isCtlop = (docType === 'ctlop');
        const startWeek = parseInt(document.getElementById("batch-start-week").value, 10) || 1;
        const endWeek = parseInt(document.getElementById("batch-end-week").value, 10) || 35;
        const batchOrient = document.querySelector('input[name="batch-orientation"]:checked')?.value || currentOrientation || 'portrait';

        if (startWeek > endWeek) {
            alert("Tuần bắt đầu phải nhỏ hơn hoặc bằng tuần kết thúc!");
            return;
        }

        closeBatchExportModal();

        let allHtml = "";
        for (let w = startWeek; w <= endWeek; w++) {
            if (docType === 'lbg-mon') {
                allHtml += renderSingleWeekMonPaperHtml(w, batchOrient);
            } else {
                allHtml += renderSingleWeekPaperHtml(w, isCtlop, batchOrient);
            }
        }

        const docTitle = (docType === 'lbg-mon') ? "Lịch Báo Giảng Theo Môn" : (isCtlop ? "Lịch Báo Giảng Tích Hợp" : "Lịch Báo Giảng");
        openPreviewModal(
            `Xem trước ${docTitle} từ Tuần ${startWeek} đến Tuần ${endWeek} (${batchOrient === 'landscape' ? 'Khổ ngang' : 'Khổ đứng'})`,
            allHtml,
            exportBatchLbgToDocx,
            null,
            () => window.print()
        );
    }

    function renderSingleWeekPaperHtml(weekNum, isCtlop, customOrientation = null) {
        const isLandscape = (customOrientation === "landscape" || currentOrientation === "landscape");
        const weekInfo = state.weeks.find(w => w.week === weekNum) || { startDateVN: '', endDateVN: '' };
        const schedule = isCtlop
            ? calculateWeekScheduleForBm(weekNum, state.ctlopFilterSubject, "all", state.ctlopFilterClass, state.ctlopOptHideEmptyRows)
            : calculateWeekScheduleForBm(weekNum, state.filterSubject, state.filterCampus, state.filterClass, state.lbgOptHideEmptyRows);

        const bghSigner = getBghSignerInfo("LBG");
        const orderedCols = getLbgOrderedColumns(state.lbgCustomCols, state.lbgShowColSign, state.lbgShowColNote, isCtlop);

        // Dynamic Table Header Columns
        let theadColsHtml = "";
        orderedCols.forEach(col => {
            if (col.key === 'day') theadColsHtml += `<th style="width: 11%; border: 1px solid #000; padding: 5px; text-align: center;">Thứ, ngày</th>`;
            else if (col.key === 'session') theadColsHtml += `<th style="width: 6%; border: 1px solid #000; padding: 5px; text-align: center;">Buổi</th>`;
            else if (col.key === 'period') theadColsHtml += `<th style="width: 5%; border: 1px solid #000; padding: 5px; text-align: center;">Tiết</th>`;
            else if (col.key === 'class') theadColsHtml += `<th style="width: 9%; border: 1px solid #000; padding: 5px; text-align: center; font-weight: bold;">Lớp</th>`;
            else if (col.key === 'subject') theadColsHtml += `<th style="width: 13%; border: 1px solid #000; padding: 5px; text-align: center;">Môn học</th>`;
            else if (col.key === 'ppct') theadColsHtml += `<th style="width: 8%; border: 1px solid #000; padding: 5px; text-align: center;">Tiết PPCT</th>`;
            else if (col.key === 'lesson') theadColsHtml += `<th style="border: 1px solid #000; padding: 5px; text-align: center;">${isCtlop ? 'Tên bài dạy chi tiết' : 'Tên bài dạy'}</th>`;
            else if (col.key === 'integ') theadColsHtml += `<th style="width: 22%; border: 1px solid #000; padding: 5px; text-align: center;">Nội dung tích hợp / Điều chỉnh</th>`;
            else if (col.key === 'sign') theadColsHtml += `<th style="width: 7%; border: 1px solid #000; padding: 5px; text-align: center;">Kí tên</th>`;
            else if (col.key === 'note') theadColsHtml += `<th style="width: 11%; border: 1px solid #000; padding: 5px; text-align: center;">Ghi chú</th>`;
            else if (col.isCustom) theadColsHtml += `<th style="width: 10%; border: 1px solid #000; padding: 5px; text-align: center;">${escapeHtml(col.title)}</th>`;
        });

        let tableRowsHtml = "";
        let i = 0;
        while (i < schedule.length) {
            const curDay = schedule[i].day;
            let j = i;
            while (j < schedule.length && schedule[j].day === curDay) j++;
            const daySpan = j - i;
            const dateStr = getDayDateStr(weekInfo.startDateVN, curDay);

            for (let k = i; k < j; k++) {
                const row = schedule[k];
                const rowKey = `w${weekNum}_s${row.slotIndex}`;
                tableRowsHtml += "<tr>";

                let dayCellHtml = "";
                if (k === i) {
                    dayCellHtml = `<td rowspan="${daySpan}" style="text-align: center; vertical-align: middle; font-weight: 700; border: 1px solid #000; padding: 4px;">${dateStr.replace('\n', '<br>')}</td>`;
                }

                orderedCols.forEach(col => {
                    if (col.key === 'day') {
                        if (dayCellHtml) tableRowsHtml += dayCellHtml;
                    } else if (col.key === 'session') {
                        tableRowsHtml += `<td style="text-align: center; vertical-align: middle; border: 1px solid #000; padding: 4px;">${escapeHtml(row.session)}</td>`;
                    } else if (col.key === 'period') {
                        tableRowsHtml += `<td style="text-align: center; vertical-align: middle; font-weight: 700; border: 1px solid #000; padding: 4px;">${row.period}</td>`;
                    } else if (col.key === 'class') {
                        tableRowsHtml += `<td style="text-align: center; vertical-align: middle; font-weight: 800; border: 1px solid #000; padding: 4px;">${row.isEmpty ? '--' : escapeHtml(row.className)}</td>`;
                    } else if (col.key === 'subject') {
                        tableRowsHtml += `<td style="text-align: center; font-weight: 600; vertical-align: middle; border: 1px solid #000; padding: 4px;">${row.isEmpty ? '<span style="color:#94a3b8;font-style:italic;">-- Nghỉ --</span>' : escapeHtml(row.subject)}</td>`;
                    } else if (col.key === 'ppct') {
                        tableRowsHtml += `<td style="text-align: center; font-weight: 700; vertical-align: middle; border: 1px solid #000; padding: 4px;">${row.isEmpty ? '' : (row.ppct || '')}</td>`;
                    } else if (col.key === 'lesson') {
                        tableRowsHtml += `<td style="vertical-align: middle; border: 1px solid #000; padding: 4px;">${row.isEmpty ? '<span style="color:#94a3b8;font-style:italic;">-- Nghỉ / Để trống --</span>' : escapeHtml(row.lessonName || '')}</td>`;
                    } else if (col.key === 'integ') {
                        tableRowsHtml += `<td style="vertical-align: middle; border: 1px solid #000; padding: 4px; font-size: 0.85em;">${row.isEmpty ? '' : escapeHtml(row.integration || '').replace(/\n/g, '<br>')}</td>`;
                    } else if (col.key === 'sign') {
                        tableRowsHtml += `<td style="text-align: center; vertical-align: middle; border: 1px solid #000; padding: 4px;"></td>`;
                    } else if (col.key === 'note') {
                        const noteVal = (state.slotNotes && state.slotNotes[rowKey]) ? state.slotNotes[rowKey] : (row.note || '');
                        tableRowsHtml += `<td style="vertical-align: middle; border: 1px solid #000; padding: 4px; font-size: 0.85em;">${escapeHtml(noteVal)}</td>`;
                    } else if (col.isCustom) {
                        const cVal = (state.slotCustomCols && state.slotCustomCols[rowKey] && state.slotCustomCols[rowKey][col.id]) ? state.slotCustomCols[rowKey][col.id] : '';
                        tableRowsHtml += `<td style="vertical-align: middle; border: 1px solid #000; padding: 4px; font-size: 0.85em;">${escapeHtml(cVal)}</td>`;
                    }
                });

                tableRowsHtml += "</tr>";
            }
            i = j;
        }

        // Signatures columns
        let sigTds = [];
        if (state.lbgShowBghSign !== false) {
            sigTds.push(`
                <td style="text-align: center; vertical-align: top; border: none; padding: 0 10px;">
                    <div style="font-weight: bold;">${bghSigner.docHeaderRole}</div>
                    <div style="font-style: italic; font-size: 11pt;">(Ký và ghi rõ họ tên)</div>
                    <div style="height: 55px;"></div>
                    <div style="font-weight: bold;">${bghSigner.name}</div>
                </td>
            `);
        }
        if (state.lbgShowHeadSign !== false) {
            sigTds.push(`
                <td style="text-align: center; vertical-align: top; border: none; padding: 0 10px;">
                    <div style="font-weight: bold;">TỔ TRƯỞNG CHUYÊN MÔN</div>
                    <div style="font-style: italic; font-size: 11pt;">(Ký và ghi rõ họ tên)</div>
                    <div style="height: 55px;"></div>
                    <div style="font-weight: bold;">${escapeHtml(state.settings.headOfDepartment || '')}</div>
                </td>
            `);
        }
        if (state.lbgShowTeacherSign !== false) {
            sigTds.push(`
                <td style="text-align: center; vertical-align: top; border: none; padding: 0 10px;">
                    <div style="font-weight: bold;">GIÁO VIÊN BỘ MÔN</div>
                    <div style="font-style: italic; font-size: 11pt;">(Ký và ghi rõ họ tên)</div>
                    <div style="height: 55px;"></div>
                    <div style="font-weight: bold;">${escapeHtml(state.settings.teacherName || '')}</div>
                </td>
            `);
        }

        const sigColsHtml = sigTds.length > 0 ? `
            <table style="width: 100%; border: none; margin-top: 25px;">
                <tr>
                    ${sigTds.join('')}
                </tr>
            </table>
        ` : '';

        return `
            <div class="paper-page ${isLandscape ? 'landscape' : 'portrait'}" style="font-family: 'Times New Roman', serif; color: #000; line-height: 1.35; padding: 15mm 12mm; background: #fff; max-width: 900px; margin: 0 auto; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <!-- Header National & School -->
                <table style="width: 100%; border: none; margin-bottom: 12px;">
                    <tr>
                        <td style="width: 50%; text-align: center; vertical-align: top; border: none; padding: 0;">
                            <div style="font-size: 13pt; text-transform: uppercase;">${escapeHtml(state.settings.governingBody || 'UBND PHƯỜNG TRUNG NHỨT')}</div>
                            <div style="font-size: 13pt; font-weight: bold; text-transform: uppercase;">${escapeHtml(state.settings.schoolName || 'TRƯỜNG TIỂU HỌC TRUNG NHỨT')}</div>
                            <div style="font-size: 13pt; font-weight: bold; text-transform: uppercase; margin-top: 2px;">${escapeHtml(state.settings.departmentName || 'TỔ BỘ MÔN')}</div>
                        </td>
                        <td style="width: 50%; text-align: center; vertical-align: top; border: none; padding: 0;">
                            <div style="font-size: 13pt; font-weight: bold;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                            <div style="font-size: 14pt; font-weight: bold; text-decoration: underline;">Độc lập - Tự do - Hạnh phúc</div>
                        </td>
                    </tr>
                </table>

                <!-- Doc Title -->
                <div style="text-align: center; margin: 14px 0 16px 0;">
                    <div style="font-size: 14pt; font-weight: bold; text-transform: uppercase;">${isCtlop ? 'LỊCH BÁO GIẢNG TÍCH HỢP' : 'LỊCH BÁO GIẢNG'} TUẦN ${weekNum}</div>
                    <div style="font-size: 13pt; font-style: italic;">(Thời gian thực hiện: Từ ngày ${weekInfo.startDateVN || '...'} đến ngày ${weekInfo.endDateVN || '...'})</div>
                    <div style="font-size: 13pt; margin-top: 3px;">
                        <strong>Giáo viên:</strong> ${escapeHtml(state.settings.teacherName || '')} &nbsp;|&nbsp; <strong>Môn dạy:</strong> ${escapeHtml(state.assignedSubjects.join(', '))}
                    </div>
                </div>

                <!-- Table -->
                <table style="width: 100%; border-collapse: collapse; font-size: 13pt; margin-bottom: 20px;">
                    <thead>
                        <tr style="background: #e2e8f0;">
                            ${theadColsHtml}
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRowsHtml}
                    </tbody>
                </table>

                <!-- Signatures -->
                ${sigColsHtml}
            </div>
        `;
    }

    function renderSingleWeekMonPaperHtml(weekNum, customOrientation = null) {
        const isLandscape = (customOrientation === "landscape" || currentOrientation === "landscape");
        const weekInfo = state.weeks.find(w => w.week === weekNum) || { startDateVN: '', endDateVN: '' };
        const groups = calculateWeekScheduleBySubjectForBm(
            weekNum,
            state.lbgMonFilterSubject,
            state.lbgMonOptHideEmptyRows
        );
        const bghSigner = getBghSignerInfo("LBG");
        const showInteg = (state.lbgMonShowIntegration !== false);

        let tableContentHtml = "";
        if (groups.length === 0) {
            tableContentHtml = `<tr><td colspan="${showInteg ? 8 : 7}" style="text-align: center; padding: 15px; border: 1px solid #000; font-style: italic;">Không có tiết dạy nào trong tuần này.</td></tr>`;
        } else {
            groups.forEach(grp => {
                const colSpan = showInteg ? 8 : 7;
                tableContentHtml += `
                    <tr style="background: #e2e8f0; font-weight: bold;">
                        <td colspan="${colSpan}" style="border: 1px solid #000; padding: 6px 10px; font-size: 13pt; text-transform: uppercase;">
                            📚 MÔN: ${escapeHtml(grp.subject)} (${grp.rows.length} tiết)
                        </td>
                    </tr>
                `;
                grp.rows.forEach(row => {
                    const dateStr = getDayDateStr(weekInfo.startDateVN, row.day);
                    tableContentHtml += `
                        <tr>
                            <td style="border: 1px solid #000; padding: 4px; text-align: center; vertical-align: middle; font-weight: 600;">${dateStr.replace('\n', '<br>')}</td>
                            <td style="border: 1px solid #000; padding: 4px; text-align: center; vertical-align: middle;">${escapeHtml(row.session)}</td>
                            <td style="border: 1px solid #000; padding: 4px; text-align: center; vertical-align: middle; font-weight: 700;">${row.period}</td>
                            <td style="border: 1px solid #000; padding: 4px; text-align: center; vertical-align: middle; font-weight: bold;">${escapeHtml(row.className)}</td>
                            <td style="border: 1px solid #000; padding: 4px; font-weight: 600; vertical-align: middle; text-align: center;">${escapeHtml(row.subject)}</td>
                            <td style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: 700; vertical-align: middle;">${row.ppct || ''}</td>
                            <td style="border: 1px solid #000; padding: 4px; vertical-align: middle;">${escapeHtml(row.lessonName || '')}</td>
                            ${showInteg ? `<td style="border: 1px solid #000; padding: 4px; vertical-align: middle; font-size: 0.85em;">${escapeHtml(row.integration || '').replace(/\n/g, '<br>')}</td>` : ''}
                        </tr>
                    `;
                });
            });
        }

        // Signatures columns
        let sigTds = [];
        if (state.lbgShowBghSign !== false) {
            sigTds.push(`
                <td style="text-align: center; vertical-align: top; border: none; padding: 0 10px;">
                    <div style="font-weight: bold;">${bghSigner.docHeaderRole}</div>
                    <div style="font-style: italic; font-size: 11pt;">(Ký và ghi rõ họ tên)</div>
                    <div style="height: 55px;"></div>
                    <div style="font-weight: bold;">${bghSigner.name}</div>
                </td>
            `);
        }
        if (state.lbgShowHeadSign !== false) {
            sigTds.push(`
                <td style="text-align: center; vertical-align: top; border: none; padding: 0 10px;">
                    <div style="font-weight: bold;">TỔ TRƯỞNG CHUYÊN MÔN</div>
                    <div style="font-style: italic; font-size: 11pt;">(Ký và ghi rõ họ tên)</div>
                    <div style="height: 55px;"></div>
                    <div style="font-weight: bold;">${escapeHtml(state.settings.headOfDepartment || '')}</div>
                </td>
            `);
        }
        if (state.lbgShowTeacherSign !== false) {
            sigTds.push(`
                <td style="text-align: center; vertical-align: top; border: none; padding: 0 10px;">
                    <div style="font-weight: bold;">GIÁO VIÊN BỘ MÔN</div>
                    <div style="font-style: italic; font-size: 11pt;">(Ký và ghi rõ họ tên)</div>
                    <div style="height: 55px;"></div>
                    <div style="font-weight: bold;">${escapeHtml(state.settings.teacherName || '')}</div>
                </td>
            `);
        }

        const sigColsHtml = sigTds.length > 0 ? `
            <table style="width: 100%; border: none; margin-top: 25px;">
                <tr>
                    ${sigTds.join('')}
                </tr>
            </table>
        ` : '';

        return `
            <div class="paper-page ${isLandscape ? 'landscape' : 'portrait'}" style="font-family: 'Times New Roman', serif; color: #000; line-height: 1.35; padding: 15mm 12mm; background: #fff; max-width: 900px; margin: 0 auto; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 20px;">
                <!-- Header National & School -->
                <table style="width: 100%; border: none; margin-bottom: 12px;">
                    <tr>
                        <td style="width: 50%; text-align: center; vertical-align: top; border: none; padding: 0;">
                            <div style="font-size: 13pt; text-transform: uppercase;">${escapeHtml(state.settings.governingBody || 'UBND PHƯỜNG TRUNG NHỨT')}</div>
                            <div style="font-size: 13pt; font-weight: bold; text-transform: uppercase;">${escapeHtml(state.settings.schoolName || 'TRƯỜNG TIỂU HỌC TRUNG NHỨT')}</div>
                            <div style="font-size: 13pt; font-weight: bold; text-transform: uppercase; margin-top: 2px;">${escapeHtml(state.settings.departmentName || 'TỔ BỘ MÔN')}</div>
                        </td>
                        <td style="width: 50%; text-align: center; vertical-align: top; border: none; padding: 0;">
                            <div style="font-size: 13pt; font-weight: bold;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                            <div style="font-size: 14pt; font-weight: bold; text-decoration: underline;">Độc lập - Tự do - Hạnh phúc</div>
                        </td>
                    </tr>
                </table>

                <!-- Doc Title -->
                <div style="text-align: center; margin: 14px 0 16px 0;">
                    <div style="font-size: 14pt; font-weight: bold; text-transform: uppercase;">LỊCH BÁO GIẢNG THEO MÔN TUẦN ${weekNum}</div>
                    <div style="font-size: 13pt; font-style: italic;">(Thời gian thực hiện: Từ ngày ${weekInfo.startDateVN || '...'} đến ngày ${weekInfo.endDateVN || '...'})</div>
                    <div style="font-size: 13pt; margin-top: 3px;">
                        <strong>Giáo viên:</strong> ${escapeHtml(state.settings.teacherName || '')} &nbsp;|&nbsp; <strong>Môn:</strong> ${escapeHtml(state.lbgMonFilterSubject === 'all' ? state.assignedSubjects.join(', ') : state.lbgMonFilterSubject)}
                    </div>
                </div>

                <!-- Table -->
                <table style="width: 100%; border-collapse: collapse; font-size: 13pt; margin-bottom: 20px;">
                    <thead>
                        <tr style="background: #e2e8f0;">
                            <th style="width: 11%; border: 1px solid #000; padding: 5px; text-align: center;">Thứ, ngày</th>
                            <th style="width: 6%; border: 1px solid #000; padding: 5px; text-align: center;">Buổi</th>
                            <th style="width: 5%; border: 1px solid #000; padding: 5px; text-align: center;">Tiết</th>
                            <th style="width: 9%; border: 1px solid #000; padding: 5px; text-align: center; font-weight: bold;">Lớp</th>
                            <th style="width: 13%; border: 1px solid #000; padding: 5px; text-align: center;">Môn học</th>
                            <th style="width: 8%; border: 1px solid #000; padding: 5px; text-align: center;">Tiết PPCT</th>
                            <th style="border: 1px solid #000; padding: 5px; text-align: center;">Tên bài dạy</th>
                            ${showInteg ? `<th style="width: 22%; border: 1px solid #000; padding: 5px; text-align: center;">Nội dung tích hợp / Điều chỉnh</th>` : ''}
                        </tr>
                    </thead>
                    <tbody>
                        ${tableContentHtml}
                    </tbody>
                </table>

                <!-- Signatures -->
                ${sigColsHtml}
            </div>
        `;
    }

    // =========================================================================
    // MODALS & EVENT HANDLERS
    // =========================================================================
    function openWelcomeModal() {
        const modal = document.getElementById("modal-welcome-guide");
        if (modal) modal.style.display = "flex";
    }

    function closeWelcomeModal() {
        const modal = document.getElementById("modal-welcome-guide");
        if (modal) modal.style.display = "none";
        localStorage.setItem("LBG_BM_HAS_SEEN_WELCOME", "true");
    }

    function checkFirstTimeWelcome() {
        const hasSeen = localStorage.getItem("LBG_BM_HAS_SEEN_WELCOME");
        if (!hasSeen) {
            setTimeout(openWelcomeModal, 400);
        }
    }

    // Campus CRUD
    window.openEditCampusModal = function(campusId) {
        const campus = state.campuses.find(c => c.id === campusId);
        if (!campus) return;
        const modal = document.getElementById("modal-campus-editor");
        const idInput = document.getElementById("modal-campus-editing-id");
        const codeInput = document.getElementById("modal-campus-code");
        const nameInput = document.getElementById("modal-campus-name");

        if (idInput) idInput.value = campus.id;
        if (codeInput) codeInput.value = campus.code;
        if (nameInput) nameInput.value = campus.name;

        if (modal) modal.style.display = "flex";
    };

    // Class CRUD
    window.openEditClassModal = function(className) {
        const cls = state.allClasses.find(c => c.name === className);
        const modal = document.getElementById("modal-class-editor");
        const title = document.getElementById("modal-class-title");
        const oldNameInput = document.getElementById("modal-class-editing-old-name");
        const nameInput = document.getElementById("modal-class-name");
        const gradeSelect = document.getElementById("modal-class-grade");
        const campusSelect = document.getElementById("modal-class-campus");
        const isAssignedCheck = document.getElementById("modal-class-is-assigned");

        if (cls) {
            if (title) title.textContent = "✏️ Sửa Tên Lớp Học";
            if (oldNameInput) oldNameInput.value = cls.name;
            if (nameInput) nameInput.value = cls.name;
            if (gradeSelect) gradeSelect.value = cls.grade;
            if (campusSelect) campusSelect.value = cls.campusId;
            if (isAssignedCheck) isAssignedCheck.checked = !!cls.isAssigned;
        } else {
            if (title) title.textContent = "➕ Thêm Lớp Mới";
            if (oldNameInput) oldNameInput.value = "";
            if (nameInput) nameInput.value = "";
            if (gradeSelect) gradeSelect.value = 5;
            if (campusSelect) campusSelect.value = "A";
            if (isAssignedCheck) isAssignedCheck.checked = true;
        }

        if (modal) modal.style.display = "flex";
    };

    window.deleteClass = function(className) {
        if (!confirm(`Thầy/Cô có chắc chắn muốn xóa lớp ${className} khỏi hệ thống không?`)) return;
        state.allClasses = state.allClasses.filter(c => c.name !== className);
        saveState();
        renderClassesSection("all");
        renderMasterTimetableDetailed();
        showToast(`Đã xóa lớp ${className}`, "success");
    };

    window.toggleClassAssigned = function(className, isAssigned) {
        const cls = state.allClasses.find(c => c.name === className);
        if (cls) {
            cls.isAssigned = isAssigned;
            saveState();
            renderClassesSection("all");
            renderMasterTimetableDetailed();
        }
    };

    // Subject Management
    window.toggleAssignedSubject = function(subjectName, isChecked) {
        if (isChecked) {
            if (!state.assignedSubjects.includes(subjectName)) {
                state.assignedSubjects.push(subjectName);
            }
        } else {
            state.assignedSubjects = state.assignedSubjects.filter(s => s !== subjectName);
        }
        saveState();
        renderAssignedSubjectsSection();
        renderMasterTimetableDetailed();
        updatePpctSubjectDropdown();
    };

    window.removeAssignedSubject = function(idx) {
        const sub = state.assignedSubjects[idx];
        state.assignedSubjects.splice(idx, 1);
        saveState();
        renderAssignedSubjectsSection();
        renderMasterTimetableDetailed();
        updatePpctSubjectDropdown();
        showToast(`Đã bỏ môn ${sub}`, "info");
    };

    // Timetable slot clear
    window.clearSlot = function(idx) {
        if (state.timetable[idx]) {
            state.timetable[idx].className = "-- Trống --";
            state.timetable[idx].subject = "-- Nghỉ / Để trống --";
            saveState();
            renderMasterTimetableMatrix();
            renderMasterTimetableDetailed();
        }
    };

    window.openSlotEditPrompt = function(slotIndex) {
        const slot = state.timetable[slotIndex];
        if (!slot) return;

        const newClass = prompt(`Nhập tên lớp cho tiết ${slot.period} ${slot.session} ${slot.day}:`, slot.className || "");
        if (newClass === null) return;

        const newSub = prompt(`Nhập môn học:`, slot.subject || "");
        if (newSub === null) return;

        slot.className = newClass.trim();
        slot.subject = newSub.trim();
        saveState();
        renderTabLbgTableOnly();
        showToast("Đã cập nhật tiết dạy!", "success");
    };

    window.editLessonNameInline = function(grade, subject, week, periodInWeek, cellEl) {
        const oldVal = cellEl.textContent;
        const newVal = prompt("Chỉnh sửa Tên bài dạy:", oldVal);
        if (newVal === null || newVal === oldVal) return;

        const ppctList = state.gradeCurricula[grade] || [];
        const item = ppctList.find(x => x.week === week && normalizeSubjectName(x.subject) === normalizeSubjectName(subject) && x.periodInWeek === periodInWeek);
        if (item) {
            item.lessonName = newVal.trim();
            saveState();
            cellEl.textContent = newVal.trim();
            showToast("Đã lưu tên bài dạy!", "success");
        }
    };

    window.editIntegrationInline = function(grade, subject, week, periodInWeek, cellEl) {
        const oldVal = cellEl.innerText;
        const newVal = prompt("Chỉnh sửa Nội dung tích hợp / Điều chỉnh:", oldVal);
        if (newVal === null || newVal === oldVal) return;

        const ppctList = state.gradeCurricula[grade] || [];
        const item = ppctList.find(x => x.week === week && normalizeSubjectName(x.subject) === normalizeSubjectName(subject) && x.periodInWeek === periodInWeek);
        if (item) {
            item.integration = newVal.trim();
            saveState();
            cellEl.innerHTML = escapeHtml(newVal.trim()).replace(/\n/g, '<br>');
            showToast("Đã lưu nội dung tích hợp!", "success");
        }
    };

    window.editPpctLessonInline = function(grade, subject, ppctNum, field, cellEl) {
        const oldVal = cellEl.innerText;
        const newVal = prompt(`Chỉnh sửa ${field === 'lessonName' ? 'Tên bài dạy' : 'Nội dung tích hợp'}:`, oldVal);
        if (newVal === null || newVal === oldVal) return;

        const ppctList = state.gradeCurricula[grade] || [];
        const item = ppctList.find(x => x.subject === subject && x.ppct === ppctNum);
        if (item) {
            item[field] = newVal.trim();
            saveState();
            if (field === 'integration') {
                cellEl.innerHTML = escapeHtml(newVal.trim()).replace(/\n/g, '<br>');
            } else {
                cellEl.textContent = newVal.trim();
            }
            showToast("Đã lưu thay đổi PPCT!", "success");
        }
    };

    window.deletePpctLesson = function(grade, subject, ppctNum) {
        if (!confirm(`Xác nhận xóa tiết PPCT số ${ppctNum} của môn ${subject}?`)) return;
        state.gradeCurricula[grade] = (state.gradeCurricula[grade] || []).filter(x => !(x.subject === subject && x.ppct === ppctNum));
        saveState();
        renderTabPpctTableOnly();
        showToast("Đã xóa tiết PPCT!", "info");
    };

    window.removePht = function(idx) {
        if (state.settings.vicePrincipals.length <= 1) return;
        state.settings.vicePrincipals.splice(idx, 1);
        renderPhtListInputs();
        renderBghSignerDropdowns();
    };

    // Tab Switching
    function switchActiveTab(targetTab) {
        document.querySelectorAll(".tab-navigation .tab-btn").forEach(btn => {
            btn.classList.toggle("active", btn.dataset.tab === targetTab);
        });

        document.querySelectorAll(".app-main .tab-content").forEach(sec => {
            sec.classList.toggle("active", sec.id === targetTab);
        });

        state.currentTab = targetTab;

        if (targetTab === "tab-lbg") renderTabLbg();
        else if (targetTab === "tab-ctlop") renderTabCtlop();
        else if (targetTab === "tab-lbg-mon") renderTabLbgMon();
        else if (targetTab === "tab-ppct") renderTabPpct();
        else if (targetTab === "tab-lichtuan") renderTabLichtuan();
        else if (targetTab === "tab-settings") renderTabSettings();
    }

    // =========================================================================
    // INITIALIZATION & EVENT BINDINGS
    // =========================================================================
    function initApp() {
        loadState();
        updateTopHeader();

        // Bind Nav Tabs
        document.querySelectorAll(".tab-navigation .tab-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                switchActiveTab(btn.dataset.tab);
            });
        });

        // Top Quick Buttons
        const btnTopSettings = document.getElementById("btn-top-settings");
        if (btnTopSettings) btnTopSettings.onclick = () => switchActiveTab("tab-settings");

        const btnTopGuide = document.getElementById("btn-top-guide");
        if (btnTopGuide) btnTopGuide.onclick = () => switchActiveTab("tab-guide");

        document.querySelectorAll(".btn-nav-to-settings").forEach(btn => {
            btn.onclick = () => switchActiveTab("tab-settings");
        });

        document.querySelectorAll(".btn-nav-to-lbgmon").forEach(btn => {
            btn.onclick = () => switchActiveTab("tab-lbg-mon");
        });

        // Orientation Toggles
        document.querySelectorAll(".orientation-toggle .btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const parent = e.target.closest(".orientation-toggle");
                parent.querySelectorAll(".btn").forEach(b => b.classList.remove("active"));
                e.target.classList.add("active");
                currentOrientation = e.target.dataset.orient || "portrait";
            });
        });

        // Tab 1 Actions
        const btnLbgBatch = document.getElementById("btn-lbg-batch");
        if (btnLbgBatch) btnLbgBatch.onclick = () => openBatchExportModal('lbg');

        const btnLbgPreview = document.getElementById("btn-lbg-preview");
        if (btnLbgPreview) {
            btnLbgPreview.onclick = () => {
                const html = renderSingleWeekPaperHtml(state.currentWeek, false, currentOrientation);
                openPreviewModal(`Lịch Báo Giảng Tuần ${state.currentWeek}`, html, exportLbgDocxCurrent, () => exportLbgXlsxCurrent(false), () => window.print());
            };
        }

        const btnLbgExcel = document.getElementById("btn-lbg-excel");
        if (btnLbgExcel) btnLbgExcel.onclick = () => exportLbgXlsxCurrent(false);

        const btnLbgDocxDirect = document.getElementById("btn-lbg-docx-direct");
        if (btnLbgDocxDirect) btnLbgDocxDirect.onclick = () => exportLbgDocxCurrent();

        // Tab 2 Actions
        const btnCtlopBatch = document.getElementById("btn-ctlop-batch");
        if (btnCtlopBatch) btnCtlopBatch.onclick = () => openBatchExportModal('ctlop');

        const btnCtlopPreview = document.getElementById("btn-ctlop-preview");
        if (btnCtlopPreview) {
            btnCtlopPreview.onclick = () => {
                const html = renderSingleWeekPaperHtml(state.currentWeek, true, currentOrientation);
                openPreviewModal(`Lịch Báo Giảng Tích Hợp Tuần ${state.currentWeek}`, html, exportCtlopDocxCurrent, () => exportLbgXlsxCurrent(true), () => window.print());
            };
        }

        const btnCtlopExcel = document.getElementById("btn-ctlop-excel");
        if (btnCtlopExcel) btnCtlopExcel.onclick = () => exportLbgXlsxCurrent(true);

        const btnCtlopDocxDirect = document.getElementById("btn-ctlop-docx-direct");
        if (btnCtlopDocxDirect) btnCtlopDocxDirect.onclick = () => exportCtlopDocxCurrent();

        // Tab 1 & Tab 2 Synchronized Column and Signature Toggles
        const chkLbgColSign = document.getElementById("lbg-opt-col-sign");
        const chkCtlopColSign = document.getElementById("ctlop-opt-col-sign");
        function syncColSign(val) {
            state.lbgShowColSign = val;
            if (chkLbgColSign) chkLbgColSign.checked = val;
            if (chkCtlopColSign) chkCtlopColSign.checked = val;
            saveState();
            renderTabLbgTableOnly();
            renderTabCtlopTableOnly();
        }
        if (chkLbgColSign) chkLbgColSign.onchange = (e) => syncColSign(e.target.checked);
        if (chkCtlopColSign) chkCtlopColSign.onchange = (e) => syncColSign(e.target.checked);

        const chkLbgColNote = document.getElementById("lbg-opt-col-note");
        const chkCtlopColNote = document.getElementById("ctlop-opt-col-note");
        function syncColNote(val) {
            state.lbgShowColNote = val;
            if (chkLbgColNote) chkLbgColNote.checked = val;
            if (chkCtlopColNote) chkCtlopColNote.checked = val;
            saveState();
            renderTabLbgTableOnly();
            renderTabCtlopTableOnly();
        }
        if (chkLbgColNote) chkLbgColNote.onchange = (e) => syncColNote(e.target.checked);
        if (chkCtlopColNote) chkCtlopColNote.onchange = (e) => syncColNote(e.target.checked);

        const btnLbgAddCol = document.getElementById("btn-lbg-add-custom-col");
        if (btnLbgAddCol) btnLbgAddCol.onclick = handleAddNewCustomCol;
        const btnCtlopAddCol = document.getElementById("btn-ctlop-add-custom-col");
        if (btnCtlopAddCol) btnCtlopAddCol.onclick = handleAddNewCustomCol;

        const chkLbgSigBgh = document.getElementById("lbg-opt-sig-bgh");
        const chkCtlopSigBgh = document.getElementById("ctlop-opt-sig-bgh");
        function syncSigBgh(val) {
            state.lbgShowBghSign = val;
            if (chkLbgSigBgh) chkLbgSigBgh.checked = val;
            if (chkCtlopSigBgh) chkCtlopSigBgh.checked = val;
            const b1 = document.getElementById("lbg-sig-box-bgh");
            if (b1) b1.style.display = val ? "" : "none";
            const b2 = document.getElementById("ctlop-sig-box-bgh");
            if (b2) b2.style.display = val ? "" : "none";
            saveState();
        }
        if (chkLbgSigBgh) chkLbgSigBgh.onchange = (e) => syncSigBgh(e.target.checked);
        if (chkCtlopSigBgh) chkCtlopSigBgh.onchange = (e) => syncSigBgh(e.target.checked);

        const chkLbgSigHead = document.getElementById("lbg-opt-sig-head");
        const chkCtlopSigHead = document.getElementById("ctlop-opt-sig-head");
        function syncSigHead(val) {
            state.lbgShowHeadSign = val;
            if (chkLbgSigHead) chkLbgSigHead.checked = val;
            if (chkCtlopSigHead) chkCtlopSigHead.checked = val;
            const h1 = document.getElementById("lbg-sig-box-head");
            if (h1) h1.style.display = val ? "" : "none";
            const h2 = document.getElementById("ctlop-sig-box-head");
            if (h2) h2.style.display = val ? "" : "none";
            saveState();
        }
        if (chkLbgSigHead) chkLbgSigHead.onchange = (e) => syncSigHead(e.target.checked);
        if (chkCtlopSigHead) chkCtlopSigHead.onchange = (e) => syncSigHead(e.target.checked);

        const chkLbgSigTeacher = document.getElementById("lbg-opt-sig-teacher");
        const chkCtlopSigTeacher = document.getElementById("ctlop-opt-sig-teacher");
        function syncSigTeacher(val) {
            state.lbgShowTeacherSign = val;
            if (chkLbgSigTeacher) chkLbgSigTeacher.checked = val;
            if (chkCtlopSigTeacher) chkCtlopSigTeacher.checked = val;
            const t1 = document.getElementById("lbg-sig-box-teacher");
            if (t1) t1.style.display = val ? "" : "none";
            const t2 = document.getElementById("ctlop-sig-box-teacher");
            if (t2) t2.style.display = val ? "" : "none";
            saveState();
        }
        if (chkLbgSigTeacher) chkLbgSigTeacher.onchange = (e) => syncSigTeacher(e.target.checked);
        if (chkCtlopSigTeacher) chkCtlopSigTeacher.onchange = (e) => syncSigTeacher(e.target.checked);

        // Tab 3 Actions
        const btnLbgMonBatch = document.getElementById("btn-lbgmon-batch");
        if (btnLbgMonBatch) btnLbgMonBatch.onclick = () => openBatchExportModal('lbg-mon');

        const btnLbgMonPreview = document.getElementById("btn-lbgmon-preview");
        if (btnLbgMonPreview) {
            btnLbgMonPreview.onclick = () => {
                const html = renderSingleWeekMonPaperHtml(state.currentWeek, currentOrientation);
                openPreviewModal(`Lịch Báo Giảng Theo Môn Tuần ${state.currentWeek}`, html, exportLbgMonDocxCurrent, () => exportLbgMonXlsxCurrent(), () => window.print());
            };
        }

        const btnLbgMonExcel = document.getElementById("btn-lbgmon-excel");
        if (btnLbgMonExcel) btnLbgMonExcel.onclick = () => exportLbgMonXlsxCurrent();

        const btnLbgMonDocx = document.getElementById("btn-lbgmon-docx");
        if (btnLbgMonDocx) btnLbgMonDocx.onclick = () => exportLbgMonDocxCurrent();

        // Batch Export Modal Controls
        const modalBatchCloseBtn = document.getElementById("modal-batch-close-btn");
        if (modalBatchCloseBtn) modalBatchCloseBtn.onclick = closeBatchExportModal;

        const modalBatchCancelBtn = document.getElementById("modal-batch-cancel-btn");
        if (modalBatchCancelBtn) modalBatchCancelBtn.onclick = closeBatchExportModal;

        document.querySelectorAll(".batch-range-btn").forEach(btn => {
            btn.onclick = () => {
                const s = btn.dataset.start;
                const e = btn.dataset.end;
                const selStart = document.getElementById("batch-start-week");
                const selEnd = document.getElementById("batch-end-week");
                if (selStart && s) selStart.value = s;
                if (selEnd && e) selEnd.value = e;
            };
        });

        const btnBatchDownloadDocx = document.getElementById("btn-batch-download-docx");
        if (btnBatchDownloadDocx) btnBatchDownloadDocx.onclick = exportBatchLbgToDocx;

        const btnBatchPreviewPrint = document.getElementById("btn-batch-preview-print");
        if (btnBatchPreviewPrint) btnBatchPreviewPrint.onclick = previewBatchLbg;

        // Tab 4 PPCT Actions
        const btnPreviewKhdh = document.getElementById("btn-preview-khdh");
        if (btnPreviewKhdh) {
            btnPreviewKhdh.onclick = previewKhdhCurrent;
        }

        const btnExportPpctExcel = document.getElementById("btn-export-ppct-excel");
        if (btnExportPpctExcel) btnExportPpctExcel.onclick = exportPpctExcelCurrent;

        const btnExportKhdhDocx = document.getElementById("btn-export-khdh-docx");
        if (btnExportKhdhDocx) {
            btnExportKhdhDocx.onclick = () => {
                const genFn = window.generateKhdhDocx || (window.DocxGenerator && window.DocxGenerator.generateKhdhDocx);
                if (genFn) {
                    const grade = state.ppctCurrentGrade;
                    const subject = state.ppctCurrentSubject;
                    const rawList = (state.gradeCurricula[grade] || []).filter(item => normalizeSubjectName(item.subject) === normalizeSubjectName(subject));
                    const list = enrichKhdhRowsWithTopics(grade, subject, rawList);
                    genFn({
                        grade: grade,
                        subject: subject,
                        rows: list,
                        settings: state.settings
                    }).then(blob => {
                        const filename = `KHDH_Khoi_${grade}_${subject.replace(/\s+/g, '_')}_${state.settings.academicYear.replace(/\s+/g, '')}.docx`;
                        saveAs(blob, filename);
                        showToast(`Đã xuất file Word KHDH: ${filename}`, "success");
                    }).catch(err => {
                        console.error("KHDH export error:", err);
                        alert("Lỗi xuất KHDH: " + err.message);
                    });
                } else {
                    showToast("Không tìm thấy bộ tạo Word KHDH", "error");
                }
            };
        }

        const btnDownloadPpctTemplate = document.getElementById("btn-download-ppct-template");
        if (btnDownloadPpctTemplate) {
            btnDownloadPpctTemplate.onclick = downloadPpctTemplate;
        }

        const inputUploadPpct = document.getElementById("input-upload-ppct");
        if (inputUploadPpct) {
            inputUploadPpct.onchange = (e) => {
                const file = e.target.files && e.target.files[0];
                if (file) {
                    uploadPpctFromFile(file);
                    e.target.value = "";
                }
            };
        }

        // Tab 4 Multi-Export Modal & Filter
        const btnOpenMultiExport = document.getElementById("btn-open-multi-export-khdh");
        if (btnOpenMultiExport) btnOpenMultiExport.onclick = openMultiExportKhdhModal;

        const btnMultiClose = document.getElementById("modal-khdh-multi-close-btn");
        if (btnMultiClose) btnMultiClose.onclick = closeMultiExportKhdhModal;

        const btnMultiCancel = document.getElementById("modal-khdh-multi-cancel-btn");
        if (btnMultiCancel) btnMultiCancel.onclick = closeMultiExportKhdhModal;

        const multiGradeSelect = document.getElementById("multi-export-grade-select");
        if (multiGradeSelect) multiGradeSelect.onchange = renderMultiExportSubjectsList;

        const btnMultiSelectAll = document.getElementById("btn-multi-export-select-all");
        if (btnMultiSelectAll) {
            btnMultiSelectAll.onclick = () => {
                document.querySelectorAll(".multi-export-subject-item").forEach(cb => cb.checked = true);
            };
        }

        const btnMultiDeselectAll = document.getElementById("btn-multi-export-deselect-all");
        if (btnMultiDeselectAll) {
            btnMultiDeselectAll.onclick = () => {
                document.querySelectorAll(".multi-export-subject-item").forEach(cb => cb.checked = false);
            };
        }

        const btnDoMultiDocx = document.getElementById("btn-do-multi-export-docx");
        if (btnDoMultiDocx) btnDoMultiDocx.onclick = doMultiExportDocx;

        const btnDoMultiExcel = document.getElementById("btn-do-multi-export-excel");
        if (btnDoMultiExcel) btnDoMultiExcel.onclick = doMultiExportExcel;

        const chkPpctFilterAssigned = document.getElementById("ppct-filter-only-assigned");
        if (chkPpctFilterAssigned) {
            chkPpctFilterAssigned.checked = (state.ppctFilterOnlyAssigned !== false);
            chkPpctFilterAssigned.onchange = (e) => {
                state.ppctFilterOnlyAssigned = e.target.checked;
                saveState();
                updatePpctSubjectDropdown();
                renderTabPpctTableOnly();
            };
        }

        const btnPpctManageSubs = document.getElementById("btn-ppct-manage-subjects");
        if (btnPpctManageSubs) {
            btnPpctManageSubs.onclick = () => {
                switchActiveTab("tab-settings");
                setTimeout(() => {
                    const el = document.getElementById("assigned-subjects-tags-container");
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 150);
            };
        }

        const btnAddPpctRow = document.getElementById("btn-add-ppct-row");
        if (btnAddPpctRow) {
            btnAddPpctRow.onclick = () => {
                const grade = state.ppctCurrentGrade;
                const subject = state.ppctCurrentSubject;
                const list = state.gradeCurricula[grade] || [];
                const maxPpct = list.reduce((m, x) => (x.subject === subject && x.ppct > m ? x.ppct : m), 0);
                const newLesson = {
                    week: Math.min(35, Math.floor(maxPpct / 2) + 1),
                    subject: subject,
                    periodInWeek: 1,
                    ppct: maxPpct + 1,
                    lessonName: "Bài dạy mới",
                    integration: "",
                    duration: "1 tiết"
                };
                list.push(newLesson);
                saveState();
                renderTabPpctTableOnly();
                showToast("Đã thêm tiết mới vào cuối bảng PPCT!", "success");
            };
        }

        const btnSavePpctChanges = document.getElementById("btn-save-ppct-changes");
        if (btnSavePpctChanges) {
            btnSavePpctChanges.onclick = () => {
                saveState();
                showToast("Đã lưu toàn bộ thay đổi PPCT thành công!", "success");
            };
        }

        // Tab 5 35-Week Generator
        const btnRunGen = document.getElementById("btn-run-week-generator");
        if (btnRunGen) {
            btnRunGen.onclick = () => {
                const year = document.getElementById("gen-year").value;
                const startD = document.getElementById("gen-start-date").value;
                const tetS = document.getElementById("gen-tet-start-date").value;
                const tetE = document.getElementById("gen-tet-end-date").value;
                state.weeks = autoGenerateCalendar(year, startD, tetS, tetE);
                saveState();
                renderTabLichtuan();
                showToast("Đã tính tự động 35 tuần năm học thành công!", "success");
            };
        }

        const btnSaveLichtuan = document.getElementById("btn-save-lichtuan");
        if (btnSaveLichtuan) {
            btnSaveLichtuan.onclick = () => {
                saveState();
                showToast("Đã lưu thay đổi Lịch tuần thành công!", "success");
            };
        }

        // Tab 6 Settings Actions
        const btnSaveSettings = document.getElementById("btn-save-settings");
        if (btnSaveSettings) {
            btnSaveSettings.onclick = () => {
                state.settings.governingBody = document.getElementById("set-gov-body").value.trim();
                state.settings.schoolName = document.getElementById("set-school-name").value.trim();
                state.settings.academicYear = document.getElementById("set-academic-year").value.trim();
                state.settings.location = document.getElementById("set-location").value.trim();
                state.settings.teacherName = document.getElementById("set-teacher").value.trim();
                state.settings.departmentName = document.getElementById("set-department").value.trim();
                state.settings.headOfDepartment = document.getElementById("set-head").value.trim();
                state.settings.dateString = document.getElementById("set-date").value.trim();
                state.settings.principal = document.getElementById("set-principal").value.trim();

                const phtInputs = document.querySelectorAll(".pht-name-input");
                state.settings.vicePrincipals = Array.from(phtInputs).map(inp => inp.value.trim()).filter(Boolean);
                if (state.settings.vicePrincipals.length === 0) state.settings.vicePrincipals = ["Lê Văn Tám"];

                const lbgSelectEl = document.getElementById("set-bgh-signer-lbg-select");
                if (lbgSelectEl && lbgSelectEl.value) {
                    const lbgSignerVal = lbgSelectEl.value.split(":");
                    state.settings.bghSignerLbgType = lbgSignerVal[0];
                    state.settings.bghSignerLbgIndex = parseInt(lbgSignerVal[1], 10);
                }

                const khdhSelectEl = document.getElementById("set-bgh-signer-khdh-select");
                if (khdhSelectEl && khdhSelectEl.value) {
                    const khdhSignerVal = khdhSelectEl.value.split(":");
                    state.settings.bghSignerKhdhType = khdhSignerVal[0];
                    state.settings.bghSignerKhdhIndex = parseInt(khdhSignerVal[1], 10);
                }

                saveState();
                renderBghSignerDropdowns();
                updateTopHeader();
                renderTabLbg();
                renderTabCtlop();
                renderTabLbgMon();
                showToast("Đã lưu toàn bộ cài đặt thành công!", "success");
            };
        }

        const btnAddPht = document.getElementById("btn-add-pht");
        if (btnAddPht) {
            btnAddPht.onclick = () => {
                if (!state.settings.vicePrincipals) state.settings.vicePrincipals = [];
                state.settings.vicePrincipals.push("Phó Hiệu trưởng mới");
                renderPhtListInputs();
                renderBghSignerDropdowns();
            };
        }

        const btnAddCustomSub = document.getElementById("btn-add-custom-subject");
        if (btnAddCustomSub) {
            btnAddCustomSub.onclick = () => {
                const inp = document.getElementById("input-add-custom-subject");
                const val = inp ? inp.value.trim() : "";
                if (!val) return;
                if (!state.assignedSubjects.includes(val)) {
                    state.assignedSubjects.push(val);
                    saveState();
                    inp.value = "";
                    renderAssignedSubjectsSection();
                    renderMasterTimetableDetailed();
                    showToast(`Đã thêm môn ${val}`, "success");
                }
            };
        }

        // Quick Subject Actions & Memory Optimization
        const btnUncheckAllSubs = document.getElementById("btn-uncheck-all-subjects");
        if (btnUncheckAllSubs) {
            btnUncheckAllSubs.onclick = () => {
                if (!confirm("Bỏ chọn tất cả các môn giảng dạy hiện tại? Thầy/Cô có thể tick chọn lại môn mình dạy ngay sau đó.")) return;
                state.assignedSubjects = [];
                saveState();
                renderAssignedSubjectsSection();
                renderMasterTimetableDetailed();
                updatePpctSubjectDropdown();
                renderTabPpctTableOnly();
                showToast("Đã bỏ chọn tất cả môn!", "info");
            };
        }

        const btnResetDefSubs = document.getElementById("btn-reset-default-subjects");
        if (btnResetDefSubs) {
            btnResetDefSubs.onclick = () => {
                state.assignedSubjects = ["Tin học", "Công nghệ"];
                saveState();
                renderAssignedSubjectsSection();
                renderMasterTimetableDetailed();
                updatePpctSubjectDropdown();
                renderTabPpctTableOnly();
                showToast("Đã đặt lại môn giảng dạy mẫu: Tin học & Công nghệ!", "success");
            };
        }

        const btnPurgePpct = document.getElementById("btn-purge-unassigned-ppct");
        if (btnPurgePpct) btnPurgePpct.onclick = purgeUnassignedSubjectsData;

        const btnRestorePpct = document.getElementById("btn-restore-all-ppct");
        if (btnRestorePpct) btnRestorePpct.onclick = restoreAllSubjectsData;

        const btnResetClasses = document.getElementById("btn-reset-default-classes");
        if (btnResetClasses) {
            btnResetClasses.onclick = () => {
                if (!confirm("Khôi phục lại 75 lớp chuẩn của 5 khối và 5 phân hiệu?")) return;
                state.allClasses = generateDefault75Classes();
                saveState();
                renderClassesSection("all");
                renderMasterTimetableDetailed();
                showToast("Đã khôi phục 75 lớp chuẩn!", "success");
            };
        }

        const btnSelectAllClasses = document.getElementById("btn-select-all-assigned-classes");
        if (btnSelectAllClasses) {
            btnSelectAllClasses.onclick = () => {
                state.allClasses.forEach(c => c.isAssigned = true);
                saveState();
                renderClassesSection("all");
                renderMasterTimetableDetailed();
            };
        }

        const btnDeselectAllClasses = document.getElementById("btn-deselect-all-assigned-classes");
        if (btnDeselectAllClasses) {
            btnDeselectAllClasses.onclick = () => {
                state.allClasses.forEach(c => c.isAssigned = false);
                saveState();
                renderClassesSection("all");
                renderMasterTimetableDetailed();
            };
        }

        // Master Timetable Actions
        const btnSaveMasterTt = document.getElementById("btn-save-master-timetable");
        if (btnSaveMasterTt) {
            btnSaveMasterTt.onclick = () => {
                saveState();
                showToast("Đã lưu Thời Khóa Biểu cá nhân thành công!", "success");
            };
        }

        const btnResetMasterTt = document.getElementById("btn-reset-master-timetable");
        if (btnResetMasterTt) {
            btnResetMasterTt.onclick = () => {
                if (!confirm("Khôi phục Thời Khóa Biểu cá nhân về mẫu mặc định?")) return;
                state.timetable = generateDefaultBmTimetable();
                saveState();
                renderMasterTimetableMatrix();
                renderMasterTimetableDetailed();
                showToast("Đã khôi phục TKB mẫu!", "success");
            };
        }

        const btnPrintMasterTt = document.getElementById("btn-print-master-tkb");
        if (btnPrintMasterTt) {
            btnPrintMasterTt.onclick = () => {
                window.print();
            };
        }

        const btnDocxMasterTt = document.getElementById("btn-docx-master-tkb");
        if (btnDocxMasterTt) {
            btnDocxMasterTt.onclick = () => {
                const genFn = window.generateTimetableDocx || (window.DocxGenerator && window.DocxGenerator.generateTimetableDocx);
                if (genFn) {
                    genFn(state.timetable, state.settings, "THỜI KHÓA BIỂU CÁ NHÂN GIÁO VIÊN BỘ MÔN", state.settings.academicYear).then(blob => {
                        const filename = `TKB_Ca_Nhan_${(state.settings.teacherName || 'GVBM').replace(/\s+/g, '_')}.docx`;
                        saveAs(blob, filename);
                        showToast(`Đã xuất file Word TKB: ${filename}`, "success");
                    }).catch(err => {
                        console.error("TKB Docx error:", err);
                        alert("Lỗi xuất TKB Word: " + err.message);
                    });
                } else {
                    showToast("Không tìm thấy bộ tạo Word TKB", "error");
                }
            };
        }

        const btnXlsxMasterTt = document.getElementById("btn-xlsx-master-tkb");
        if (btnXlsxMasterTt) {
            btnXlsxMasterTt.onclick = () => {
                const genFn = window.generateTimetableXlsx || (window.XlsxGenerator && window.XlsxGenerator.generateTimetableXlsx);
                if (genFn) {
                    genFn(state.timetable, state.settings).then(blob => {
                        const filename = `TKB_Ca_Nhan_${(state.settings.teacherName || 'GVBM').replace(/\s+/g, '_')}.xlsx`;
                        saveAs(blob, filename);
                        showToast(`Đã xuất file Excel TKB: ${filename}`, "success");
                    }).catch(err => {
                        console.error("TKB Xlsx error:", err);
                        alert("Lỗi xuất TKB Excel: " + err.message);
                    });
                } else {
                    showToast("Không tìm thấy bộ tạo Excel TKB", "error");
                }
            };
        }

        // Backup & Restore
        const btnBackup = document.getElementById("btn-backup-data");
        if (btnBackup) {
            btnBackup.onclick = () => {
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
                const dl = document.createElement('a');
                dl.setAttribute("href", dataStr);
                dl.setAttribute("download", `LBG_BM_Backup_${state.settings.academicYear.replace(/\s+/g, '')}_${new Date().toISOString().slice(0,10)}.json`);
                dl.click();
                showToast("Đã tải file sao lưu JSON!", "success");
            };
        }

        const inputRestore = document.getElementById("input-restore-data");
        if (inputRestore) {
            inputRestore.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (evt) => {
                    try {
                        const parsed = JSON.parse(evt.target.result);
                        if (parsed.settings) state.settings = parsed.settings;
                        if (Array.isArray(parsed.assignedSubjects)) state.assignedSubjects = parsed.assignedSubjects;
                        if (Array.isArray(parsed.campuses)) state.campuses = parsed.campuses;
                        if (Array.isArray(parsed.allClasses)) state.allClasses = parsed.allClasses;
                        if (Array.isArray(parsed.timetable)) state.timetable = parsed.timetable;
                        if (Array.isArray(parsed.weeks)) state.weeks = parsed.weeks;
                        if (parsed.customSubjectCurricula) {
                            applyCustomSubjectCurricula(parsed.customSubjectCurricula);
                        } else if (parsed.gradeCurricula) {
                            state.gradeCurricula = parsed.gradeCurricula;
                        }

                        saveState();
                        initApp();
                        showToast("Khôi phục dữ liệu từ JSON thành công!", "success");
                    } catch (err) {
                        showToast("File JSON không hợp lệ!", "error");
                    }
                };
                reader.readAsText(file);
            };
        }

        const btnResetAll = document.getElementById("btn-reset-all-data");
        if (btnResetAll) {
            btnResetAll.onclick = () => {
                if (!confirm("CẢNH BÁO: Thao tác này sẽ xóa toàn bộ dữ liệu đã nhập và khôi phục cài đặt gốc của LBG_BM. Thầy/Cô có chắc chắn không?")) return;
                localStorage.removeItem(STORAGE_KEY);
                location.reload();
            };
        }

        // Class Modal Events
        const btnOpenAddClass = document.getElementById("btn-open-add-class-modal");
        if (btnOpenAddClass) btnOpenAddClass.onclick = () => window.openEditClassModal(null);

        const btnClassClose = document.getElementById("modal-class-close-btn");
        const btnClassCancel = document.getElementById("modal-class-cancel-btn");
        const classModal = document.getElementById("modal-class-editor");
        if (btnClassClose) btnClassClose.onclick = () => classModal.style.display = "none";
        if (btnClassCancel) btnClassCancel.onclick = () => classModal.style.display = "none";

        const btnClassSave = document.getElementById("modal-class-save-btn");
        if (btnClassSave) {
            btnClassSave.onclick = () => {
                const oldName = document.getElementById("modal-class-editing-old-name").value.trim();
                const newName = document.getElementById("modal-class-name").value.trim();
                const grade = parseInt(document.getElementById("modal-class-grade").value, 10);
                const campusId = document.getElementById("modal-class-campus").value;
                const isAssigned = document.getElementById("modal-class-is-assigned").checked;

                if (!newName) {
                    alert("Vui lòng nhập tên lớp!");
                    return;
                }

                if (oldName) {
                    // Edit existing
                    const cls = state.allClasses.find(c => c.name === oldName);
                    if (cls) {
                        cls.name = newName;
                        cls.grade = grade;
                        cls.campusId = campusId;
                        cls.isAssigned = isAssigned;
                        // update any slot using oldName
                        state.timetable.forEach(s => {
                            if (s.className === oldName) s.className = newName;
                        });
                    }
                } else {
                    // Add new
                    if (state.allClasses.some(c => c.name === newName)) {
                        alert(`Lớp ${newName} đã tồn tại!`);
                        return;
                    }
                    state.allClasses.push({
                        name: newName,
                        grade: grade,
                        campusId: campusId,
                        isAssigned: isAssigned
                    });
                }

                saveState();
                classModal.style.display = "none";
                renderClassesSection("all");
                renderMasterTimetableDetailed();
                showToast(`Đã lưu lớp ${newName}!`, "success");
            };
        }

        // Campus Modal Events
        const btnCampusClose = document.getElementById("modal-campus-close-btn");
        const btnCampusCancel = document.getElementById("modal-campus-cancel-btn");
        const campusModal = document.getElementById("modal-campus-editor");
        if (btnCampusClose) btnCampusClose.onclick = () => campusModal.style.display = "none";
        if (btnCampusCancel) btnCampusCancel.onclick = () => campusModal.style.display = "none";

        const btnCampusSave = document.getElementById("modal-campus-save-btn");
        if (btnCampusSave) {
            btnCampusSave.onclick = () => {
                const id = document.getElementById("modal-campus-editing-id").value;
                const newName = document.getElementById("modal-campus-name").value.trim();
                if (!newName) return;
                const campus = state.campuses.find(c => c.id === id);
                if (campus) {
                    campus.name = newName;
                    saveState();
                    campusModal.style.display = "none";
                    renderCampusesSection();
                    showToast("Đã lưu tên phân hiệu!", "success");
                }
            };
        }

        // Welcome Modal Buttons
        const btnWelcomeClose = document.getElementById("btn-welcome-close");
        if (btnWelcomeClose) btnWelcomeClose.onclick = closeWelcomeModal;

        const btnWelcomeStart = document.getElementById("btn-welcome-start");
        if (btnWelcomeStart) btnWelcomeStart.onclick = closeWelcomeModal;

        const btnWelcomeDetail = document.getElementById("btn-welcome-detail");
        if (btnWelcomeDetail) {
            btnWelcomeDetail.onclick = () => {
                closeWelcomeModal();
                switchActiveTab("tab-guide");
            };
        }

        // Close preview modal
        const btnModalClose = document.getElementById("modal-close-btn");
        const btnModalCloseFooter = document.getElementById("modal-close-footer");
        if (btnModalClose) btnModalClose.onclick = closePreviewModal;
        if (btnModalCloseFooter) btnModalCloseFooter.onclick = closePreviewModal;

        // Render current active tab
        switchActiveTab(state.currentTab || "tab-lbg");

        // Check if first time
        checkFirstTimeWelcome();
    }

    // Expose needed globals
    window.state = state;
    window.saveState = saveState;
    window.loadState = loadState;
    window.initGradeCurricula = initGradeCurricula;
    window.cleanupObsoleteStorage = cleanupObsoleteStorage;
    window.calculateWeekScheduleForBm = calculateWeekScheduleForBm;
    window.calculateWeekScheduleBySubjectForBm = calculateWeekScheduleBySubjectForBm;
    window.renderTabLbg = renderTabLbg;

    // Boot
    document.addEventListener("DOMContentLoaded", initApp);

})();
