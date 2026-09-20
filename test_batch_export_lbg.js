// Automated test for Batch Word Export (Xuất nhiều tuần cùng lúc) in LBG_BM
const fs = require('fs');
const path = require('path');

const ROOT_DIR = __dirname;
const JSZip = require(path.join(ROOT_DIR, 'lib/jszip.min.js'));

async function runBatchExportTests() {
  console.log('=== RUNNING TESTS: BATCH WORD EXPORT FOR GVBM ===\n');
  let failures = 0;

  function assert(condition, message) {
    if (!condition) {
      console.error(`❌ FAIL: ${message}`);
      failures++;
    } else {
      console.log(`✅ PASS: ${message}`);
    }
  }

  async function getZipXml(blob) {
    let inputData = blob;
    if (blob && typeof blob.arrayBuffer === 'function') {
      inputData = Buffer.from(await blob.arrayBuffer());
    }
    const zip = await JSZip.loadAsync(inputData);
    return await zip.file('word/document.xml').async('string');
  }

  // Load docx_generator into Node environment
  global.JSZip = JSZip;
  global.window = { JSZip: JSZip };
  require(path.join(ROOT_DIR, 'js/docx_generator.js'));

  const settings = {
    governingBody: "UBND PHƯỜNG TRUNG NHỨT",
    schoolName: "TRƯỜNG TIỂU HỌC TRUNG NHỨT",
    departmentName: "TỔ TIN HỌC - CÔNG NGHỆ",
    teacherName: "Nguyễn Văn Chuyên",
    headOfGrade: "Trần Thị Mai",
    principal: "Phạm Quốc Hùng",
    vicePrincipals: ["Lê Văn Tám"],
    bghSignerType: "PHT",
    weeks: [
      { week: 1, startDateVN: "08/09/2026", endDateVN: "12/09/2026" },
      { week: 2, startDateVN: "15/09/2026", endDateVN: "19/09/2026" },
      { week: 3, startDateVN: "22/09/2026", endDateVN: "26/09/2026" }
    ]
  };

  const sampleSlotsWeek1 = [
    { day: "Thứ 2", session: "Sáng", period: 1, className: "5A", subject: "Tin học", ppct: "1", lessonName: "Bài 1: Khám phá máy tính", isOff: false },
    { day: "Thứ 2", session: "Sáng", period: 2, className: "5B", subject: "Tin học", ppct: "1", lessonName: "Bài 1: Khám phá máy tính", isOff: false },
    { day: "Thứ 3", session: "Chiều", period: 1, className: "4A", subject: "Tin học", ppct: "1", lessonName: "Làm quen với máy tính", isOff: false }
  ];

  const sampleSlotsWeek2 = [
    { day: "Thứ 2", session: "Sáng", period: 1, className: "5A", subject: "Tin học", ppct: "2", lessonName: "Bài 2: Thực hành gõ phím", isOff: false },
    { day: "Thứ 2", session: "Sáng", period: 2, className: "5B", subject: "Tin học", ppct: "2", lessonName: "Bài 2: Thực hành gõ phím", isOff: false },
    { day: "Thứ 3", session: "Chiều", period: 1, className: "4A", subject: "Tin học", ppct: "2", lessonName: "Thao tác chuột", isOff: false }
  ];

  // =========================================================================
  // TEST 1: generateMultiWeekLbgDocx with raw array returned by scheduleFn (The bug case!)
  // =========================================================================
  console.log('--- Test 1: generateMultiWeekLbgDocx with raw array scheduleFn ---');
  try {
    const rawArrayFn = (w) => (w === 1 ? sampleSlotsWeek1 : sampleSlotsWeek2);
    const blobRaw = await window.DocxGenerator.generateMultiWeekLbgDocx(
      false, 1, 2, rawArrayFn, settings, "portrait", { hideEmptyRows: false }
    );
    assert(blobRaw !== null && blobRaw !== undefined, "generateMultiWeekLbgDocx returned blob without throwing");

    const docXml = await getZipXml(blobRaw);
    assert(docXml.includes("08/09/2026") && docXml.includes("12/09/2026"), "Docx contains Week 1 dates");
    assert(docXml.includes("15/09/2026") && docXml.includes("19/09/2026"), "Docx contains Week 2 dates");
    assert(docXml.includes("w:type=\"page\""), "Docx contains page break between weeks");
    assert(docXml.includes("5A") && docXml.includes("5B") && docXml.includes("4A"), "Docx contains GVBM class names (5A, 5B, 4A)");
    assert(docXml.includes("GIÁO VIÊN BỘ MÔN"), "Docx signer role is GIÁO VIÊN BỘ MÔN");
    assert(docXml.includes("Nguyễn Văn Chuyên"), "Docx signer name is Nguyễn Văn Chuyên");
    assert(docXml.includes("TỔ TIN HỌC - CÔNG NGHỆ"), "Docx contains GVBM department name");
    assert(!docXml.includes("undefined"), "Docx XML contains no 'undefined' literals");
  } catch (err) {
    assert(false, "Test 1 threw error: " + err.stack);
  }

  // =========================================================================
  // TEST 2: generateMultiWeekLbgDocx with object returned { weekInfo, schedule, stats }
  // =========================================================================
  console.log('\n--- Test 2: generateMultiWeekLbgDocx with object scheduleFn ---');
  try {
    const objFn = (w) => ({
      weekNum: w,
      weekInfo: settings.weeks.find(x => x.week === w),
      schedule: w === 1 ? sampleSlotsWeek1 : sampleSlotsWeek2,
      stats: {}
    });
    const blobObj = await window.DocxGenerator.generateMultiWeekLbgDocx(
      true, 1, 2, objFn, settings, "landscape", { hideEmptyRows: false }
    );
    assert(blobObj !== null && blobObj !== undefined, "generateMultiWeekLbgDocx (object return) generated blob");

    const docXml = await getZipXml(blobObj);
    assert(docXml.includes("LỊCH BÁO GIẢNG TÍCH HỢP TUẦN 1"), "Contains Integrated LBG Week 1 title");
    assert(docXml.includes("LỊCH BÁO GIẢNG TÍCH HỢP TUẦN 2"), "Contains Integrated LBG Week 2 title");
    assert(docXml.includes("w:type=\"page\""), "Contains page break");
  } catch (err) {
    assert(false, "Test 2 threw error: " + err.stack);
  }

  // =========================================================================
  // TEST 3: generateBatchLbgBySubjectDocx (LBG theo môn nhiều tuần)
  // =========================================================================
  console.log('\n--- Test 3: generateBatchLbgBySubjectDocx ---');
  try {
    const bySubFn = (w) => {
      const slots = (w === 1 ? sampleSlotsWeek1 : sampleSlotsWeek2);
      return [
        {
          subject: "Tin học",
          rows: slots
        }
      ];
    };

    const blobSub = await window.DocxGenerator.generateBatchLbgBySubjectDocx(
      1, 2, bySubFn, settings, "portrait", true, "Tin học", "all"
    );
    assert(blobSub !== null && blobSub !== undefined, "generateBatchLbgBySubjectDocx generated blob without throwing");

    const docXml = await getZipXml(blobSub);
    assert(docXml.includes("LỊCH BÁO GIẢNG MÔN TIN HỌC TUẦN 1"), "Contains Subject LBG Week 1 title");
    assert(docXml.includes("LỊCH BÁO GIẢNG MÔN TIN HỌC TUẦN 2"), "Contains Subject LBG Week 2 title");
    assert(docXml.includes("5A") && docXml.includes("5B") && docXml.includes("4A"), "Contains class names in subject batch");
    assert(docXml.includes("w:type=\"page\""), "Contains page break between weeks");
    assert(docXml.includes("GIÁO VIÊN BỘ MÔN"), "Signer role is GIÁO VIÊN BỘ MÔN");
    assert(!docXml.includes("undefined"), "Docx XML contains no 'undefined' literals");
  } catch (err) {
    assert(false, "Test 3 threw error: " + err.stack);
  }

  // =========================================================================
  // TEST 4: Single-week generateLbgDocx signer check
  // =========================================================================
  console.log('\n--- Test 4: Single-week generateLbgDocx signer check ---');
  try {
    const blobSingle = await window.DocxGenerator.generateLbgDocx(
      false, 1, settings.weeks[0], sampleSlotsWeek1, settings, {}, "portrait"
    );
    assert(blobSingle !== null && blobSingle !== undefined, "generateLbgDocx generated blob");
    const docXml = await getZipXml(blobSingle);
    assert(docXml.includes("GIÁO VIÊN BỘ MÔN"), "Single-week LBG signer is GIÁO VIÊN BỘ MÔN");
    assert(docXml.includes("Nguyễn Văn Chuyên"), "Single-week LBG signer name is Nguyễn Văn Chuyên");
  } catch (err) {
    assert(false, "Test 4 threw error: " + err.stack);
  }

  console.log('\n========================================');
  if (failures === 0) {
    console.log('🎉 ALL BATCH EXPORT TESTS PASSED SUCCESSFULLY! (100% OK)');
  } else {
    console.error(`❌ ${failures} TEST(S) FAILED!`);
    process.exit(1);
  }
}

runBatchExportTests();
