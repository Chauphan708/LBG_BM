const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('====================================================');
console.log('RUNNING COMPREHENSIVE VERIFICATION FOR LBG_BM...');
console.log('====================================================\n');

// 1. Check Pristine V8
const v8Path = path.join(__dirname, '..', 'lich-bao-giang-app');
if (fs.existsSync(v8Path)) {
    console.log('[1/7] Checking V8 Pristine preservation at:', v8Path);
    const { execSync } = require('child_process');
    const v8Status = execSync('git status --porcelain', { cwd: v8Path, encoding: 'utf8' }).trim();
    assert.strictEqual(v8Status, '', 'V8 working tree must be 100% pristine and clean!');
    console.log('  ✓ V8 codebase is untouched and clean on main branch.');
}

// 2. Check LBG_BM git remote (Must NOT have remote)
const { execSync } = require('child_process');
const bmRemotes = execSync('git remote', { cwd: __dirname, encoding: 'utf8' }).trim();
assert.strictEqual(bmRemotes, '', 'LBG_BM must NOT have any git remote configured!');
console.log('[2/7] Checking LBG_BM git configuration:');
console.log('  ✓ No git remote configured (100% local, safe from push).');

// 3. Load curriculum data in Node
console.log('[3/7] Verifying curriculum data in LBG_BM:');
global.window = global;
require('./data/curriculum_data.js');
require('./data/curriculum_grades_1_4.js');

assert(window.APP_INITIAL_DATA && Array.isArray(window.APP_INITIAL_DATA.ppct), 'Grade 5 ppct missing!');
assert(window.APP_INITIAL_DATA.ppct.length >= 1500, 'Grade 5 must have >= 1500 lessons');
console.log('  ✓ Grade 5 PPCT loaded:', window.APP_INITIAL_DATA.ppct.length, 'lessons.');

for (let g = 1; g <= 4; g++) {
    assert(window.APP_GRADE_DATA && window.APP_GRADE_DATA[g] && Array.isArray(window.APP_GRADE_DATA[g].ppct), `Grade ${g} ppct missing!`);
    console.log(`  ✓ Grade ${g} PPCT loaded:`, window.APP_GRADE_DATA[g].ppct.length, 'lessons.');
}

// 4. Verify Grade 3 Specialist subjects have authentic lessons (not placeholders)
console.log('[4/7] Verifying Grade 3 specialist subjects authenticity:');
const g3List = window.APP_GRADE_DATA['3'].ppct;
['Tin học', 'Công nghệ', 'Âm nhạc', 'Mĩ thuật', 'GD Thể chất'].forEach(sub => {
    const items = g3List.filter(x => x.subject === sub);
    assert(items.length > 0, `Grade 3 ${sub} has no items!`);
    const hasPlaceholder = items.some(x => x.lessonName && x.lessonName.includes('GV bộ môn dạy'));
    assert(!hasPlaceholder, `Grade 3 ${sub} still has placeholder lessons!`);
    console.log(`  ✓ Grade 3 ${sub}: ${items.length} authentic lessons, sample: "${items[0].lessonName}"`);
});

// 5. Test LBG_BM schedule calculation & multi-subject teaching scenario
console.log('[5/7] Testing multi-subject & multi-grade BM schedule calculation:');
const appCode = fs.readFileSync(path.join(__dirname, 'js', 'app.js'), 'utf8');

// Mock DOM environment for app.js evaluation if needed
global.document = {
    addEventListener: () => {},
    getElementById: () => null,
    querySelectorAll: () => []
};
global.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
};

eval(appCode);

assert(typeof window.calculateWeekScheduleForBm === 'function', 'calculateWeekScheduleForBm function must exist!');
assert(typeof window.calculateWeekScheduleBySubjectForBm === 'function', 'calculateWeekScheduleBySubjectForBm function must exist!');

// Test with teacher teaching 3 different subjects across Grades 3, 4, 5
window.state.timetable = [
    { day: "Thứ 2", session: "Sáng", period: 1, className: "4A1", subject: "Tin học" },
    { day: "Thứ 2", session: "Sáng", period: 2, className: "4A2", subject: "Tin học" },
    { day: "Thứ 2", session: "Sáng", period: 3, className: "3A1", subject: "Tin học" },
    { day: "Thứ 2", session: "Sáng", period: 4, className: "5A1", subject: "Tin học" },
    { day: "Thứ 2", session: "Chiều", period: 1, className: "5A1", subject: "Công nghệ" },
    { day: "Thứ 3", session: "Sáng", period: 1, className: "5B1", subject: "GD Thể chất" },
    { day: "Thứ 3", session: "Sáng", period: 2, className: "5B1", subject: "GD Thể chất" },
];

const week1Schedule = window.calculateWeekScheduleForBm(1, "all", "all", "all", false);
assert.strictEqual(week1Schedule.length, 7, 'Schedule should have 7 items');

// Check 4A1 Tin học
const s4A1 = week1Schedule.find(s => s.className === "4A1");
assert(s4A1 && s4A1.ppct === 1, '4A1 Tin hoc should be PPCT 1');
assert(s4A1.lessonName.includes('Phần cứng'), '4A1 Tin hoc lesson name correct');
console.log('  ✓ 4A1 Tin học Week 1: PPCT', s4A1.ppct, 'Lesson:', s4A1.lessonName);

// Check 5A1 Tin học vs 5A1 Công nghệ (same class, 2 different subjects)
const s5A1Tin = week1Schedule.find(s => s.className === "5A1" && s.subject === "Tin học");
const s5A1Cn = week1Schedule.find(s => s.className === "5A1" && s.subject === "Công nghệ");
assert(s5A1Tin && s5A1Tin.ppct === 1, '5A1 Tin học should be PPCT 1');
assert(s5A1Cn && s5A1Cn.ppct === 1, '5A1 Công nghệ should be PPCT 1 independently');
assert(s5A1Cn.integration && s5A1Cn.integration.length > 0, '5A1 Công nghệ has rich integration content');
console.log('  ✓ 5A1 Tin học Week 1: PPCT', s5A1Tin.ppct, 'Lesson:', s5A1Tin.lessonName);
console.log('  ✓ 5A1 Công nghệ Week 1: PPCT', s5A1Cn.ppct, 'Lesson:', s5A1Cn.lessonName);

// Check 5B1 GD Thể chất (2 periods in same week for same class)
const s5B1_1 = week1Schedule[5];
const s5B1_2 = week1Schedule[6];
assert.strictEqual(s5B1_1.periodInWeek, 1, 'First period in week should be 1');
assert.strictEqual(s5B1_2.periodInWeek, 2, 'Second period in week should be 2');
assert.strictEqual(s5B1_1.ppct, 1, 'First period PPCT is 1');
assert.strictEqual(s5B1_2.ppct, 2, 'Second period PPCT is 2');
console.log('  ✓ 5B1 GD Thể chất Week 1: Tiết 1 PPCT', s5B1_1.ppct, '| Tiết 2 PPCT', s5B1_2.ppct);

// 6. Test Multi-subject Grouping
console.log('[6/7] Testing multi-subject grouping calculation:');
const groups = window.calculateWeekScheduleBySubjectForBm(1, "all", false);
assert(groups.length >= 3, 'Should have at least 3 subjects grouped');
console.log('  ✓ Grouped subjects count:', groups.length);
groups.forEach(g => {
    console.log(`    - Môn ${g.subject}: ${g.rows.length} tiết`);
});

// 7. Test Export Engines Column Structure
console.log('[7/7] Testing Word and Excel export column structures:');
const docxCode = fs.readFileSync(path.join(__dirname, 'js', 'docx_generator.js'), 'utf8');
const xlsxCode = fs.readFileSync(path.join(__dirname, 'js', 'xlsx_generator.js'), 'utf8');

assert(docxCode.includes("cols.push({ key: 'className', title: 'Lớp'"), 'Word generator must include className column!');
assert(docxCode.includes("GIÁO VIÊN BỘ MÔN"), 'Word generator must include GIÁO VIÊN BỘ MÔN signature!');
assert(docxCode.includes("TỔ TRƯỞNG CHUYÊN MÔN"), 'Word generator must include TỔ TRƯỞNG CHUYÊN MÔN signature!');
console.log('  ✓ Word generator (.docx) has Lớp column and proper GVBM headers and signatures.');

assert(xlsxCode.includes("cols.push({ key: 'className', title: 'Lớp'"), 'Excel generator must include className column!');
console.log('  ✓ Excel generator (.xlsx) has Lớp column.');

console.log('\n====================================================');
console.log('ALL TESTS PASSED WITH 100% SUCCESS!');
console.log('LBG_BM IS VERIFIED, PRODUCTION-READY, AND FULLY LOCAL!');
console.log('====================================================');
